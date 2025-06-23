from langchain.tools import tool
from langchain_community.tools.tavily_search import TavilySearchResults

from app.config.settings import TAVILY_API_KEY

# Instantiate Tavily tool once (reuse for efficiency)
tavily = TavilySearchResults(k=5, tavily_api_key=TAVILY_API_KEY)  # Adjust `k` to control how many results to fetch

@tool
def tavily_web_search_tool(query: str) -> str:
    """
    Uses Tavily to perform a web search and return summarized results.
    Use this tool for any question that you don't have info about.
    You can get any info from this tool using web like searching weather other than the current weather or a product or a service.
    Use this to get info about Facebook campaigns stuff or error only after first asking the user.
    This tool can also be used to get weather by just performing a simple web search.

    Args:
        query (str): The user's search query.

    Returns:
        str: Search results as a summary.
    """

    print("🔍 Running Tavily web search tool...")
    print(f"📋 Query: {query}")

    if not query.strip():
        print("Empty query")
        return "Error: Search query is required."

    try:
        results = tavily.run(query)
        print("Tavily search completed")
        return results
    except Exception as e:
        print(f"Tavily search failed: {str(e)}")
        return f"Error during Tavily search: {str(e)}"
