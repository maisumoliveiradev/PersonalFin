# SDD-007 --- v0.1.0 Release Validation Report

-   **Date:** 2026-09-24
-   **Candidate:** branch `feature/sdd-006-transaction-list` (SDD-001 to
    SDD-006, PRs #1 to #6), validated from a fresh clone.
-   **Executed by:** AI agent (Claude Code), on the project owner's
    development machine (macOS, Node.js 24.21, npm 11.19, Docker
    PostgreSQL 17).
-   **Verdict:** Ready to release after the project owner merges PRs #1
    to #7 and confirms DR-072. No critical integrity or security defect is
    known. Open items are listed at the end.

## Environment of the run

The candidate was cloned into an empty directory and run with its own
configuration, isolated from the day-to-day development instance:

| Item | Value |
|---|---|
| Install | `npm ci` (lockfile) |
| Database | New empty database `personalfin_release` |
| API | `npm run dev:api` on `http://localhost:3334` |
| Web | `expo start --web` on `http://localhost:8082` |
| Browser | Google Chrome, headless, driven by Playwright (`playwright-core`, outside the repository), timezone `America/Sao_Paulo` |

## Results

| Check | Result | Evidence |
|---|---|---|
| Clean installation/setup | Pass | `npm ci` on a fresh clone; `prepare` enabled the git hooks (`core.hooksPath=.githooks`). |
| Lint | Pass | `npm run lint` (Biome, 110 files). |
| Typecheck | Pass | `npm run typecheck` in all 4 workspaces. |
| Contract | Pass | `npm run contract:check`: generated types match `openapi.yaml`. |
| Automated tests | Pass | Unit: 82 (API) + 65 (domain). Integration: 38 against PostgreSQL. |
| Migrations from clean database | Pass | `0001` to `0004` applied to an empty database; the second run applied nothing. |
| Environment configuration | Pass | API refuses to start without `APP_ENV` (`ConfigError`); runs with a per-instance `.env` (own port, database, secret, trusted origins). |
| Authentication | Pass | Browser: sign-up, session restored after reload, sign-out, wrong password rejected, sign-in. |
| Protected access | Pass | Browser: signed-out user only reaches sign-in/sign-up. API: every protected route returns 401 without a session (unit tests). |
| Create Financial Space | Pass | Browser: first-space onboarding, validation, creation, second space, selection. |
| Default categories | Pass | Browser: new space shows the catalog. Integration: seeded exactly once, including 4 concurrent attempts. |
| Create Income | Pass | Browser: pending income `5000` saved as `500000` centavos, date `2026-03-01`. |
| Create Expense | Pass | Browser: `1.234,56` saved as `123456` centavos with subcategory and date `2026-01-05` (verified in the database). |
| List transactions | Pass | Browser: empty state, new items, pt-BR formatting, order by financial date, persistence after reload. |
| User/space isolation | Pass | Browser: a second user sees none of the first user's spaces and gets "not found" when opening one by URL. API and database: categories, transactions, and spaces of other spaces/users are rejected or hidden (unit and integration tests). |
| Money and date integrity | Pass | Domain and integration tests under `TZ=Pacific/Kiritimati`, `TZ=Pacific/Pago_Pago`, and `TZ=America/Sao_Paulo`. |
| Basic Web responsiveness | Pass | Screens reviewed at 1280 px and 390 px wide, in Light and Dark system themes. |
| iOS startup | Pass (startup only) | Expo Go (SDK 57) on the iPhone 17 simulator loads the app and renders the sign-in screen. The full journey was not automated on iOS. |
| Android startup | Not verified | The `Phone` emulator (Android 37) booted, but `adb` could not reach its server from the agent's sandboxed shell, so the app could not be installed. The Android bundle compiles (`expo export --platform all`). To verify manually: start the emulator, set `EXPO_PUBLIC_API_URL=http://10.0.2.2:3333`, run `npm run dev:client`, and press `a`. |

## Documentation checks

| Check | Result |
|---|---|
| `CURRENT-STATE.md` describes reality | Pass |
| `CHANGELOG.md` contains v0.1.0 | Pass |
| OpenAPI matches the API | Pass (`contract:check`; handlers typed with generated types; unit tests assert response shapes) |
| ADR statuses accurate | Pass (ADR-0001 to ADR-0011 Accepted) |
| C4/architecture reflect implemented boundaries | Pass |
| No roadmap feature falsely marked implemented | Pass |

## Open items (not blocking)

-   **DR-072** (category kind must match transaction type) was proposed
    by the agent and accepted on 2026-09-24 under the project owner's
    delegation.
-   **Android startup was not verified** (see Results). iOS was verified
    for startup only. The full user journey was automated only on the
    Web (TD-008 tracks the missing client test runner).
-   Found during validation and fixed in this SDD: the development
    `TRUSTED_ORIGINS` example lacked `exp://`, which Expo Go uses as its
    origin. Without it, Better Auth would reject native sign-in through
    Expo Go as an untrusted origin (inferred from the configuration, not
    observed, because native sign-in was not exercised).
-   After a page reload, the "Lançamento salvo." confirmation remains
    visible because it comes from a URL parameter (cosmetic).
-   Known technical debt: TD-001 to TD-009 in
    `docs/engineering/TECHNICAL-DEBT.md`.
-   Production/staging hosting is not defined yet; v0.1.0 is validated in
    the development environment only.

## Release

Released to `main` on 2026-09-24 and tagged `v0.1.0`. The stacked PRs
#2 to #7 had been merged into their base branches; PR #8 integrated them
into `develop` with a tree identical to the validated candidate.
Android was later confirmed to load the app in Expo Go (bundle loaded
on the `Phone` emulator); the full journey remains Web-only.
