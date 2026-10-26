def calculate_production_summary(pvgis_data: list[dict]) -> dict:
    yearly_kwh = 0.0
    monthly_map = {m: 0.0 for m in range(1, 13)}

    for entry in pvgis_data:
        kwh = entry["generation_kwh"]
        month = entry["month"]
        yearly_kwh += kwh
        monthly_map[month] += kwh

    monthly_list = [
        {"month": m, "kwh": round(monthly_map[m], 1)} 
        for m in range(1, 13)
    ]

    return {
        "yearlyKwh": round(yearly_kwh, 1),
        "monthlyKwh": monthly_list
    }


def simulate_battery(pvgis_data: list[dict], hourly_consumption: list[float], capacity_kwh: float, annual_use_kwh: float) -> dict:
    total_hours = min(len(pvgis_data), len(hourly_consumption))
    
    total_production = 0.0
    total_consumption = 0.0
    
    # Baseline: Without Battery
    self_used_no_batt = 0.0
    exported_no_batt = 0.0
    
    # With Battery
    soc = 0.0
    self_used_with_batt = 0.0
    exported_with_batt = 0.0

    for i in range(total_hours):
        gen = pvgis_data[i]["generation_kwh"]
        cons = hourly_consumption[i]
        
        total_production += gen
        total_consumption += cons
        
        # Without battery
        if gen >= cons:
            self_used_no_batt += cons
            exported_no_batt += (gen - cons)
        else:
            self_used_no_batt += gen
            
        # With battery
        net = gen - cons
        if net > 0:
            # Solar covers house; excess goes to battery
            self_used_with_batt += cons
            charge_room = capacity_kwh - soc
            charge = min(net, charge_room)
            soc += charge
            exported_with_batt += (net - charge)
        else:
            # Solar falls short; discharge battery to cover deficit
            self_used_with_batt += gen
            deficit = cons - gen
            discharge = min(deficit, soc)
            soc -= discharge
            self_used_with_batt += discharge

    pct_no_batt = round((self_used_no_batt / total_production * 100), 1) if total_production > 0 else 0.0
    pct_with_batt = round((self_used_with_batt / total_production * 100), 1) if total_production > 0 else 0.0

    return {
        "productionKwh": round(total_production, 1),
        "consumptionKwh": round(total_consumption, 1),
        "withoutBattery": {
            "selfUsedKwh": round(self_used_no_batt, 1),
            "exportedKwh": round(exported_no_batt, 1),
            "selfConsumptionPercentage": pct_no_batt
        },
        "withBattery": {
            "selfUsedKwh": round(self_used_with_batt, 1),
            "exportedKwh": round(exported_with_batt, 1),
            "selfConsumptionPercentage": pct_with_batt,
            "batteryAddedKwh": round(self_used_with_batt - self_used_no_batt, 1)
        }
    }