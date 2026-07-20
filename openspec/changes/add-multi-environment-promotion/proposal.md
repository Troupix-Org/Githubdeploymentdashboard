# Change: Multi-Environment Promotion

## Why
A common deployment pattern is promoting a build through environments in sequence:
QA → Staging → Production. Currently users must manually note the build number from one
deployment, find the target pipeline, enter the build number, and trigger again. A
"Promote" button on each deployment row automates this multi-step process.

## What Changes
- Add a `promotesTo?: string` field to the `Pipeline` type — the ID of the pipeline that
  represents the next environment for this pipeline's builds
- In `ProjectConfig`, add a "Promotes to" single-select per pipeline
- In the deployment status table, add a "Promote →" action button on completed `success`
  rows for pipelines that have a `promotesTo` configured
- Clicking "Promote" pre-fills the target pipeline's deploy form with the same build number
  and opens the Deploy section, ready for one-click confirmation

## Impact
- Affected specs: `environment-promotion` (new capability)
- Affected code:
  - `src/lib/storage.ts` — `Pipeline` interface gains `promotesTo?: string`
  - `src/components/ProjectConfig.tsx` — "Promotes to" select in pipeline edit form
  - `src/components/DeploymentDashboard.tsx` — Promote button in status table, pre-fill logic
