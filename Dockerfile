# syntax=docker/dockerfile:1.4

FROM    python:3.9.21-alpine3.21  AS  builder

# Création des dossiers nécessaires
RUN     mkdir -p    /app/staticdata \
                    /app/images \
                    /app/fonts

WORKDIR /app

COPY    requirements.txt     /app/
# Installation des dépendances Python
RUN     pip install --no-cache-dir -r requirements.txt

FROM builder AS leaderboard

# Copie des fichiers nécessaires
COPY    staticdata/     /app/staticdata/
COPY    images/         /app/images/
COPY    fonts/          /app/fonts/

COPY    main.py         /app/
COPY    config.ini      /app/
COPY    output.xlsx     /app/

COPY    Pokemon.csv     /app/staticdata/

ENTRYPOINT [ "python", "main.py" ]
