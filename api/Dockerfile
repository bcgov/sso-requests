FROM node:22.18.0-alpine

# install yarn
RUN apk add --no-cache yarn

# Set the working directory
WORKDIR /app

# The api compiles @sso/authz from source, so the build context is the repo root
# and both directories come along. The package has no runtime dependencies of
# its own, so it needs no install of its own.
COPY api ./api
COPY packages/authz ./packages/authz

WORKDIR /app/api

# Install dependencies
RUN yarn install

# Build the application
RUN yarn build

ENTRYPOINT [ "yarn", "start" ]
