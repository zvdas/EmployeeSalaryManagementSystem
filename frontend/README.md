# ACME Salary Management – Frontend

Angular 21 (standalone components, signals, zoneless) + Angular Material 3 + ng2-charts. Tests run on Jest.
See [`../docs/02-design-notes.md`](../docs/02-design-notes.md) for the API contract and frontend design.

## Scripts
| Command | What it does |
|---|---|
| `npm start` | Dev server on http://localhost:4200 (expects the API on http://localhost:3000/api) |
| `npm run build` | Production build to `dist/frontend/browser` |
| `npm run watch` | Development build in watch mode |
| `npm test` | Jest unit tests (`npm run test:watch` for watch mode) |
| `npm run lint` | ESLint via angular-eslint |

Requires Node 22.12+ and npm 10+.

## Structure
```
src/
  environments/          environment.ts (dev) / environment.prod.ts (production)
  app/
    app.ts|html|scss     shell: toolbar, responsive side nav, router outlet
    app.config.ts        router, HttpClient (fetch), Chart.js registration
    app.routes.ts        '' -> employees, lazy /employees and /insights, ** -> employees
    core/models/         API types mirroring §4 of the design notes (barrel: index.ts)
    features/
      employees/         employee directory (placeholder)
      insights/          insights dashboard (placeholder)
```

## Environment config
`src/environments/environment.ts` holds `apiUrl` (`http://localhost:3000/api` in development).
Production builds swap in `environment.prod.ts` via `fileReplacements` in `angular.json`;
its `apiUrl` is currently the placeholder `/api` and will be injected at build time when deployment is set up.
The "API Docs" nav link opens `${apiUrl}/docs` (Swagger UI).
