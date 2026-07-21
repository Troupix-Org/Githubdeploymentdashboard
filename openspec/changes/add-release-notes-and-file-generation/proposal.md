# Change: Release Notes & Summary File Generation

## Why
During the production release process, users need to document what's being released and generate
an audit-trail summary file. Currently the ProductionReleaseProcess has no way to capture release
notes or export a deployment summary. Adding a release notes input step alongside a summary file
generator ensures every production release is properly documented.

## What Changes
- Integrate release notes into the **ProductionReleaseProcess** workflow as a step in the stepper
- Add a "Release Notes" form step that:
  - Accepts markdown-formatted release notes (max 2000 chars)
  - Shows a live preview of the notes (optional toggle)
  - Character counter
- Add a pre-deployment summary step showing:
  - All production pipelines to be deployed (names, build numbers, environments)
  - Total deployments in the batch
  - Estimated duration
- After the batch reaches 100% completion (all pipelines finished):
  - A "View Release Summary" button appears in the completion status view
  - Clicking the button opens a dialog with:
    - Release notes (captured during process)
    - Final deployment summary (actual results, statuses, durations)
    - Download buttons: Markdown, Plain Text, JSON, HTML
  - Users can download summary files at any time:
    - **Markdown** — formatted notes + deployment table
    - **Plain Text** — plain-text layout
    - **JSON** — structured data for programmatic use
    - **HTML** — styled document for sharing/archiving
- Release notes are persisted to batch metadata for future reference

## Impact
- Affected specs: `production-release-notes-and-summary` (new step in ProductionReleaseProcess)
- Affected code:
  - `src/components/ProductionReleaseProcess.tsx` — add release notes form step
  - `src/components/ProductionReleaseTabs.tsx` — integrate into stepper
  - `src/lib/storage.ts` — batch metadata support for release notes
  - New utility functions for summary file generation (markdown, text, JSON, HTML formatters)
