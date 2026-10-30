# Copilot Instructions for sso-requests

This is a monorepo for the Common Hosted Single Sign-On (CSS) application, enabling teams to request integrations with BC Government approved login options.

## Project Structure

The repository is organized as a monorepo with four main services:

- **`./app/`** - Next.js web portal (React 19, TypeScript, Bootstrap)
- **`./api/`** - Express.js REST API for service accounts
- **`./cron/`** - Node.js service for scheduled tasks (data reconciliation, cleanup)
- **`./db/`** - Database migrations and schema management using Sequelize + Umzug

Supporting directories:

- **`./helm/`** - Kubernetes deployment configuration
- **`./loadtests/`** - Performance testing
- **`./.bin/`** - Database setup scripts
- **`./local/`** - Local development helpers

## Build, Test, and Lint Commands

### Application (`./app/`)

```bash
# Install dependencies
make app_install  # or: yarn --cwd ./app install

# Development server (hot reload)
make app  # or: yarn --cwd ./app dev

# Build for production
make app_build  # or: yarn --cwd ./app build

# Run all tests with coverage
make app_test  # or: yarn --cwd ./app/jest test --collectCoverage

# Run specific test file
yarn --cwd ./app jest <test-file-path> --no-coverage

# Linting
yarn --cwd ./app lint

# Run API tests (uses test database)
make api_test  # or: yarn --cwd ./app/jest-api test-api --collectCoverage

# Run specific API test file
yarn --cwd ./app/jest-api test-api <test-file-path> --no-coverage
```

### API (`./api/`)

```bash
# Install dependencies
yarn --cwd ./api install

# Development server (auto-restart on file changes)
yarn --cwd ./api dev

# Build
yarn --cwd ./api build

# Run tests
yarn --cwd ./api test

# Linting
yarn --cwd ./api lint

# Fix linting issues
yarn --cwd ./api lint:fix
```

### Cron Service (`./cron/`)

```bash
# Build
yarn --cwd ./cron build

# Linting
yarn --cwd ./cron lint
```

### Database (`./db/`)

```bash
# Install dependencies
make db_install

# Compile TypeScript
make db_compile

# Run migrations on development database
make local_db

# Run migrations on test database
make local_test_db

# Run migrations directly (after compile)
make migrations
```

### Initial Setup

```bash
# One-time setup of environment files
make setup_env

# Set up local development database (first time)
make local_db

# Set up local test database (first time)
make local_test_db

# Display database schema
make schema
```

## Architecture Overview

1. **End Users** → Browser → **CSS Web Application** (Next.js, `./app/`)
2. **Service Accounts** → **CSS API** (Express.js, `./api/`)
3. Both applications → **PostgreSQL** (managed by Patroni in production)
4. Both applications → **Redis** (for rate limiting via `express-rate-limit`)
5. **Cron Service** (`./cron/`) performs scheduled tasks
6. **CSS Application & API** ⇄ **Keycloak** (for configuration changes across dev, test, prod environments)

### Key Dependencies

- **Next.js 16** - Web framework with App Router
- **React 19** - UI library
- **Express.js 5** - API framework
- **Sequelize 6** - ORM for database operations
- **PostgreSQL** - Primary data store
- **Redis (ioredis)** - Rate limiting and caching
- **Keycloak** - External identity provider integration

## Key Conventions

### TypeScript & Linting

- **TypeScript** is required across all services
- **ESLint** with Prettier is configured in each service
- Run `lint:fix` to auto-fix formatting issues
- App uses Next.js ESLint config; API uses TypeScript ESLint strict rules

### Testing

- **Jest** is the test framework across all services
- **App tests:** Located in `./app/jest/` directory
- **API tests:** Located in `./app/jest-api/` directory (note: under `./app/`, not `./api/`)
- Test database required for API tests: `make local_test_db`
- Tests must run with `--runInBand` and `--detectOpenHandles` for API

### Database

- **Sequelize** ORM with **Umzug** migrations
- Migrations are located in `./db/src/migrations/`
- New migrations should follow the naming convention: `YYYYMMDDHHMMSS-description.ts`
- Database schema is auto-generated from Sequelize models
- Always run migrations after schema changes: `make local_db` or `make local_test_db`

### Code Organization

- **App folder structure:**

  - `./components/` - Reusable React components
  - `./controllers/` - API request handlers (also used for API server code)
  - `./pages/` - Next.js page routes
  - `./page-partials/` - Page composition components
  - `./queries/` - Database query utilities
  - `./helpers/` - Utility functions
  - `./hooks/` - Custom React hooks
  - `./schemas/` - JSON Schema definitions for form validation
  - `./services/` - Business logic and external service calls
  - `./styles/` - Global CSS and styled components
  - `./types/` - TypeScript type definitions

- **API folder structure:**
  - `./api/src/` - Main source code
  - Uses dependency injection via `tsyringe`
  - Express middleware for authentication, request logging, and error handling

### Environment Variables

- Copy `.env.example` to `.env` for each service
- Required files: `./app/.env`, `./app/.env.local` (for sensitive values)
- Each service documents required variables in its `.env.example`

### Rate Limiting

- **Express Rate Limit** configured in both app and API
- **Rate Limit Redis** backend for distributed rate limiting
- Configuration varies by endpoint; check service files for specifics

### Docker

- Services can be run via Docker: `docker-compose up`
- Includes local Keycloak instances for development
- Each service has a `Dockerfile` for container builds

## Pre-commit Hooks

- **gitlint** validates commit message format
- **pre-commit** framework runs additional checks
- Ensure `pre-commit install` and `gitlint install-hook` are run during setup

## Common Patterns

