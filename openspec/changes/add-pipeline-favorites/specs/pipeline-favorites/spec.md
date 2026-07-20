## ADDED Requirements

### Requirement: Star / unstar a pipeline
The system SHALL allow users to mark any pipeline as starred from the deploy form.

#### Scenario: Unstarred pipeline shows outline star
- **GIVEN** a pipeline with no `starred` value (or `starred: false`)
- **WHEN** the deploy form renders
- **THEN** an outline star icon is shown in the pipeline header; clicking it sets
  `starred: true`, persists the change, and the icon becomes filled

#### Scenario: Starred pipeline shows filled star
- **GIVEN** `pipeline.starred = true`
- **WHEN** the deploy form renders
- **THEN** a filled purple star icon is shown; clicking it sets `starred: false` and
  the icon returns to outline

#### Scenario: Star state persists across sessions
- **GIVEN** the user stars a pipeline and reloads the page
- **WHEN** the deploy form renders
- **THEN** the pipeline still shows a filled star

### Requirement: Starred pipelines appear first in the deploy form
The system SHALL sort the pipeline list so starred pipelines appear before unstarred ones.

#### Scenario: Starred pipelines at top
- **GIVEN** pipelines [A (unstarred), B (starred), C (unstarred), D (starred)]
- **WHEN** the deploy section renders
- **THEN** the order is B, D, A, C — starred first in original relative order, then
  unstarred in original relative order

#### Scenario: Separator shown between groups
- **GIVEN** at least one starred and at least one unstarred pipeline exist
- **WHEN** the deploy section renders
- **THEN** a separator with label "Other pipelines" appears between the last starred and
  first unstarred pipeline row

#### Scenario: No separator when all pipelines share the same star state
- **GIVEN** all pipelines are starred, or none are starred
- **WHEN** the deploy section renders
- **THEN** no separator is shown and the original pipeline order is preserved
