## 1. OpenSpec
- [x] 1.1 Create proposal.md, tasks.md, spec delta
- [x] 1.2 Validate with `openspec validate add-active-run-indicator --strict`

## 2. GitHub API Layer (`src/lib/github.ts`)
- [x] 2.1 Add `actor?: { login: string }` and `triggering_actor?: { login: string }` to `GitHubWorkflowRun` interface
- [x] 2.2 Add optional `statusFilter?: string` parameter to `getWorkflowRuns()` and pass it as `?status=` query param

## 3. State & Data Fetching (`src/components/DeploymentDashboard.tsx`)
- [x] 3.1 Add `activeRuns: Record<string, GitHubWorkflowRun | null>` state variable
- [x] 3.2 Add `activeRunsLoading: Record<string, boolean>` state variable
- [x] 3.3 Implement `fetchActiveRunsForProject()`: iterates pipelines, calls `getWorkflowRuns()` per pipeline (limit 5), filters for `in_progress` | `queued`, picks most recent, updates `activeRuns`
- [x] 3.4 Call `fetchActiveRunsForProject()` in the project-load `useEffect` (after `loadDeployments`)
- [x] 3.5 Call `fetchActiveRunsForProject()` inside `refreshDeploymentStatus()` so active runs refresh on every polling cycle

## 4. Pipeline Card UI (`src/components/DeploymentDashboard.tsx`)
- [x] 4.1 Insert active run banner JSX block inside the pipeline card between inputs grid and deploy button — renders only when `activeRuns[pipeline.id]` is non-null
- [x] 4.2 Banner content: animated pulse dot, status badge, run title (truncated), branch with GitBranch icon, actor with User icon, live elapsed time, external link to GitHub
- [x] 4.3 Show skeleton when `activeRunsLoading[pipeline.id]` is true
- [x] 4.4 Extend existing elapsed time `setInterval` ticker to also update elapsed time for active run IDs
- [x] 4.5 Clear stale active run entry when a completed run is detected during polling
