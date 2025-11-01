# IFC Processor Service Dockerfile
# Python 3.11 with IfcOpenShell

FROM python:3.14-slim

# Install system dependencies for IfcOpenShell and IfcConvert
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    libboost-all-dev \
    libhdf5-dev \
    libocct-foundation-dev \
    libocct-modeling-data-dev \
    libocct-modeling-algorithms-dev \
    libocct-ocaf-dev \
    libocct-data-exchange-dev \
    libocct-visualization-dev \
    wget \
    && rm -rf /var/lib/apt/lists/*

# Install IfcConvert (bundled with IfcOpenShell)
# IfcConvert is included in ifcopenshell package

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