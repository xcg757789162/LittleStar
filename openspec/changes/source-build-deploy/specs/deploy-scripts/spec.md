## ADDED Requirements

### Requirement: Build script builds Docker images
The system SHALL provide a `build.sh` script that validates configuration and builds the application Docker image.

#### Scenario: Successful build
- **WHEN** user runs `./build.sh` with a valid `.env.local` file present
- **THEN** the script builds the app image via `docker compose build` and pulls the db image, printing progress information including estimated build time

#### Scenario: Missing env file
- **WHEN** user runs `./build.sh` without a `.env.local` file
- **THEN** the script exits with an error message instructing the user to copy `.env.example` and fill in the configuration

### Requirement: Run script manages service lifecycle
The system SHALL provide a `run.sh` script supporting subcommands: `up`, `down`, `restart`, `logs`, `status`, `reset-db`, `shell`.

#### Scenario: Start services
- **WHEN** user runs `./run.sh up`
- **THEN** the script starts all services in detached mode via `docker compose up -d`

#### Scenario: View logs
- **WHEN** user runs `./run.sh logs`
- **THEN** the script shows real-time logs from all containers via `docker compose logs -f`

#### Scenario: Check status with health
- **WHEN** user runs `./run.sh status`
- **THEN** the script shows container status via `docker compose ps` and performs HTTP health checks against `/health`, `/api/auth/health`, and `/api/rest/`

#### Scenario: Reset database
- **WHEN** user runs `./run.sh reset-db` and confirms
- **THEN** the script stops the db container, removes the `pgdata` volume, and restarts the db container (triggering init scripts)

### Requirement: Entrypoint validates prerequisites before starting
The system SHALL provide an `entrypoint.sh` that validates PostgreSQL readiness and build artifacts before starting supervisord.

#### Scenario: PostgreSQL is ready
- **WHEN** PostgreSQL responds to `pg_isready` within the retry limit (30 retries × 2 seconds)
- **THEN** the entrypoint proceeds to artifact validation

#### Scenario: PostgreSQL is not ready
- **WHEN** PostgreSQL does not respond within the retry limit
- **THEN** the entrypoint exits with error code 1 and a descriptive error message

#### Scenario: OpenMAIC artifact validation
- **WHEN** `/app/openmaic/server.js` exists
- **THEN** the entrypoint reports OpenMAIC standalone as ready

#### Scenario: Missing OpenMAIC artifact
- **WHEN** `/app/openmaic/server.js` does not exist
- **THEN** the entrypoint exits with error code 1 indicating the source build may have failed

#### Scenario: Auth Service artifact validation
- **WHEN** `/app/auth-service/dist/index.js` exists
- **THEN** the entrypoint reports Auth Service as ready

### Requirement: Environment variable template
The system SHALL provide a `.env.example` file documenting all configurable environment variables with defaults and descriptions.

#### Scenario: Template completeness
- **WHEN** user copies `.env.example` to `.env.local`
- **THEN** the file contains sections for: security (JWT_SECRET, POSTGRES_PASSWORD), database config, JWT config, service ports, OpenMAIC source build config, LLM API keys, TTS config, and image generation config
