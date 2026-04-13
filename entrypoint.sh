#!/bin/sh
set -e

# Start arq worker in background
echo "Starting arq worker..."
arq backend.worker.settings.WorkerSettings &
ARQ_PID=$!

# Start uvicorn in foreground
echo "Starting uvicorn on port ${PORT:-8000}..."
exec uvicorn backend.api.app:app --host 0.0.0.0 --port "${PORT:-8000}"
