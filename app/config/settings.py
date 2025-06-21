import os
from dotenv import load_dotenv

load_dotenv()


## model temperature
TEMPERATURE = 0.5

## facebook setup
fb_access_token = os.getenv("FB_ACCESS_TOKEN")
fb_base_url = os.getenv("FB_BASE_URL")


SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 120