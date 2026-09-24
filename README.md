# PersonalFin

Personal finance platform for Web, Android, and iOS.

Project documentation lives in [`docs/`](docs/README.md). AI agents start
from [`AGENTS.md`](AGENTS.md).

## Requirements

-   Node.js 24 (see `.nvmrc`) and npm 11
-   For native targets: Xcode (iOS) and Android SDK (Android), or the
    Expo Go app on a device

## Setup

``` sh
npm install
cp apps/api/.env.example apps/api/.env
```

`npm install` also enables the versioned git hooks in `.githooks/`.

## Run

``` sh
npm run dev:api        # API on http://127.0.0.1:3333 (GET /health)
npm run dev:client     # Expo dev server; press w (Web), i (iOS), or a (Android)
```

## Validate

``` sh
npm run validate       # lint, typecheck, contract check, tests
```

The same command runs automatically before every `git push`.
