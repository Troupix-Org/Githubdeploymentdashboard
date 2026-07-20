# deployment-history Specification

## Purpose
TBD - created by archiving change add-deployment-history-enhancements. Update Purpose after archive.
## Requirements
### Requirement: Redeploy from history
The system SHALL provide a Redeploy action on each completed or failed deployment row that
pre-fills the Deploy form with the original pipeline, build number, and workflow inputs.

#### Scenario: Redeploy a failed deployment
- **GIVEN** a deployment row with status `failure` or `success`
- **WHEN** the user clicks the Redeploy button
- **THEN** the Deploy section expands, all input fields for that pipeline are populated with
  the original values, the page scrolls to the Deploy section, and a confirmation banner
  reads "Form pre-filled with build [X] — review and deploy"

#### Scenario: Redeploy unavailable for pending/in-progress
- **GIVEN** a deployment row with status `pending` or `in_progress`
- **WHEN** the row is rendered
- **THEN** no Redeploy button is shown (the same pipeline is already active)

---

### Requirement: Deployment duration display
The system SHALL display elapsed or total deployment time on every deployment row.

#### Scenario: Completed deployment shows total duration
- **GIVEN** a deployment with both `startedAt` and `completedAt` set
- **WHEN** the deployment status table renders
- **THEN** a Duration column displays the elapsed time in the format `Xm Ys` (e.g. `"2m 34s"`)
  or `"Xs"` for sub-minute durations

#### Scenario: In-progress deployment shows live counter
- **GIVEN** a deployment with status `in_progress` or `pending` and only `startedAt` set
- **WHEN** the deployment status table is visible
- **THEN** the Duration column displays a live counter that increments every second until the
  deployment completes or the component unmounts

---

### Requirement: Browser push notifications for deployment completion
The system SHALL send a browser push notification when a deployment transitions to
`success` or `failure` while the tab is in the background.

#### Scenario: Permission requested on first visit with deployments
- **GIVEN** the user has never been asked for notification permission
- **AND** the Deployment Dashboard is mounted with at least one active deployment
- **WHEN** the component mounts
- **THEN** the browser prompts for notification permission exactly once per browser session

#### Scenario: Notification sent on completion (permission granted)
- **GIVEN** `Notification.permission` is `"granted"`
- **AND** an auto-refresh cycle detects a deployment transitioning to `success`
- **WHEN** the status update is processed
- **THEN** a browser notification fires with title "Deployment succeeded" and body
  "[Pipeline name] completed successfully"

#### Scenario: Notification sent on failure (permission granted)
- **GIVEN** `Notification.permission` is `"granted"`
- **AND** an auto-refresh cycle detects a deployment transitioning to `failure`
- **WHEN** the status update is processed
- **THEN** a browser notification fires with title "Deployment failed" and body
  "[Pipeline name] failed"

#### Scenario: No notification when permission denied
- **GIVEN** `Notification.permission` is `"denied"`
- **WHEN** a deployment completes
- **THEN** no notification is sent and no error is thrown; the in-app completion banner
  still appears as before

#### Scenario: Notification permission status indicator
- **GIVEN** the Deployment Status card is visible
- **WHEN** rendered
- **THEN** a bell icon in the card header reflects the current permission state:
  - Solid bell = granted
  - Muted/crossed bell = denied
  - Outline bell = not yet requested

