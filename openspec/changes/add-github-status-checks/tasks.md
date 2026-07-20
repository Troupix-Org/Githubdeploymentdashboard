## 1. GitHub API function

- [ ] 1.1 Add `getCheckRunsForBranch(owner: string, repo: string, branch: string)` in `lib/github.ts` — calls `GET /repos/{owner}/{repo}/commits/{branch}/check-runs` and returns the array of check runs
- [ ] 1.2 Add `getCombinedCheckStatus(checkRuns)` pure helper — returns `'success' | 'failure' | 'pending' | 'unknown'`:
  - `success` if all runs have `conclusion === 'success'` or `'skipped'`
  - `failure` if any run has `conclusion === 'failure'` or `'cancelled'`
  - `pending` if any run has `status === 'in_progress'` or `status === 'queued'`
  - `unknown` if the array is empty or the endpoint returns an error

## 2. State and fetch in DeploymentDashboard

- [ ] 2.1 Add `branchCheckStatus: { [pipelineId: string]: { status: 'loading' | 'success' | 'failure' | 'pending' | 'unknown'; runs: CheckRun[]; cachedAt: number } }` state
- [ ] 2.2 When the deploy section is expanded (`deployOpen` becomes `true`), fetch check status for all pipelines concurrently; skip any pipeline whose cached result is less than 60 seconds old
- [ ] 2.3 Set `status: 'loading'` immediately, then update to the resolved status once the API returns

## 3. Status pill in pipeline header

- [ ] 3.1 Render a small status pill next to the branch name chip in the pipeline header:
  - Loading: gray spinner
  - Success: green ✓ pill
  - Failure: red ✗ pill
  - Pending: amber ⏳ pill
  - Unknown: gray `?` pill (no checks configured or error)
- [ ] 3.2 Wrap the pill in a `Popover` (from `ui/popover.tsx`) that opens on click and lists each check run: name, conclusion icon, and an `ExternalLink` to the GitHub check run URL

## 4. Refresh

- [ ] 4.1 Add a small "↻" icon button next to the status pill that forces a re-fetch (ignoring the 60-second cache) for that pipeline only
