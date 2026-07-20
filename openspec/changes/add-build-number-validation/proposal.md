# Change: Build Number Validation

## Why
Users occasionally trigger deployments with malformed build numbers (wrong format, extra
spaces, incomplete versions) that cause workflow failures at the GitHub Actions level —
after the deployment has already been registered in the app. A per-pipeline regex pattern
validates input locally before the trigger fires, surfacing the error immediately.

## What Changes
- Add an optional `buildNumberPattern?: string` field to the `Pipeline` interface — a
  regex string that the build number must match (e.g. `^\d+\.\d+\.\d+$`)
- In `ProjectConfig`, add a "Build number pattern" text field per pipeline with a live
  preview that tests the currently stored default value against the pattern
- In `DeploymentDashboard`, validate the `build_number` input against the pipeline's
  pattern before allowing deployment:
  - Invalid: input border turns red, inline error message shown, Deploy button disabled
  - Valid: input border turns green
- Pattern is optional; pipelines without one behave exactly as today

## Impact
- Affected specs: `build-number-validation` (new capability)
- Affected code:
  - `src/lib/storage.ts` — `buildNumberPattern?: string` added to `Pipeline` interface
  - `src/components/ProjectConfig.tsx` — pattern field in pipeline edit form
  - `src/components/DeploymentDashboard.tsx` — live validation on build number input
