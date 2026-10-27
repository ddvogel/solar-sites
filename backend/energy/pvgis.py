import requests
from fastapi import HTTPException
from functools import lru_cache

# PVGIS 5.3 API endpoint for series data
PVGIS_URL = "https://re.jrc.ec.europa.eu/api/v5_3/seriescalc"

@lru_cache(maxsize=100)
def fetch_pvgis_hourly_data(lat: float, lon: float, peak_kwp: float) -> list[dict]:
    params = {
        "lat": lat,
        "lon": lon,
        "pvcalculation": 1,
        "peakpower": peak_kwp,
        "loss": 14,
        "optimalangles": 1,
        "startyear": 2023,
        "endyear": 2023,
        "outputformat": "json"
    }

    try:
        response = requests.get(PVGIS_URL, params=params, timeout=25)
        
        if response.status_code == 400:
            # PVGIS returns 400 with a JSON message when coordinates are outside dataset coverage
            try:
                err_msg = response.json().get("message", "Location not supported by PVGIS.")
            except Exception:
                err_msg = "PVGIS has no data for this location."
            raise HTTPException(status_code=400, detail=f"PVGIS location error: {err_msg}")

        # PVGIS returns 529 if the site is temporarily overloaded with computations
        if response.status_code == 529:
            raise HTTPException(status_code=503, detail="PVGIS server is overloaded. Please retry later.")
            
        response.raise_for_status()
        data = response.json()
        
        hourly_data = []
        for entry in data.get("outputs", {}).get("hourly", []):
            month = int(entry["time"][4:6])
            # entry["P"] is power in Watts, convert to kWh
            kwh = entry["P"] / 1000.0
            hourly_data.append({"month": month, "generation_kwh": kwh})
            
        if not hourly_data:
            raise HTTPException(status_code=400, detail="PVGIS returned no hourly data for this location.")

        return hourly_data

    except HTTPException:
        raise
    except requests.RequestException as e:
        raise HTTPException(status_code=502, detail=f"Failed to communicate with PVGIS API: {str(e)}")