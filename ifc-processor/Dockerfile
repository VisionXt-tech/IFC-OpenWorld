# IFC Processor Service Dockerfile
# Python 3.11 with IfcOpenShell

FROM python:3.11-slim

# Install system dependencies for IfcOpenShell
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    libboost-all-dev \
    libhdf5-dev \
    liboce-foundation-dev \
    liboce-modeling-dev \
    liboce-ocaf-dev \
    liboce-visualization-dev \
    liboce-ocaf-lite-dev \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create directory for temporary files
RUN mkdir -p /tmp/ifc_processing

# Set Python path
ENV PYTHONPATH=/app
ENV PYTHONUNBUFFERED=1

# Default command: run Celery worker
CMD ["celery", "-A", "app.workers.ifc_processing", "worker", "--loglevel=info", "--concurrency=2"]