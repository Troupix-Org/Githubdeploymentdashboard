# Change: Bulk Delete Deployments

## Why
Deployment history accumulates quickly during active development. Deleting batches one at
a time is tedious when a user wants to clear old history before a release or after a
failed experiment. A multi-select UI solves this in a single action.

## What Changes
- Add a "Select batches" toggle button in the Deployment Status card header
- When active, each batch header gains a checkbox; a "Delete selected" button and a
  select-all toggle appear in a sticky action bar above the batch list
- Confirmation dialog before bulk deletion (shows count of batches and deployments
  affected)
- Extend `lib/storage.ts` with a `deleteDeploymentsByBatches(batchIds: string[]): void`
  helper that removes all deployments matching any of the given batch IDs

## Impact
- Affected specs: `bulk-delete-deployments` (new capability)
- Affected code:
  - `src/lib/storage.ts` — new `deleteDeploymentsByBatches` helper
  - `src/components/DeploymentDashboard.tsx` — select mode toggle, checkboxes, action bar, confirmation dialog
