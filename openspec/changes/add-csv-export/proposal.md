# Change: CSV Export of Deployment History

## Why
Teams in regulated industries or with compliance requirements need to produce deployment
records for audits. Currently the only export is JSON (full project backup). A CSV export
of deployment history is directly usable in Excel, Google Sheets, and reporting tools
without parsing.

## What Changes
- Add an "Export CSV" button in the Deployment Status card header (next to the Refresh
  button)
- The CSV includes one row per deployment with columns: Batch, Pipeline, Repository,
  Environment, Branch, Build Number, Status, Duration, Started At, Completed At, Notes
- The download is generated entirely client-side (`Blob` + object URL) — no server needed
- An optional date-range filter dialog allows exporting only deployments within a chosen
  window (defaults to all)

## Impact
- Affected specs: `csv-export` (new capability)
- Affected code:
  - `src/components/DeploymentDashboard.tsx` — Export CSV button, `generateDeploymentCsv` utility, optional date filter dialog
