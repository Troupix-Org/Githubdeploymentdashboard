## Context
The app is deployed as a static site on GitHub Pages under `/Githubdeploymentdashboard/`. Its current view and selected project are held in `App` state and are lost on reload. Project configurations are persisted in IndexedDB.

## Goals / Non-Goals
- Goals: preserve the current app view across reloads, support direct links and browser back/forward, and keep refreshes compatible with GitHub Pages.
- Non-goals: persist unsaved form input, change authentication/token storage, or persist scroll position.

## Decisions
- Decision: use `HashRouter` from the already-installed `react-router-dom` package. Hash routes keep navigation client-side on GitHub Pages without requiring server rewrite rules.
- Decision: encode project-specific views with the project ID in the route, then load project data from IndexedDB when the route is opened or reloaded.
- Decision: use `/projects`, `/dashboard`, `/projects/new`, `/projects/:projectId/config`, and `/projects/:projectId/deploy` as route patterns. Unknown project IDs return to `/projects`.
- Alternatives considered: `BrowserRouter` gives cleaner paths but requires GitHub Pages fallback handling for direct reloads, which this deployment does not currently configure.

## Risks / Trade-offs
- Hash routes are less clean-looking than browser-history paths, but work with the current static hosting setup.
- A direct route to a project removed from IndexedDB cannot be restored and should fall back to the projects view.

## Migration Plan
Existing bookmarks to the site root continue to open the projects view. Navigation after deployment updates the URL to the corresponding hash route.

## Open Questions
- None.