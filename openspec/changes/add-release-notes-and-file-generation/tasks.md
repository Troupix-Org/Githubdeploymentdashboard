## 1. Data model for release notes

- [ ] 1.1 Add `releaseNotes?: string` to batch metadata storage (localStorage key: `BATCH_METADATA_{batchId}`)
- [ ] 1.2 Create `BatchMetadata` interface: `{ batchId: string; releaseNotes: string; createdAt: number }`
- [ ] 1.3 Add helper functions to `lib/storage.ts`:
  - `saveBatchMetadata(batchId, metadata): Promise<void>`
  - `getBatchMetadata(batchId): BatchMetadata | null`

## 2. Release notes input step in ProductionReleaseProcess

- [ ] 2.1 Add "Release Notes" as a new step in the `ProductionStepper` between "Pipelines" and "Review"
- [ ] 2.2 Create `ReleaseNotesStep` component in `src/components/production/` that:
  - Shows a textarea for markdown-formatted release notes (max 2000 chars)
  - Character counter below textarea ("234 / 2,000")
  - Optional markdown preview toggle (shows rendered markdown in adjacent pane)
  - Submit/Next button validates non-empty and moves to Review step
  - Can be skipped (optional release notes)
- [ ] 2.3 Store release notes in React context/state shared across ProductionReleaseProcess steps

## 3. Pre-deployment summary step in ProductionReleaseProcess

- [ ] 3.1 Add "Deployment Summary" as a review step before final confirmation
- [ ] 3.2 Show read-only summary:
  - Batch timestamp (e.g., "2026-07-20 14:35:42 UTC")
  - Pipeline table: Name | Environment | Build Number | Status (pending icon)
  - Total deployments count
  - Estimated duration (sum of average pipeline durations or "N/A")
- [ ] 3.3 Include a button to download summary preview (optional; before deployment executes)

## 4. Summary generation utilities

- [ ] 4.1 Add to `lib/storage.ts` a pure function `generateDeploymentSummary(batchId: string, deployments: Deployment[], releaseNotes?: string): SummaryData`
  ```typescript
  {
    batchId: string;
    timestamp: string;
    releaseNotes?: string;
    pipelines: Array<{ name: string; environment: string; buildNumber: string; status: string; duration: string; }>;
    successCount: number;
    failureCount: number;
  }
  ```
- [ ] 4.2 Add `formatSummaryAsMarkdown(summary: SummaryData): string`
- [ ] 4.3 Add `formatSummaryAsText(summary: SummaryData): string`
- [ ] 4.4 Add `formatSummaryAsJson(summary: SummaryData): string`
- [ ] 4.5 Add `formatSummaryAsHtml(summary: SummaryData): string` (optional; basic HTML table)

## 5. Post-deployment file download flow

- [ ] 5.1 After the production release batch reaches 100% completion (all pipelines finished), show a completion status view with:
  - Overall status: "Release Complete" with timestamp
  - Summary of results (N succeeded, N failed)
  - **"View Release Summary" button** (prominent, e.g., blue primary button)
- [ ] 5.2 When user clicks "View Release Summary" button, open a dialog showing:
  - Release notes (if provided during process)
  - Final deployment summary (read-only): table with pipeline names, environments, build numbers, actual statuses, durations
  - Download buttons: Markdown, Text, JSON, HTML
- [ ] 5.3 Each download button generates and downloads `release-{batchId}-{YYYY-MM-DD}.{ext}` with appropriate format
- [ ] 5.4 Dialog has "Close" button to close and return to deployment view

## 6. Integration with ProductionReleaseProcess component

- [ ] 6.1 Update `ProductionReleaseTabs.tsx` to include new "Release Notes" step in the stepper
- [ ] 6.2 Pass release notes through context to `ProductionStepper` component
- [ ] 6.3 Persist release notes to batch metadata when batch is created in the database
- [ ] 6.4 After final deployment completes (100%), display completion status view with "View Release Summary" button
- [ ] 6.5 Button click triggers the summary dialog with download options

