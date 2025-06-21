import cloudinary
import cloudinary.uploader
import os
from dotenv import load_dotenv

load_dotenv()

cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_NAME"),
    api_key=os.getenv("CLOUDINARY_KEY"),
    api_secret=os.getenv("CLOUDINARY_SECRET")
)


def upload_file_to_cloudinary(file_content: bytes, resource_type: str = "image", folder: str = "chat_uploads") -> str:
    """
    Uploads a file's content to Cloudinary.

    Args:
        file_content: The bytes content of the file to upload.
        resource_type: The type of resource to upload (e.g., "image", "video", "raw").
        folder: Optional. The folder in Cloudinary to upload to.

    Returns:
        The secure URL of the uploaded file.

    Raises:
        Exception: If the Cloudinary upload fails.
    """
    try:
        result = cloudinary.uploader.upload(
            file_content,
            resource_type=resource_type,
            folder=folder
        )
        return result["secure_url"]
    except Exception as e:
        print(f"Cloudinary Upload Error: {e}")
        raise Exception(f"Failed to upload to Cloudinary: {e}")

