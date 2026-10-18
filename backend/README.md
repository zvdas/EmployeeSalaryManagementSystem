# ESMS Backend

REST API for the Employee Salary Management System: Node.js 22, Express 5, TypeScript, SQLite (better-sqlite3), zod.
The API contract lives in [`../docs/02-design-notes.md`](../docs/02-design-notes.md).

## Getting started

```bash
npm install
cp .env.example .env   # optional; defaults work out of the box
npm run seed           # optional: 10,000 deterministic employees (the UI can also seed)
npm run dev            # http://localhost:3000/api/health
```

The server creates the SQLite file and applies migrations on start-up. It never seeds automatically:
seed from the CLI, or from the UI (`POST /api/seed`), which only works on an empty database.

- Swagger UI: http://localhost:3000/api/docs
- OpenAPI document: http://localhost:3000/api/openapi.json

## Scripts

| Script                            | What it does                                                           |
| --------------------------------- | ---------------------------------------------------------------------- |
| `npm run dev`                     | Start the API with live reload (`tsx watch`)                           |
| `npm run build`                   | Compile `src/` to `dist/` (`tsconfig.build.json`)                      |
| `npm start`                       | Run the compiled server (`node dist/server.js`)                        |
| `npm test` / `npm run test:watch` | Run Vitest + Supertest tests (`tests/**/*.test.ts`)                    |
| `npm run lint`                    | ESLint (flat config, typescript-eslint)                                |
| `npm run format`                  | Prettier                                                               |
| `npm run typecheck`               | `tsc --noEmit` over `src/` and `tests/`                                |
| `npm run migrate`                 | Apply pending migrations to `DB_PATH` (also `node dist/db/migrate.js`) |
| `npm run seed -- --count=N`       | Seed N employees (default 10,000); refuses if employees exist          |
| `npm run seed:reset`              | Delete all employees, then seed 10,000 again                           |

Seeding is deterministic (mulberry32, seed 42): the same count always produces the same rows.
10,000 rows insert in a single transaction in well under a second.

## Environment variables

A `.env` file in this folder is loaded automatically (except when `NODE_ENV=test`).

| Variable      | Default                 | Notes                                                              |
| ------------- | ----------------------- | ------------------------------------------------------------------ |
| `PORT`        | `3000`                  | HTTP port                                                          |
| `DB_PATH`     | `./data/esms.db`        | SQLite file (use `:memory:` for throwaway runs)                    |
| `CORS_ORIGIN` | `http://localhost:4200` | Allowed origin(s), comma-separated                                 |
| `NODE_ENV`    | `development`           | `development`, `production` or `test`                              |
| `STATIC_DIR`  | unset                   | Built Angular app to serve next to the API (single-service deploy) |

## Structure

Each feature module is layered **routes** (HTTP only) → **service** (business rules) →
**repository** (parameterised SQL only).

```
src/
  app.ts                 createApp({ db, now?, staticDir? }) factory: middleware, /api router, 404 + errors
  routes.ts              /api router: wires repositories, services and module routers
  server.ts              Entry point: open DB_PATH, migrate, listen; graceful shutdown
  config.ts              Typed, frozen config from env
  domain/reference.ts    Countries (FX rates), departments, job titles, employment types
  db/
    connection.ts        openDatabase(path) / openInMemoryDatabase() with pragmas
    schema.ts            Ordered migrations (SQL as TS, so they ship in dist/)
    migrator.ts          runMigrations(db): idempotent; mirrors countries from reference.ts
    migrate.ts           CLI
  seed/
    prng.ts, names.ts    mulberry32 PRNG and name pools
    generator.ts         Pure generateEmployees(count, seed)
    seedDatabase.ts      Transactional inserts, shared by the CLI and POST /api/seed
    seed.ts              CLI
  modules/
    employees/           CRUD, list (search/filter/sort/paginate) and CSV export
    insights/            Summary, by-country, by-job-title, by-department, distribution
    meta/                Reference data for the UI
    seed/                Seed status and trigger
  docs/                  OpenAPI document built from the zod schemas + Swagger UI
  lib/
    errors.ts            AppError, NotFoundError, ValidationError, ConflictError
    stats.ts             median, percentile, histogram, IQR outliers (pure)
    currency.ts          toUsd / roundMoney
    csv.ts               RFC 4180 rows with formula-injection protection
    zod.ts               zod extended with .openapi() (import z from here)
  middleware/
    validate.ts          validate({ body, query, params }) -> res.locals.validated
    errorHandler.ts      Maps errors to { error: { code, message, details? } }
    securityHeaders.ts   Helmet; relaxed CSP for /api/docs only
    notFound.ts          Unknown routes -> 404 NOT_FOUND
tests/                   Vitest + Supertest against in-memory SQLite (tests/helpers)
```

## Notes

- **Money.** Salaries are stored as integers in local currency. USD values are derived at query time
  (`annual_salary * usd_rate`) and every monetary average/median is rounded to an integer.
- **Medians** are computed in TypeScript (`lib/stats.ts`) from sorted salary lists returned by SQL,
  since SQLite has no `MEDIAN`. Counts, min, max and sums use SQL aggregates.
- **Validation.** zod checks the request shape; the service adds rules that need reference data or
  the clock (known country, title belongs to department, hire date not in the future) and email
  uniqueness (409). "Future" is judged against the latest calendar date anywhere (UTC+14), so a
  manager in any time zone can enter today's date.
- **List paging.** `pageSize` above 100 is rejected with 400 rather than silently capped.
- **CSV export** starts with a UTF-8 BOM so Excel detects the encoding, and text cells beginning
  with `= + - @` (or tab/CR) are prefixed with `'` to prevent formula injection.

Every non-2xx response uses the shape `{ "error": { "code", "message", "details?" } }` with codes
`VALIDATION_ERROR` (400), `NOT_FOUND` (404), `CONFLICT` (409) and `INTERNAL_ERROR` (500).
