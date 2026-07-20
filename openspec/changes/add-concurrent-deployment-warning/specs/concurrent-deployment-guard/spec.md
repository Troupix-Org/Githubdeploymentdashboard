## ADDED Requirements

### Requirement: Concurrent deployment guard — single deploy
The system SHALL warn the user before triggering a single-pipeline deployment when that
pipeline already has an active deployment.

#### Scenario: Warning shown for in-progress pipeline
- **GIVEN** pipeline A has a deployment with status `in_progress` or `pending`
- **WHEN** the user clicks the Deploy button for pipeline A
- **THEN** a confirmation dialog appears with the message "Pipeline [A] already has a
  running deployment. Deploying again may cause conflicts." and offers "Cancel" and
  "Deploy Anyway"

#### Scenario: Deploy proceeds after explicit confirmation
- **GIVEN** the concurrent deployment warning dialog is open
- **WHEN** the user clicks "Deploy Anyway"
- **THEN** the deployment is triggered normally and the dialog closes

#### Scenario: Deploy cancelled
- **GIVEN** the concurrent deployment warning dialog is open
- **WHEN** the user clicks "Cancel"
- **THEN** no deployment is triggered and the dialog closes

#### Scenario: No warning when pipeline is idle
- **GIVEN** pipeline A has no `pending` or `in_progress` deployments
- **WHEN** the user clicks Deploy for pipeline A
- **THEN** deployment triggers immediately with no additional dialog

### Requirement: Concurrent deployment guard — batch deploy
The system SHALL surface a visible warning in the Deploy All confirmation dialog for any
selected pipeline that already has an active deployment.

#### Scenario: Active badge shown in batch summary
- **GIVEN** the Deploy All confirmation dialog is open
- **AND** at least one selected pipeline has an active deployment
- **WHEN** the summary table renders
- **THEN** an amber "Active" badge appears next to that pipeline's name in the table

#### Scenario: Alert shown when conflicts exist in batch
- **GIVEN** one or more selected pipelines have active deployments
- **WHEN** the Deploy All confirmation dialog renders
- **THEN** a yellow alert reads "X pipeline(s) already have active deployments — consider
  deselecting them"

#### Scenario: Batch deploy not blocked
- **GIVEN** the user has reviewed the warnings
- **WHEN** the user clicks "Confirm & Deploy"
- **THEN** all selected pipelines (including conflicting ones) are deployed; the warning is
  informational only
