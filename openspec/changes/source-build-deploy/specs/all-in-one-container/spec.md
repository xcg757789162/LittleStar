## ADDED Requirements

### Requirement: supervisord manages four processes
The system SHALL use supervisord to manage PostgREST, Auth Service, OpenMAIC, and Nginx as supervised child processes within a single container.

#### Scenario: All processes running after startup
- **WHEN** the container starts and PostgreSQL is reachable
- **THEN** supervisord launches PostgREST on port 3000, Auth Service on port 3001, OpenMAIC on port 3002, and Nginx on port 80, all reporting RUNNING status

#### Scenario: Process auto-restart on crash
- **WHEN** any managed process (e.g., OpenMAIC) crashes
- **THEN** supervisord automatically restarts it within 5 seconds, up to 10 retries

### Requirement: Process startup ordering via priority
The system SHALL start processes in dependency order: PostgREST (priority 100) → Auth Service (priority 200) → OpenMAIC (priority 300) → Nginx (priority 900).

#### Scenario: Nginx starts last
- **WHEN** the container starts
- **THEN** Nginx starts only after PostgREST, Auth Service, and OpenMAIC have been launched, ensuring backends are available before accepting traffic

### Requirement: Per-process logging
The system SHALL write stdout and stderr for each process to separate log files under `/var/log/supervisor/`.

#### Scenario: Log file existence
- **WHEN** the container is running
- **THEN** log files exist for each service: `postgrest-stdout.log`, `postgrest-stderr.log`, `auth-stdout.log`, `auth-stderr.log`, `openmaic-stdout.log`, `openmaic-stderr.log`, `nginx-stdout.log`, `nginx-stderr.log`

### Requirement: Environment variable passthrough
The system SHALL pass database connection, JWT, and API key environment variables from the container environment to each managed process via supervisord `%(ENV_xxx)s` syntax.

#### Scenario: OpenMAIC receives PORT and HOSTNAME
- **WHEN** OpenMAIC process starts
- **THEN** it receives `PORT` (default 3002), `HOSTNAME=0.0.0.0`, and `NODE_ENV=production` environment variables

#### Scenario: PostgREST receives database connection
- **WHEN** PostgREST process starts
- **THEN** it receives `PGRST_DB_URI`, `PGRST_DB_SCHEMAS`, `PGRST_DB_ANON_ROLE`, `PGRST_JWT_SECRET`, and `PGRST_SERVER_PORT` environment variables

### Requirement: Docker Compose two-container architecture
The system SHALL define a docker-compose.yml with exactly two services: `db` (PostgreSQL 16 Alpine) and `app` (All-in-One application container).

#### Scenario: Containers start with dependencies
- **WHEN** user runs `docker compose up -d`
- **THEN** the `db` container starts first, and the `app` container starts only after `db` reports healthy

#### Scenario: Persistent volumes
- **WHEN** the services are running
- **THEN** PostgreSQL data is persisted in `pgdata` volume, OpenMAIC data in `openmaic-data`, logs in `openmaic-logs`, and media files in `media-data`
