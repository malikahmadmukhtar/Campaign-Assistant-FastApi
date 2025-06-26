from langchain.agents import initialize_agent, AgentType
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.memory import ConversationBufferWindowMemory
from dotenv import load_dotenv
import os
from app.config.settings import TEMPERATURE
from app.tools.tool_list import declared_tool_list

load_dotenv()


def initialize_gemini_agent():
    llm = ChatGoogleGenerativeAI(model="gemini-2.0-flash", google_api_key=os.getenv("GEMINI_API_KEY"),temperature=TEMPERATURE)

    memory = ConversationBufferWindowMemory(
        memory_key="chat_history",
        k=20,
        return_messages=True
    )

    agent_executor = initialize_agent(
        tools=declared_tool_list,
        llm=llm,
        agent=AgentType.STRUCTURED_CHAT_ZERO_SHOT_REACT_DESCRIPTION,
        verbose=True,
        handle_parsing_errors=True,
        memory=memory,
        return_intermediate_steps=False
    )

    return agent_executor