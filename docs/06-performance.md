# Performance Considerations

The target from the requirements: list and insight queries respond in **under 200 ms** on 10,000 employees, and seeding 10k takes **under 2 s**.

## Measured results (local, Windows 11, Node 22.14, file-backed SQLite in WAL mode)

| Operation | Time |
|---|---|
| Seed 10,000 employees (generate + insert in one transaction) | 160–340 ms |
| `GET /employees` with search, filters and sort (page of 25) | 2–8 ms |
| `GET /insights/summary` | ~10–14 ms |
| `GET /insights/by-country` | 12–18 ms |
| `GET /insights/by-job-title?country=…` | ~5 ms |
| `GET /insights/by-department` | 13–28 ms |
| `GET /insights/distribution` | ~8 ms |
| `GET /employees/export.csv` (all 10,000 rows, ~1.5 MB) | ~85 ms |
| Backend test suite (161 tests) | ~5–6 s wall clock, of which the tests themselves take ~2 s |
| Frontend production bundle | 149 kB compressed for the initial load; each route is a lazy chunk |

All endpoints are 7–20× faster than the 200 ms target. The insights figures were also checked against direct SQL (see the Phase 3 notes in [04-ai-prompts.md](04-ai-prompts.md)).

## What makes it fast

### Database
- **Indexes match the access patterns:**
  - `(country_code, job_title)` serves the country filter, the job-title filter within a country, and the "job title in a country" insight.
  - `(department)` serves the department filter and breakdown.
  - `(full_name)` serves the default sort.
- **WAL mode:** readers don't block the writer. A `busy_timeout` handles brief contention.
- **Prepared, parameterised statements.** better-sqlite3 runs them synchronously inside the Node process, so there is no network hop to a DB server.
- **The seed runs in one transaction with a reused prepared statement.** Inserting row by row with autocommit would be about 100× slower.
- **Derived values are computed in SQL, not stored.** `annual_salary × usd_rate` is computed per row in the query, so updating an FX rate costs nothing.

### API
- **Server-side pagination** (max 100 rows per page). The browser never receives 10k rows, and the matching `COUNT(*)` uses the same WHERE clause.
- **Aggregates in SQL** (`COUNT`, `MIN`, `MAX`, `SUM`, `AVG`, `GROUP BY`). For medians and quartiles, each group's salaries are fetched already sorted (`ORDER BY`) and the middle value is picked in TypeScript, which is O(n) per group with no sorting in JS.
- **CSV export is streamed** with `.iterate()`, so the full result is never held as one array.
- **Body size limit** of 100 kB on JSON requests.

### Frontend
- **Lazy routes.** Chart.js (~180 kB) is provided only on the insights page, which cut the initial bundle from 804 kB to about 600 kB raw.
- **Zoneless change detection, `OnPush` everywhere, signals.** Only the affected views re-render.
- **The 300 ms search debounce and request cancellation** (`switchMap`) avoid a request per keystroke and stop stale responses from overwriting newer ones.
- **`/meta` (the dropdown data) is fetched once** and cached for the whole session.

## Where this design stops scaling, and what we'd do next

| Pressure | Symptom | Next step |
|---|---|---|
| ~100k+ employees | Medians fetch every salary in a group; `LIKE '%term%'` search can't use an index | Precompute aggregates in a summary table refreshed on write, or move to Postgres (`percentile_cont`); use FTS5 or trigram indexes for search |
| Deep pagination (page 400+) | `OFFSET` scans skipped rows | Keyset (cursor) pagination on `(sort_key, id)` |
| Many concurrent editors | SQLite allows a single writer | Postgres, a connection pool, horizontal API instances |
| Many simultaneous large exports | Each export holds the shared synchronous connection for ~85 ms | Background export job with a download link, or a read replica |
| Heavy dashboard traffic | Insights are recomputed on every request | Short-lived cache (e.g. 60 s), cleared on write |
| Free-tier cold start | First request after sleeping takes 30–60 s | Paid instance (always on) |
