## 1. Implementation
- [x] 1.1 Extract a pipeline-scoped build loader and reuse it for initial project loading and manual refresh, requesting at most five builds for the configured repository, workflow, and branch.
- [x] 1.2 Distinguish failed fetches from successful empty results without changing the existing error behavior for other API callers; preserve previous results on refresh failure.
- [x] 1.3 Add a labeled refresh icon with pipeline-scoped loading, duplicate-request prevention, error feedback, and empty-result handling, available regardless of list expansion or result count.
- [x] 1.4 Preserve entered workflow inputs, selected build number, other pipelines' results, and list expansion during refresh.

## 2. Verification
- [x] 2.1 Verify the refresh request targets only the selected pipeline's repository, workflow, and branch and requests five recent runs.
- [x] 2.2 Verify a newly available build and changed run statuses appear in both the latest-build summary and expanded list without changing deployment inputs.
- [x] 2.3 Verify collapsed, zero-build, and one-build states; repeated clicks while loading; successful empty responses; and failed refreshes retaining prior results with retry available.
- [x] 2.4 Run npm run build and openspec validate add-branch-build-refresh --strict.

## Verification Notes
- Browser checks used isolated contexts with synthetic projects and mocked GitHub responses; no real token or repository data was changed.
- Verified API status/conclusion mapping and backward-compatible error handling separately.
- The refresh control fits a 390px layout and its DOM click handler executes. Actual mobile pointer interaction was not verified because the integrated browser runner stalled on the existing project Open button. Page-level horizontal overflow outside the refresh control remains outside this change.
- Production build passed with Vite's large-chunk warning; edited files have no reported editor errors.