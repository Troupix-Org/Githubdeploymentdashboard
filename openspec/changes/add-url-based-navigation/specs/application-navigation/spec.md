## ADDED Requirements

### Requirement: URL-backed application navigation
The system SHALL represent the active application view in a URL that can be reloaded or opened directly, without requiring server-side route rewrites.

#### Scenario: Reload restores the current view
- **GIVEN** the user is on a supported application view
- **WHEN** the page is reloaded
- **THEN** the same view is restored from the URL

#### Scenario: Project deployment view restores its project
- **GIVEN** the user is viewing a project's deployment dashboard
- **WHEN** the page is reloaded or the project URL is opened directly
- **THEN** the project is loaded from IndexedDB and its deployment dashboard is shown

#### Scenario: Browser history follows navigation
- **WHEN** the user navigates between application views and uses the browser back or forward action
- **THEN** the URL and rendered view stay in sync

#### Scenario: Missing project route falls back safely
- **GIVEN** a project-specific URL refers to a project that no longer exists
- **WHEN** the route is resolved
- **THEN** the projects view is shown

#### Scenario: GitHub Pages can reload a nested app view
- **GIVEN** the application is hosted on GitHub Pages
- **WHEN** the user reloads a supported application view
- **THEN** the static host serves the app and the client restores the view from the URL