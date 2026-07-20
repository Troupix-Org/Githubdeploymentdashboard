## 1. Conflict detection helper

- [ ] 1.1 Add `hasActiveDeployment(pipelineId: string, deployments: Deployment[]): boolean` — returns `true` if any deployment for that pipeline is `pending` or `in_progress`

## 2. Single-deploy guard

- [ ] 2.1 In `handleDeploy`, call `hasActiveDeployment` before triggering; if `true`, set a new state variable `conflictPipelineId` and open a confirmation dialog
- [ ] 2.2 Create the conflict confirmation dialog (reuse `AlertDialog`) with title "Active deployment in progress", body "Pipeline [X] already has a running deployment. Deploying again may cause conflicts.", Cancel and "Deploy Anyway" buttons
- [ ] 2.3 "Deploy Anyway" proceeds with the original `handleDeploy` logic; Cancel clears `conflictPipelineId`

## 3. Batch-deploy guard

- [ ] 3.1 In the Deploy All confirmation dialog table, for each pipeline row call `hasActiveDeployment` and render an amber warning badge ("Active") next to the pipeline name when `true`
- [ ] 3.2 If any selected pipelines have active deployments, show a yellow `Alert` in the dialog: "X pipeline(s) already have active deployments — consider deselecting them"
- [ ] 3.3 The user can still proceed without deselecting (explicit override); no hard block
