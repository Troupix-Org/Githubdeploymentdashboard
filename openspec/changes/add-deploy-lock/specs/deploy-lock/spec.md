## ADDED Requirements

### Requirement: Lock a pipeline against deployments
The system SHALL allow locking a pipeline with an optional reason to prevent accidental
deployments.

#### Scenario: Lock a pipeline with a reason
- **GIVEN** an unlocked pipeline
- **WHEN** the user clicks the lock icon and enters "Post-release observation period" and confirms
- **THEN** `pipeline.locked = true`, `pipeline.lockReason = "Post-release observation period"` are persisted and the pipeline header shows an amber "🔒 Locked" badge with the reason

#### Scenario: Lock without a reason
- **GIVEN** an unlocked pipeline
- **WHEN** the user clicks lock and submits with an empty reason field
- **THEN** `pipeline.locked = true` is persisted with no reason text; the badge shows "🔒 Locked" without a reason line

#### Scenario: Unlock a pipeline
- **GIVEN** a locked pipeline
- **WHEN** the user clicks the lock icon and confirms unlock
- **THEN** `pipeline.locked` and `pipeline.lockReason` are cleared and the pipeline returns to normal state

### Requirement: Locked pipeline cannot be deployed
The system SHALL prevent deployment of locked pipelines through all deploy paths.

#### Scenario: Deploy button replaced for locked pipeline
- **GIVEN** `pipeline.locked = true`
- **WHEN** the deploy form renders
- **THEN** the input fields are hidden and the Deploy button is replaced with a disabled amber "🔒 Locked — cannot deploy" button

#### Scenario: Locked pipelines excluded from Deploy All pre-selection
- **GIVEN** a project with pipelines A (unlocked), B (locked), C (unlocked)
- **WHEN** the user clicks "Deploy All"
- **THEN** the initial selection contains only A and C; B is not included

#### Scenario: Locked pipeline cannot be added to batch in edit mode
- **GIVEN** the Deploy All confirmation dialog is in edit mode
- **AND** pipeline B is locked
- **WHEN** the user views pipeline B in the selection table
- **THEN** pipeline B's checkbox is disabled and shows a "🔒 Locked" badge; it cannot be checked

### Requirement: Lock state visible on locked pipeline rows
The system SHALL clearly communicate locked status in the pipeline header.

#### Scenario: Lock reason shown beneath badge
- **GIVEN** `pipeline.locked = true` and `pipeline.lockReason = "Change freeze"`
- **WHEN** the pipeline header renders
- **THEN** an amber "🔒 Locked" badge is shown and beneath it italicised text reads *"Reason: Change freeze"*
