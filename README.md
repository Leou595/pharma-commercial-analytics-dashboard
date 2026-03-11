# Commercial Performance Executive Dashboard

A polished, interactive, front-end dashboard demo for anonymized biopharma commercial analytics. The project is designed as an executive-style monthly business review artifact for interviews, stakeholder walkthroughs, and portfolio use.

## Anonymization Note

This dashboard is inspired by the structural logic of a real workbook, but all sensitive business details are replaced with synthetic content:

- Fictional product names (`Product X/Y/Z/Q`)
- Fictional region/province/hospital/squad names
- Synthetic and internally consistent sales, targets, attainment, and growth metrics
- No real company logos, teams, employee names, or proprietary KPI formulas

## Tech Stack

- HTML5
- Tailwind CSS (CDN)
- Vanilla JavaScript
- Apache ECharts

## Project Structure

- `/Users/leouj/Documents/New project/index.html`
- `/Users/leouj/Documents/New project/data/dashboardData.js`
- `/Users/leouj/Documents/New project/js/state.js`
- `/Users/leouj/Documents/New project/js/charts.js`
- `/Users/leouj/Documents/New project/js/app.js`
- `/Users/leouj/Documents/New project/styles/custom.css`
- `/Users/leouj/Documents/New project/README.md`

## Dashboard Modules

1. Hero header with executive framing and controls
2. Global filter bar (Month / Quarter / YTD / Region / Province / Tier / Product / Form / Top N / Metric)
3. Executive KPI overview and pacing traffic-light indicator
4. Time trend (Sales vs Target vs Attainment)
5. Regional bubble performance (completion, growth, contribution)
6. Dosage form analysis (Injection vs Capsule)
7. Sales team analysis (productivity, coverage, squad KPIs)
8. Hospital tier segmentation analysis
9. Top growth hospital leaderboard with sortable table + row drill-down drawer
10. Underperforming alert cards for exception management

## Interaction Features

- Cross-filtering by chart click (region/province/dosage/tier/trend)
- Global filter propagation across all modules
- Sortable hospital leaderboard
- Hospital row drill-down mini trend panel
- Reset filters action
- Responsive desktop/tablet/mobile layout
- Light/Dark mode with system default and localStorage persistence
- Refined microinteractions (hover, transitions, reveal animation)

## How to Run Locally

1. Open terminal in project folder:
   - `cd "/Users/leouj/Documents/New project"`
2. Start a simple static server (recommended):
   - `python3 -m http.server 8000`
3. Open browser:
   - `http://localhost:8000`

You can also open `index.html` directly, but a local server is preferred for stable script loading.

## Deploy

### GitHub Pages

1. Push this folder to a GitHub repository.
2. In repo settings, enable **Pages**.
3. Set source to branch (e.g., `main`) and root `/`.
4. Access your published URL from GitHub Pages settings.

### Vercel

1. Import the GitHub repository into Vercel.
2. Framework preset: `Other` (static site).
3. Build command: none.
4. Output directory: root.
5. Deploy.

## Design Rationale

- Executive-first information hierarchy: KPI summary before diagnostics
- Controlled blue-led visual language for biopharma credibility
- Balanced depth: enough Tableau-style interactivity without SaaS over-complexity
- Clear, concise commercial analytics copy for professional discussions
- Modular code structure for easy extension (new segments, additional products, scenario layers)
