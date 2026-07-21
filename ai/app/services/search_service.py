import os
import requests
from typing import Dict, List, Optional
from dotenv import load_dotenv
import urllib.parse
import re
import concurrent.futures
import threading
import time

load_dotenv()

YOUTUBE_API_KEY = os.getenv("YOUTUBE_API_KEY")
SERPER_API_KEY = os.getenv("SERPER_API_KEY")

# Hard ceiling on the whole enrichment phase. The backend worker times the AI call out
# (ROADMAP_TIMEOUT_MS, 120s), and that call also makes TWO LLM round-trips (roadmap + skill-gap,
# ~40-60s combined) around this enrichment. Capping enrichment here leaves comfortable headroom;
# the guaranteed floor fills any still-pending slot, so the roadmap stays complete AND on time.
ENRICH_DEADLINE_SECONDS = 50

# Serper is called first for both YouTube and articles, but when the key is out of
# credits / quota it fails on EVERY call. Under the enrichment burst (~48 targets ×2
# searches) those dead calls also start timing out at the connect stage (10s each),
# eating the whole per-resource time budget before the working scraper fallbacks run.
# So the first credits/quota/auth failure disables Serper for the rest of the process —
# every later search then goes straight to the keyless scrapers with their full budget.
_serper_disabled = False
_serper_lock = threading.Lock()

# DuckDuckGo is the keyless article fallback, but it hard-throttles concurrent connections
# from one IP — past ~5 in flight every request connect-times-out (measured). The enrichment
# fan-out can drive ~10 article searches at once, so cap in-flight DDG requests to a level it
# tolerates. YouTube's scraper isn't throttled this way and stays fully concurrent.
_DDG_SEMAPHORE = threading.Semaphore(5)


def _serper_available() -> bool:
    return bool(SERPER_API_KEY) and not _serper_disabled


def _disable_serper(reason: str) -> None:
    global _serper_disabled
    with _serper_lock:
        if not _serper_disabled:
            _serper_disabled = True
            print(f"    ⚠ Serper disabled for this process ({reason}); using keyless fallbacks")


def _serper_is_exhausted(response: requests.Response) -> bool:
    """True when the response means the Serper key can't be used (credits/quota/auth)."""
    if response.status_code in (401, 402, 403, 429):
        return True
    if response.status_code == 400 and ("credit" in response.text.lower() or "quota" in response.text.lower()):
        return True
    return False

def enrich_roadmap_with_resources(roadmap: Dict) -> Dict:
    """
    Enrich each step AND each subtopic in the roadmap with learning resources
    (parallel processing for speed). Adds direct YouTube video + article links.
    Steps and subtopics are flattened into one thread pool so the whole roadmap
    (typically 12 steps + ~36 subtopics) enriches concurrently.
    """
    steps = roadmap.get("steps", [])

    # Build the full task list: one search per step and per subtopic.
    # Each entry is (query, target_dict) — the dict gets its own "resources" key.
    tasks = []
    for step in steps:
        title = step.get("title", "")
        skills = step.get("skills", [])
        tasks.append((f"{title} {' '.join(skills)} tutorial", step))
        for sub in step.get("subtopics", []) or []:
            sub_title = sub.get("title", "")
            # Include the parent topic for context so the search stays on-domain.
            tasks.append((f"{sub_title} {title} tutorial", sub))

    print(f"Enriching {len(steps)} steps + subtopics ({len(tasks)} targets) with resources...")

    # Each target spawns 2 concurrent scrapes (YouTube + article), so this pool size is
    # doubled in actual outbound connections. Kept moderate on purpose: pushing it higher
    # makes youtube.com and Ecosia contend for bandwidth and start timing out.
    executor = concurrent.futures.ThreadPoolExecutor(max_workers=8)
    try:
        futures = [(query, target, executor.submit(search_learning_resources, query))
                   for query, target in tasks]

        # Collect against one shared deadline. Whatever hasn't finished by then takes the
        # guaranteed floor instead of blocking — this is the hard cap that protects the worker timeout.
        deadline = time.monotonic() + ENRICH_DEADLINE_SECONDS
        for query, target, future in futures:
            try:
                target["resources"] = future.result(timeout=max(0.1, deadline - time.monotonic()))
            except Exception:
                target["resources"] = _fallback_resources(query)
    finally:
        # Don't wait on scrapes still running past the deadline; they die on their own timeouts.
        executor.shutdown(wait=False)

    print("Resource enrichment completed!")
    return roadmap


