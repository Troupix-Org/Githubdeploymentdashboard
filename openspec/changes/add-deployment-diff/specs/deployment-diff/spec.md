## ADDED Requirements

### Requirement: Diff action on successful deployments
The system SHALL provide a diff action on successful deployment rows where a prior
successful deployment exists for the same pipeline.

#### Scenario: Diff button shown when prior deployment exists
- **GIVEN** pipeline A has two successful deployments (build 2.1.0 and 2.1.4)
- **WHEN** the deployment status table renders the 2.1.4 row
- **THEN** a Diff icon button is shown in the Actions column

#### Scenario: Diff button not shown for first-ever deployment
- **GIVEN** pipeline A has only one successful deployment
- **WHEN** the table renders
- **THEN** no Diff button is shown (no prior deployment to compare against)

#### Scenario: Diff button not shown on non-success rows
- **GIVEN** a deployment row with status `failure`, `pending`, or `in_progress`
- **WHEN** the table renders
- **THEN** no Diff button is shown regardless of prior deployments

### Requirement: Commit diff dialog
The system SHALL display the commits between the current and previous successful
deployment's SHAs in a dialog.

#### Scenario: Dialog shows commit list
- **GIVEN** 5 commits exist between the base and head SHAs
- **WHEN** the user clicks Diff and the API responds
- **THEN** a dialog opens with header "Changes since last deployment — 5 commits" and
  5 rows each showing: short SHA, commit message (first line), author, relative date,
  and an external link

#### Scenario: No new commits shown when SHAs are identical
- **GIVEN** the same SHA was deployed twice (e.g. a re-trigger)
- **WHEN** the diff dialog opens
- **THEN** the dialog shows "No new commits — same SHA deployed"

#### Scenario: Diverged branches show warning
- **GIVEN** the compare API returns `status: 'diverged'`
- **WHEN** the diff dialog renders
- **THEN** an amber alert reads "Branches have diverged — comparison may be incomplete"
  above the commit list

#### Scenario: Loading state while fetching
- **GIVEN** the diff API call is in flight
- **WHEN** the Diff button was clicked
- **THEN** the button shows a spinner and is disabled until the response arrives
