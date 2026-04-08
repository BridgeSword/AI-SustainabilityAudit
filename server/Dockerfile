# For more information, please refer to https://aka.ms/vscode-docker-python
FROM python:3.12-slim as python-base

# Expose all required ports here
EXPOSE 9092

# Setting all required environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=on \
    PIP_DEFAULT_TIMEOUT=100 \
    POETRY_VERSION=2.0.1 \
    POETRY_HOME="/opt/poetry" \
    POETRY_VIRTUALENVS_IN_PROJECT=true \
    POETRY_NO_INTERACTION=1 \
    SERVER_PATH="/usr/app/" \
    VENV_PATH="/opt/pysetup/.venv"

ENV PATH="$POETRY_HOME/bin:$VENV_PATH/bin:$PATH"

ENV APP_ENV=local

# Copying & Installing all required dependencies

COPY ../poetry.lock ../pyproject.toml $SERVER_PATH
COPY src $SERVER_PATH

RUN apt-get update \
    && apt-get install --no-install-recommends -y \
    curl \
    build-essential
    
RUN --mount=type=cache,target=/root/.cache \
    curl -sSL https://install.python-poetry.org | python -

RUN --mount=type=cache,target=/root/.cache \
    poetry install

RUN mkdir -p carbon_reports
RUN mkdir -p server/src/VS_files

WORKDIR $SERVER_PATH

CMD ["poetry", "run", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "9092", \
    "--workers", "1", "--timeout-keep-alive", "1000000"] 
    # "--reload"
