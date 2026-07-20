## 1. Storage helper

- [ ] 1.1 Add `deleteDeploymentsByBatches(batchIds: string[]): void` in `lib/storage.ts` — filters out all deployments whose `batchId` is in the provided array and persists the result

## 2. Select mode state

- [ ] 2.1 Add `selectMode: boolean` and `selectedBatchIds: string[]` state variables to `DeploymentDashboard`
- [ ] 2.2 Add a "Select" toggle button in the Deployment Status card header (next to the Refresh button); clicking it sets `selectMode = true` and clears `selectedBatchIds`
- [ ] 2.3 When `selectMode` is active, replace the "Select" button with a "Cancel" button that exits select mode and clears selection

## 3. Batch checkboxes

- [ ] 3.1 When `selectMode` is active, render a `Checkbox` at the start of each batch header row
- [ ] 3.2 Clicking the checkbox toggles that `batchId` in `selectedBatchIds`
- [ ] 3.3 Hide the individual batch delete button (trash icon) while in select mode to avoid accidental single-batch deletes

## 4. Bulk action bar

- [ ] 4.1 When `selectMode` is active and `deployments.length > 0`, render a sticky action bar above the batch list showing:
  - "Select all" / "Deselect all" toggle
  - `{N} batch(es) selected — {M} deployment(s)` count
  - Red "Delete selected" button (disabled when `selectedBatchIds.length === 0`)
- [ ] 4.2 "Select all" sets `selectedBatchIds` to all `sortedBatchIds`; "Deselect all" clears the array

## 5. Confirmation and deletion

- [ ] 5.1 "Delete selected" opens a new `AlertDialog` (reuse existing dialog styles) with title "Delete {N} batches?" and body "This will permanently remove {M} deployments. This cannot be undone."
- [ ] 5.2 On confirm, call `deleteDeploymentsByBatches(selectedBatchIds)`, reload deployments, exit select mode, and show a success toast
