FROM node:16.14.2-slim

RUN apt-get update && apt-get install curl make -y \
                   && apt-get install libsqlite3-dev bzip2 icu-devtools uuid-dev -y

WORKDIR /app

COPY ./*.json ./

RUN yarn install

RUN mkdir app

RUN mkdir lambda

RUN mkdir localserver

COPY app ./app/

COPY lambda ./lambda/

RUN yarn --cwd ./lambda install

RUN yarn --cwd ./lambda/app install

RUN yarn --cwd ./lambda/db install

RUN yarn --cwd ./lambda/actions install

RUN yarn --cwd ./lambda/scheduler install

RUN yarn --cwd ./lambda/css-api install

RUN yarn --cwd ./lambda/siteminder-tests-scheduler install

ENV NODE_ENV production

RUN yarn --cwd ./app install

RUN yarn --cwd ./app build

COPY localserver ./localserver/

RUN yarn --cwd ./localserver install

EXPOSE 3000

ENTRYPOINT [ "yarn", "--cwd", "./app", "start"]
