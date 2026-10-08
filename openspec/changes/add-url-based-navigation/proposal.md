# Change: Add URL-Based Navigation

## Why
The application stores its current view and selected project only in React state, so reloading returns the user to the projects view. URL-backed navigation will preserve the current view and make application views directly addressable.

## What Changes
- Add hash-based routes for projects, the multi-project dashboard, project creation/configuration, and project deployment views.
- Restore the selected project from IndexedDB when loading a project-specific route.
- Keep browser back/forward navigation synchronized with the visible view.
- Fall back to the projects view when a project route references a project that no longer exists.

## Impact
- Affected specs: `application-navigation`
- Affected code: `src/App.tsx`, `src/main.tsx`, and existing navigation callbacks
- No dependency addition is expected; `react-router-dom` is already installed.