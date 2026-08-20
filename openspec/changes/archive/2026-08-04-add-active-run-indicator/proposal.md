# Change: Active Pipeline Run Indicator

## Why
The dashboard has no visibility into workflow runs triggered externally (pushes, PRs, other users, scheduled triggers). Teams need to know whether a pipeline is already executing before deciding to redeploy, and they want live status tracking without leaving the dashboard.

## What Changes
- Add a per-pipeline active run banner inside each pipeline card, displayed between the workflow inputs and the deploy button
- Banner shows the most recent `in_progress` or `queued` run with: status badge, run title, branch, actor, live elapsed time, and a link to the GitHub Actions run page
- Fetch active runs via `getWorkflowRuns()` on project load and refresh on the existing adaptive polling cycle (10–30s) — no new polling timer
- Extend `GitHubWorkflowRun` interface to include `actor` and `triggering_actor` fields
- Add optional `statusFilter` parameter to `getWorkflowRuns()` for targeted API queries

## Impact
- Affected specs: `active-run-indicator` (new capability)
- Affected code:
  - `src/lib/github.ts` — `GitHubWorkflowRun` interface, `getWorkflowRuns()` signature
  - `src/components/DeploymentDashboard.tsx` — new state, fetch logic, polling integration, pipeline card JSX
