# ZenithW is intentionally run as one Gunicorn worker. Its live job state,
# Socket.IO rooms, and prepared-file tokens are process-local.
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

RUN apt-get update \
    && apt-get install -y --no-install-recommends ffmpeg tini \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app/backend

COPY backend/requirements.lock ./requirements.lock
RUN pip install --require-hashes -r requirements.lock

COPY backend/ ./

RUN useradd --create-home --uid 10001 zenithw \
    && mkdir -p /app/backend/downloads \
    && chown -R zenithw:zenithw /app

USER zenithw
EXPOSE 8000

ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["gunicorn", "--worker-class", "geventwebsocket.gunicorn.workers.GeventWebSocketWorker", "--workers", "1", "--worker-connections", "1000", "--timeout", "660", "--graceful-timeout", "30", "--bind", "0.0.0.0:8000", "app:app"]
