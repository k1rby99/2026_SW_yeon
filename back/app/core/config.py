from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="YEON_", env_file=".env", extra="ignore")

    secret_key: str = "dev-secret-change-me"
    database_url: str = "sqlite:///./yeon.db"
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"

    access_token_ttl_minutes: int = 60
    refresh_token_ttl_days: int = 14

    # mock = 규칙 기반 목업, agent = Anthropic API 기반 분석 에이전트
    analysis_engine: str = "mock"
    seed_demo_data: bool = True

    # --- 분석 에이전트 (YEON_ANALYSIS_ENGINE=agent 일 때만 사용) ---
    anthropic_api_key: str = ""
    anthropic_model: str = "claude-opus-4-8"
    # 에이전트 호출이 실패하면 규칙 기반 목업으로 떨어진다. 데모 중 화면이 죽지 않게 한다.
    analysis_fallback: bool = True
    # 선별 단계에 넘길 후보 상한. 넓게 추리되 토큰이 폭주하지 않게 막는다.
    analysis_shortlist_size: int = 12

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


settings = Settings()
