FROM node:16.14.2-slim

RUN apt-get update && apt-get install curl make -y \
                   && apt-get install libsqlite3-dev bzip2 icu-devtools uuid-dev -y

WORKDIR /app

COPY ./*.json ./

RUN yarn install

COPY ./app/*.json ./app/

RUN yarn --cwd ./app install

COPY ./lambda/*.json ./lambda/

RUN yarn --cwd ./lambda install

COPY ./lambda/shared/*.json ./lambda/shared/

RUN yarn --cwd ./lambda/shared install

COPY ./lambda/app/*.json ./lambda/app/

RUN yarn --cwd ./lambda/app install

COPY ./lambda/actions/*.json ./lambda/actions/

RUN yarn --cwd ./lambda/actions install

COPY ./lambda/db/*.json ./lambda/db/

RUN yarn --cwd ./lambda/db install

COPY ./lambda/scheduler/*.json ./lambda/scheduler/

RUN yarn --cwd ./lambda/scheduler install

COPY ./localserver/*.json ./localserver/

RUN yarn --cwd ./localserver install

ENTRYPOINT [ "yarn", "--cwd", "./localserver", "dev"]
