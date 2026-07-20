# Change: Project Overview Dashboard

## Why
The home screen (ProjectList) shows project names only. Users must open each project
individually to learn its last deployment status, whether anything is actively running, or
when the last release was triggered. A summary view eliminates this navigation overhead.

## What Changes
- Replace (or augment) the flat project list with a card grid where each card shows:
  - Project name and type badge (PRODUCTION / standard)
  - Last deployment status icon + timestamp
  - Count of active (pending/in_progress) deployments
  - Number of configured pipelines and repositories
  - Quick-action buttons: Open, Deploy All shortcut
- Cards are sorted: active deployments first, then by most-recent deployment, then alphabetically
- The existing list/table view is retained as an alternative (toggle or fallback)

## Impact
- Affected specs: `project-overview` (new capability)
- Affected code:
  - `src/components/ProjectList.tsx` — extend or replace with card grid layout
  - `src/lib/storage.ts` — no schema changes; reads existing `getDeployments()` data
  - `src/App.tsx` — no routing changes required
