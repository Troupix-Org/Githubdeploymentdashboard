## ADDED Requirements

### Requirement: Per-pipeline build number pattern configuration
The system SHALL allow a regex pattern to be configured per pipeline to constrain valid
build number formats.

#### Scenario: Pattern saved with pipeline
- **GIVEN** the user enters `^\d+\.\d+\.\d+$` in the pipeline's "Build number pattern" field
- **WHEN** the pipeline is saved
- **THEN** `pipeline.buildNumberPattern = "^\\d+\\.\\d+\\.\\d+$"` is persisted

#### Scenario: Invalid regex rejected at config time
- **GIVEN** the user types `[invalid(` as the pattern
- **WHEN** the pattern field loses focus
- **THEN** an inline error reads "Invalid regex" and the Save button is disabled

#### Scenario: Live preview with valid default value
- **GIVEN** the pipeline has `defaultInputValues.build_number = "1.5.0"` and the pattern `^\d+\.\d+\.\d+$`
- **WHEN** the pattern field is rendered
- **THEN** a green preview line reads "✅ Matches default value"

#### Scenario: Live preview with invalid default value
- **GIVEN** the pipeline has `defaultInputValues.build_number = "build-123"` and the pattern `^\d+\.\d+\.\d+$`
- **WHEN** the pattern field is rendered
- **THEN** a red preview line reads "❌ Default value does not match"

### Requirement: Live build number validation in the deploy form
The system SHALL validate the build number input in real time against the pipeline's
configured pattern.

#### Scenario: Valid value shows green border
- **GIVEN** a pipeline with pattern `^\d+\.\d+\.\d+$`
- **WHEN** the user types "2.1.0" in the build number field
- **THEN** the input has a green border and no error message

#### Scenario: Invalid value shows red border and message
- **GIVEN** a pipeline with pattern `^\d+\.\d+\.\d+$`
- **WHEN** the user types "build-123"
- **THEN** the input has a red border and an inline message reads
  "Does not match expected format: ^\d+\.\d+\.\d+$"

#### Scenario: Deploy button disabled on validation failure
- **GIVEN** the build number input is non-empty and fails the pattern
- **WHEN** the deploy form renders
- **THEN** the Deploy button is disabled

#### Scenario: No validation when no pattern configured
- **GIVEN** a pipeline with no `buildNumberPattern`
- **WHEN** the user types any value in the build number field
- **THEN** no validation styling is applied and the Deploy button is not disabled by pattern

### Requirement: Validation surfaced in Deploy All dialog
The system SHALL flag build number format violations in the batch deployment summary.

#### Scenario: Invalid format badge in batch summary
- **GIVEN** a pipeline with pattern `^\d+\.\d+\.\d+$` and build number "snapshot-42"
- **WHEN** the Deploy All confirmation dialog renders
- **THEN** the pipeline's Build Number cell shows a red "Invalid format" badge alongside
  the build number value

#### Scenario: Pattern violation does not block batch deploy
- **GIVEN** one pipeline has an invalid build number format
- **WHEN** the user clicks "Confirm & Deploy"
- **THEN** the batch proceeds; the invalid pipeline will fail at the GitHub Actions level;
  the warning is informational only
