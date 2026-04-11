## ADDED Requirements

### Requirement: Unified reverse proxy gateway on port 80
The system SHALL configure Nginx to listen on port 80 and route requests to backend services via localhost upstreams.

#### Scenario: Auth API routing
- **WHEN** a request arrives at `/api/auth/*`
- **THEN** Nginx proxies it to Auth Service at `127.0.0.1:3001` with the `/api/auth/` prefix stripped to `/auth/`

#### Scenario: PostgREST API routing
- **WHEN** a request arrives at `/api/rest/*`
- **THEN** Nginx proxies it to PostgREST at `127.0.0.1:3000` with the `/api/rest/` prefix stripped

#### Scenario: OpenMAIC application routing
- **WHEN** a request arrives at `/openmaic/*`
- **THEN** Nginx proxies it to OpenMAIC at `127.0.0.1:3002` with the `/openmaic/` prefix stripped

### Requirement: CORS headers on API routes
The system SHALL add CORS headers (`Access-Control-Allow-Origin: *`, appropriate methods and headers) to all API responses.

#### Scenario: CORS preflight handling
- **WHEN** an OPTIONS request arrives at any `/api/*` path
- **THEN** Nginx returns 204 with CORS headers including `Access-Control-Allow-Origin: *`, allowed methods, and allowed headers

#### Scenario: CORS on normal responses
- **WHEN** a non-OPTIONS request arrives at `/api/auth/*` or `/api/rest/*`
- **THEN** the response includes `Access-Control-Allow-Origin: *` and `Access-Control-Expose-Headers` headers

### Requirement: OpenMAIC iframe embedding support
The system SHALL configure Nginx to allow OpenMAIC pages to be embedded in iframes by the LittleStar frontend.

#### Scenario: iframe security headers
- **WHEN** a response is proxied from OpenMAIC at `/openmaic/*`
- **THEN** Nginx removes upstream `X-Frame-Options` and `Content-Security-Policy` headers and adds `Content-Security-Policy: frame-ancestors 'self' http://localhost:5173 http://localhost:4173`

#### Scenario: iframe bridge script injection
- **WHEN** an HTML response is proxied from OpenMAIC
- **THEN** Nginx injects `<script src="/iframe-bridge.js"></script>` before `</head>` via `sub_filter`, along with auto-config JavaScript for image generation settings

### Requirement: Static asset caching
The system SHALL configure appropriate cache headers for static assets.

#### Scenario: Next.js static assets
- **WHEN** a request arrives at `/_next/*`
- **THEN** Nginx proxies to OpenMAIC and sets `Cache-Control: public, immutable` with 30-day expiry

#### Scenario: Media files
- **WHEN** a request arrives at `/media/*`
- **THEN** Nginx serves files from `/data/media/` with 30-day cache, immutable directive, and CORS headers

#### Scenario: Public resource assets
- **WHEN** a request arrives at `/avatars/*`, `/images/*`, or `/logo-horizontal.png`
- **THEN** Nginx proxies to OpenMAIC with 7-day cache and `Cache-Control: public`

### Requirement: Health check endpoint
The system SHALL provide a `/health` endpoint returning JSON status.

#### Scenario: Health check response
- **WHEN** a GET request arrives at `/health`
- **THEN** Nginx returns HTTP 200 with body `{"status":"ok","service":"littlestar-app"}` and Content-Type `application/json`

### Requirement: iframe bridge script serving
The system SHALL serve the iframe-bridge.js file at `/iframe-bridge.js`.

#### Scenario: Bridge script request
- **WHEN** a request arrives at `/iframe-bridge.js`
- **THEN** Nginx serves the file from `/etc/nginx/iframe-bridge.js` with `Content-Type: application/javascript`, no-cache directive, and CORS header
