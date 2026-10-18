# Demo Video Script (~5 minutes)

A walkthrough to record against the deployed app, or locally. **Tip:** on Render's free tier, open the URL a minute before recording to wake the service. After a restart the database is empty, which is exactly what scene 1 needs.

| # | Time | Show | Say |
|---|---|---|---|
| 1 | 0:00 | Open the app; the **"Your database is empty"** dialog appears | "ACME's HR team manages 10,000 salaries across 8 countries in Excel. This is the web app replacing that. On an empty database it asks how much sample data to load." Click **Load full 10,000**; the snackbar shows "Loaded 10,000 employees" |
| 2 | 0:30 | Employee list; paginator shows "1 – 25 of 10,000" | "Everything is paginated, sorted and filtered on the server, so it stays instant at 10k rows." |
| 3 | 0:50 | Type a name in Search; pick **Country: India**, **Department: Engineering**, **Job title: Software Engineer** | "Search covers name, email and employee code. The job-title options follow the chosen department." Point out the salary column: local currency (₹) with the USD figure beneath |
| 4 | 1:30 | Sort by **Salary** descending | "Salary sorts by the USD value, so the comparison is fair across currencies." |
| 5 | 1:50 | **Add employee** → try to save with an invalid email, a salary of 0 and a future hire date | Show the inline validation messages. Then fill it in correctly (Germany: the field shows EUR) and save |
| 6 | 2:30 | Add another employee with an email that already exists | "Duplicate emails are rejected by the server; the error appears on the field itself." |
| 7 | 2:50 | Edit an employee's salary; delete one (confirm dialog) | "Every change is validated on the server as well; deleting asks for confirmation." |
| 8 | 3:10 | **Export CSV** with a filter applied; open the file in Excel | "HR can still take the data into Excel: the filtered list, with both currencies." |
| 9 | 3:30 | **Insights** page: KPI cards | "Here's how the org pays people: headcount, total annual payroll, average and median salary, all normalised to USD." |
| 10 | 3:50 | **By country** table and chart | "Min, max, average and median per country in local currency, plus USD for comparison. The chart compares average with median." |
| 11 | 4:10 | **Job titles in a country**: choose Germany | "This answers questions like: what do we pay a Software Engineer in Germany?" |
| 12 | 4:30 | **Departments** (filter to US) and **Salary distribution** histogram with the outlier note | "Which department costs the most, and how salaries are spread, including outliers." |
| 13 | 4:50 | Click **API Docs**: Swagger UI; run `GET /insights/summary` with "Try it out" | "Every endpoint is documented and testable. The docs are generated from the same schemas that validate requests." |
| 14 | 5:10 | Briefly show the GitHub repo: `docs/`, commit history, the test command | "Requirements came first, then design, then incremental commits with tests at each step: 161 backend and 115 frontend tests." |
