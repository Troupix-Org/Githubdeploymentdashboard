# Change: Multi-Project Deployment Dashboard

## Why
Users must open each project individually to check deployment status. A unified, auto-refreshing dashboard surfaces recent deployments across all projects on a single page without navigation overhead.

## What Changes
- New "Dashboard" view accessible via a header nav button
- Displays the last N deployments per selected project in a sortable table
- Configurable refresh interval (1–30 min); on each refresh, active deployments pull live status from the GitHub API
- Settings panel: project selection (multi-select), refresh interval, sort order (date / project / status / environment), rows per project
- Dashboard configuration persisted in localStorage (`dashboard_config`)

## Impact
- Affected specs: `multi-project-dashboard` (new capability)
- Affected code:
  - `src/components/MultiProjectDashboard.tsx` — new component (created)
  - `src/lib/storage.ts` — `DashboardConfig` interface + `getDashboardConfig()` / `saveDashboardConfig()` (added)
  - `src/App.tsx` — `'dashboard'` added to `View` type; render branch added
  - `src/components/Header.tsx` — Dashboard nav button; `currentView` / `onNavigate` props added
