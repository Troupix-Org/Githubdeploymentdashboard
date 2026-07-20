## ADDED Requirements

### Requirement: Rate limit state capture
The system SHALL capture the GitHub API rate limit from every API response and make it
available to UI components.

#### Scenario: Rate limit updated after each API call
- **GIVEN** the app makes any GitHub API request (polling, workflow fetch, deploy trigger)
- **WHEN** the response is received
- **THEN** `X-RateLimit-Remaining` and `X-RateLimit-Reset` are stored in the module-level
  rate limit state and any registered subscribers are notified

#### Scenario: Missing header leaves state unchanged
- **GIVEN** a GitHub API response does not include `X-RateLimit-Remaining`
- **WHEN** the response is processed
- **THEN** the previously cached rate limit values are preserved unchanged

### Requirement: Rate limit indicator in header
The system SHALL display a rate limit indicator in the app header when a GitHub token is
configured.

#### Scenario: Indicator shows remaining count
- **GIVEN** a token is configured and at least one API call has been made
- **WHEN** the header renders
- **THEN** the indicator shows "[remaining] / 5,000" and a proportional progress bar

#### Scenario: Progress bar colour reflects urgency
- **GIVEN** the rate limit is being displayed
- **WHEN** remaining requests are above 1,000
- **THEN** the bar is green
- **WHEN** remaining is 500–1,000
- **THEN** the bar is amber
- **WHEN** remaining is below 500
- **THEN** the bar is red

#### Scenario: Reset time shown on hover
- **GIVEN** the rate limit indicator is rendered
- **WHEN** the user hovers over it
- **THEN** a tooltip displays "Resets at [local time formatted as HH:MM]"

#### Scenario: Indicator hidden when no token
- **GIVEN** no GitHub token is configured
- **WHEN** the header renders
- **THEN** no rate limit indicator is shown

#### Scenario: Skeleton state before first API call
- **GIVEN** a token is configured but no API calls have been made yet this session
- **WHEN** the header renders
- **THEN** the indicator shows a dash or placeholder instead of a number

### Requirement: Low rate-limit warning before deployment
The system SHALL warn the user when fewer than 500 API requests remain before they trigger
a deployment.

#### Scenario: Warning shown when limit is low
- **GIVEN** `remaining < 500`
- **WHEN** the user attempts to trigger a deploy (single or batch)
- **THEN** an amber alert is shown: "Only [N] GitHub API requests remaining (resets at
  [time]). Batch deployments may fail."

#### Scenario: Warning is informational only
- **GIVEN** the low rate-limit warning is visible
- **WHEN** the user proceeds to deploy
- **THEN** the deployment is triggered normally; the warning does not block the action
