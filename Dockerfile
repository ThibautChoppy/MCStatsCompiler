# syntax=docker/dockerfile:1.4

FROM    python:3.9.21-alpine3.21  AS  builder

# Installation des dépendances système nécessaires
RUN     apk add --no-cache \
            gcc \
            python3-dev \
            musl-dev \
            freetype-dev \
            libpng-dev \
            gfortran \
            openblas-dev \
            sqlite-dev \
            jpeg-dev \
            zlib-dev

# Création des dossiers nécessaires
RUN     mkdir -p /app/staticdata \
            /app/images \
            /app/fonts \
            /app/data

WORKDIR /app

COPY    requirements.txt     /app/
# Installation des dépendances Python
RUN     pip install --no-cache-dir -r requirements.txt

FROM builder AS leaderboard

# Copie des fichiers nécessaires
COPY    main.py              /app/
COPY    config.ini          /app/
COPY    output.xlsx         /app/
COPY    staticdata/         /app/staticdata/
COPY    Pokemon.csv         /app/staticdata/
COPY    images/             /app/images/
COPY    fonts/              /app/fonts/

ENTRYPOINT [ "python", "main.py" ]
