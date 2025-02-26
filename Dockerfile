# syntax=docker/dockerfile:1.4

FROM    python:3.9.21-alpine3.21  AS  leaderboard

WORKDIR /root

RUN     apk add --no-cache git
RUN     git clone https://github.com/Elric02/MCStatsCompiler.git

RUN     mv MCStatsCompiler/cobblemon_module/* .

COPY    cobblemon.py    .

RUN     rm -rf MCStatsCompiler cobblemonplayerdata output.xlsx

RUN     pip install pandas numpy configparser paramiko

ENTRYPOINT [ "/bin/sh" ]
