# Change: Deployment Notes

## Why
After triggering a deployment, users often need to record context for future reference —
what was fixed, why a rollback was triggered, or which ticket it relates to. Without notes,
deployment history is just build numbers and timestamps; with notes it becomes a lightweight
audit trail.

## What Changes
- Add an optional `notes?: string` field to the `Deployment` interface in `lib/storage.ts`
- In the deployment status table, add a note icon button on each row that opens an inline
  edit popover (single `textarea`, Save / Cancel)
- Saved notes are displayed as a truncated chip on the row; hovering shows the full text
- Notes persist to localStorage alongside the rest of the deployment data via `saveDeployment`
- No breaking changes — the field is optional and absent on existing deployments

## Impact
- Affected specs: `deployment-notes` (new capability)
- Affected code:
  - `src/lib/storage.ts` — `notes?: string` added to `Deployment` interface (backward-compatible)
  - `src/components/DeploymentDashboard.tsx` — note button, popover, inline display in table rows
