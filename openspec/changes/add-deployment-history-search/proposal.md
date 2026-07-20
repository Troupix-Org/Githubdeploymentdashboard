# Change: Deployment History Search and Filter

## Why
Deployment history grows quickly for active projects. Currently users must scroll through
all batches to find a specific build, pipeline, or failure. A search/filter bar would make
the history actionable, especially during incident investigation.

## What Changes
- Add a search/filter toolbar above the deployment status batch list with:
  - **Text search**: matches build number or pipeline name (case-insensitive)
  - **Status filter**: multi-select chip group (All / Pending / In Progress / Success / Failure)
  - **Environment filter**: dropdown populated from unique environments in the current project's deployments
- Filtering is client-side (all data already in `deployments` state) — no API calls
- Matching is applied at the individual deployment level; a batch is shown only if at least
  one of its deployments matches; non-matching rows within a visible batch are hidden
- A "Clear filters" button resets all filters; filter state resets when leaving the project

## Impact
- Affected specs: `deployment-history-search` (new capability)
- Affected code:
  - `src/components/DeploymentDashboard.tsx` — filter state, toolbar UI, filtered batch computation
