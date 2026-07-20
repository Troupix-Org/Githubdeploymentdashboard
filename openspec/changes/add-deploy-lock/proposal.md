# Change: Deploy Lock

## Why
Production pipelines are sometimes intentionally frozen — during an incident, a change
freeze window, or a post-deployment observation period. Today there is no way to mark a
pipeline as "do not deploy" in the app; the only protection is remembering not to click.
A soft lock on a pipeline prevents accidental triggers while clearly communicating the
reason to the whole team.

## What Changes
- Add `locked?: boolean` and `lockReason?: string` fields to the `Pipeline` interface
- When a pipeline is locked:
  - The Deploy button is replaced with a "Locked 🔒" button (disabled, amber styling)
  - The locked pipeline is excluded from the pre-selected set in "Deploy All"
  - An amber badge with the lock reason appears in the pipeline header
- A lock/unlock toggle in the pipeline header opens a small dialog to set/clear the reason
- Lock state is per-pipeline, persisted via `saveProject`, visible to anyone sharing the
  exported config

## Impact
- Affected specs: `deploy-lock` (new capability)
- Affected code:
  - `src/lib/storage.ts` — `locked?: boolean`, `lockReason?: string` added to `Pipeline`
  - `src/components/DeploymentDashboard.tsx` — lock badge, disabled deploy button, pre-selection exclusion, lock dialog
