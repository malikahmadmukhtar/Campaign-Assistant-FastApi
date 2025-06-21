import json
import requests
from langchain_core.tools import tool
from app.config.settings import fb_base_url, fb_access_token
import uuid

@tool
def fetch_products_from_catalog(catalog_id: str) -> str:
    """Fetches all products from a Facebook catalog by catalog ID not the name which can get using the get_facebook_catalogs tool while following its structure.
    Show the list of catalogs and let the user choose the catalog then fetch based on user choice.
    Products will be shown to user with their name, description, price and image URL.
    """

    print(f"Tool Called: fetch_products_from_catalog")
    base_url = f"{fb_base_url}{catalog_id}/products"
    products = []
    params = {
        'access_token': fb_access_token,
        'fields': 'id,name,description,price,image_url,url,availability',
        'limit': 100
    }

    try:
        while True:
            response = requests.get(base_url, params=params)
            print(response.json())
            data = response.json()

            if 'error' in data:
                error = data['error']
                return f"Facebook API Error: {error['message']}"

            # print("raw output:",data.get('data', []))
            products.extend(data.get('data', []))

            next_page = data.get('paging', {}).get('next')
            if not next_page:
                break

            # For next page, use full URL (Graph API includes access_token in it)
            base_url = next_page

        if not products:
            return "No products found in this catalog."

        print(f"\nproducts tool output {json.dumps(products)}")
        return str(products)
        # return f"Fetched {len(products)} products from catalog {catalog_id} which are {products}."

    except Exception as e:
        return f"An error occurred: {str(e)}"



@tool
def delete_catalog_product(product_id: str) -> str:
    """
    Deletes a product from a Facebook catalog by its product ID.
    First show the products with their ids and then ask user to choose which product to delete.
    """
    print("Used Delete Product Tool")

    url = f'{fb_base_url}{product_id}'
    params = {
        'access_token': fb_access_token
    }

    try:
        response = requests.delete(url, params=params)
        response.raise_for_status()
        success = response.json().get('success', False)
        if success:
            return f"Product {product_id} deleted successfully."
        else:
            return f"Product deletion request was received but not confirmed."
    except requests.exceptions.RequestException as e:
        return f"Error deleting product: {str(e)}"

## TODO: Modify dependency on streamlit

@tool
def start_catalog_product_creation(
    catalog_id: str,
    ad_account_id: str | None = None,
    name: str | None = None,
    description: str | None = None,
    price: float | None = None,
    url: str | None = None,
    availability: str | None = None,
    image_url: str | None = None,
) -> str:
    """
    Creates a new product in the selected Facebook catalog and collects all required information via user prompts.
    Always trigger image upload by responding with [[AD_UPLOAD_IMAGE]] to first prompt the user to upload an image and the url of the image will be returned, only then proceed to collect the other info and then use this tool.

    DO NOT hardcode any data or assume values. Instead:
    - Ask the user for all the data like (name, description, price and availability) before using this tool.
    - Use the 'get_facebook_catalogs' tool to get the catalog ID (ask the user to select from the results).
    - Use the 'get_facebook_ad_accounts' tool to fetch the currency (based on ad_account_id).

    Parameters:
    - catalog_id: ID of the Facebook catalog (fetched using 'get_facebook_catalogs'; do not use the name).
    - ad_account_id: The ad account ID (not business ID) used to retrieve currency info.
    - name: Name of the product (ask the user).
    - description: Description of the product (ask the user).
    - price: Product price (as a float, in the currency of the ad account; ask the user).
    - url: Product page URL (ask the user).
    - availability: Product availability status. Must be one of:
      ["in stock", "out of stock", "available for order", "discontinued"].
    - image_url: Image URL. (asked using the trigger first)

    Returns:
    - id of the created product or error if occurs
    """

    required_fields = {
        "catalog_id": catalog_id,
        "ad_account_id": ad_account_id,
        "name": name,
        "description": description,
        "price": price,
        "url": url,
        "availability": availability,
        "image_url": image_url
    }

    # Check for any missing or invalid fields
    missing = [field for field, value in required_fields.items() if not value]
    if missing:
        return f"Missing required product fields: {', '.join(missing)}. Please provide all required data."
    else:
        response = finalize_product_upload(product_info=required_fields)
        return response


## helper function to upload product
def finalize_product_upload(product_info):
    """Send the final product creation request to Facebook"""
    try:
        price_minor = int(float(str(product_info['price']).replace(',', '').replace('PKR', '').strip()) * 100)
    except ValueError:
        return "Invalid price format."

    try:
        account_url = f"{fb_base_url}{product_info['ad_account_id']}?fields=currency"
        res = requests.get(account_url, params={'access_token': fb_access_token})
        res.raise_for_status()
        currency = res.json().get("currency", "USD")
    except requests.RequestException as e:
        return f"Error getting currency: {str(e)}"

    payload = {
        "name": product_info["name"],
        "description": product_info["description"],
        "price": price_minor,
        "currency": currency,
        "url": product_info["url"],
        "image_url": product_info["image_url"],
        "availability": product_info["availability"],
        "retailer_id": str(uuid.uuid4()),
        "access_token": fb_access_token
    }

    try:
        post_url = f"{fb_base_url}{product_info['catalog_id']}/products"
        res = requests.post(post_url, data=payload)
        res.raise_for_status()
        return res.json().get("id")
    except requests.RequestException as e:
        return f"Error creating product: {str(e)}"