def _fallback_resources(query: str) -> Dict[str, str]:
    """On-topic search URLs used whenever live search misses — always valid, instant, relevant."""
    encoded = urllib.parse.quote(query)
    return {
        "youtube_video": f"https://www.youtube.com/results?search_query={encoded}",
        "article": f"https://www.google.com/search?q={encoded}+tutorial",
    }

def search_learning_resources(query: str) -> Dict[str, Optional[str]]:
    """
    Search for YouTube video and article for the given query.
    Returns direct links to resources.
    """
    resources = {
        "youtube_video": None,
        "article": None
    }
    
    # Search YouTube and Article in parallel. Wait on BOTH with one shared deadline instead
    # of two sequential .result() calls — otherwise whichever is read first eats the budget
    # and a slightly-slow-but-found result from the other gets discarded even though it made it.
    # shutdown(wait=False): don't block on a scrape still hanging past the deadline — take the
    # guaranteed floor below instead. This keeps each target bounded regardless of network stalls.
    executor = concurrent.futures.ThreadPoolExecutor(max_workers=2)
    try:
        futures = {
            "youtube_video": executor.submit(search_youtube, query),
            "article": executor.submit(search_article, query),
        }
        concurrent.futures.wait(futures.values(), timeout=10)

        for key, future in futures.items():
            if not future.done():
                print(f"    {key} search timed out")
                continue
            try:
                resources[key] = future.result()
            except Exception as e:
                print(f"    {key} search failed: {e}")
    finally:
        executor.shutdown(wait=False)

    # Guaranteed floor: a direct scraped link is preferred, but free scrapers occasionally miss
    # or time out under the fan-out. Rather than leave a slot empty, fall back to an on-topic
    # search URL — always valid, instant, and relevant — so every step ALWAYS has both a video
    # and an article link. On a well-connected host the direct links dominate; this only fills gaps.
    fallback = _fallback_resources(query)
    if not resources["youtube_video"]:
        resources["youtube_video"] = fallback["youtube_video"]
    if not resources["article"]:
        resources["article"] = fallback["article"]

    return resources

def search_youtube(query: str) -> Optional[str]:
    """
    Search YouTube and return direct video link.
    Uses multiple methods with fallbacks.
    """
    # Method 1: Try YouTube Data API if key is available
    if YOUTUBE_API_KEY:
        result = search_youtube_api(query)
        if result:
            return result
    
    # Method 2: Try Serper API (includes YouTube results)
    if _serper_available():
        result = search_youtube_via_serper(query)
        if result:
            return result
    
    # Method 3: Fallback to web scraping approach
    result = search_youtube_scraping(query)
    if result:
        return result
    
    return None

