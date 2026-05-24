FROM python:3.12-slim AS builder

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PATH="/opt/venv/bin:$PATH"

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends build-essential libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements*.txt ./

RUN python -m venv /opt/venv \
    && python - <<'PY'
from pathlib import Path
requirements = []
for path in sorted(Path('.').glob('requirements*.txt')):
    for line in path.read_text().splitlines():
        stripped = line.strip()
        if stripped and not stripped.startswith('#') and stripped not in requirements:
            requirements.append(stripped)
Path('requirements-combined.txt').write_text('\n'.join(requirements) + '\n', encoding='utf-8')
PY

RUN pip install --upgrade pip \
    && pip install -r requirements-combined.txt

FROM python:3.12-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PATH="/opt/venv/bin:$PATH"

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends libpq5 \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /opt/venv /opt/venv
COPY . .

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/health', timeout=3)"

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
