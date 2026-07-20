## ADDED Requirements

### Requirement: Pipeline promotion configuration
The system SHALL allow a pipeline to declare which pipeline represents its next environment
(the promotion target).

#### Scenario: Set promotion target in pipeline config
- **GIVEN** a project with pipelines "Deploy QA" and "Deploy Staging"
- **WHEN** the user edits "Deploy QA" and selects "Deploy Staging" as its promotion target
- **THEN** `deployQA.promotesTo = deployStaging.id` is persisted with the project

#### Scenario: Pipeline cannot promote to itself
- **GIVEN** the "Promotes to" dropdown for pipeline A is open
- **WHEN** the options are rendered
- **THEN** pipeline A is not listed as a selectable option

### Requirement: Promote action on successful deployments
The system SHALL display a Promote button on completed successful deployment rows for
pipelines that have a promotion target configured.

#### Scenario: Promote button shown on success rows
- **GIVEN** a deployment row with status `success` for a pipeline with `promotesTo` set
- **WHEN** the deployment status table renders
- **THEN** a "Promote →" button is visible in the Actions column of that row

#### Scenario: Promote button not shown on non-success rows
- **GIVEN** a deployment row with status `failure`, `pending`, or `in_progress`
- **WHEN** the table renders
- **THEN** no Promote button is shown regardless of `promotesTo` configuration

#### Scenario: Promote button not shown when no target configured
- **GIVEN** a deployment row with status `success` for a pipeline with no `promotesTo`
- **WHEN** the table renders
- **THEN** no Promote button is shown

### Requirement: Promote pre-fills target pipeline form
The system SHALL pre-fill the target pipeline's deploy form with the source build number
when the user clicks Promote.

#### Scenario: Build number copied to target pipeline
- **GIVEN** a successful deployment of "Deploy QA" with build number "1.5.0"
- **AND** "Deploy QA" has `promotesTo = "Deploy Staging".id`
- **WHEN** the user clicks "Promote →"
- **THEN** `inputValues["Deploy Staging"].build_number` is set to "1.5.0", the Deploy
  section expands, scrolls into view, and a banner reads "Build 1.5.0 copied to Deploy
  Staging — review and deploy"

#### Scenario: Target pipeline not found
- **GIVEN** `promotesTo` points to a pipeline ID that no longer exists in the project
- **WHEN** the user clicks "Promote →"
- **THEN** an error message reads "Promotion target pipeline no longer exists. Update your
  pipeline configuration."
