# Change: GitHub Status Checks on Branch

## Why
Users trigger deployments without knowing whether the CI pipeline on the target branch is
currently passing. Deploying from a branch with failing checks can introduce regressions.
Showing the commit status inline — next to the branch name in the deploy form — gives a
clear green/red signal before the user commits to a deployment.

## What Changes
- For each pipeline in the deploy form, fetch the combined commit status of the latest
  commit on `pipeline.branch` using the GitHub Checks API
  (`/repos/{owner}/{repo}/commits/{ref}/check-runs`) when the deploy section is expanded
- Display a status pill next to the branch name chip: ✅ green (all passing), ⚠️ amber
  (some failing), ❌ red (critical failure), or a loading spinner while fetching
- Results cached per pipeline for 60 seconds to avoid hammering the API on every render
- Clicking the pill opens a popover listing each check run name and its conclusion with a
  link to the GitHub check run

## Impact
- Affected specs: `github-status-checks` (new capability)
- Affected code:
  - `src/lib/github.ts` — new `getCheckRunsForBranch(owner, repo, branch)` function
  - `src/components/DeploymentDashboard.tsx` — status fetch on deploy section open, pill display, popover
