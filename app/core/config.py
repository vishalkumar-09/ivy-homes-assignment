import os
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

class Settings(BaseModel):
    BASE_URL: str = os.getenv("IVY_BASE_URL", "https://solve.ivy.homes").rstrip("/")
    API_KEY: str = os.getenv("IVY_API_KEY", "")
    CITY: str = os.getenv("IVY_CITY", "Bangalore")
    ASSIGNED_LOCALITY: str = os.getenv("IVY_ASSIGNED_LOCALITY", "Yelahanka")
    DEMO_PASSWORD: str = os.getenv("IVY_DEMO_PASSWORD", "5edd65b804")

settings = Settings()
