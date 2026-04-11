## ADDED Requirements

### Requirement: Multi-stage Docker build from source
The system SHALL build OpenMAIC from GitHub source code using a multi-stage Dockerfile, producing a minimal runtime image without build-time dependencies.

#### Scenario: Successful first-time build
- **WHEN** user runs `docker compose build app` with valid network access
- **THEN** Docker executes 3 build stages (auth-builder, openmaic-builder, final image) and produces a tagged image containing Auth Service JS bundle, OpenMAIC Next.js standalone output, Nginx, PostgREST binary, and supervisord

#### Scenario: Build with custom repository
- **WHEN** user sets `OPENMAIC_REPO=https://github.com/my-fork/OpenMAIC.git` and `OPENMAIC_BRANCH=develop` as build args
- **THEN** the openmaic-builder stage clones the specified fork and branch instead of the default upstream repository

#### Scenario: Cached rebuild without source changes
- **WHEN** user runs `docker compose build app` a second time without changes to build args or Dockerfile
- **THEN** Docker uses cached layers and completes in under 30 seconds

### Requirement: Auth Service compilation stage
The system SHALL compile the Auth Service TypeScript source to JavaScript in the auth-builder stage.

#### Scenario: TypeScript compilation
- **WHEN** the auth-builder stage executes
- **THEN** it runs `npm ci` for dependencies and `npx tsc --skipLibCheck` to produce `/build/auth-service/dist/index.js`

### Requirement: OpenMAIC standalone build stage
The system SHALL clone OpenMAIC source, install dependencies with pnpm, and build Next.js in standalone mode.

#### Scenario: Next.js standalone output
- **WHEN** the openmaic-builder stage completes `pnpm build`
- **THEN** the output at `.next/standalone/` contains `server.js` and a minimal `node_modules`, and `.next/static/` contains the static assets

### Requirement: Minimal final runtime image
The system SHALL copy only runtime artifacts into the final image, excluding build tools (pnpm, gcc, python3, git).

#### Scenario: Final image contents
- **WHEN** the final image is inspected
- **THEN** it contains Node.js runtime, Nginx, PostgREST binary, supervisord, Auth Service dist, OpenMAIC standalone output, and required native libraries (cairo, pango, sharp deps) but does NOT contain pnpm, g++, python3, or git
