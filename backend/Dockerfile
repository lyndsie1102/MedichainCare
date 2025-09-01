FROM python:3.10-slim

# Set working directory
WORKDIR /workspace

# Copy the backend requirements file into the container
COPY requirements.txt .

# Install the Python dependencies
RUN pip install -r requirements.txt

# Copy the entire backend code into the container
COPY . .

# Expose port for the backend
EXPOSE 8000


# run backend with uvicorn command
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]