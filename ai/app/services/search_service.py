import os
import requests
from typing import Dict, List, Optional
from dotenv import load_dotenv
import urllib.parse
import re
import concurrent.futures

load_dotenv()

YOUTUBE_API_KEY = os.getenv("YOUTUBE_API_KEY")
SERPER_API_KEY = os.getenv("SERPER_API_KEY")

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

    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
        futures = [(target, executor.submit(search_learning_resources, query))
                   for query, target in tasks]

        for target, future in futures:
            try:
                target["resources"] = future.result(timeout=25)
            except Exception as e:
                print(f"  ✗ enrichment failed for '{target.get('title', '?')}': {str(e)}")
                target["resources"] = {"youtube_video": None, "article": None}

    print("Resource enrichment completed!")
    return roadmap

def search_learning_resources(query: str) -> Dict[str, Optional[str]]:
    """
    Search for YouTube video and article for the given query.
    Returns direct links to resources.
    """
    resources = {
        "youtube_video": None,
        "article": None
    }
    
    # Search YouTube and Article in parallel
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
        youtube_future = executor.submit(search_youtube, query)
        article_future = executor.submit(search_article, query)
        
        try:
            resources["youtube_video"] = youtube_future.result(timeout=10)
        except Exception as e:
            print(f"    YouTube search failed: {e}")
        
        try:
            resources["article"] = article_future.result(timeout=10)
        except Exception as e:
            print(f"    Article search failed: {e}")
    
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
    if SERPER_API_KEY:
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
        
        response = requests.post(url, json=payload, headers=headers, timeout=10)
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
        
        response = requests.get(search_url, params=params, headers=headers, timeout=10)
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
    if SERPER_API_KEY:
        result = search_with_serper(query)
        if result:
            return result
    
    # Fallback to DuckDuckGo (no API key needed)
    return search_with_duckduckgo(query)

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
        
        response = requests.post(url, json=payload, headers=headers, timeout=10)
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
    try:
        url = "https://html.duckduckgo.com/html/"
        headers = {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
        }
        data = {
            "q": f"{query} tutorial",
            "b": "",
            "kl": "us-en"
        }
        
        response = requests.post(url, data=data, headers=headers, timeout=10)
        response.raise_for_status()
        
        # Parse HTML to find first result link
        pattern = r'<a rel="nofollow" class="result__a" href="([^"]+)"'
        matches = re.findall(pattern, response.text)
        
        if matches:
            # Decode URL
            first_link = urllib.parse.unquote(matches[0])
            # Extract actual URL from DuckDuckGo redirect
            if "uddg=" in first_link:
                actual_url = first_link.split("uddg=")[1].split("&")[0]
                print(f"    ✓ Found article via DuckDuckGo: {actual_url}")
                return urllib.parse.unquote(actual_url)
        
        return None
    
    except Exception as e:
        print(f"    DuckDuckGo search error: {str(e)}")
        return None