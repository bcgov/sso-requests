FROM node:22.18.0-alpine

# install yarn
RUN apk add --no-cache yarn

# Set the working directory
WORKDIR /app

# The api compiles @sso/authz and @sso/logs-query from source, so the build
# context is the repo root and these directories come along. The packages have
# no runtime dependencies of their own, so they need no install of their own.
COPY api ./api
COPY packages/authz ./packages/authz
COPY packages/logs-query ./packages/logs-query

WORKDIR /app/api

# Install dependencies
RUN yarn install

# Build the application
RUN yarn build

ENTRYPOINT [ "yarn", "start" ]
