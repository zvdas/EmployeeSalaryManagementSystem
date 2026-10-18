# AI Usage: Prompts and Instructions

This project was built with **Claude Code**, an agentic coding tool. This document records how AI was used, what it was asked to do, and how its output was checked.

## Principles followed
1. **Human decisions, AI execution.** Before any code was written, the AI was told to ask clarifying questions instead of assuming. Every architectural choice below was made by a person.
2. **Contract first.** A frozen API contract ([02-design-notes.md](02-design-notes.md)) let parallel agents build the backend and frontend without drifting apart.
3. **Agents don't commit.** Sub-agents write code in disjoint folders. The orchestrating session reviews the diff, runs the tests, and commits in small milestones.
4. **Tests are the acceptance gate.** No milestone was committed until its tests passed.

## 1. Initial prompt
> I need you to draft for me the structure for a web based salary management software to be used in an organization having 10000 employees across multiple countries. The HR manager should be able to manage the salaries data and answer questions about how the organisation pays people. It should be end-to-end fully functioning deployed software with a backend (Node.js with express) and UI (Angular). You may use an SQL relational database. Also ready a seed script for 10000 employees. Ensure that there is a set of meaningful unit tests that cover the core functionality, the tests are fast, deterministic and easy to understand, and that the code is up to industry standards with good structure, readability and maintainability. Also ensure that you create the following documents: Requirements document, Planning or design notes, Architecture diagrams, Prompts or instructions used with AI tools, Trade-off explanations, Performance considerations. […] One folder should be created in the repository for the frontend and another for the backend.
>
> Use dynamic workflows and generate a detailed plan. The app doesn't need to be complex, just needs to provide the main deliverables. A document is attached highlighting anything that may have been missed. Ask me clarifying questions; do not assume unless asked otherwise.

The assessment brief (PDF) was attached as context.

## 2. Clarifying questions (AI asked, human answered)
| Question | Options offered | Decision |
|---|---|---|
| Database | SQLite / PostgreSQL | **SQLite** |
| Deployment | Render / Railway-Fly / Docker only / Vercel + API host | **Render** |
| Backend language | TypeScript / JavaScript | **TypeScript** |
| UI library | Angular Material / PrimeNG / Bootstrap | **Angular Material** |
| Cross-currency comparison | Local + USD via static rates / local only / USD only | **Local + USD via static rates** |
| Authentication | None (documented) / simple login | **None, documented as out of scope** |
| Persistence on the free tier | Auto-seed on boot / paid disk | Auto-seed. **Later refined:** prompt the user in the UI |
| Insights | by country, by title in country, department, distribution | **All four** |
| Data access | better-sqlite3 + repository / Prisma / Knex | **better-sqlite3 + repository** |
| Tests | Vitest+Supertest/Jest / Jest everywhere / Karma | **Vitest + Supertest, Jest for Angular** |
| Git | Commit per step, push at end / push each milestone / local only | **Commit per step, push after confirmation** |
| Workflow | Parallel subagents / phase check-ins / both | **Both** |
| Salary history | Current only / history table | **Current only** |
| CSV | Export only / import + export / neither | **Export only** |
| Charts | Chart.js (ng2-charts) / tables only | **Chart.js** |

### Plan revision requested by the human
On reviewing the first plan, the user asked for:
- a **Swagger UI route** for testing every API call. Decision: **generate it from the zod schemas**.
- a **seed prompt when the DB is empty**, letting the user choose 100 or 10,000 employees. Decision: **a UI dialog on app load**, because Render has no interactive terminal.

## 3. Sub-agent prompts
The prompts given to each implementation agent are appended below as they are issued.

### Phase 1: Scaffolding (two agents in parallel)
Both agents received the same guardrails:
- Read `02-design-notes.md` first; it is the frozen contract.
- Work **only** in your own folder; don't touch the other agent's folder.
- **Never run state-changing git commands.** The orchestrator reviews and commits.
- Scaffold only; don't implement Phase 2 features early.
- Never block on an interactive prompt.
- Before reporting, run every verification command (install, typecheck, lint, test, build, smoke-run) and fix any failures.
- Finish with a concise report: versions installed, pass/fail output, and any deviations.

**Backend agent (summary of the prompt)**
> Scaffold `backend/`:
> - Express 5 + TypeScript (strict). Dependencies for later phases installed up front (zod, better-sqlite3, helmet, cors, swagger-ui-express, zod-to-openapi). Check that zod-to-openapi works with the installed zod major, and that better-sqlite3's native binary loads on Windows.
> - `config.ts`, plus an `AppError` hierarchy (`NotFound`, `Validation`, `Conflict`).
> - `errorHandler`, which maps AppError, ZodError and malformed JSON into the contract's error shape and returns 500 without leaking stacks; plus `notFound`.
> - A `createApp({ db })` factory with `GET /api/health`.
> - `server.ts` with graceful SIGTERM handling.
> - ESLint (flat config) + Prettier, and Vitest + Supertest tests for health, 404 and the error mapping.

**Frontend agent (summary of the prompt)**
> Scaffold `frontend/` with the latest stable Angular CLI:
> - standalone, routing, SCSS, no SSR, strict, `--skip-git`
> - Angular Material via `ng add`; ng2-charts registered with `provideCharts`
> - **Replace the CLI's default test runner with Jest** (jest-preset-angular)
> - environment files with `apiUrl`, and `provideHttpClient(withFetch())`
> - TypeScript models mirroring §4 of the contract *exactly*
> - responsive Material shell (toolbar + sidenav: Employees, Insights, API Docs link) with lazy-loaded placeholder routes
> - Jest tests for the shell and routes; Prettier config

