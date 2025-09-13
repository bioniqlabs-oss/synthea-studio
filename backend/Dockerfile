FROM python:3.9-slim

WORKDIR /app

# Install system dependencies including Java
RUN apt-get update && apt-get install -y \
    gcc \
    postgresql-client \
    curl \
    wget \
    default-jre-headless \
    && rm -rf /var/lib/apt/lists/*

# Download Synthea JAR
ENV SYNTHEA_VERSION=master-branch-latest
RUN mkdir -p /app/synthea && \
    wget -O /app/synthea/synthea-with-dependencies.jar \
    https://github.com/synthetichealth/synthea/releases/download/${SYNTHEA_VERSION}/synthea-with-dependencies.jar && \
    chmod +x /app/synthea/synthea-with-dependencies.jar

# Verify Java and Synthea installation
RUN java -version && \
    java -jar /app/synthea/synthea-with-dependencies.jar --help || true

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY app/ app/
COPY alembic.ini .
COPY alembic/ alembic/

# Create storage directories
RUN mkdir -p /var/lib/synthea-studio/storage \
    && mkdir -p /tmp/synthea-output

# Set environment variables
ENV SYNTHEA_JAR_PATH=/app/synthea/synthea-with-dependencies.jar
ENV SYNTHEA_OUTPUT_PATH=/tmp/synthea-output
ENV PYTHONUNBUFFERED=1

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8001/health || exit 1

EXPOSE 8001

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8001"]