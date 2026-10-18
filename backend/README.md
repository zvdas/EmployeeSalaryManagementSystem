# ESMS Backend

REST API for the Employee Salary Management System: Node.js 22, Express 5, TypeScript, SQLite (better-sqlite3), zod.
The API contract lives in [`../docs/02-design-notes.md`](../docs/02-design-notes.md).

## Getting started

```bash
npm install
cp .env.example .env   # optional; defaults work out of the box
npm run dev            # http://localhost:3000/api/health
```

## Scripts

| Script                                | What it does                                        |
| ------------------------------------- | --------------------------------------------------- |
| `npm run dev`                         | Start the API with live reload (`tsx watch`)        |
| `npm run build`                       | Compile `src/` to `dist/` (`tsconfig.build.json`)   |
| `npm start`                           | Run the compiled server (`node dist/server.js`)     |
| `npm test` / `npm run test:watch`     | Run Vitest + Supertest tests (`tests/**/*.test.ts`) |
| `npm run lint`                        | ESLint (flat config, typescript-eslint)             |
| `npm run format`                      | Prettier                                            |
| `npm run typecheck`                   | `tsc --noEmit` over `src/` and `tests/`             |
| `npm run migrate`                     | Apply the DB schema (Phase 2; stub for now)         |
| `npm run seed` / `npm run seed:reset` | Seed deterministic data (Phase 2; stub for now)     |

## Environment variables

A `.env` file in this folder is loaded automatically (except when `NODE_ENV=test`).

| Variable      | Default                 | Notes                                           |
| ------------- | ----------------------- | ----------------------------------------------- |
| `PORT`        | `3000`                  | HTTP port                                       |
| `DB_PATH`     | `./data/esms.db`        | SQLite file (use `:memory:` for throwaway runs) |
| `CORS_ORIGIN` | `http://localhost:4200` | Allowed origin(s), comma-separated              |
| `NODE_ENV`    | `development`           | `development`, `production` or `test`           |

## Structure

```
src/
  app.ts               createApp({ db }) factory: middleware, /api router, 404 + error handler
  routes.ts            /api router; feature routers are mounted here
  server.ts            Entry point: listen on PORT, graceful SIGTERM/SIGINT shutdown
  config.ts            Typed, frozen config from env
  lib/errors.ts        AppError, NotFoundError, ValidationError, ConflictError
  middleware/
    errorHandler.ts    Maps errors to { error: { code, message, details? } }
    notFound.ts        Unknown routes -> 404 NOT_FOUND
  db/migrate.ts        (stub) schema migrations
  seed/seed.ts         (stub) seed script
tests/                 Vitest + Supertest
```

Every non-2xx response uses the shape `{ "error": { "code", "message", "details?" } }` with codes
`VALIDATION_ERROR` (400), `NOT_FOUND` (404), `CONFLICT` (409) and `INTERNAL_ERROR` (500).
