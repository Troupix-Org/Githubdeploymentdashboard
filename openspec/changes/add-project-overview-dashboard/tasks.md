## 1. Data layer

- [x] 1.1 Add a `getLastDeploymentByProject(projectId: string): Deployment | null` helper in `lib/storage.ts` that returns the most recent deployment for a project
- [x] 1.2 Add a `getActiveDeploymentCountByProject(projectId: string): number` helper that counts `pending`/`in_progress` deployments per project

## 2. ProjectOverviewCard component

- [x] 2.1 Create `src/components/ProjectOverviewCard.tsx` — accepts `project: Project`, `lastDeployment: Deployment | null`, `activeCount: number`, `onOpen: () => void`
- [x] 2.2 Show project name and PRODUCTION badge (matching existing badge style) in the card header
- [x] 2.3 Show last deployment status icon + relative timestamp (e.g. "2h ago") using the existing `formatRelativeDate` pattern; show "No deployments yet" if null
- [x] 2.4 Show active deployment count badge (blue, with spinner) when `activeCount > 0`
- [x] 2.5 Show pipeline count and repository count as small metadata chips
- [x] 2.6 Wire the Open button to `onOpen`

## 3. ProjectList layout update

- [x] 3.1 In `ProjectList.tsx`, compute `lastDeployment` and `activeCount` for each project using the new helpers
- [x] 3.2 Sort projects: active-first → most-recent-deployment → alphabetical
- [x] 3.3 Render projects as a responsive card grid (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`) using `ProjectOverviewCard`
- [x] 3.4 Preserve the existing "Create Project" and "Import" action buttons above the grid

## 4. Live refresh

- [x] 4.1 Add a `useEffect` in `ProjectList.tsx` that re-computes `lastDeployment` / `activeCount` every 15 seconds when any project has active deployments (reuse the adaptive polling pattern from `DeploymentDashboard`)
