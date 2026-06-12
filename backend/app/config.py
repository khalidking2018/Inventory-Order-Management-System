import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class Settings:
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", 
        "postgresql://postgres:postgres@localhost:5432/inventory"
    )
    PROJECT_NAME: str = "Inventory & Order Management System"

settings = Settings()
