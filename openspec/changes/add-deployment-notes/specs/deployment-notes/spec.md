## ADDED Requirements

### Requirement: Add and edit deployment notes
The system SHALL allow users to attach free-text notes to any deployment after it has been
triggered.

#### Scenario: Open note editor on deployment with no existing note
- **GIVEN** a deployment row with no note
- **WHEN** the user clicks the note icon button
- **THEN** a popover opens with an empty textarea and Save / Cancel buttons

#### Scenario: Open note editor on deployment with existing note
- **GIVEN** a deployment with `notes = "Hotfix for #452"`
- **WHEN** the user clicks the note icon button
- **THEN** the popover opens with the textarea pre-filled with "Hotfix for #452"

#### Scenario: Save note persists to storage
- **GIVEN** the note popover is open with text "Deployed by CI skip override"
- **WHEN** the user clicks Save
- **THEN** `deployment.notes` is updated in localStorage, the popover closes, and the note
  chip appears on the row without a page reload

#### Scenario: Cancel discards changes
- **GIVEN** the note popover is open and the user has typed new text
- **WHEN** the user clicks Cancel
- **THEN** the popover closes, `deployment.notes` is unchanged, and the original chip
  (if any) is still shown

#### Scenario: Note icon distinguishes annotated vs unannotated rows
- **GIVEN** two deployment rows — one with a note, one without
- **WHEN** both rows render
- **THEN** the row with a note shows a filled/coloured note icon; the row without shows a
  muted/outline icon

### Requirement: Note display on deployment rows
The system SHALL display a truncated preview of the note directly on the deployment row.

#### Scenario: Short note displayed in full
- **GIVEN** `deployment.notes = "Hotfix"` (6 chars)
- **WHEN** the deployment row renders
- **THEN** the chip shows "Hotfix" without truncation

#### Scenario: Long note truncated with ellipsis
- **GIVEN** `deployment.notes = "Rollback triggered because of payment gateway timeout in prod"`
- **WHEN** the deployment row renders
- **THEN** the chip shows the first 30 characters followed by "…"; hovering reveals the full text in a tooltip

#### Scenario: No chip for empty note
- **GIVEN** `deployment.notes` is undefined or an empty string
- **WHEN** the deployment row renders
- **THEN** no note chip is shown
