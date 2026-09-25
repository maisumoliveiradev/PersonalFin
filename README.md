# PersonalFin

Personal finance platform for Web, Android, and iOS.

Project documentation lives in [`docs/`](docs/README.md). AI agents start
from [`AGENTS.md`](AGENTS.md).

## Requirements

-   Node.js 24 (see `.nvmrc`) and npm 11
-   Docker (local PostgreSQL)
-   For native targets: Xcode (iOS) and Android SDK (Android), or the
    Expo Go app on a device

## Setup

``` sh
npm install
cp apps/api/.env.example apps/api/.env
cp apps/client/.env.example apps/client/.env
```

Set `BETTER_AUTH_SECRET` in `apps/api/.env` (for example with
`openssl rand -base64 32`). Then start the database and apply
migrations:

``` sh
npm run db:up
npm run db:migrate
```

`npm install` also enables the versioned git hooks in `.githooks/`.

## Run

``` sh
npm run dev:api        # API on http://localhost:3333
npm run dev:client     # Expo dev server; press w (Web), i (iOS), or a (Android)
```

`EXPO_PUBLIC_API_URL` must be reachable from the device running the app:
`http://localhost:3333` works for Web and the iOS simulator. For the
Android emulator use `http://10.0.2.2:3333`, and for a physical device
use your computer's LAN address (and set `HOST=0.0.0.0` in the API).

`MIN_CLIENT_VERSION` in `apps/api/.env` is optional: when set, the API
rejects older app versions with `426` (ADR-0016).

## Validate

``` sh
npm run validate          # lint, typecheck, contract check, unit tests
npm run test:integration  # API tests against the PostgreSQL test database
npm run test:e2e          # browser journeys (needs Chrome, API, and Web running)
```

`validate` runs automatically before every `git push`. Run
`test:integration` before merging changes to persistence or
authentication.
