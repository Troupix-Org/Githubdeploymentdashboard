## 1. Data model

- [ ] 1.1 Add `dependsOn?: string[]` to the `Pipeline` interface in `lib/storage.ts`
- [ ] 1.2 Validate that `dependsOn` IDs are within the same project's pipelines when saving (prevent dangling references)

## 2. ProjectConfig UI

- [ ] 2.1 In the pipeline edit form in `ProjectConfig.tsx`, add a "Depends on" multi-select (use the existing `Checkbox` list pattern) listing all other pipelines in the project
- [ ] 2.2 Prevent circular dependency selection: disable pipeline A in the "Depends on" list of pipeline B if B is already in A's `dependsOn`
- [ ] 2.3 Persist `dependsOn` when saving the pipeline via `saveProject`

## 3. Dependency-aware batch execution engine

- [ ] 3.1 Add a `buildExecutionLevels(pipelines: Pipeline[]): Pipeline[][]` utility that performs topological sort — returns an array of levels where each level's pipelines can run in parallel
- [ ] 3.2 Detect and surface cycles: if a cycle is found, show an error and abort the batch
- [ ] 3.3 In `handleConfirmDeployAll`, iterate through execution levels rather than a flat list
- [ ] 3.4 After triggering all pipelines in a level, poll `getWorkflowRun` until all reach a terminal state before proceeding to the next level (reuse `refreshDeploymentStatus` logic)
- [ ] 3.5 If any pipeline in a level fails, collect its transitive dependents, add them to the results as `skipped`, and continue with independent pipelines in remaining levels

## 4. Skipped state display

- [ ] 4.1 Add `skipped` as a renderable status variant in `getStatusIcon` and `getStatusBadge` (grey badge, minus-circle icon)
- [ ] 4.2 In the batch deployment results summary, report: "X succeeded, Y failed, Z skipped"
- [ ] 4.3 Skipped deployments are not saved to storage (they were never triggered); show them only in the immediate results banner

## 5. Dependency visualisation in Deploy All dialog

- [ ] 5.1 In the Deploy All confirmation table, add a "Depends on" column showing dependency names as small badges when `dependsOn` is set
