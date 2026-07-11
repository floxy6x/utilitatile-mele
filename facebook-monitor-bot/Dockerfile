FROM mcr.microsoft.com/playwright/python:v1.61.0-jammy

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY monitor.py .
COPY pages.txt .
COPY scripts ./scripts

RUN mkdir -p /app/data

CMD ["python", "monitor.py"]
