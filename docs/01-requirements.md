# Requirements: ACME Employee Salary Management

## Goal
Replace the Excel workbooks that ACME's HR team uses for salary data with a web application. With it, the **HR Manager** can:
1. reliably maintain salary records for about **10,000 employees across several countries**, and
2. quickly answer questions about **how the organisation pays people**.

## Persona
**HR Manager.** Comfortable with spreadsheets, not technical. Needs accurate data, quick lookups and comparisons that are easy to defend, e.g. "What do we pay Software Engineers in India compared with Germany?"

## Problems with the current Excel process
- Edits are manual and error-prone. Nothing validates fields, so emails can be duplicated and salaries can be negative or blank.
- With 10k rows spread over several sheets, finding and filtering data is slow.
- Comparisons across countries mix currencies, so answers are inconsistent.
- Every analysis question needs a hand-built pivot table.

## In scope (MVP)
| # | Feature | Why |
|---|---|---|
| F1 | **Employee directory**: server-side paginated table with search by name/email/code, filters by country, department and job title, and sorting | Find any of 10k records in seconds |
| F2 | **Create / edit / delete** an employee, with validation (required fields, valid country, salary > 0, unique email) | Replaces manual spreadsheet edits and catches data errors |
| F3 | **Multi-currency salaries**: each salary is stored in its local currency, and a static FX table normalises it to USD | Local figures stay accurate, and cross-country comparisons become fair |
| F4 | **Insights dashboard**: org summary (headcount, payroll, average/median); stats per country (min/max/avg/median); stats per job title within a country; department headcount and payroll; salary distribution histogram | Answers "how do we pay people?" without pivot tables |
| F5 | **CSV export** of the filtered list | HR still shares data in Excel; export keeps that workflow working |
| F6 | **Seeding**: deterministic 10,000-employee seed script. When the database is empty, the UI asks whether to load a 100-row sample or the full 10,000 | Realistic demo data; a quick option for walkthroughs |
| F7 | **API documentation**: Swagger UI generated from the validation schemas | Anyone can explore and test the API; the docs cannot drift from the code |

## Deliberately out of scope (and why)
| Excluded | Reasoning |
|---|---|
| Authentication / roles | There is a single persona (HR Manager). Real auth (SSO/RBAC) is a solved but large problem that adds no product insight here. The API is structured so middleware can be added later. |
| Salary history / audit trail | Valuable, but it doubles the data model. The MVP answers questions about *current* pay. History would be the next feature. |
| CSV/Excel bulk import | Validating and reconciling imports (partial failures, duplicates, mapping) is a project of its own. Export covers the immediate need. |
| Live FX rates | Live rates add an external dependency and make results non-deterministic. Static rates are clearly labelled, and that is enough for comparing pay structures. |
| Payroll, tax, benefits, bonuses | ACME needs *salary management and analysis*, not payroll processing. |
| Multi-tenant / multi-org | The software is for one organisation. |
| Data persistence on the free hosting tier | The demo deployment uses an ephemeral disk, and the seed prompt recreates data on restart. A production deployment would use a persistent volume or a managed database. |

## Non-functional requirements
- **Performance:** list and insight queries return in under 200 ms on 10k rows. Seeding 10k rows takes under 2 s.
- **Quality:** unit and API tests for the core logic (validation, statistics, currency conversion, seeding, endpoints). Tests are fast, deterministic and need no network.
- **Usability:** clean Material UI, consistent currency formatting, helpful validation and error messages.
- **Deployability:** one-click Render blueprint, with the backend and frontend in separate folders.

## Success criteria
- The HR Manager can find, add, edit and remove an employee without help.
- The HR Manager can answer, in under a minute:
  - What are the minimum, maximum and average salary in a given country?
  - What is the average salary for a job title in a given country?
  - Which department costs the most?
- Everything above works on the deployed URL with 10,000 seeded employees.
