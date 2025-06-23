import requests
from urllib.parse import quote
from langchain.tools import tool


@tool
def generate_image_tool(prompt: str) -> str:
    """
    Generates an image using Pollinations AI and returns the image as markdown.
    Show the image with proper Markdown formatting.
    Generated images can be used for generating image for use with products as urls.

    Args:
        prompt (str): Text description of the image to generate.


    Returns:
        str: Url of the generated image.
    """
    print("Used generate image tool")
    try:
        print(f"Generating image for prompt: {prompt}")
        encoded_prompt = quote(prompt)
        image_url = f"https://pollinations.ai/p/{encoded_prompt}?width={1024}&height={1024}&seed={40}&model=flux"
        print(f"Constructed image URL: {image_url}")
        return image_url
        # Check if image exists
        # res = requests.get(image_url)
        # if res.status_code != 200:
        #     print(f"Failed to fetch image. Status: {res.status_code}")
        #     return f"Error: Failed to generate image (HTTP {res.status_code})"
        #
        # print(f"Image generated successfully.")
        # return image_url
        # return f"![Generated Image]({image_url})"

    except Exception as e:
        print(f"Exception during image generation: {e}")
        return f"Error: {e}"