### Phase 2: Core features (two agents in parallel, each in its own git worktree)
**Process change:** I wanted milestone-sized commits while the two agents worked at the same time. So each agent ran in an **isolated git worktree** and committed its own milestones on its own branch. Every milestone had a fixed commit subject, and the agent had to pass `typecheck && lint && test` before each commit. The orchestrator then reviewed both branches, re-ran every check, and merged them into `main`. The agents touch separate folders, so the merge cannot conflict.

**Backend agent (summary of the prompt)**
> Implement these milestones, committing after each:
> 1. **Schema and migrations.** Reference data in one TS module; countries upserted during migration; idempotent migrations that work from `dist/`; `createApp({ db })` now needs a DB.
> 2. **Deterministic seed.** A *pure* `generateEmployees(count, seed)` using mulberry32. Weighted countries and employment types. Salary = base × country factor × jitter ÷ FX. Hire dates come only from the PRNG, never `Date.now`. Insert in a single transaction; CLI with `--count`.
> 3. **CRUD.** Routes → service → repository. zod validation with a reusable middleware; parsed values go on `res.locals`, because Express 5's `req.query` is read-only. Business rules: title must belong to the department; duplicate email → 409. An injected clock for the "not in the future" rule. Parameterised SQL with a whitelist of sort columns. Plus `/meta`.
> 4. **Insights.** Pure `stats.ts` (median, quartiles, buckets, IQR outliers); SQL aggregates; medians computed in TS. Tests use a hand-built fixture whose expected numbers are **worked out by hand inside the test**.
> 5. **CSV export.** Streamed with `.iterate()`, RFC 4180 escaping, and **CSV formula-injection protection**.
> 6. **Seed endpoints.** `count` accepts only `100 | 10000`; 409 if the DB is not empty.
> 7. **OpenAPI** generated from the *same* zod schemas, Swagger UI at `/api/docs`, with the CSP relaxed only on that route.
>
> Final check: seed twice from scratch and compare hashes (determinism), then time the endpoints against 10k rows.

**Frontend agent (summary of the prompt)**
> Build strictly against the contract; the backend is not available. Use zoneless signals, OnPush, `inject()`, new control flow, typed reactive forms, and no `any`. Milestones, committing after each:
> 1. **Core.** API services (empty filters left out of query params), an error interceptor that shows a snackbar with the contract's `error.message`, a money pipe, and a data-refresh signal.
> 2. **Employee list.** Server-side sort and paginator, debounced search, job-title options that depend on the department, and cancellation of in-flight requests.
> 3. **Dialogs.** Create/edit with validators mirroring the server. `YYYY-MM-DD` built from *local* date parts to avoid the UTC off-by-one bug. A 409 response maps to an error on the email field. Delete confirmation, and a CSV download via a blob.
> 4. **Insights dashboard.** KPI cards, country/title/department tables, Chart.js bar charts and a histogram. The chart-data mappers are pure functions with their own tests.
> 5. **Seed prompt.** A non-blocking status check on startup; a `disableClose` dialog offering 100 or 10,000; refresh on success.

### Phase 3: Integration and hardening (done by the orchestrator, not delegated)
Integration needs a view of both halves at once, so I did this phase myself instead of handing it to an agent.
- **Contract check:** the backend's validation `details[].path` values are plain field names (`email`, `countryCode`), which match the frontend's form-control mapping.
- **Live run:** the built API ran against a fresh database, alongside `ng serve`. I exercised every flow over HTTP:
  - the seed status, trigger and 409 paths
  - employee create/update/delete, including the 400 and 409 cases
  - each insights endpoint
  - CSV export, including the CORS-exposed `Content-Disposition`
  - Swagger
- **Cross-check against the database:** the insights numbers were compared with direct SQL queries and match exactly.
- **UI check:** both pages were rendered in headless Chrome. The seed dialog was checked against an empty database.
- **Fixes:**
  - errors that are already shown inline are no longer also shown in a snackbar
  - a negative low outlier threshold is hidden
  - the empty-directory message differs from the no-filter-match message
  - Vitest shares workers across files
  - Angular CLI analytics are pinned off
- **Lesson:** the first live run accidentally hit a dev server *the user* had started on the same ports. Further runs used separate ports and a scratch database.

### Phase 4: Deployment and documentation (orchestrator)
- **Deployment shape changed, with the user's approval.** The plan had two Render services. While writing the blueprint, it became clear that each service needs the other's URL before either exists. The AI asked the user instead of picking for them; the user chose **one service** in which Express serves the Angular build.
- **A CSP issue caught before deploying.** Angular's critical-CSS inlining adds an inline `onload` handler, which helmet's `script-src-attr 'none'` blocks, leaving the page unstyled. We disabled inlining rather than loosen the CSP. A production-mode run in headless Chrome confirmed the fix.
- **Docs written from measurements, not estimates.** Every timing in `06-performance.md` was measured during Phase 2–4 runs. Claims were checked against the code (pragmas, ORDER BY usage, stylesheet size) and one figure was corrected.

## 4. What worked and what didn't
- **Worked:**
  - A frozen API contract let two agents build the backend and frontend in parallel with **no integration bugs**. The only Phase 3 fixes were UX polish.
  - Requiring every agent to run typecheck, lint and tests before each commit kept every milestone green.
  - The agents reported their deviations from the contract explicitly. Examples: rejecting `pageSize > 100` instead of capping it, and moving Chart.js out of the initial bundle. That made review quick.
- **Needed human correction:**
  - The first plan was missing Swagger and a choice of seed size.
  - The deployment shape had to change.
  - A live test accidentally hit the user's own running dev server.
- **Verified rather than trusted:** every agent report was re-checked by re-running the full suites on the merged `main`, and insight figures were checked against independent SQL.
