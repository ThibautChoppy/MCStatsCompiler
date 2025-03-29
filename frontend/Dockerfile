# syntax=docker/dockerfile:1.4

FROM node:18-alpine AS frontend

WORKDIR /app

RUN apk add --no-cache sqlite

COPY    package.json ./

RUN     npm install
COPY    .   .

EXPOSE  8080

CMD     ["npm", "start"]
