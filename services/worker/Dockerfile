FROM python:3.11-slim

WORKDIR /app

# Install Java for Synthea
RUN apt-get update && apt-get install -y \
    default-jre-headless \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Download Synthea JAR
RUN mkdir -p /opt/synthea && \
    curl -L https://github.com/synthetichealth/synthea/releases/download/master-branch-latest/synthea-with-dependencies.jar \
    -o /opt/synthea/synthea.jar

# Copy shared package first
COPY packages/shared /app/packages/shared
RUN pip install -e /app/packages/shared

# Install worker dependencies
COPY services/worker/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy worker application
COPY services/worker/app ./app

# Set environment variables
ENV PYTHONPATH=/app:$PYTHONPATH
ENV SYNTHEA_JAR_PATH=/opt/synthea/synthea.jar
ENV STORAGE_PATH=/data/synthea

# Create data directory
RUN mkdir -p /data/synthea

# Run Celery worker
CMD ["celery", "-A", "app.celery_app", "worker", "--loglevel=info", "--concurrency=4"]