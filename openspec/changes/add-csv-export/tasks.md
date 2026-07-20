## 1. CSV generation utility

- [ ] 1.1 Add `generateDeploymentCsv(deployments: Deployment[], project: Project): string` pure function in `DeploymentDashboard.tsx` (or extract to `lib/csv.ts`)
- [ ] 1.2 Columns (in order): `Batch`, `Batch Number`, `Pipeline`, `Repository`, `Environment`, `Branch`, `Build Number`, `Status`, `Duration (s)`, `Started At`, `Completed At`, `Notes`
- [ ] 1.3 Duration column: `completedAt - startedAt` in whole seconds; empty string if no `completedAt`
- [ ] 1.4 Started/Completed columns: ISO 8601 strings (`new Date(ts).toISOString()`)
- [ ] 1.5 Escape cell values: wrap in double-quotes, escape inner double-quotes with `""`
- [ ] 1.6 Batch Number column: compute from `sortedBatchIds` (same `#N` numbering shown in the UI)

## 2. Download trigger

- [ ] 2.1 Add a `Download` icon button labelled "Export CSV" in the Deployment Status card header (between the bell icon and the Refresh button); only shown when `deployments.length > 0`
- [ ] 2.2 On click, call `generateDeploymentCsv`, create a `Blob` with `type: 'text/csv'`, create an object URL, trigger a download via a temporary `<a>` element, then revoke the URL
- [ ] 2.3 Name the file `deployments-{project.name}-{YYYY-MM-DD}.csv`

## 3. Optional date range filter

- [ ] 3.1 Add a date range `Dialog` triggered by a small calendar icon next to the Export CSV button
- [ ] 3.2 The dialog has "From" and "To" date inputs (type="date") defaulting to all-time (empty)
- [ ] 3.3 On confirm, filter `deployments` to those whose `startedAt` falls within the range before generating the CSV
- [ ] 3.4 The dialog has "Export All" shortcut button that skips the filter and exports the full history
