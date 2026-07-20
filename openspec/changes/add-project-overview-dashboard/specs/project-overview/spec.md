## ADDED Requirements

### Requirement: Project status card grid
The system SHALL display projects as a card grid on the home screen, with each card
summarising the project's deployment health at a glance.

#### Scenario: Card shows last deployment status
- **GIVEN** a project with at least one completed deployment
- **WHEN** the home screen renders
- **THEN** the project card displays the status icon (success/failure/in-progress/pending)
  and a relative timestamp (e.g. "3h ago") for the most recent deployment

#### Scenario: Card shows active deployment indicator
- **GIVEN** a project with one or more `pending` or `in_progress` deployments
- **WHEN** the home screen renders
- **THEN** the card shows an animated blue badge with the count of active deployments

#### Scenario: Card shows no-deployments state
- **GIVEN** a project with zero deployments
- **WHEN** the home screen renders
- **THEN** the card shows "No deployments yet" in muted text, with no status icon

#### Scenario: Cards sorted by activity
- **GIVEN** a mix of projects — some with active deployments, some with recent completions,
  some never deployed
- **WHEN** the home screen renders
- **THEN** projects with active deployments appear first, then by most-recent deployment
  descending, then alphabetically by name

#### Scenario: Open button navigates to project dashboard
- **GIVEN** the project card is rendered
- **WHEN** the user clicks "Open"
- **THEN** the app navigates to that project's DeploymentDashboard (same behaviour as
  clicking a project in the existing list)

### Requirement: Home screen live refresh
The system SHALL automatically refresh project cards while any project has active deployments.

#### Scenario: Cards refresh every 15 seconds during active deployments
- **GIVEN** at least one project has a `pending` or `in_progress` deployment
- **WHEN** 15 seconds elapse
- **THEN** all card status summaries update to reflect current deployment state without a
  full page reload

#### Scenario: Refresh pauses when no active deployments
- **GIVEN** all deployments across all projects are in a terminal state (`success` / `failure`)
- **WHEN** the home screen is visible
- **THEN** no polling interval is active (no unnecessary background work)
