# backend/app/core/config.py
from pathlib import Path
from typing import Annotated

from pydantic import field_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict

# Raiz del proyecto (3 niveles arriba de app/core)
BASE_DIR = Path(__file__).resolve().parent.parent.parent.parent


class Settings(BaseSettings):
    POSTGRES_DB: str
    POSTGRES_USER: str
    POSTGRES_PASSWORD: str
    DATABASE_URL: str
    JWT_SECRET: str
    CORS_ORIGINS: Annotated[list[str], NoDecode] = ["http://localhost:5173"]

    model_config = SettingsConfigDict(env_file=BASE_DIR / ".env", extra="ignore")

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def split_cors(cls, v):
        if isinstance(v, str):
            return [o.strip() for o in v.split(",") if o.strip()]
        return v

    @property
    def effective_database_url(self) -> str:
        # Dentro de Docker el host "db" resuelve. En host Windows no,
        # asi que se usa localhost:5433 sin tocar el .env.
        from urllib.parse import urlparse, urlunparse

        parsed = urlparse(self.DATABASE_URL)
        if parsed.hostname != "db":
            return self.DATABASE_URL
        try:
            import socket

            socket.getaddrinfo("db", parsed.port or 5432)
            return self.DATABASE_URL
        except OSError:
            local_port = 5433 if (parsed.port or 5432) == 5432 else parsed.port
            host = f"localhost:{local_port}"
            netloc = host
            if parsed.username:
                userinfo = parsed.username
                if parsed.password:
                    userinfo += f":{parsed.password}"
                netloc = f"{userinfo}@{host}"
            return urlunparse(parsed._replace(netloc=netloc))


# Instancia global
settings = Settings()