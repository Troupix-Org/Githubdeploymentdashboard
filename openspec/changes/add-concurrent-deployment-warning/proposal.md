# Change: Concurrent Deployment Warning

## Why
Users can accidentally double-trigger the same pipeline while it is still running, wasting
GitHub Actions minutes and potentially causing race conditions in the target environment.
The app already polls deployment status, so the in-progress state is available in memory.

## What Changes
- Before executing `handleDeploy` or adding a pipeline to a batch in `handleConfirmDeployAll`,
  check whether a `pending` or `in_progress` deployment exists for the same pipeline
- If a conflict is detected:
  - **Single deploy**: show a confirmation dialog "Pipeline X already has an active deployment.
    Deploy anyway?"
  - **Batch deploy**: mark the conflicting rows in the summary table with a warning badge;
    allow the user to deselect them or proceed explicitly
- No data model changes required — uses existing `deployments` state

## Impact
- Affected specs: `concurrent-deployment-guard` (new capability)
- Affected code:
  - `src/components/DeploymentDashboard.tsx` — guard in `handleDeploy` and `handleConfirmDeployAll`, new conflict dialog state
