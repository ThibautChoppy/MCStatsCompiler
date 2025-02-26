# syntax=docker/dockerfile:1.4

FROM    python:3.9.21-alpine3.21  AS  leaderboard

COPY    cobblemon_module /cobblemon_module

WORKDIR /cobblemon_module

RUN     pip install pandas numpy configparser paramiko

ENTRYPOINT [ "python", "cobblemon.py" ]
