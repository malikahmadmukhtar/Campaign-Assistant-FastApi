from langchain_core.tools import tool
import requests
from app.config.settings import fb_access_token, fb_base_url


@tool
def create_catalog_creative(
    ad_account_id: str,
    catalog_id: str,
    product_set_id: str,
    name: str,
    template_url: str,
) -> str:
    """
    Creates a catalog-based creative for dynamic product ads.

    Parameters:
    - ad_account_id: Facebook Ad Account ID from accounts tool
    - catalog_id: Facebook Catalog ID (from 'get_facebook_catalogs').
    - product_set_id: Product Set ID inside the catalog, the default value can be 'default'.
    - name: Name of the creative (e.g., "Dynamic Ad Creative").
    - template_url: The template URL used for dynamic product ads.

    Returns:
    - The ID of the created ad creative or an error message.
    """
    print("Used Create catalog creative Tool")

    # Validate input
    required_fields = {
        "ad_account_id": ad_account_id,
        "catalog_id": catalog_id,
        "product_set_id": product_set_id,
        "name": name,
        "template_url": template_url,
        "access_token": fb_access_token,
    }

    missing = [k for k, v in required_fields.items() if not v]
    if missing:
        return f"Missing required fields: {', '.join(missing)}."

    # Prepare API call
    url = f"{fb_base_url}{ad_account_id}/adcreatives"
    payload = {
        "name": name,
        "catalog_id": catalog_id,
        "product_set_id": product_set_id,
        "template_url": template_url,
        "access_token": fb_access_token,
    }

    # Make the request
    try:
        response = requests.post(url, data=payload)
        response.raise_for_status()
        creative_id = response.json().get("id")
        return f"Catalog creative created successfully with ID: `{creative_id}`"
    except requests.RequestException as e:
        return f"Failed to create catalog creative: {e}"
