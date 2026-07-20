## ADDED Requirements

### Requirement: Pipeline dependency configuration
The system SHALL allow users to declare that a pipeline depends on one or more other
pipelines within the same project.

#### Scenario: Set dependencies in pipeline config
- **GIVEN** a project with pipelines A, B, and C
- **WHEN** the user edits pipeline C and selects A and B as dependencies
- **THEN** `C.dependsOn = [A.id, B.id]` is persisted with the project

#### Scenario: Circular dependency prevented
- **GIVEN** pipeline A depends on pipeline B
- **WHEN** the user tries to set pipeline B to depend on pipeline A
- **THEN** pipeline A is disabled (greyed out) in B's dependency selector and cannot be chosen

### Requirement: Dependency-aware batch deployment
The system SHALL execute batch deployments in topological order, waiting for each
dependency to succeed before starting its dependents.

#### Scenario: Dependent pipeline waits for prerequisite
- **GIVEN** pipeline B depends on pipeline A
- **AND** both are selected in a batch deploy
- **WHEN** the batch runs
- **THEN** pipeline A is triggered first; pipeline B is triggered only after A reaches `success`

#### Scenario: Pipelines without dependencies run first
- **GIVEN** a batch with pipelines A (no deps), B (depends on A), C (no deps)
- **WHEN** the batch runs
- **THEN** A and C are triggered simultaneously in the first level; B is triggered after A succeeds

#### Scenario: Dependent pipeline skipped on prerequisite failure
- **GIVEN** pipeline B depends on pipeline A
- **AND** pipeline A reaches status `failure`
- **WHEN** the batch execution engine processes the result
- **THEN** pipeline B is not triggered; the results banner reports it as "skipped"

#### Scenario: Cycle detected before execution
- **GIVEN** pipeline A depends on B and B depends on A (cycle)
- **WHEN** the user opens the Deploy All confirmation dialog
- **THEN** an error message reads "Circular dependency detected: [A → B → A]. Fix pipeline
  configuration before deploying." and the Confirm button is disabled

### Requirement: Dependency visibility in Deploy All dialog
The system SHALL show each pipeline's dependencies in the Deploy All confirmation table.

#### Scenario: Dependencies shown as badges
- **GIVEN** pipeline B has `dependsOn = [A.id]`
- **WHEN** the Deploy All summary table renders
- **THEN** a "Depends on: A" badge appears in pipeline B's row
