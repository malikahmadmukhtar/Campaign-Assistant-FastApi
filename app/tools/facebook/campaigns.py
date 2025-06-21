import requests
from langchain_core.tools import tool
from app.config.settings import fb_access_token, fb_base_url

@tool
def get_facebook_campaigns(ad_account_id: str) -> str:
    """Fetch campaigns from a Facebook Ad Account using the get_facebook_ad_accounts tool to get the ad account id and asking the user to select the account
    to get the campaigns from.
    """

    print(f"get campaigns tool called with ad_account_id: {ad_account_id}")
    url = f"{fb_base_url}{ad_account_id}/campaigns"
    params = {
        'access_token': fb_access_token,
        'fields': 'id,name,status,objective',
    }
    try:
        response = requests.get(url, params=params)
        response.raise_for_status()
        data = response.json().get('data', [])

        if not data:
            return "No campaigns found for this ad account."
        return data

    except requests.exceptions.RequestException as e:
        return f"Error fetching campaigns: {str(e)}"



@tool
def create_fb_campaign(ad_account_id: str, campaign_name: str, objective: str) -> str:
    """Create a Facebook campaign given ad account ID, campaign name, and objective.
    First ask for ad account id then ask for objective and then ask for campaign name before calling the tool.
    The objective is to be given in the exact format from this list by asking user to choose from objective_options = [
        'OUTCOME_AWARENESS', 'OUTCOME_TRAFFIC', 'OUTCOME_ENGAGEMENT',
        'OUTCOME_LEADS', 'OUTCOME_APP_PROMOTION', 'OUTCOME_SALES',
        'OUTCOME_LOCAL_AWARENESS', 'OUTCOME_VIDEO_VIEWS'
    ]
    Carefully check the tools if they can provide any required info and then ask the user for any of the required info or confirmations.
    """
    print(f"create campaigns tool called with ad_account_id: {ad_account_id}, campaign_name: {campaign_name}, objective: {objective}")
    url = f'{fb_base_url}{ad_account_id}/campaigns'
    campaign_data = {
        'name': campaign_name,
        'objective': objective,
        'status': 'PAUSED',
        'special_ad_categories': '[]',
        'access_token': fb_access_token
    }

    try:
        response = requests.post(url, data=campaign_data)
        response.raise_for_status()
        return f"Campaign created with ID: {response.json().get('id')}"
    except requests.exceptions.RequestException as e:
        return f"Error creating campaign: {str(e)}"


@tool
def delete_facebook_campaign(campaign_id: str) -> str:
    """
    Deletes a Facebook ad campaign.
    Always ask for confirmation before deletion.

    Parameters:
    - campaign_id (str): The ID of the Facebook campaign to delete.

    Returns:
    - Success or error message as a string.
    """
    try:
        url = f"{fb_base_url}{campaign_id}"
        response = requests.delete(url, params={"access_token": fb_access_token})
        response.raise_for_status()
        result = response.json()

        if result.get("success"):
            return f"✅ Campaign with ID `{campaign_id}` deleted successfully."
        else:
            return f"❌ Failed to delete campaign `{campaign_id}`. Response: {result}"

    except requests.RequestException as e:
        return f"❌ Error deleting campaign: {str(e)}"
