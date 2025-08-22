# --- Stage 1: Base image with ALL dependencies ---
FROM mcr.microsoft.com/devcontainers/python:3.10 AS base

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends build-essential

# Upgrade pip to the latest version, as recommended by the notice
RUN pip install --upgrade pip

# Copy the single requirements file
COPY requirements.txt .

# Install all dependencies from the single file
RUN pip install --no-cache-dir -r requirements.txt


# --- Stage 2: Development image ---
# Builds FROM base, so it already has all dependencies
FROM base AS dev

# Copy the entire application context
COPY . .


# --- Stage 3: Test image ---
# Builds FROM base, so it already has all dependencies
FROM base AS test

# Copy the entire application context
COPY . .
CMD ["pytest"]


# --- Stage 4: Production image ---
# This is a lean image for deployment.
# It also builds from 'base'.
FROM base AS production

# Copy the application code from the context
COPY . .

# Command to run the Uvicorn server in a production-ready way
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]