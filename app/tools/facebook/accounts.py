from langchain_core.tools import tool
from app.config.settings import fb_access_token, fb_base_url
import requests

# --- TOOL DEFINITION ---
@tool
def get_facebook_business_accounts() -> str:
    """
    Fetches Facebook Business Accounts connected to the user, and you should show them as a list in the output.

    You are a helpful, friendly facebook campaign assistant named 'junie'. Your job is to help users with their accounts, catalogs, products, campaigns and ad creatives.

    Guidelines:
    - Your name is Junie.
    - NEVER EVER assume that you have to do something when a user has not explicitly stated it, always ask the user.
    - NEVER EVER use a tool without its parameter as it will cause the whole system to crash, ALWAYS collect the parameters and use then while calling tools.
    - Show any info from by the tools in a clean list format.
    - Format any output from the tools and show the output in a proper Markdown format.
    - If the user just greets you or asks general questions, respond conversationally and use emojis if needed. Only use tools if needed to fetch or calculate specific info.
    - If any tool needs more input, check the tools if they have can give the data else ask the user.
    - Check if a tools requires parameters that can be provided by the other tools and call those tools first and if there is a single choice then continue with that data.
    - If there are multiple choices then always ask the user for selection and only then proceed.
    - When calling multiple tools by yourself, you should show the steps you have taken to get there.
    - There are multiple tools which depend on the output from other tools, if such tools are used then execute them in order and ask for user confirmation by showing them data and allowing them to choose the input for the next tool.
    - Show multiple items like (ad accounts, business accounts, catalogs, campaigns or products) in the form of a list with their details below them in the form of a subheading and the items with a serial number.
    - Before creating an item like a campaign, adset, product or catalog, you should first show all the data gathered from the tools or from the user and ask the user to check and confirm before using the tool to create such item.
    - You can give recommendations to the users based on the tool output and the user input if something could be changed or is not correct.
    - If you require the id of some entity to perform a task then you should use the corresponding tool to fetch and show users for them to select the id.
    - You can answer any questions about facebook ads, campaigns, ad-sets, pages and how to optimize them from your data but don't deviate too much from these instructions.
    """
    print(f"Tool Called: get_facebook_business_accounts")

    url = f"{fb_base_url}me/businesses"

    try:
        response = requests.get(url, params={"access_token": fb_access_token})
        response.raise_for_status()
        data = response.json()

        businesses = data.get("data", [])
        if not businesses:
            return "No business accounts found for this user."
        return businesses

    except requests.exceptions.HTTPError as http_err:
        return f"Facebook API error: {http_err.response.json().get('error', {}).get('message', str(http_err))}"

    except requests.exceptions.RequestException as e:
        return f"Network error while contacting Facebook: {str(e)}"

    except Exception as e:
        return f"Unexpected error: {str(e)}"



@tool
def get_facebook_ad_accounts() -> str:
    """
    Fetches Facebook Ad Accounts connected to the user and, and you should show them as a list in the output.
    Ad Account id should be used intact without omitting anything like (act_) before the numbers.
    """
    print(f"Tool Called: get_facebook_ad_accounts")

    url = f"{fb_base_url}me/adaccounts"

    try:
        response = requests.get(url, params={"access_token": fb_access_token})
        response.raise_for_status()
        data = response.json()

        ad_accounts = data.get("data", [])
        if not ad_accounts:
            return "No ad accounts found for this user."

        print(ad_accounts)

        return "".join(
            [f"- {acc.get('name', 'Unnamed')} (ID: {acc['id']})" for acc in ad_accounts]
        )
        # return ad_accounts

    except requests.exceptions.HTTPError as http_err:
        return f"Facebook API error: {http_err.response.json().get('error', {}).get('message', str(http_err))}"

    except requests.exceptions.RequestException as e:
        return f"Network error while contacting Facebook: {str(e)}"

    except Exception as e:
        return f"Unexpected error: {str(e)}"
