## 1. Redeploy from history

- [ ] 1.1 Add a `Redeploy` icon button to each row in the deployment status table (alongside the existing GitHub link and Delete buttons)
- [ ] 1.2 On click, expand the Deploy section and pre-fill `inputValues[pipelineId]` with the stored `buildNumber` and any workflow inputs captured at deployment time
- [ ] 1.3 Scroll the deploy section into view after pre-fill (`document.getElementById('deploy-section')?.scrollIntoView`)
- [ ] 1.4 Show a brief toast/success banner confirming "Form pre-filled with build X — review and deploy"

## 2. Duration display

- [ ] 2.1 Add a `formatDuration(ms: number): string` utility that returns human-readable strings like `"2m 34s"` or `"45s"`
- [ ] 2.2 For `success` / `failure` rows: display `formatDuration(completedAt - startedAt)` in a new **Duration** column
- [ ] 2.3 For `in_progress` / `pending` rows: display a live elapsed counter updated by a `setInterval` inside the component (cleared on unmount)
- [ ] 2.4 Add the **Duration** column header to both the batch deployment table and the Deploy All confirmation table

## 3. Browser push notifications

- [ ] 3.1 Add a `requestNotificationPermission()` helper in `lib/storage.ts` (or a new `lib/notifications.ts`) that calls `Notification.requestPermission()` and stores the result in localStorage (`notifications_enabled`)
- [ ] 3.2 Add a `sendDeploymentNotification(pipelineName: string, status: 'success' | 'failure')` helper that fires a `new Notification(...)` with appropriate title, body, and icon
- [ ] 3.3 In `DeploymentDashboard`, call `requestNotificationPermission()` once on mount (only if `Notification.permission === 'default'`)
- [ ] 3.4 In `refreshDeploymentStatus`, after detecting a transition to `success` or `failure`, call `sendDeploymentNotification` for each newly completed deployment
- [ ] 3.5 Add a notification permission status indicator in the Deployment Status card header (bell icon — muted if denied, active if granted)
