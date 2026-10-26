import json
from pathlib import Path

# load the normalized profile into memory once on application startup
PROFILE_PATH = Path(__file__).resolve().parent / "e1a_hourly.json"

try:
    with open(PROFILE_PATH, "r", encoding="utf-8") as f:
        E1A_WEIGHTS = json.load(f)
except FileNotFoundError:
    E1A_WEIGHTS = []
    print("Warning: e1a_hourly.json not found in the energy module directory.")

def get_hourly_consumption(annual_use_kwh: float) -> list[float]:
    """
    Distributes an annual kWh total across 8760 hours using the E1A profile.
    """
    if not E1A_WEIGHTS:
        raise RuntimeError("Load profile data is missing.")
        
    return [annual_use_kwh * weight for weight in E1A_WEIGHTS]