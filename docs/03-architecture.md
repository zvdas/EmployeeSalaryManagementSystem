# Architecture

The diagrams are written in Mermaid, which GitHub renders inline.

## 1. System context and deployment
In production a single Node.js process serves both the REST API and the compiled Angular app. Locally the two run separately: `ng serve` on :4200 and the API on :3000, with CORS between them.

```mermaid
flowchart LR
  HR["HR Manager<br/>(browser)"]

  subgraph Render["Render web service (free tier)"]
    direction TB
    EX["Express 5 (Node 22)"]
    SPA["Angular build<br/>(STATIC_DIR)"]
    API["/api routers"]
    DB[("SQLite file<br/>ephemeral disk")]
    EX -->|"GET /, /employees, /insights …"| SPA
    EX -->|"/api/*"| API
    API --> DB
  end

  HR -->|HTTPS| EX
  GH["GitHub repo<br/>render.yaml"] -->|"push → build & deploy"| Render
```

## 2. Backend layers
Each feature module has the same three layers. Every layer depends only on the one below it, and the database is injected through `createApp({ db })`, so tests use an in-memory database with no mocks.

```mermaid
flowchart TB
  subgraph HTTP["HTTP layer"]
    MW["securityHeaders (helmet) → cors → json(100kb)"]
    VAL["validate(zod schemas) → res.locals.validated"]
    R["routes: employees · insights · meta · seed · docs"]
  end
  subgraph Domain["Business rules"]
    S["services: title must belong to the department, unique email → 409,<br/>hire date not in future (injected clock), seeding only into an empty DB"]
    LIB["lib: stats (median, quartiles, buckets, IQR) · currency · errors"]
  end
  subgraph Data["Data access"]
    REPO["repositories: parameterised SQL, whitelisted sort columns"]
    DBX[("better-sqlite3<br/>WAL, foreign keys")]
  end
  ERR["errorHandler → { error: { code, message, details } }"]

  MW --> VAL --> R --> S --> REPO --> DBX
  S --> LIB
  R -. throws .-> ERR
  S -. throws AppError .-> ERR
```

The same zod schemas feed both request validation and the generated OpenAPI document (`/api/openapi.json`, with Swagger UI at `/api/docs`). The docs therefore can't drift from what the API actually accepts.

| Folder (`backend/src`) | Responsibility |
|---|---|
| `domain/reference.ts` | Countries, FX rates, departments, job titles. This is the single source of the reference data; migrations upsert the countries from it |
| `db/` | Connection (pragmas), schema, migration runner |
| `modules/employees` | CRUD, list/filter/sort/paginate, CSV export |
| `modules/insights` | Aggregations: summary, by-country, by-job-title, by-department, distribution |
| `modules/meta`, `modules/seed` | Dropdown reference data; seed status and trigger |
| `seed/` | PRNG, pure generator, transactional insert, CLI |
| `docs/` | OpenAPI registry and generator |
| `middleware/` | Validation, errors, 404, security headers, SPA serving |

## 3. Frontend structure
```mermaid
flowchart TB
  APP["App shell<br/>toolbar + responsive sidenav"]
  APP --> EMP["/employees (lazy)"]
  APP --> INS["/insights (lazy)"]
  APP --> SEED["SeedPromptService<br/>(on start: status → dialog if empty)"]

  EMP --> FB["EmployeeFilterBar"]
  EMP --> FD["EmployeeFormDialog"]
  EMP --> CD["ConfirmDialog"]
  INS --> K["KpiCards"] & CS["CountryStats + chart"] & JT["JobTitleStats"] & DS["DepartmentStats + chart"] & SD["SalaryDistribution histogram"]

  subgraph Core["core/"]
    API["EmployeeApi · InsightsApi · Meta · SeedApi services"]
    INT["errorInterceptor (snackbar unless the caller shows errors inline)"]
    RL["refreshableLoad + DataRefreshService"]
  end
  EMP & INS & SEED --> API
  API --> INT
  EMP & INS --> RL
```

- **State:** signals and `computed`. Each list or insight section derives its request from signals, so a new request cancels the previous one (`switchMap`). The section also reloads whenever `DataRefreshService` changes, which happens after a seed, create, edit or delete.
- **Performance:**
  - Both feature routes are lazy-loaded.
  - Chart.js is provided only on the insights page, not app-wide, which keeps it out of the initial bundle.
  - All components use `OnPush`, and the app runs without zone.js.

## 4. Key request flows

### Start-up on an empty database (seed prompt)
```mermaid
sequenceDiagram
  actor HR as HR Manager
  participant UI as Angular app
  participant API as Express API
  participant DB as SQLite
  HR->>UI: open the app
  UI->>API: GET /api/seed/status
  API->>DB: SELECT COUNT(*) FROM employees
  API-->>UI: { employeeCount: 0, isEmpty: true }
  UI->>HR: dialog: "Load 100 sample" / "Load full 10,000"
  HR->>UI: choose 10,000
  UI->>API: POST /api/seed { count: 10000 }
  API->>DB: generateEmployees(10000, seed 42) → one transaction
  API-->>UI: 201 { inserted: 10000 }
  UI->>UI: DataRefreshService.bump() → list and insights reload
```

### Editing an employee (validation round-trip)
```mermaid
sequenceDiagram
  participant F as EmployeeFormDialog
  participant API as PUT /api/employees/:id
  participant S as EmployeeService
  participant R as EmployeeRepository
  F->>F: client validators (required, email, integer salary, date not in future)
  F->>API: EmployeeInput
  API->>API: zod parse (400 VALIDATION_ERROR with details[].path)
  API->>S: update(id, input)
  S->>S: country exists? title belongs to department? (400)
  S->>R: findByEmail → another employee? (409 CONFLICT)
  S->>R: UPDATE … WHERE id = ? (404 if no row)
  R-->>F: Employee (with derived currency and annualSalaryUsd)
  Note over F: 400 details map onto form controls and 409 onto the email field,<br/>shown inline only (the interceptor skips its snackbar)
```

## 5. Data model
```mermaid
erDiagram
  COUNTRIES ||--o{ EMPLOYEES : "pays in"
  COUNTRIES {
    TEXT code PK "ISO 3166-1 alpha-2"
    TEXT name
    TEXT currency "ISO 4217"
    REAL usd_rate "USD per 1 unit"
  }
  EMPLOYEES {
    INTEGER id PK
    TEXT employee_code UK "EMP-000001"
    TEXT full_name
    TEXT email UK "COLLATE NOCASE"
    TEXT job_title
    TEXT department
    TEXT country_code FK
    INTEGER annual_salary "local currency, > 0"
    TEXT employment_type
    TEXT hire_date "YYYY-MM-DD"
    TEXT created_at
    TEXT updated_at
  }
  SCHEMA_MIGRATIONS {
    INTEGER version PK
    TEXT name
    TEXT applied_at
  }
```
Indexes: `(country_code, job_title)`, `(department)` and `(full_name)`. USD amounts are never stored. They are computed at query time as `annual_salary × usd_rate`, so updating a rate needs no data migration.
