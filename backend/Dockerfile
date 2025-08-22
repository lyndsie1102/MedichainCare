# --- Stage 1: Base image with core dependencies ---
FROM mcr.microsoft.com/devcontainers/python:3.10 AS base

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
WORKDIR /app

COPY requirements-base.txt .
RUN pip install --no-cache-dir -r requirements-base.txt


# --- Stage 2: Development image ---
FROM base AS dev

COPY requirements-dev.txt .
RUN pip install --no-cache-dir -r requirements-dev.txt
COPY . .


# --- Stage 3: Test image ---
FROM base AS test

COPY requirements-test.txt .
RUN pip install --no-cache-dir -r requirements-test.txt
COPY . .
CMD ["pytest"]


# --- Stage 4: Production image --- <<<< NEW STAGE >>>>
# This is a lean image for deployment. It builds on 'base' and
# only includes the necessary code and core dependencies.
FROM base AS production

# Copy the application code from the context
COPY . .

# Command to run the Uvicorn server in a production-ready way
# Note: We don't use --reload here.
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]