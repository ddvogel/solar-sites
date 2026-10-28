# Build the React frontend using Bun
FROM oven/bun:1 AS frontend-build
WORKDIR /app/frontend

COPY frontend/package.json frontend/bun.lockb* ./
RUN bun install

COPY frontend/ ./
RUN bun run build

# Set up the Python backend to serve everything
FROM python:3.10-slim
WORKDIR /app/backend

COPY backend/requirements.txt ./
RUN pip install --no-cache-dir --only-binary :all: -r requirements.txt || pip install --no-cache-dir -r requirements.txt

COPY backend/ ./

# Copy the frontend assets from into a static folder
COPY --from=frontend-build /app/frontend/dist ./static

# Expose port 8000
EXPOSE 8000

# Run Uvicorn on port 8000 
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]