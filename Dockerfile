FROM node:20.17.0-slim

RUN curl --proto "=https" -fsSL https://bun.sh/install | bash
RUN apt-get update && apt-get install curl make -y \
                   && apt-get install libsqlite3-dev bzip2 icu-devtools uuid-dev -y

WORKDIR /app

COPY . .

RUN make app_install

RUN make server_install

ENTRYPOINT [ "yarn", "--cwd", "./localserver", "dev"]
