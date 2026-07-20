## ADDED Requirements

### Requirement: Export deployment history to CSV
The system SHALL allow users to download the deployment history for a project as a
CSV file.

#### Scenario: Export CSV button visible with deployments
- **GIVEN** a project has at least one deployment
- **WHEN** the Deployment Status card is rendered
- **THEN** an "Export CSV" button is visible in the card header

#### Scenario: Export CSV button hidden with no deployments
- **GIVEN** a project has no deployments
- **WHEN** the Deployment Status card renders
- **THEN** no Export CSV button is shown

#### Scenario: Download triggered on click
- **GIVEN** the Export CSV button is visible
- **WHEN** the user clicks it (without date filtering)
- **THEN** a CSV file named `deployments-{project name}-{YYYY-MM-DD}.csv` is downloaded
  containing one row per deployment

#### Scenario: CSV columns and content
- **GIVEN** a deployment with all fields populated
- **WHEN** it appears in the exported CSV
- **THEN** the row contains: Batch, Batch Number, Pipeline, Repository, Environment,
  Branch, Build Number, Status, Duration (s), Started At (ISO 8601), Completed At
  (ISO 8601), Notes

#### Scenario: Cells with commas or quotes are escaped
- **GIVEN** a deployment note contains `"see ticket, #42"`
- **WHEN** exported to CSV
- **THEN** the Notes cell is wrapped in double-quotes with internal quotes doubled:
  `"see ticket, #42"` → `"""see ticket, #42"""`

### Requirement: Optional date range filter before export
The system SHALL allow filtering the export to a specific date range.

#### Scenario: Date range dialog accessible
- **GIVEN** the Export CSV button is visible
- **WHEN** the user clicks the calendar icon next to the Export CSV button
- **THEN** a dialog opens with From and To date inputs and Export / Export All / Cancel buttons

#### Scenario: Date range filters exported rows
- **GIVEN** deployments exist from multiple weeks
- **AND** the user sets From = last Monday and To = today
- **WHEN** the user clicks Export in the dialog
- **THEN** only deployments whose `startedAt` falls within the range are included in the CSV

#### Scenario: Export All bypasses filter
- **GIVEN** the date range dialog is open with partial date inputs
- **WHEN** the user clicks "Export All"
- **THEN** the full deployment history is exported regardless of the date inputs
