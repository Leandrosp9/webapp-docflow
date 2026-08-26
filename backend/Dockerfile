FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /app

RUN apt-get update \
    && DEBIAN_FRONTEND=noninteractive apt-get install --no-install-recommends -y \
        tesseract-ocr \
        tesseract-ocr-eng \
        tesseract-ocr-por \
        ffmpeg \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY alembic.ini .
COPY migrations migrations
COPY app app
COPY entrypoint.sh .
RUN chmod +x entrypoint.sh && mkdir -p /app/uploads

EXPOSE 8000
CMD ["./entrypoint.sh"]
