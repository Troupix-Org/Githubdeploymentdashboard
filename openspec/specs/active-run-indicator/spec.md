# active-run-indicator Specification

## Purpose
TBD - created by archiving change add-active-run-indicator. Update Purpose after archive.
## Requirements
### Requirement: Active Run Detection
The system SHALL fetch and display the most recent `in_progress` or `queued` GitHub Actions workflow run for each pipeline, including runs triggered outside the dashboard.

#### Scenario: Externally triggered run is visible
- **WHEN** a pipeline has a workflow run with status `in_progress` or `queued` on GitHub (regardless of trigger source)
- **THEN** the pipeline card SHALL display an active run banner above the deploy button

#### Scenario: No active run
- **WHEN** no workflow run for the pipeline has status `in_progress` or `queued`
- **THEN** the pipeline card SHALL NOT display an active run banner

#### Scenario: Run completes during session
- **WHEN** an active run transitions to `completed` during a polling cycle
- **THEN** the banner SHALL be removed from the pipeline card automatically on the next poll

---

### Requirement: Active Run Banner Display
The banner SHALL display the following information for the active run: status indicator, run title, branch, actor (who triggered), live elapsed time, and a link to the GitHub Actions run page.

#### Scenario: Banner content for in-progress run
- **WHEN** an active run banner is shown
- **THEN** it SHALL display a pulsing status dot, a status badge (`In Progress` or `Queued`), the run title (truncated at ~40 chars), the branch name with a branch icon, the triggering actor's login with a user icon, a live elapsed time counter, and an external link icon that opens `html_url` in a new browser tab

#### Scenario: Loading state
- **WHEN** active runs are being fetched on initial project load
- **THEN** the pipeline card SHALL show a skeleton placeholder in the banner area until the fetch completes

---

### Requirement: Real-Time Status Tracking
The active run status SHALL update automatically using the existing adaptive polling cycle (10–30s) without introducing a separate polling timer.

#### Scenario: Polling refreshes active run state
- **WHEN** the dashboard polling cycle fires (every 10–30s depending on deployment age)
- **THEN** `getWorkflowRuns()` SHALL be called for each pipeline and `activeRuns` state SHALL be updated with the latest status

#### Scenario: Elapsed time updates live
- **WHEN** an active run banner is visible
- **THEN** the elapsed time display SHALL increment every second using the existing elapsed time ticker

---

### Requirement: API Efficiency
Active run detection SHALL minimise GitHub API usage by sharing the existing polling interval and fetching at most 5 recent runs per pipeline per cycle.

#### Scenario: Sequential fetching on load
- **WHEN** a project with multiple pipelines is loaded
- **THEN** `getWorkflowRuns()` calls SHALL be issued sequentially (not concurrently) to avoid rate limit spikes

#### Scenario: Status filter reduces payload
- **WHEN** `getWorkflowRuns()` is called with a `statusFilter`
- **THEN** the GitHub API request SHALL include the `?status=` query parameter to limit results to the requested status

