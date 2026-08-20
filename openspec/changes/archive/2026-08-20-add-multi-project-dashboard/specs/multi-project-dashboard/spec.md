## ADDED Requirements

### Requirement: Multi-project deployment dashboard view
The system SHALL provide a dedicated Dashboard view accessible from the application header that displays recent deployments across multiple projects in a unified, auto-refreshing table.

#### Scenario: Dashboard shows deployments from all projects by default
- **WHEN** the user navigates to the Dashboard view
- **THEN** the last N deployments (default 10) per project are displayed, sorted by date descending

#### Scenario: Dashboard filters to selected projects
- **GIVEN** the user has selected a subset of projects in the settings panel
- **WHEN** the dashboard renders
- **THEN** only deployments belonging to the selected projects are shown

#### Scenario: Dashboard sorts by configurable criterion
- **GIVEN** the user selects a sort mode (date / project / status / environment)
- **WHEN** the table renders
- **THEN** rows are ordered according to that criterion; ties broken by start date descending

#### Scenario: Dashboard navigates to project
- **WHEN** the user clicks the link button on a deployment row
- **THEN** the app navigates to that project's DeploymentDashboard view

### Requirement: Configurable auto-refresh
The system SHALL refresh deployment statuses from the GitHub API on a user-configurable interval (1, 2, 5, 10, 15, or 30 minutes).

#### Scenario: Active deployments receive live status updates
- **GIVEN** one or more deployments have status `pending` or `in_progress` and a `workflowRunId`
- **WHEN** a refresh cycle fires
- **THEN** the system calls `getWorkflowRun()` for each active deployment, updates the status in localStorage, and re-renders the table

#### Scenario: Completed deployments are not re-fetched
- **GIVEN** all visible deployments have terminal status (`success` / `failure`)
- **WHEN** a refresh cycle fires
- **THEN** no GitHub API calls are made (rate-limit budget preserved)

#### Scenario: Countdown timer visible
- **GIVEN** the user is on the Dashboard view
- **WHEN** the view is mounted
- **THEN** a countdown timer showing seconds until the next refresh is displayed next to the manual Refresh button

### Requirement: Dashboard configuration persistence
The system SHALL persist dashboard settings (selected project IDs, refresh interval, sort order, rows per project) in localStorage so they survive page reloads.

#### Scenario: Settings survive reload
- **GIVEN** the user configures a 10-minute refresh interval and selects two projects
- **WHEN** the page is reloaded and the Dashboard view is opened
- **THEN** the same interval and project selection are restored
