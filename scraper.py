"""
scraper.py

Utility functions for scraping Google search and image search results.
Provides methods to extract top web links for a given query or image,
used for augmenting object detection results with relevant external resources.
"""

import requests
from bs4 import BeautifulSoup
import urllib.parse

def get_google_search_links(query, num_links=5):
    """
    Scrapes Google search results for a given query and returns the top links.
    
    Args:
        query (str): The search query string
        num_links (int): Number of links to return (default: 5)
        
    Returns:
        list: A list of URLs from the search results
    """
    # Format the query for URL
    encoded_query = urllib.parse.quote_plus(query)
    url = f"https://www.google.com/search?q={encoded_query}"
    
    # Set headers to mimic a browser request
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    }
    
    try:
        # Send the request
        response = requests.get(url, headers=headers)
        response.raise_for_status()  # Raise exception for HTTP errors
        
        # Parse the HTML content
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Find all search result links
        links = []
        for result in soup.select('div.yuRUbf > a'):
            href = result.get('href')
            if href.startswith('http') and 'google.com' not in href:
                links.append(href)
                if len(links) >= num_links:
                    break
        
        return links
    
    except Exception as e:
        print(f"Error scraping Google search results: {e}")
        return []

def get_google_image_search_links(image_file, num_links=5):
    """
    Performs a Google reverse image search with a local image file and returns the top links.
    
    Args:
        image_file: The image file object to search with
        num_links (int): Number of links to return (default: 5)
        
    Returns:
        list: A list of URLs from the reverse image search results
    """
    try:
        # Google's image search API endpoint
        search_url = "https://www.google.com/searchbyimage/upload"
        
        # Set headers to mimic a browser request
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.5",
            "DNT": "1",
            "Connection": "keep-alive",
            "Upgrade-Insecure-Requests": "1"
        }
        
        # Create multipart form data with the image file
        multipart = {'encoded_image': (image_file.filename, image_file, image_file.content_type)}
        
        # Send the POST request with the image file
        response = requests.post(
            search_url, 
            files=multipart, 
            headers=headers, 
            allow_redirects=True
        )
        response.raise_for_status()
        
        # Parse the HTML content from the response
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Find all search result links
        links = []
        for result in soup.select('div.yuRUbf > a'):
            href = result.get('href')
            if href and href.startswith('http') and 'google.com' not in href:
                links.append(href)
                if len(links) >= num_links:
                    break
        
        # If no links found, it might be in a different format
        if not links:
            # Try alternative selectors
            for result in soup.select('div.g div.yuRUbf > a'):
                href = result.get('href')
                if href and href.startswith('http') and 'google.com' not in href:
                    links.append(href)
                    if len(links) >= num_links:
                        break
        
        return links
    
    except Exception as e:
        print(f"Error performing Google image search: {e}")
        return []

