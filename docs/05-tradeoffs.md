# Trade-offs

Each decision lists what we chose, what we gave up, and when we would revisit it.

## Platform and architecture

| Decision | Why | Cost | Revisit when |
|---|---|---|---|
| **SQLite** instead of Postgres | No setup at all; one file; each test gets a fresh in-memory DB in microseconds. 10k rows is tiny for SQLite | One writer at a time; no managed backups; on Render the data lives on the instance's disk | More than one app instance, frequent concurrent writes, or a need for point-in-time recovery. The repositories hold plain SQL, so moving to Postgres is contained |
| **Hand-written SQL in repositories** instead of an ORM | The analytics SQL is the product; keeping it visible makes it easy to review and tune. better-sqlite3 is synchronous and fast | Row-to-type mapping is written by hand; no generated schema types | The schema grows past a handful of tables |
| **Layered modules** (routes → service → repository) | Business rules sit in one place and are unit-testable; HTTP and SQL stay thin | A little more boilerplate than putting the logic in the routes | — |
| **`createApp({ db, now })` dependency injection** | Tests are deterministic: an in-memory DB and a fixed clock, no mocks | Every caller passes its dependencies explicitly | — |
| **One Render service** (Express serves the Angular build) instead of separate API and static-site services | One URL; no CORS or build-time API URL; one free instance. The two-service setup needs each service's URL before either exists | The API and UI deploy together and can't scale separately | The UI moves to a CDN, or the API gets other consumers |
| **Render free tier** | No cost; deploys from GitHub | Sleeps after inactivity, so the first request is slow; **the disk is ephemeral** and the database is reset on every restart or deploy | Real use needs a persistent disk (paid) or a managed DB. `DB_PATH` is already configurable |

## Product scope

| Decision | Why | Cost |
|---|---|---|
| **No authentication** | There is one persona, and real auth (SSO/RBAC) is a large, already-solved problem that adds no insight here. The API is layered so auth middleware can be added in one place | The deployed demo is public; anyone with the URL can edit the demo data |
| **Current salary only** (no history) | Answers today's question, "how do we pay people?", with half the data model | No trend analysis or audit trail. History would be the next feature: a `salary_changes` table written by the service on every salary update |
| **Static FX rates** stored in the DB | Results are deterministic and testable, with no external dependency. USD is computed at query time, so changing a rate needs no data migration | USD figures are approximate and labelled as such in the UI |
| **Fixed department → job-title catalogue**, enforced on write | Analytics stay consistent; free text would split one title into "Software Engineer", "SW Engineer", "software engineer" | Adding a title needs a code change. A real system would manage the catalogue in the UI |
| **CSV export only** (no import) | Export keeps HR's Excel workflow working. Import means mapping, partial failures and duplicate reconciliation, which is a project of its own | Bulk changes go through the UI one record at a time |
| **Explicit seeding** (UI prompt or CLI) instead of seeding automatically at start-up | The user chooses a 100-row walkthrough or the full 10k; `POST /seed` refuses to run on a non-empty DB, so real data can't be overwritten | After a restart on the free tier, the first visitor has to click once |

## Implementation details

| Decision | Why | Cost |
|---|---|---|
| **Medians computed in TypeScript** | SQLite has no MEDIAN. A pure, unit-tested `stats.ts` is clearer than window-function SQL | Each group's salaries are fetched into memory; see [performance](06-performance.md) for limits |
| **`pageSize > 100` rejected (400)** rather than silently capped | Being explicit beats surprising the caller; the limit is in the OpenAPI spec | Clients must respect the limit |
| **The "not in the future" date check uses the latest calendar date anywhere (UTC+14)** | An HR manager in any time zone can enter today's date | A date up to about 14 hours ahead of UTC is accepted |
| **CSV: UTF-8 BOM and formula-injection guard** | Excel shows accented names correctly; cells starting with `= + - @` (or tab/CR) can't run as formulas | Such cells start with a visible `'` |
| **zod schemas generate the OpenAPI spec** | The docs can't drift from validation | Couples the docs to the zod-to-openapi library |
| **Jest instead of Angular's default test runner** | Requested stack; fast jsdom tests | Needs jest-preset-angular, which follows Angular releases with some delay |
| **Angular 21 (LTS) instead of 22** | Angular 22 needs Node ≥ 22.22.3; the dev machine and Render pin 22.14 | Upgrading later is routine with `ng update` |
| **Critical-CSS inlining turned off** | Angular's inlining adds an inline `onload` handler, which the strict CSP (`script-src-attr 'none'`) blocks | Slightly later first paint; the stylesheet is under 2 kB compressed (fonts load from Google Fonts) |
| **Error snackbar is global, with an opt-out for each request** | Every failure is visible by default, while forms show their own errors inline and nothing appears twice | Callers must remember to set the opt-out for statuses they handle themselves |
