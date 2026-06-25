from pydantic_settings import BaseSettings
from typing import List
import secrets


class Settings(BaseSettings):
    PROJECT_NAME: str = "CogniTrack"
    VERSION: str = "0.1.0"
    API_V1_STR: str = "/api/v1"

    DATABASE_URL: str = "postgresql://cognitrack:cognitrack@localhost:5432/cognitrack"
    
    SECRET_KEY: str = secrets.token_urlsafe(32)
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7

    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
    ]

    BASELINE_MIN_SESSIONS: int = 3
    BASELINE_EWMA_ALPHA: float = 0.1
    ANOMALY_CONTAMINATION: float = 0.1

    RT_VALID_MIN: int = 150
    RT_VALID_MAX: int = 3000

    class Config:
        case_sensitive = True
        env_file = ".env"


settings = Settings()