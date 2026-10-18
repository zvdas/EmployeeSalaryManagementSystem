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
