from langchain.tools import tool
import requests
import json
from app.config.settings import fb_access_token, fb_base_url


@tool
def fetch_existing_creatives(ad_account_id: str):
    """
    Fetch existing ad creatives for the given Facebook ad account.

    Parameters:
    - ad_account_id: Facebook Ad Account ID

    Returns:
    - List of tuples (creative_id, creative_name) or error message.
    """
    print("Used Fetch Creatives Tool")

    url = f"{fb_base_url}{ad_account_id}/adcreatives"
    params = {
        'access_token': fb_access_token,
        'fields': 'id,name,object_story_spec'
    }

    try:
        response = requests.get(url, params=params)
        response.raise_for_status()
        data = response.json()
        creatives = data.get('data', [])
        if not creatives:
            return "No ad creatives found for this account."

        # Format output nicely
        creative_list = [(c['id'], c.get('name', '')) for c in creatives]
        return creative_list

    except requests.exceptions.RequestException as e:
        return f"Error fetching creatives: {str(e)}"


@tool
def delete_facebook_ad_creative(creative_id: str) -> str:
    """
    Deletes a Facebook Ad Creative.

    Parameters:
    - creative_id (str): The ID of the Ad Creative to delete.

    Returns:
    - Success or error message as a string.
    """
    try:
        url = f"{fb_base_url}{creative_id}"
        response = requests.delete(url, params={"access_token": fb_access_token})
        response.raise_for_status()
        result = response.json()

        if result.get("success"):
            return f"Ad Creative `{creative_id}` deleted successfully."
        else:
            return f"Failed to delete Ad Creative `{creative_id}`. Response: {result}"
    except requests.RequestException as e:
        return f"Error deleting Ad Creative: {str(e)}"



def upload_image_to_facebook(image_file):
    """Upload image directly to Facebook and return image_hash."""
    url = f"{fb_base_url}act_1398438551173939/adimages"
    # image_file.seek(0)

    files = {'file': ('ad_image.jpg', image_file, 'image/jpeg')}
    data = {'access_token': fb_access_token}

    res = requests.post(url, files=files, data=data)
    if res.status_code == 200:
        try:
            return list(res.json()['images'].values())[0]['hash']
        except Exception:
            return "Invalid image upload response."
    else:
       return f"Facebook upload failed: {res.text}"


@tool
def start_creative_creation(
    ad_account_id: str,
    page_id: str,
    name: str | None = None,
    message: str | None = None,
    link: str | None = None,
    cta_type: str | None = None,
    image_hash: str | None = None,
) -> str:
    """
   Creates a new ad creative by collecting all required information via user prompts.
   Always trigger image upload by responding with [[CREATIVE_UPLOAD_IMAGE]] to first prompt the user to upload an image and the url of the image will be returned, only then proceed to collect the other info and then use this tool.


    Parameters:
    - ad_account_id: Facebook Ad Account ID
    - page_id: Facebook Page ID that owns the ad.
    - name: Name of the creative (e.g., "Summer Sale Ad").
    - message: The text shown above the ad creative.
    - link: URL the ad should link to.
    - cta_type: Call-to-action type (e.g., "SHOP_NOW", "LEARN_MORE").
    - image_hash: first to get using the trigger.


    Returns:
    - id of the created creative or error if occurs.
    """
    print("Used Start Creative creation tool")
    fields = {
        "ad_account_id": ad_account_id,
        "page_id": page_id,
        "name": name,
        "message": message,
        "link": link,
        "cta_type": cta_type,
        "image_hash": image_hash
    }

    missing = [k for k, v in fields.items() if not v]
    if missing:
        return f"Missing required creative fields: {', '.join(missing)}."
    else:
        response = finalize_creative_upload(fields)
        return response



def finalize_creative_upload(creative_info):
    """Create a Facebook ad creative after image upload."""
    url = f"{fb_base_url}{creative_info['ad_account_id']}/adcreatives"

    link_data = {
        "message": creative_info["message"],
        "link": creative_info["link"],
        "image_hash": creative_info["image_hash"],
        "call_to_action": {
            "type": creative_info["cta_type"],
            "value": {
                "link": creative_info["link"]
            }
        }
    }

    payload = {
        "name": creative_info["name"],
        "object_story_spec": {
            "page_id": creative_info["page_id"],
            "link_data": link_data
        },
        "access_token": fb_access_token
    }

    try:
        res = requests.post(url, json=payload)
        res.raise_for_status()
        return res.json().get("id")
    except requests.RequestException as e:
        print("Response Body:", res.text)
        print(f"Error creating creative: {str(e)}")
        return f"Error creating creative: {str(e)}error{res.text}"