def search_youtube_api(query: str) -> Optional[str]:
    """
    Search YouTube using official YouTube Data API v3.
    """
    try:
        url = "https://www.googleapis.com/youtube/v3/search"
        params = {
            "part": "snippet",
            "q": query,
            "type": "video",
            "maxResults": 1,
            "key": YOUTUBE_API_KEY,
            "order": "relevance",
            "videoDuration": "medium",
            "safeSearch": "none",
            "videoEmbeddable": "true"
        }
        
        response = requests.get(url, params=params, timeout=10)
        
        # Check for quota exceeded or other API errors
        if response.status_code == 403:
            data = response.json()
            if "quotaExceeded" in str(data):
                print("YouTube API quota exceeded. Falling back to alternative methods.")
                return None
        
        response.raise_for_status()
        data = response.json()
        
        if "items" in data and len(data["items"]) > 0:
            video_id = data["items"][0]["id"]["videoId"]
            video_url = f"https://www.youtube.com/watch?v={video_id}"
            print(f"    ✓ Found YouTube video via API: {video_url}")
            return video_url
        
        return None
    
    except requests.exceptions.HTTPError as e:
        print(f"    YouTube API HTTP error: {e}")
        if e.response.status_code == 400:
            error_data = e.response.json()
            print(f"    API Error details: {error_data}")
        return None
    except Exception as e:
        print(f"    YouTube API error: {str(e)}")
        return None

def search_youtube_via_serper(query: str) -> Optional[str]:
    """
    Search YouTube videos using Serper API.
    """
    try:
        url = "https://google.serper.dev/search"
        headers = {
            "X-API-KEY": SERPER_API_KEY,
            "Content-Type": "application/json"
        }
        payload = {
            "q": f"site:youtube.com {query}",
            "num": 3
        }
        
        response = requests.post(url, json=payload, headers=headers, timeout=6)
        if _serper_is_exhausted(response):
            _disable_serper(f"{response.status_code} {response.text[:60]}")
            return None
        response.raise_for_status()

        data = response.json()

        if "organic" in data:
            for result in data["organic"]:
                link = result.get("link", "")
                if "youtube.com/watch" in link:
                    print(f"    ✓ Found YouTube video via Serper: {link}")
                    return link

        return None
    
    except Exception as e:
        print(f"    Serper YouTube search error: {str(e)}")
        return None

def search_youtube_scraping(query: str) -> Optional[str]:
    """
    Search YouTube using web scraping (no API key needed).
    Uses YouTube's search suggestion API.
    """
    try:
        # Use YouTube's internal API for search results
        search_url = "https://www.youtube.com/results"
        params = {
            "search_query": query
        }
        
        headers = {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
        }
        
        response = requests.get(search_url, params=params, headers=headers, timeout=7)
        response.raise_for_status()
        
        # Extract video ID from the HTML response
        pattern = r'"videoId":"([a-zA-Z0-9_-]{11})"'
        matches = re.findall(pattern, response.text)
        
        if matches:
            video_id = matches[0]  # Get first video
            video_url = f"https://www.youtube.com/watch?v={video_id}"
            print(f"    ✓ Found YouTube video via scraping: {video_url}")
            return video_url
        
        return None
    
    except Exception as e:
        print(f"    YouTube scraping error: {str(e)}")
        return None

def search_article(query: str) -> Optional[str]:
    """
    Search for articles/tutorials and return direct link.
    Uses Serper API (Google Search alternative) or falls back to DuckDuckGo.
    """
    # Try Serper API first (more reliable, 2500 free searches/month)
    if _serper_available():
        result = search_with_serper(query)
        if result:
            return result

    # Keyless fallbacks. Ecosia first: it tolerates the enrichment burst (~48 concurrent
    # searches) that throttles DuckDuckGo into CAPTCHA/connect-timeouts, and returns cleaner
    # tutorial links. DuckDuckGo stays as a last-resort secondary.
    result = search_with_ecosia(query)
    if result:
        return result

    return search_with_duckduckgo(query)


