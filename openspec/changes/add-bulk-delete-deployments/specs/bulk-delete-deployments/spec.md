## ADDED Requirements

### Requirement: Batch selection mode
The system SHALL provide a selection mode in the Deployment Status section that allows
users to mark multiple batches for bulk deletion.

#### Scenario: Enter and exit select mode
- **GIVEN** the Deployment Status card is showing batches
- **WHEN** the user clicks "Select"
- **THEN** a checkbox appears on each batch header and a "Cancel" button replaces "Select"
- **WHEN** the user clicks "Cancel"
- **THEN** all checkboxes disappear and any selection is cleared

#### Scenario: Individual batch checkbox toggles selection
- **GIVEN** select mode is active
- **WHEN** the user clicks the checkbox on batch #3
- **THEN** batch #3 is added to the selection; the action bar updates its count

#### Scenario: Select all / deselect all
- **GIVEN** select mode is active with 5 batches visible
- **WHEN** the user clicks "Select all"
- **THEN** all 5 batch IDs are selected
- **WHEN** the user then clicks "Deselect all"
- **THEN** the selection is cleared

### Requirement: Bulk action bar
The system SHALL display a contextual action bar when select mode is active.

#### Scenario: Action bar shows correct counts
- **GIVEN** 3 batches are selected containing a total of 7 deployments
- **WHEN** the action bar renders
- **THEN** it reads "3 batch(es) selected — 7 deployment(s)"

#### Scenario: Delete button disabled with empty selection
- **GIVEN** select mode is active and no batches are selected
- **WHEN** the action bar renders
- **THEN** the "Delete selected" button is disabled

### Requirement: Bulk deletion confirmation and execution
The system SHALL require explicit confirmation before deleting multiple batches.

#### Scenario: Confirmation dialog shows affected counts
- **GIVEN** 2 batches are selected containing 5 deployments
- **WHEN** the user clicks "Delete selected"
- **THEN** a dialog appears: "Delete 2 batches? This will permanently remove 5 deployments."

#### Scenario: Confirmed bulk deletion removes all selected batches
- **GIVEN** the bulk delete confirmation dialog is open
- **WHEN** the user confirms
- **THEN** all deployments in the selected batches are removed from storage, the list refreshes, select mode exits, and a success toast appears

#### Scenario: Cancelled bulk deletion makes no changes
- **GIVEN** the bulk delete confirmation dialog is open
- **WHEN** the user cancels
- **THEN** no deployments are deleted and select mode remains active
