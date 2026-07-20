# Change: Pipeline Favorites

## Why
Projects with many pipelines force users to scroll past rarely-used ones every time they
deploy. Starring a pipeline pins it to the top of the deploy section so the most-used
pipelines are always immediately accessible.

## What Changes
- Add an optional `starred?: boolean` field to the `Pipeline` interface
- In the deploy form pipeline list, show starred pipelines first (maintaining their
  relative order), followed by unstarred ones, with a faint separator between groups
- Add a star toggle button in each pipeline row header (replaces the visual accent bar)
- Star state is persisted to IndexedDB alongside the rest of the pipeline config via
  `saveProject`

## Impact
- Affected specs: `pipeline-favorites` (new capability)
- Affected code:
  - `src/lib/storage.ts` — `starred?: boolean` added to `Pipeline` (optional, backward-compatible)
  - `src/components/DeploymentDashboard.tsx` — star button in pipeline header, sorted render order