def search_with_ecosia(query: str) -> Optional[str]:
    """
    Search articles via Ecosia (keyless, Bing-backed). Chosen as the primary keyless source
    because it doesn't hard-throttle concurrent scraping the way DuckDuckGo does, so it stays
    reliable across the whole enrichment fan-out.
    """
    try:
        response = requests.get(
            "https://www.ecosia.org/search",
            params={"q": f"{query} tutorial guide"},
            headers={
                "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                              "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36"
            },
            timeout=7,
        )
        response.raise_for_status()

        # Organic result anchors: <a data-test-id="result-link" ... href="...">
        for link in re.findall(r'data-test-id="result-link"[^>]*?href="(https?://[^"]+)"', response.text):
            if "youtube.com" in link or "youtu.be" in link:
                continue
            print(f"    ✓ Found article via Ecosia: {link}")
            return link

        return None

    except Exception as e:
        print(f"    Ecosia search error: {str(e)}")
        return None

def search_with_serper(query: str) -> Optional[str]:
    """
    Search using Serper API (Google Search API alternative).
    Get free API key at: https://serper.dev/
    """
    try:
        url = "https://google.serper.dev/search"
        headers = {
            "X-API-KEY": SERPER_API_KEY,
            "Content-Type": "application/json"
        }
        payload = {
            "q": f"{query} tutorial guide",
            "num": 5
        }
        
        response = requests.post(url, json=payload, headers=headers, timeout=6)
        if _serper_is_exhausted(response):
            _disable_serper(f"{response.status_code} {response.text[:60]}")
            return None
        response.raise_for_status()

        data = response.json()

        # Filter for quality tutorial sites
        quality_domains = [
            "medium.com", "dev.to", "freecodecamp.org", "css-tricks.com",
            "smashingmagazine.com", "digitalocean.com", "hackernoon.com",
            "towardsdatascience.com", "realpython.com", "scotch.io",
            "blog.logrocket.com", "atlassian.com", "github.com",
            "tutorialspoint.com", "geeksforgeeks.org", "w3schools.com"
        ]
        
        if "organic" in data:
            # First try to find article from quality domains
            for result in data["organic"]:
                link = result.get("link", "")
                # Skip YouTube links in article search
                if "youtube.com" in link or "youtu.be" in link:
                    continue
                if any(domain in link for domain in quality_domains):
                    print(f"    ✓ Found article via Serper: {link}")
                    return link
            
            # If no quality domain found, return first non-YouTube result
            for result in data["organic"]:
                link = result.get("link", "")
                if "youtube.com" not in link and "youtu.be" not in link:
                    print(f"    ✓ Found article via Serper: {link}")
                    return link
        
        return None
    
    except Exception as e:
        print(f"    Serper search error: {str(e)}")
        return None

def search_with_duckduckgo(query: str) -> Optional[str]:
    """
    Search using DuckDuckGo HTML search (more reliable than API).
    """
    url = "https://html.duckduckgo.com/html/"
    headers = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
    }
    data = {
        "q": f"{query} tutorial",
        "b": "",
        "kl": "us-en"
    }

    # Last-resort secondary (Ecosia is primary). Single short attempt only: DDG hard-throttles
    # under the fan-out, and a slow retry just leaves a thread hanging that drags later requests.
    try:
        with _DDG_SEMAPHORE:  # hold a slot only for the network call, not the parsing
            response = requests.post(url, data=data, headers=headers, timeout=7)
        response.raise_for_status()

        # Result anchors: <a rel="nofollow" class="result__a" href="...">. DDG serves the
        # target either as a direct URL or wrapped in a /l/?...&uddg=<url> redirect — handle both.
        # (class comes before href in both old and new markup, so this matches either order.)
        matches = re.findall(r'class="result__a"[^>]*href="([^"]+)"', response.text)
        for raw in matches:
            link = urllib.parse.unquote(raw)
            if "uddg=" in link:
                link = urllib.parse.unquote(link.split("uddg=")[1].split("&")[0])
            if not link.startswith("http"):
                continue
            # Article slot must not be a video link (that's the youtube_video's job)
            if "youtube.com" in link or "youtu.be" in link:
                continue
            print(f"    ✓ Found article via DuckDuckGo: {link}")
            return link

        return None
    except Exception as e:
        print(f"    DuckDuckGo search error: {str(e)}")
        return None