## ADDED Requirements

### Requirement: Branch CI status displayed in deploy form
The system SHALL display the combined CI check status of the latest commit on each
pipeline's configured branch.

#### Scenario: All checks passing shows green pill
- **GIVEN** all check runs on the pipeline's branch have `conclusion = 'success'`
- **WHEN** the deploy section is expanded
- **THEN** a green ✓ pill appears next to the branch name chip

#### Scenario: Any check failing shows red pill
- **GIVEN** at least one check run has `conclusion = 'failure'`
- **WHEN** the deploy section is expanded
- **THEN** a red ✗ pill appears next to the branch name chip

#### Scenario: In-progress checks show amber pill
- **GIVEN** no checks have failed and at least one has `status = 'in_progress'`
- **WHEN** the deploy section is expanded
- **THEN** an amber ⏳ pill appears

#### Scenario: Loading state shown while fetching
- **GIVEN** the deploy section was just expanded
- **WHEN** the check status API call is in flight
- **THEN** a gray spinner appears next to the branch name

#### Scenario: No checks configured shows neutral pill
- **GIVEN** the repository has no configured check runs for the branch
- **WHEN** the deploy section is expanded
- **THEN** a gray `?` pill appears (does not block deployment)

### Requirement: Check run details in popover
The system SHALL show individual check run results on demand.

#### Scenario: Click pill opens check details popover
- **GIVEN** the branch status pill is visible
- **WHEN** the user clicks it
- **THEN** a popover lists each check run with its name, a status icon, and an external link to the GitHub check run URL

### Requirement: Status cache and manual refresh
The system SHALL cache check results to avoid redundant API calls.

#### Scenario: Results cached for 60 seconds
- **GIVEN** check status was fetched less than 60 seconds ago
- **WHEN** the deploy section is closed and reopened
- **THEN** no new API call is made; the cached result is shown immediately

#### Scenario: Manual refresh bypasses cache
- **GIVEN** a cached check status result
- **WHEN** the user clicks the refresh icon next to the pill
- **THEN** a new API call is made regardless of cache age and the result updates
