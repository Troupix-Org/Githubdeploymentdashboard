## 1. Data model

- [ ] 1.1 Add `promotesTo?: string` (pipeline ID) to the `Pipeline` interface in `lib/storage.ts`
- [ ] 1.2 Validate that `promotesTo` cannot point to itself when saving

## 2. ProjectConfig UI

- [ ] 2.1 In the pipeline edit form in `ProjectConfig.tsx`, add a "Promotes to" `Select` dropdown listing all other pipelines in the project plus a "None" option
- [ ] 2.2 Persist `promotesTo` when saving the pipeline via `saveProject`
- [ ] 2.3 Display the current "Promotes to" value in the pipeline list with a small arrow badge (e.g. "→ Staging Pipeline")

## 3. Promote action in deployment status table

- [ ] 3.1 In the deployment status table, for each row where the deployment has status `success` AND `pipeline.promotesTo` is set, render a "Promote →" icon button (use `ArrowRight` from Lucide) in the Actions column
- [ ] 3.2 On click, resolve the target pipeline from `project.pipelines` using `pipeline.promotesTo`; if not found, show an error toast
- [ ] 3.3 Pre-fill `inputValues[targetPipelineId].build_number` with the source deployment's `buildNumber`
- [ ] 3.4 Expand the Deploy section (`setDeployOpen(true)`), scroll to it, and show a banner: "Build [X] copied to [Target Pipeline] — review and deploy"

## 4. Promotion chain visualisation

- [ ] 4.1 In the Deploy section pipeline headers, show a small "→ [Target]" chip when `promotesTo` is configured so users can see the promotion chain at a glance
