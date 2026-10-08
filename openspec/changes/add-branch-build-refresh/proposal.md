# Change: Refresh the latest five builds from a pipeline branch

## Why
The deployment dashboard loads recent branch builds when a project opens, but users cannot refresh that list independently when new builds become available or run statuses change.

## What Changes
- Add an accessible refresh icon beside each pipeline's latest-build summary, available even when the build list is collapsed, empty, or contains only one build.
- Fetch up to five recent builds for that pipeline's configured repository, workflow, and branch, updating both the latest-build summary and expanded list.
- Show pipeline-scoped loading and error feedback without changing deployment inputs or clearing previously fetched builds on failure.
- Keep this action separate from deployment-status refresh and do not introduce automatic build polling.

## Impact
- Affected specs: pipeline-builds (new capability documenting branch-build refresh).
- Affected code: src/components/DeploymentDashboard.tsx; src/lib/github.ts only as needed to distinguish refresh failure from an empty result while preserving existing callers' behavior.
- Assumption: "branch" means the existing pipeline.branch configuration, not a new branch selector.
- No persistence, dependency, or production-release workflow changes.

## Approval
Approved by the user on 2026-10-08.