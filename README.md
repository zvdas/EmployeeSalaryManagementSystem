# ACME Employee Salary Management System

ACME's HR team manages salary data for 10,000 employees across 8 countries in spreadsheets. This web app replaces that. With it, the HR Manager can **maintain salary records** and **answer how the organisation pays people**.

- **Live demo:** https://acme-salary-management-ifym.onrender.com (Swagger: [/api/docs](https://acme-salary-management-ifym.onrender.com/api/docs/)). Free tier: allow 30–60 s to wake up; the database resets on restart, after which the app offers to load sample data.
- **Demo video:** [docs/demo/demo.webm](docs/demo/demo.webm) (2.5 min, recorded against the live site; open with **View raw** to play it in the browser). It was recorded automatically by a Playwright script ([docs/demo/record-demo.mjs](docs/demo/record-demo.mjs)) that follows the [demo script](docs/demo-script.md).

## Features
- **Employee directory:** server-side search, filters (country, department, job title), sorting and pagination over 10k rows.
- **Create / edit / delete** employees. The client and the server validate the same rules: the job title must belong to the department, emails must be unique, the salary must be a positive integer, and the hire date can't be in the future.
- **Multi-currency salaries:** stored in local currency (8 countries), with USD values calculated from static exchange rates for fair comparison.
- **Insights dashboard:**
  - org-wide KPIs
  - per-country min/max/average/median
  - pay by job title within a country
  - department headcount and payroll
  - salary distribution with outliers
  - Chart.js charts
- **CSV export** of the filtered list, with Excel-safe encoding and formula-injection protection.
- **Seed prompt:** on an empty database the UI offers to load 100 sample or 10,000 employees. The data is deterministic.
- **Swagger UI** at `/api/docs`, generated from the same zod schemas that validate requests.

## Tech stack
| | |
|---|---|
| Backend ([`backend/`](backend)) | Node.js 22, Express 5, TypeScript, SQLite (better-sqlite3), zod, Vitest + Supertest |
| Frontend ([`frontend/`](frontend)) | Angular 21 (standalone, signals, zoneless), Angular Material, ng2-charts, Jest |
| Deployment | Render blueprint ([`render.yaml`](render.yaml)): one web service where Express serves the API and the Angular build |

## Run locally
Requires Node **22.12+**.

```bash
# Terminal 1: API on http://localhost:3000/api (Swagger: /api/docs)
cd backend
npm install
npm run dev

# Terminal 2: UI on http://localhost:4200
cd frontend
npm install
npm start
```
Open http://localhost:4200. The app asks to load sample data when the database is empty. You can also seed from the CLI with `cd backend && npm run seed`.

**Production-like run (single process, bash syntax):**
```bash
cd frontend && npm run build
cd ../backend && npm run build
STATIC_DIR=../frontend/dist/frontend/browser npm start   # http://localhost:3000
```

## Tests and quality checks
```bash
cd backend  && npm test   # 161 tests: unit (stats, currency, CSV, generator, rules) + API (Supertest, in-memory DB)
cd frontend && npm test   # 115 tests: services, interceptor, components, dialogs, chart mappers
npm run typecheck && npm run lint   # in either folder
```
The tests are deterministic: they use in-memory databases, a fixed clock and a seeded random number generator, and need no network.

## Deploy (Render)
1. In the Render dashboard choose **New → Blueprint** and select this repository. Render reads `render.yaml`.
2. Wait for the build (both apps), then open the service URL. The seed prompt appears on first visit.

Free-tier caveats: the service sleeps when idle, so the first request takes 30–60 s, and **the disk is ephemeral**, so the database resets on every restart or deploy. Both are covered in the [trade-offs](docs/05-tradeoffs.md).

## Documentation
| Document | Contents |
|---|---|
| [01 Requirements](docs/01-requirements.md) | Goal, persona, scope, deliberate exclusions with reasons, success criteria |
| [02 Design notes](docs/02-design-notes.md) | Approach, data model, **API contract**, key decisions |
| [03 Architecture](docs/03-architecture.md) | Deployment, backend layers, frontend structure, request flows, ER diagram (Mermaid) |
| [04 AI prompts and usage](docs/04-ai-prompts.md) | How AI was used: clarifying questions, sub-agent prompts, review process, lessons |
| [05 Trade-offs](docs/05-tradeoffs.md) | What we chose, what it costs, when to revisit |
| [06 Performance](docs/06-performance.md) | Measured timings, what makes it fast, where it stops scaling |
| [Demo script](docs/demo-script.md) | Walkthrough for the video |

## How this was built
The work went in phases, each one committed in small steps:
1. Requirements, then design and the API contract.
2. Parallel backend and frontend scaffolds.
3. Core features, built by parallel AI agents in isolated git worktrees.
4. Integration and hardening.
5. Deployment and documentation.

The commit history shows that progression, and [docs/04-ai-prompts.md](docs/04-ai-prompts.md) records how the AI agents were directed and how their output was checked.

**Note: This is a Take-home assignment from a hiring process.**