- **API Error Handling:** Use `http-errors` for standardized HTTP error responses
- **Authentication:** JWT tokens validated via Keycloak client libraries
- **Validation:** AJV schema validation in API, React Hook Form in app
- **Logging:** Structured pino logging in app and API (see below)
- **Styling:** Styled Components (CSS-in-JS) and Bootstrap in app
- **Audit events:** Every change to a resource is recorded through `@sso/audit` (see below)

## Logging

The app (`./app/utils/logger.ts`) and the API (`./api/src/logger.ts`) share the same pino setup: one JSON object per line on stdout, collected into Loki and kept for two weeks. Long-term records of changes belong in audit events, not logs.

- **Use the shared logger**, never `console.*` in server code. Create a child per module: `const log = logger.child({ module: 'controllers/user' })`. Import from `@app/utils/logger` (app) or `@/logger` (API).
- **Server code only in the app.** The logger uses `node:async_hooks`; never import it from pages, components or `services/` (browser code).
- **Structured fields first, message second:** `log.info({ clientId }, 'client created')`. Keep the message a fixed string and put variable values in fields.
- **Errors go under `err`:** `log.error({ err }, 'failed to create client')`, so they are serialized consistently.
- **Request context is automatic.** App routes wrapped in `withApiLogging` and API requests after the `requestLogging` middleware tag every line with `reqId` (and the caller once authenticated). Don't pass these by hand. The same `reqId` is stored on audit events (`events.req_id`) and returned in the `x-request-id` header. New app API routes must be wrapped in `withApiLogging`.
- **No secrets.** Keys matching secret/password/token/authorization/cookie/api-key/credential are redacted at any depth, but values under neutral keys or inside message strings are not. Never log them.
- **Levels:** `LOG_LEVEL` (default `debug` in development, `silent` in tests, `info` otherwise); `LOG_FORMAT=pretty` for readable local output.
- The cron service (`./cron/`) still logs with `console`.

Flag in review: `console.*` in app or API server code, errors not passed under `err`, interpolated values in log messages instead of fields, anything that could log a secret, and app API routes not wrapped in `withApiLogging`.

## Audit Events

The `events` table is the permanent audit record, written by the app and the API through the shared `@sso/audit` package (`./packages/audit/`). Read `./packages/audit/README.md` and `./docs/events.md` before adding or changing a write path. Never call `models.event.create` directly; the legacy `EVENTS` enum and `createEvent({ eventCode })` are gone.

### Writing new code

When adding a new resource, route or change to existing data, record it with the pattern that matches what the change touches:

- **Database only:** `audit.createEvent({ action, outcome: 'success', ... }, transaction)` in the **same transaction** as the change, so neither commits without the other. `createEvent` is strict and rethrows on failure.
- **Outside system (Keycloak, SDX, …):** `audit.runAuditedOperation(operation, call, { onSuccess })`. `requested` is stored before `call` runs; database rows that mirror the outside system are written in `onSuccess(transaction)`, never before the call succeeds.
- **Several outside changes in one request:** `audit.runAuditedBatch(parent, items)`, one child operation per change under a parent action (e.g. `role-bulk-update`, `role-bulk-create`).
- **Workflow-backed changes (integrations, API accounts):** the controller writes `requested` alongside the enqueue; the engine writes the outcome (`./app/workflow/audit.ts`). Don't write outcomes from the controller.
- **Best effort:** `audit.tryCreateEvent` only for an outcome after an outside call that already happened (e.g. a failed email). Never for the change itself.

Conventions:

- **Validate first.** Throw 400/403/404/409 before any event is written; rejected requests belong in the request log, not the audit table.
- **Resource ids and target are columns**, not `details`: `requestId`, `teamId`, `organizationId`, `environment`, `target: { type, id }`. Build role targets with `roleOperation` / `roleMappingOperations` and usernames with `roleMappingTarget`, so the app and API record the same change identically.
- **Only record real changes.** Drop no-op changes (adding a role already held) before recording.
- **Actor comes from context.** `authenticate` (app) and the auth middleware (API) set it. Routes with no authenticated user (cron, callbacks) must wrap their work in `withActor(systemActor('<name>'))`; `createEvent` fails without an actor.
- **A new action** must be added to `AUDIT_ACTIONS` in `packages/audit/src/vocabulary.ts`, given a typed `details` shape in `packages/audit/src/details.ts`, and documented in `docs/events.md`. Don't rename or reshape existing actions; existing rows keep their old shape.
- **Every write route** (POST/PUT/PATCH/DELETE, or a GET that writes) needs an entry in `app/jest-api/audit-coverage-manifest.ts` or `api/src/tests/audit-coverage-manifest.ts`: the actions it records, or `unaudited` with a reason. `zz.audit-coverage.test.ts` fails otherwise, and a test must exercise each listed action.

### Reviewing changes

Flag in review any change that:

- Adds or modifies a write path (database row, Keycloak, SDX) without an audit event, or without a coverage manifest entry for a new route.
- Writes an event outside the change's transaction, or writes mirror rows before the outside call succeeds.
- Writes an event before validation, so a rejected request leaves an audit row.
- Uses `tryCreateEvent` for the change itself, or `models.event.create` / legacy `eventCode` values.
- Puts resource ids, usernames or environment in `details` instead of their columns, or builds a role-mapping target by hand.
- Adds an action without updating `vocabulary.ts`, `details.ts` and `docs/events.md`.
- Adds a route reachable without an authenticated user that writes events without `withActor`.

## Deployment

- **Helm charts** in `./helm/` manage Kubernetes deployments
- **Release process:** Create PR from `dev` to `main` with release label (`release:major`, `release:minor`, `release:patch`, `release:norelease`)
- Build and push Docker images in CI/CD pipeline
