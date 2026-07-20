## ADDED Requirements

### Requirement: Analytics card visibility
The system SHALL display an Analytics section in the deployment dashboard only when enough
data exists to produce meaningful charts.

#### Scenario: Analytics hidden with fewer than 3 deployments
- **GIVEN** a project with 0–2 deployments
- **WHEN** the deployment dashboard renders
- **THEN** the Analytics card is not shown

#### Scenario: Analytics shown with sufficient data
- **GIVEN** a project with 3 or more deployments
- **WHEN** the deployment dashboard renders
- **THEN** the Analytics card is visible and collapsed by default

### Requirement: Success rate chart
The system SHALL display the ratio of successful to failed deployments as a donut chart.

#### Scenario: Donut chart reflects terminal deployments
- **GIVEN** a project has 8 successful and 2 failed deployments (plus some pending)
- **WHEN** the analytics card is expanded
- **THEN** the donut chart shows green = 8, red = 2; pending/in-progress are excluded

#### Scenario: All-success state
- **GIVEN** all deployments are successful
- **WHEN** the success rate chart renders
- **THEN** the donut is fully green with "100%" label

### Requirement: Deployments per day chart
The system SHALL display deployment frequency as a bar chart over the last 14 days.

#### Scenario: Days with no deployments show zero bars
- **GIVEN** deployments on only 3 of the last 14 days
- **WHEN** the frequency chart renders
- **THEN** all 14 days are shown with 0-height bars on empty days

#### Scenario: Count reflects all deployment statuses
- **GIVEN** 3 deployments on a single day (1 success, 1 failure, 1 in-progress)
- **WHEN** the frequency chart renders for that day
- **THEN** the bar height is 3

### Requirement: Average duration by pipeline chart
The system SHALL display mean deployment duration per pipeline as a horizontal bar chart.

#### Scenario: Only completed deployments included
- **GIVEN** pipeline A has 2 successful deployments (120s, 180s) and 1 pending
- **WHEN** the duration chart renders
- **THEN** pipeline A shows "2m 30s" (150 second average); the pending is excluded

#### Scenario: Duration chart hidden for single pipeline
- **GIVEN** only one pipeline has completed deployments
- **WHEN** the analytics card renders
- **THEN** the duration chart is not shown (no comparative value)
