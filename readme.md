# AI Marketing Assistant Chat Interface

This project provides a chat-based interface for an AI Marketing Assistant, designed to help users create and manage Facebook advertising campaigns, ad sets, and products through natural language prompts. The system leverages **LangChain with tool calling** for intelligent response generation, a **SQLite backend** for data storage (authentication and chat history), and a **FastAPI backend with Uvicorn** to serve the application and handle API requests. The front-end is a dynamic web interface offering **voice input and output capabilities**.

---

## Features

* **Interactive Chat Interface:** Engage with the AI assistant through a user-friendly chat window.
* **Facebook Campaign Management:** Create and manage Facebook campaigns, ad sets, and products using conversational prompts.
* **Tool Calling with LangChain:** The AI uses LangChain's tool-calling capabilities to interact with external systems (e.g., Facebook Ads API) to fulfill user requests.
* **SQLite Database:** Securely stores user authentication details and chat session history.
* **FastAPI Backend:** A robust and high-performance backend built with FastAPI and Uvicorn, handling API requests and serving the web application.
* **Voice Input (Speech Recognition):** Speak your commands and queries to the AI assistant.
* **Voice Output (Speech Synthesis):** Receive spoken responses from the AI assistant.
* **Chat Session Management:** Create new chat sessions, load previous sessions, and delete old ones from a sidebar.
* **User Authentication:** Secure login and registration system.
* **Image Upload Functionality:**
    * **Product Image Upload:** Upload product images directly from the chat interface, which are then referenced in the chat input.
    * **Facebook Creative Image Upload:** Upload images specifically for Facebook ad creatives, returning an image hash for use in campaigns.
* **Markdown Support:** Chat messages are rendered with GitHub Flavored Markdown for clear and structured communication.

---

## Technologies Used

* **Frontend:** HTML, CSS, JavaScript (Vanilla JS, DOMPurify, Marked.js)
* **Backend:** Python 3
    * **Framework:** FastAPI
    * **ASGI Server:** Uvicorn
    * **AI/NLP:** LangChain (with tool calling)
    * **Database:** SQLite3
* **Speech:** Web Speech API (SpeechRecognition and SpeechSynthesis)

---

## Getting Started

### Prerequisites

* Python 3.8+

### Installation

1.  **Clone the repository:**

    ```bash
    git clone <repository_url>
    cd <repository_name>
    ```

2.  **Backend Setup:**

    Create a virtual environment and install dependencies:

    ```bash
    python -m venv venv
    source venv/bin/activate  # On Windows: venv\Scripts\activate
    pip install -r requirements.txt
    ```

    Ensure your `requirements.txt` includes: `fastapi`, `uvicorn`, `langchain`, `sqlalchemy`, `python-jose[cryptography]`, `passlib[bcrypt]`, `Pillow`, `python-dotenv`, `requests`, etc.


3 **Environment Variables:**

    Create a `.env` file in the root directory of your project and add the following, replacing placeholders with your actual values:

    ```dotenv
    FACEBOOK_APP_ID=your_facebook_app_id
    FACEBOOK_APP_SECRET=your_facebook_app_secret
    FACEBOOK_ACCESS_TOKEN=your_facebook_access_token
    SECRET_KEY=your_super_secret_key_for_jwt
    ALGORITHM=HS256
    ACCESS_TOKEN_EXPIRE_MINUTES=30
    ```

4 **Run the Backend Server:**

    ```bash
    uvicorn main:app --reload
    ```
    (This command assumes your main FastAPI application object is named `app` and is located in `main.py`).

5 **Access the Application:**

    Open your web browser and navigate to `http://127.0.0.1:8000` (or the address where Uvicorn is running).

---

## Usage

1.  **Register/Login:** If you're a new user, register for an account. Otherwise, log in with your credentials.
2.  **Start a New Chat:** Click the **"New Chat"** button to begin a fresh conversation.
3.  **Interact with the AI:** Type your commands and questions into the message input field. For example:
    * "Create a new Facebook campaign for my e-commerce store selling shoes."
    * "Set up an ad set targeting people interested in running, ages 25-45, in New York."
    * "Upload a product image for my new running shoes."
    * "Upload a creative image for my Facebook ad."
4.  **Voice Input:** Click the microphone icon to speak your message.
5.  **Voice Output:** Toggle the **"Speech"** switch to enable or disable the AI's spoken responses. You can also click the speaker icon next to agent messages to hear them individually.
6.  **Manage Sessions:** Use the sidebar to switch between existing chat sessions or delete them.

---

