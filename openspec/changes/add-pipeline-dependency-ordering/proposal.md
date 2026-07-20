# Change: Pipeline Dependency Ordering

## Why
When deploying all pipelines in a batch, some pipelines must not run until a prerequisite
pipeline has succeeded (e.g. a shared infrastructure pipeline must complete before
application pipelines start). Currently all pipelines in a batch are triggered sequentially
with no dependency awareness — a failed prerequisite does not stop dependents.

## What Changes
- Add an optional `dependsOn?: string[]` field to the `Pipeline` type (array of pipeline IDs)
- In `ProjectConfig`, add a "Depends on" multi-select to each pipeline's edit form
- In `handleConfirmDeployAll`, replace the flat sequential loop with a dependency-aware
  execution engine:
  1. Build a dependency graph from selected pipelines
  2. Execute pipelines in topological order
  3. After each pipeline triggers, poll until it reaches a terminal state before starting dependents
  4. If a pipeline fails, skip its dependents and mark them as `skipped`
- **BREAKING** (data schema): adds `dependsOn` to `Pipeline` — backward-compatible (optional field)

## Impact
- Affected specs: `pipeline-dependencies` (new capability)
- Affected code:
  - `src/lib/storage.ts` — `Pipeline` interface gains `dependsOn?: string[]`
  - `src/components/ProjectConfig.tsx` — dependency multi-select in pipeline edit form
  - `src/components/DeploymentDashboard.tsx` — `handleConfirmDeployAll` execution engine, new `skipped` display state
