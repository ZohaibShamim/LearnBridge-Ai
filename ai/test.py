from app.services.search_service import search_youtube, search_article

# Test YouTube search
print("Testing YouTube search...")
youtube_url = search_youtube("React Hooks tutorial")
print(f"YouTube result: {youtube_url}\n")

# Test Article search
print("Testing Article search...")
article_url = search_article("React Hooks tutorial")
print(f"Article result: {article_url}\n")

# Test full resource search
from app.services.search_service import search_learning_resources
print("Testing full resource search...")
resources = search_learning_resources("Python Flask REST API tutorial")
print(f"Resources: {resources}")