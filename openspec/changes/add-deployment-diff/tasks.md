## 1. GitHub API function

- [ ] 1.1 Add `compareCommits(owner: string, repo: string, base: string, head: string)` in `lib/github.ts` — calls `GET /repos/{owner}/{repo}/compare/{base}...{head}` and returns `{ commits: CommitSummary[], behind_by: number, ahead_by: number, status: string }`
- [ ] 1.2 Define `CommitSummary` interface: `{ sha: string; message: string; author: string; date: string; url: string }`

## 2. Resolving SHAs from workflow runs

- [ ] 2.1 Add `getWorkflowRunSha(owner, repo, runId)` helper that calls `getWorkflowRun` (already exists) and returns `run.head_sha`
- [ ] 2.2 To find the "previous" deployment: from the same pipeline's deployments (sorted by `startedAt` desc), take the first `success` deployment before the current one

## 3. Diff button in deployment table

- [ ] 3.1 Add a `GitCompare` (Lucide) icon button in the Actions column of each `success` deployment row for pipelines where a previous successful deployment exists in the same project
- [ ] 3.2 The button is disabled with a spinner while the diff is being fetched
- [ ] 3.3 On click, resolve both SHAs (current and previous run), call `compareCommits`, and open the diff dialog

## 4. Diff dialog

- [ ] 4.1 Add `diffDialogOpen: boolean` and `diffData: { commits: CommitSummary[]; ahead_by: number; base: string; head: string } | null` state
- [ ] 4.2 Dialog header: "Changes since last deployment — [N] commits"
- [ ] 4.3 Render each commit as a row: short SHA (7 chars, monospace), first line of message, author name, relative date, external link to commit URL
- [ ] 4.4 When `ahead_by === 0` show "No new commits — same SHA deployed"
- [ ] 4.5 When `status === 'diverged'` show an amber warning: "Branches have diverged — comparison may be incomplete"
