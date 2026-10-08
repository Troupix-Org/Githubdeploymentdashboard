## ADDED Requirements

### Requirement: Manual branch-build refresh
The system SHALL provide an accessible, explicitly labeled refresh icon for each pipeline's recent builds in the deployment dashboard. The action SHALL fetch up to the latest five builds for that pipeline's configured repository, workflow, and branch and update both its latest-build summary and recent-build list. Refresh SHALL remain available when the list is collapsed or contains zero or one build and SHALL NOT trigger deployment-status refresh or requests for other pipelines.

#### Scenario: Refresh discovers a new build
- **GIVEN** a new build exists for a pipeline's configured workflow and branch
- **WHEN** the user refreshes that pipeline's recent builds
- **THEN** the latest-build summary and recent-build list show the refreshed results, newest first, limited to five builds
- **AND** other pipelines' build results remain unchanged

#### Scenario: Refresh updates existing run statuses
- **GIVEN** a previously displayed build has completed since the list was loaded
- **WHEN** the user refreshes that pipeline's recent builds
- **THEN** the displayed build status and conclusion reflect the latest response

#### Scenario: Refresh remains available without an expanded list
- **GIVEN** the recent-build list is collapsed or currently contains zero or one build
- **WHEN** the user views the pipeline's latest-build summary
- **THEN** the refresh action is available without expanding the list

### Requirement: Non-destructive refresh feedback
The system SHALL show loading feedback and prevent duplicate manual refresh requests for the same pipeline while a request is pending. A refresh SHALL preserve entered workflow inputs, the selected build number, and list expansion state. Failed refreshes SHALL retain previously fetched builds and show actionable error feedback distinct from a successful empty response, with retry available after loading ends.

#### Scenario: Refresh preserves deployment preparation
- **GIVEN** the user has entered workflow inputs and selected a build number
- **WHEN** a manual build refresh succeeds
- **THEN** those inputs and the selected build number remain unchanged
- **AND** the list expansion state remains unchanged

#### Scenario: Repeated clicks during loading
- **GIVEN** a pipeline's build refresh is pending
- **WHEN** the user attempts another refresh for the same pipeline
- **THEN** no duplicate request is started
- **AND** that pipeline's refresh control displays loading feedback

#### Scenario: Refresh fails
- **GIVEN** a pipeline has previously fetched builds
- **WHEN** its manual refresh fails
- **THEN** the previous latest-build summary and list remain available
- **AND** the user sees error feedback and can retry

#### Scenario: Refresh returns no builds
- **WHEN** a pipeline's manual refresh succeeds with no builds for its configured workflow and branch
- **THEN** stale results are replaced with an empty state
- **AND** no failure is reported and refresh remains available