## ADDED Requirements

### Requirement: Deployment history text search
The system SHALL filter the deployment status list in real time as the user types in a
search box.

#### Scenario: Search by build number
- **GIVEN** the deployment history contains deployments with various build numbers
- **WHEN** the user types "1.2.3" in the search box
- **THEN** only deployments whose `buildNumber` contains "1.2.3" (case-insensitive) are shown

#### Scenario: Search by pipeline name
- **GIVEN** the deployment history contains deployments from multiple pipelines
- **WHEN** the user types "staging" in the search box
- **THEN** only deployments whose associated pipeline name contains "staging" are shown

#### Scenario: Partial batch visibility
- **GIVEN** a batch contains 3 deployments, 1 of which matches the search
- **WHEN** the search is active
- **THEN** the batch header is shown and only the matching deployment row is visible;
  the non-matching rows are hidden

#### Scenario: Empty search shows all deployments
- **GIVEN** a search query is cleared (empty string)
- **WHEN** the filter is evaluated
- **THEN** all batches and deployments are displayed (no filter applied)

### Requirement: Deployment status filter
The system SHALL allow filtering deployments by one or more status values via chip buttons.

#### Scenario: Filter by single status
- **GIVEN** the status filter chips are visible
- **WHEN** the user clicks "Failure"
- **THEN** only deployments with status `failure` are shown; batches with no failures are hidden

#### Scenario: Filter by multiple statuses
- **GIVEN** the status filter
- **WHEN** the user clicks both "Pending" and "In Progress"
- **THEN** deployments with either status are shown

#### Scenario: "All" chip clears status filter
- **GIVEN** one or more status chips are active
- **WHEN** the user clicks "All"
- **THEN** the status filter is cleared and all statuses are shown

### Requirement: Deployment environment filter
The system SHALL allow filtering deployments by environment via a dropdown.

#### Scenario: Environment dropdown populated from history
- **GIVEN** the project has deployments across environments "staging", "qa", "production"
- **WHEN** the environment filter dropdown is opened
- **THEN** the options show "All environments", "staging", "qa", "production"

#### Scenario: Filter by environment
- **GIVEN** the environment filter is set to "production"
- **WHEN** the deployment list renders
- **THEN** only deployments with `environment` equal to "production" are shown

### Requirement: Filter summary and reset
The system SHALL show a results count and a clear button when any filter is active.

#### Scenario: Summary line shown when filtering
- **GIVEN** filters are active and reduce the visible deployments
- **WHEN** the Deployment Status card content renders
- **THEN** a line reads "Showing X of Y deployments" above the batch list

#### Scenario: Clear filters resets all
- **GIVEN** text search, status filter, and environment filter are all set
- **WHEN** the user clicks "Clear filters"
- **THEN** all three filters reset to their default (empty/All) state and all deployments are shown

#### Scenario: Filters reset on project change
- **GIVEN** active filters are set for project A
- **WHEN** the user navigates back and opens project B
- **THEN** all filters are cleared and the full deployment history for project B is shown
