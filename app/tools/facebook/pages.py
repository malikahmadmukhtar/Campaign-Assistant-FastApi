from langchain.tools import tool
import requests
from app.config.settings import fb_access_token, fb_base_url

@tool
def fetch_facebook_page_ids():
    """
    Fetch Facebook Page IDs for use by other tools.

    Returns:
    - A list of (page_id, page_name) tuples, or an error message if the request fails.
    """
    print("Used Fetch Facebook Page id Tool")

    url = f"{fb_base_url}me/accounts"
    params = {
        "access_token": fb_access_token,
        "fields": "id,name"
    }

    try:
        response = requests.get(url, params=params)
        response.raise_for_status()
        data = response.json()
        pages = data.get("data", [])

        if not pages:
            return "No Facebook pages found for this user."

        return [(page["id"], page["name"]) for page in pages]

    except requests.exceptions.RequestException as e:
        return f"Error fetching Facebook pages: {str(e)}"
