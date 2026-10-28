# Solar Sites
A full-stack web application for solar advisors to estimate solar energy production and battery storage benefits for client sites.

## Running the Application
Run the application using Docker. Both the frontend and backend will be served from a container on port 8000.

1. Build the Docker image:
    ```
    docker build -t solar .
    ```

2. Run the container:
    ```
    docker run -p 8000:8000 solar
    ```
3. Open your browser and navigate to: *http://localhost:8000*

## Technology Stack & Architecture

The application uses a full-stack, single-container architecture. Wow! That's awesome!

### Architecture Overview
The application uses a single-container deployment.

- **Build Pipeline:** A multi-stage Docker build, which uses *Bun* to compile the React/TypeScript frontend into static production assets.
- **Serving:** FastAPI serves both the JSON API (`/api/*`) and the static React assets from port `8000`.

### Backend Stack

#### 1. Framework
- FastAPI combined with Uvicorn. Low latency, high throughput ad it works good!
- Pydantic automates schema validation and error responses (especially useful for fulfilling the API contract's validation rules)
- Using Pydantic’s `alias_generator = to_camel`, Python code uses idiomatic `snake_case` internally while seamlessly exchanging camelCase payloads matching the API contract.

#### 2. Database
- SQLite is used as the database. It's lightweight and requires no seperate database management, making it perfect for this asignment.
- SQLAlchemy provides queries to guard against SQL injection, defines model relationships (such as linking client sites to specific advisors), and simplifies database transactions.

#### 3. Security: `bcrypt` & `python-jose`
- **Password Hashing:** `bcrypt` hashing ensures advisor passwords are never stored in plain text.
- **Stateless Authentication:** `python-jose` issues and decodes tokens containing expiry metadata, keeping user sessions authenticated.

#### 4. Energy operations with `requests`
- Communicates directly with the European Commission's PVGIS 5.3 API to retrieve solar irradiation calculations.
- Using `@lru_cache` to cache PVGIS network responses by coordinates and system size, we eliminate the need to call the PVGIS API every time the same site is opened.


### Frontend Stack

#### React & TypeScript
- As required by the asignment, we use React with Typescript. There is not much more to say about it. It just works, and it works great.

#### Build & Tooling
- Vite delivers fast compilation speeds
- Bun is used in the initial Docker stage for fast package installation.

#### Styling
- We use Tailwind CSS in the frontend for styling. It has everything required in this project, so there is no need to make custom components or install seperate styling libraries.

## Energy Modeling & Assumptions
This project requires a few assumptions to be made to make everything work correctly. To try and achieve realistic data, we made use of industry standards and valid sources for our assumptions.

### Household Consumption Model
Solar generation peaks around midday, whereas typical residential demand peaks during mornings and evenings. Assuming flat consumption inflates direct self-consumption and understates a battery's real value.

To model real-world behavior accurately, this project incorporates the Dutch *E1A Standard Load Profile*, published by Het Normo: [Energiedatawijzer: Profielen Elektriciteit 2026](https://energiedatawijzer.nl/documenten/profielen-elektriciteit-2026/).

* The published CSV file features a standard profile for every fifteen minutes for an entire year. This was aggregated into 8760 hourly fractions and normalized into `e1a_hourly.json`, where the sum of all hourly weights equals 1.0 (100%), which can be found in the project files.
* For any annual consumption input, the load at an hour is calculated as the total annual consumption multiplied by the weight set by `e1a_hourly.json`.
* This captures seasonal shifts and daily patterns. The method should accurately reflect the mismatch between peak generation and peak load, resulting in realistic annual battery cycling numbers.

### PVGIS Solar Yield Parameters & System Losses

Hourly solar yields are retrieved directly from the *PVGIS 5.3 API* using coordinates and peak system power. There are however a few parameters we need to set ourselves.

* **Loss Parameter (`loss=14`):** Fixed at 14%. This baseline is the standard used by the European Commission models to account for real-world inefficiencies.
* **Optimal Angles (`optimalangles=1`):** Fixed to query PVGIS for the optimal mounting tilt for the given coordinates.
* **Representative Meteorological Year:** Set to historical reference year `2023`, matching PVGIS's latest validated full-year solar radiation series.

### Battery Storage Simulation Mechanics

The simulator loops through all 8,760 hours of the year, comparing solar production against household demand hour by hour. The system works as follows:

1. The home uses the solar energy first. Any leftover energy charges the battery until it is full. If there is still extra power after that, it gets exported to the grid.
2. When consumption exceeds solar, the home takes what it can from the panels, and covers the rest by discharging the battery until it runs out. If the battery is empty, the remaining power is drawn from the grid.

This creates the Battery Modeler seen in the application.