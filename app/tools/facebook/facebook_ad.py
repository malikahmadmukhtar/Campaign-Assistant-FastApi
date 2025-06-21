import json
from app.config.settings import fb_base_url, fb_access_token
from langchain.tools import tool
import requests

@tool
def get_facebook_ads(ad_account_id: str, ad_set_id: str = None, campaign_id: str = None) -> str:
    """
    Fetches a list of ads under the specified Facebook ad account. You can optionally filter by ad set or campaign.

    Parameters:
    - ad_account_id (str): The Facebook Ad Account ID (e.g., "1234567890").
    - ad_set_id (str, optional): Filter ads by specific ad set.
    - campaign_id (str, optional): Filter ads by specific campaign.

    Returns:
    - A formatted list of ads with ID, name, status, and creative_id.
    """
    print("Used Facebook ads Tool")

    try:
        base_url = f"{fb_base_url}{ad_account_id}/ads"
        params = {
            "fields": "id,name,status,adset_id,campaign_id,creative",
            "access_token": fb_access_token
        }

        # Apply filters if provided
        if ad_set_id:
            params["adset_id"] = ad_set_id
        if campaign_id:
            params["campaign_id"] = campaign_id

        response = requests.get(base_url, params=params)
        response.raise_for_status()
        ads = response.json().get("data", [])

        if not ads:
            return "No ads found for the given ad account."

        result_lines = []
        for ad in ads:
            creative_id = ad.get("creative", {}).get("id", "N/A")
            result_lines.append(
                f"- **Ad ID**: `{ad['id']}` | **Name**: {ad['name']} | **Status**: {ad['status']} | **Creative ID**: `{creative_id}`"
            )

        return "\n".join(result_lines)

    except requests.RequestException as e:
        return f"Failed to fetch ads: {str(e)}"



@tool
def create_facebook_ad(
    ad_account_id: str,
    ad_set_id: str,
    creative_id: str,
    is_catalog_ad: bool = False,
    name: str = "Facebook Ad",
    status: str = "PAUSED",
    template_url: str = "https://www.example.com"
) -> str:
    """
    Creates a Facebook ad in the specified ad account.

    Parameters:
    - ad_account_id: Facebook Ad Account ID
    - ad_set_id: ID of the ad set this ad will belong to.
    - creative_id: ID of the ad creative to attach (fetch the creative id using fetch_existing_creatives tool).
    - access_token: Facebook access token.
    - is_catalog_ad: Set to True for catalog (DPA) ads.
    - name: Optional name of the ad (ask the user to choose a name).
    - status: Ad status (e.g., "PAUSED", "ACTIVE").
    - template_url: Used only for catalog ads (ask the user to choose if an ad is a catalog ad).

    Returns:
    - The created ad ID or an error message.
    """
    print("Used Create Facebook ad Tool")

    try:
        # Check for existing payment methods
        payment_methods_url = f"{fb_base_url}{ad_account_id}/paymentmethods"
        payment_check = requests.get(payment_methods_url, params={"access_token": fb_access_token})
        has_payment_method = (
            payment_check.status_code == 200 and payment_check.json().get("data")
        )

        # If no payment method, attempt manual setup
        if not has_payment_method:
            account_url = f"{fb_base_url}{ad_account_id}?fields=currency"
            account_info = requests.get(account_url, params={"access_token": fb_access_token})
            account_info.raise_for_status()
            currency = account_info.json().get("currency", "USD")

            setup_data = {
                "type": "MANUAL",
                "currency": currency,
                "billing_limit": "10000",
                "access_token": fb_access_token,
            }
            setup_url = f"{fb_base_url}{ad_account_id}/paymentmethods"
            setup_response = requests.post(setup_url, data=setup_data)

            if setup_response.status_code != 200:
                return f"Failed to create manual payment method: {setup_response.text}"

        # Construct ad creation payload
        creative_payload = (
            {"creative_id": creative_id, "template_url": template_url}
            if is_catalog_ad else
            {"creative_id": creative_id}
        )

        ad_payload = {
            "name": name,
            "adset_id": ad_set_id,
            "creative": json.dumps(creative_payload),
            "status": status,
            "access_token": fb_access_token
        }

        # Make the ad creation call
        ad_url = f"{fb_base_url}{ad_account_id}/ads"
        ad_response = requests.post(ad_url, data=ad_payload)
        ad_response.raise_for_status()

        ad_id = ad_response.json().get("id")
        return f"Ad created successfully with ID: `{ad_id}`"

    except requests.RequestException as e:
        return f"Failed to create ad: {str(e)}"


@tool
def delete_facebook_ad(ad_id: str) -> str:
    """
    Deletes a Facebook Ad.

    Parameters:
    - ad_id (str): The ID of the Ad to delete.

    Returns:
    - Success or error message as a string.
    """
    try:
        url = f"{fb_base_url}{ad_id}"
        response = requests.delete(url, params={"access_token": fb_access_token})
        response.raise_for_status()
        result = response.json()

        if result.get("success"):
            return f"Ad `{ad_id}` deleted successfully."
        else:
            return f"Failed to delete Ad `{ad_id}`. Response: {result}"
    except requests.RequestException as e:
        return f"Error deleting Ad: {str(e)}"
