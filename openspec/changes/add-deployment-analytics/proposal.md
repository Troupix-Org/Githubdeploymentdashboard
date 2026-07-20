# Change: Deployment Analytics

## Why
Users have no visibility into deployment health trends. When a pipeline starts failing
frequently, or deployments are taking longer than usual, the only way to notice is to
scroll through the history table manually. Recharts is already in the dependency tree — a
stats view costs no additional bundle weight.

## What Changes
- Add an **Analytics** collapsible card below the Deployment Status section in
  `DeploymentDashboard` (only shown when `deployments.length >= 3`)
- Three charts, each derived entirely from existing `deployments` state:
  1. **Success Rate** — donut chart: `success` vs `failure` counts
  2. **Deployments per Day** — bar chart of deployment count over the last 14 days
  3. **Avg Duration by Pipeline** — horizontal bar chart of mean `completedAt - startedAt`
     per pipeline (only includes completed deployments with both timestamps)
- Charts are read-only and update reactively as `deployments` state changes
- No new API calls, no new stored data

## Impact
- Affected specs: `deployment-analytics` (new capability)
- Affected code:
  - `src/components/DeploymentDashboard.tsx` — new Analytics collapsible section
  - No changes to `lib/storage.ts` or `lib/github.ts`
