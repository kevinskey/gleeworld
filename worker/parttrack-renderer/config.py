import os
from dataclasses import dataclass


@dataclass(frozen=True)
class Settings:
    database_url: str
    supabase_url: str          # e.g. https://supabase.gleeworld.org
    service_key: str
    soundfont_path: str        # /opt/gleeworld-parttrack/soundfonts/FluidR3_GM.sf2
    poll_interval_s: float


def load() -> Settings:
    return Settings(
        database_url=os.environ["DATABASE_URL"],
        supabase_url=os.environ["SUPABASE_URL"].rstrip("/"),
        service_key=os.environ["SUPABASE_SERVICE_KEY"],
        soundfont_path=os.environ["SOUNDFONT_PATH"],
        poll_interval_s=float(os.environ.get("POLL_INTERVAL_S", "5")),
    )
