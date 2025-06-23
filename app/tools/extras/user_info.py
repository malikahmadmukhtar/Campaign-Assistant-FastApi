import os
import json
from langchain_core.tools import tool

USER_DATA_FILE = f"userdata/userdata.json"


def load_user_data():
    """Load user data from a JSON file if it exists."""
    if os.path.exists(USER_DATA_FILE):
        with open(USER_DATA_FILE, "r") as f:
            return json.load(f)
    return {}


def save_user_data(data):
    """Save user data to a JSON file."""
    os.makedirs(f"userdata/userinfo", exist_ok=True)  # ✅ Make sure directory exists
    with open(USER_DATA_FILE, "w") as f:
        json.dump(data, f, indent=2)


@tool
def get_user_info(
        name: str = None,
        age: str = None,
        mail: str = None,
        address: str = None,
        city: str = None,
        phone: str = None,
        action: str = "get"
) -> str:
    """
    Manage the user's personal profile stored in your memory for user's personal details.
    Use this tool to get user's personal details when asked or required by the conversational context.
    You may ask the user informally about their name or other data and store it.
    Usage Examples:
        - If user asks about his personal name or age.
        - Asks hia email.

    Ask for data if not present to save it.

    This tool allows retrieving or updating personal information such as:
    - Name
    - Age
    - Email (mail)
    - Address
    - City
    - Phone number

    Parameters:
    ----------
    name : str, optional
        The user's full name (only needed when updating).
    age : str, optional
        The user's age (only needed when updating).
    mail : str, optional
        The user's email address (only needed when updating).
    address : str, optional
        The user's street address (only needed when updating).
    city : str, optional
        The user's city (only needed when updating).
    phone : str, optional
        The user's phone number (only needed when updating).
    action : str
        The operation to perform: "get" to retrieve stored data, or "update" to modify existing data.

    Returns:
    -------
    str
        A message confirming the current user details (for "get") or listing the updated fields (for "update").
        If no details are stored or updated, it returns an appropriate message.

    Usage Examples:
    ---------------
    - To retrieve all saved user info:
        manage_user_profile(action="get")

    - To update just the email and city:
        manage_user_profile(mail="new@mail.com", city="New York", action="update")
    """
    print('used user info tool')
    try:
        user_data = load_user_data()

        if action == "get":
            if not user_data:
                return "No personal information is stored yet."
            return "Here is your stored information:\n" + "\n".join(
                [f"{k.capitalize()}: {v}" for k, v in user_data.items()])

        elif action == "update":
            updates = {
                "name": name,
                "age": age,
                "mail": mail,
                "address": address,
                "city": city,
                "phone": phone
            }

            updated_fields = []
            for key, value in updates.items():
                if value is not None:
                    user_data[key] = value
                    updated_fields.append(key)

            save_user_data(user_data)

            if updated_fields:
                return f"Updated your info: {', '.join(updated_fields)}."
            else:
                return "No updates were made because no new information was provided."

        else:
            return "Invalid action. Use 'get' or 'update'."
    except Exception as e:
        print("Error in data", e)
        return f"Error occurred {e}"