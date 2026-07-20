# Change: Deployment Diff (Commits Between Builds)

## Why
When deploying build 2.1.4 after 2.1.1 has been in production, users have no visibility
into what changed. They must manually navigate to GitHub and compare commits. Showing the
commit list inline — "12 commits since the last production deployment" — makes the
deployment decision more informed and provides a lightweight change log for each release.

## What Changes
- In the deployment status table, add a "Diff" action button on `success` rows for
  pipelines that have a previous deployment to compare against
- Clicking "Diff" fetches the commits between the two workflow runs' `head_sha` values
  using the GitHub Compare API (`/repos/{owner}/{repo}/compare/{base}...{head}`) and
  displays them in a `Dialog`
- The diff dialog shows: commit count summary, each commit as a row with SHA (short),
  message (first line), author, relative date, and a link to the commit on GitHub
- If the two SHAs are identical, show "No changes — same commit"

## Impact
- Affected specs: `deployment-diff` (new capability)
- Affected code:
  - `src/lib/github.ts` — new `compareCommits(owner, repo, base, head)` function
  - `src/components/DeploymentDashboard.tsx` — Diff button, diff dialog state, commit list render
