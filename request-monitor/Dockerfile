FROM node:20.17.0-slim

RUN apt-get update && apt-get install curl make yarn -y

WORKDIR /app

COPY . .

RUN make install

RUN make build

ENTRYPOINT [ "make", "start" ]
