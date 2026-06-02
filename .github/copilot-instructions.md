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
  - Express middleware for authentication, logging (Winston), and error handling

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
- **Logging:** Winston in API, console in app
- **Styling:** Styled Components (CSS-in-JS) and Bootstrap in app

## Deployment

- **Helm charts** in `./helm/` manage Kubernetes deployments
- **Release process:** Create PR from `dev` to `main` with release label (`release:major`, `release:minor`, `release:patch`, `release:norelease`)
- Build and push Docker images in CI/CD pipeline
