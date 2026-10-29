FROM node:22.18.0-alpine

# install yarn
RUN apk add --no-cache yarn

# Set the working directory
WORKDIR /app

# The api compiles @sso/authz and @sso/audit from source, so the build context is
# the repo root and those directories come along. The packages have no runtime
# dependencies of their own, so they need no install of their own.
COPY api ./api
COPY packages/authz ./packages/authz
COPY packages/audit ./packages/audit

WORKDIR /app/api

# Install dependencies
RUN yarn install

# Build the application
RUN yarn build

ENTRYPOINT [ "yarn", "start" ]
