## 1. Storage
- [x] 1.1 Add `DashboardConfig` interface to `src/lib/storage.ts`
- [x] 1.2 Add `getDashboardConfig()` and `saveDashboardConfig()` helpers

## 2. Dashboard Component
- [x] 2.1 Create `src/components/MultiProjectDashboard.tsx`
- [x] 2.2 Project multi-select checkboxes in collapsible settings panel
- [x] 2.3 Refresh interval dropdown (1 / 2 / 5 / 10 / 15 / 30 min)
- [x] 2.4 Sort selector (date / project / status / environment)
- [x] 2.5 Rows-per-project selector (5 / 10 / 20)
- [x] 2.6 Deployment table with columns: Project, Pipeline, Environment, Build #, Status, Branch, Started, Actions
- [x] 2.7 Status badges and environment colour coding
- [x] 2.8 Auto-refresh via `setInterval`; countdown timer displayed
- [x] 2.9 Live GitHub API status fetch for active (`pending` / `in_progress`) deployments on each refresh
- [x] 2.10 Updated statuses persisted back to localStorage via `saveDeployment()`
- [x] 2.11 "Open project" link button navigates to `DeploymentDashboard` via callback

## 3. App Integration
- [x] 3.1 Add `'dashboard'` to `View` type in `src/App.tsx`
- [x] 3.2 Render `<MultiProjectDashboard>` for `view === 'dashboard'`
- [x] 3.3 Pass `currentView` and `onNavigate` props to `<Header>`

## 4. Header
- [x] 4.1 Add `LayoutDashboard` icon import and Dashboard nav button to `src/components/Header.tsx`
- [x] 4.2 Button toggles between dashboard and projects view; active state highlighted
