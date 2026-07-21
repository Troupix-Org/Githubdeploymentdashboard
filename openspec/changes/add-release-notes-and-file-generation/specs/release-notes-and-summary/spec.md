## ADDED Requirements

### Requirement: Release notes input step in production release workflow
The system SHALL include a "Release Notes" step in the ProductionReleaseProcess stepper,
between the "Pipelines" selection and "Review" confirmation steps.

#### Scenario: Release notes step appears in stepper
- **GIVEN** a user navigates to ProductionReleaseProcess
- **WHEN** they complete the "Pipelines" step
- **THEN** they advance to the "Release Notes" step with a textarea, character counter,
  and optional markdown preview toggle

#### Scenario: User enters release notes
- **GIVEN** the Release Notes step is active
- **WHEN** the user types "Release v2.1.0: Fixed payment gateway timeout, added metrics logging"
- **THEN** the text is displayed with live character count "90 / 2,000"

#### Scenario: Character limit enforced
- **GIVEN** the Release Notes textarea is active
- **WHEN** the user types more than 2000 characters
- **THEN** additional input is blocked and the counter shows "2,000 / 2,000"

#### Scenario: Release notes are optional
- **GIVEN** the Release Notes step is active
- **WHEN** the user leaves the textarea empty and clicks "Next"
- **THEN** the step advances to the Review step with empty release notes (no validation error)

#### Scenario: Markdown preview toggle
- **GIVEN** the Release Notes step with the user having typed markdown ("## Fixes\n- Bug #123")
- **WHEN** the user clicks the "Preview" toggle
- **THEN** an adjacent pane shows the rendered markdown with proper heading and bullet formatting

### Requirement: Deployment summary step in production release workflow
The system SHALL display a pre-deployment review summary showing all pipelines to be deployed.

#### Scenario: Summary step shows deployment details
- **GIVEN** a user has selected 3 pipelines in ProductionReleaseProcess
- **WHEN** they reach the Review/Summary step
- **THEN** a read-only section displays:
  - Batch timestamp (e.g., "2026-07-20 14:35:42 UTC")
  - Pipeline table: Name | Environment | Build Number | Status (all showing "Pending")
  - Total: "3 deployments"
  - Estimated duration (if available)

#### Scenario: Release notes visible in summary
- **GIVEN** the user entered release notes "Hotfix for login issue" in the prior step
- **WHEN** they view the Summary step
- **THEN** the release notes are displayed above the pipeline table in a collapsible section

#### Scenario: User confirms and starts batch
- **GIVEN** all steps are complete and the summary is displayed
- **WHEN** the user clicks "Deploy All"
- **THEN** the batch starts executing and the user is navigated to a deployment progress view

### Requirement: View Release Summary button available at 100% completion
The system SHALL display a "View Release Summary" button in the completion status view after
all pipelines in the production release batch have reached terminal status.

#### Scenario: Button appears when production release is 100% complete
- **GIVEN** a production release batch with 3 pipelines is executing
- **WHEN** all pipelines reach terminal status (success, failure, or mixed)
- **THEN** the completion status view displays:
  - Status message: "Release Complete" or "Release Completed (2 succeeded, 1 failed)"
  - Timestamp of completion
  - **"View Release Summary" button** (prominent, blue styling)

#### Scenario: User clicks button to view release summary
- **GIVEN** the completion status view is displayed with the "View Release Summary" button
- **WHEN** the user clicks the button
- **THEN** a modal dialog opens showing:
  - Release notes section (if provided during process)
  - Deployment summary table with actual results (pipeline names, environments, build numbers, statuses, durations)
  - Download buttons: Markdown, Text, JSON, HTML
  - "Close" button to dismiss the dialog

#### Scenario: Completed deployment summary includes results
- **GIVEN** the release summary dialog is open after a batch with 2 successes and 1 failure
- **WHEN** the summary is displayed
- **THEN** the pipeline table shows actual statuses (checkmark icon for success, X icon for failure)
  and the summary footer reads "2 succeeded, 1 failed"

#### Scenario: Export as Markdown
- **GIVEN** the release summary dialog is open
- **WHEN** the user clicks "Download as Markdown"
- **THEN** a file `release-{batchId}-{YYYY-MM-DD}.md` is downloaded containing:
  - # Release {date}
  - Release Notes section (if provided)
  - ## Deployment Summary (markdown table with pipelines, statuses, durations)

#### Scenario: Export as Plain Text
- **GIVEN** the release summary dialog is open
- **WHEN** the user clicks "Download as Text"
- **THEN** a `.txt` file is downloaded with plain-text formatting (no markdown syntax)

#### Scenario: Export as JSON
- **GIVEN** the release summary dialog is open
- **WHEN** the user clicks "Download as JSON"
- **THEN** a `.json` file is downloaded with structured data:
  ```json
  {
    "batchId": "...",
    "timestamp": "...",
    "releaseNotes": "...",
    "deployments": [
      {"name": "pipeline-1", "environment": "prod", "buildNumber": "42", "status": "success", "duration": "2m 15s"}
    ],
    "summary": {"succeeded": 2, "failed": 1}
  }
  ```

#### Scenario: Export as HTML
- **GIVEN** the release summary dialog is open
- **WHEN** the user clicks "Download as HTML"
- **THEN** a `.html` file is downloaded with styled HTML including:
  - Release notes rendered as HTML
  - Formatted table with deployment results
  - Color-coded rows (green for success, red for failure)
  - Professional styling suitable for sharing or archiving

#### Scenario: Button remains accessible for re-viewing summary
- **GIVEN** a production release has completed and the user dismissed the summary dialog
- **WHEN** the user clicks "View Release Summary" button again
- **THEN** the dialog re-opens with the same summary and download options (data persisted)

### Requirement: Release notes persist with production release batch
The system SHALL store release notes in batch metadata for future reference.

#### Scenario: Release notes saved to batch metadata
- **GIVEN** the user entered and submitted release notes during ProductionReleaseProcess
- **WHEN** the batch is created and executes
- **THEN** the release notes are persisted to batch metadata in storage (localStorage)

#### Scenario: Release notes accessible in batch history
- **GIVEN** a user navigates to a historical production release batch that included release notes
- **WHEN** they view the batch details
- **THEN** a collapsible "Release Notes" section displays the stored notes above the deployment table

