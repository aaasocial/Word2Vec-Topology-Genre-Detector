# Stage 1: Build frontend
FROM node:20-slim AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --ignore-scripts
COPY frontend/ ./
RUN npm run build
# Produces /app/frontend/dist/

# Stage 2: Python runtime + models + cache
FROM python:3.12-slim

WORKDIR /app

# Install system deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python deps first (layer caching)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Download NLTK data required at import time
RUN python -m nltk.downloader stopwords

# Copy application code
COPY backend/ ./backend/
COPY config/ ./config/
COPY corpus/ ./corpus/
COPY scripts/utils.py ./scripts/utils.py

# Download models + cache from GitHub Release
# The RELEASE_URL build arg should point to a tarball containing:
#   data/models/  (runtime files only)
#   data/cache/   (pre-built cache)
ARG RELEASE_URL=""
RUN CLEAN_URL=$(printf '%s' "$RELEASE_URL" | tr -d '[:space:]') && \
    if [ -n "$CLEAN_URL" ]; then \
      echo "Downloading models + cache from $CLEAN_URL..." && \
      curl -fsSL "$CLEAN_URL" | tar xz -C /app; \
    else \
      echo "WARNING: No RELEASE_URL provided. Expecting data/models/ and data/cache/ in build context."; \
    fi

# Copy built frontend
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Copy entrypoint
COPY entrypoint.sh .
RUN chmod +x entrypoint.sh

# Set Python path so backend imports work
ENV PYTHONPATH=/app

EXPOSE 8000

ENTRYPOINT ["./entrypoint.sh"]
