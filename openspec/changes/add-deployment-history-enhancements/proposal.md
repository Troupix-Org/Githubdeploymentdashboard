# Change: Deployment History Enhancements

## Why
The deployment status table is the most-used screen after triggering deployments, yet it
only supports viewing and deleting entries. Users must leave the app to re-trigger an old
build, have no visibility into how long deployments take, and miss completion events when
the tab is not focused.

## What Changes
- **Redeploy from history**: Add a "Redeploy" action to each deployment row that pre-fills
  the deploy form with the same pipeline, build number, and workflow inputs, then opens the
  deploy section ready to submit.
- **Duration display**: Calculate and show elapsed time (`completedAt - startedAt`) on
  completed deployment rows. Show a live elapsed counter on in-progress deployments.
- **Browser push notifications**: When `refreshDeploymentStatus` detects a transition to
  `success` or `failure`, send a `Notification` API alert so users are informed even when
  the tab is in the background. Requires one-time permission prompt.

## Impact
- Affected specs: `deployment-history` (new capability)
- Affected code:
  - `src/components/DeploymentDashboard.tsx` — action column, duration column, notification trigger
  - `src/lib/storage.ts` — no schema changes required (all data already present)
  - `src/lib/github.ts` — no changes required
