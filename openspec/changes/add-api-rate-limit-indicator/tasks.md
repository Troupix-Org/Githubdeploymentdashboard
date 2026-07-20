## 1. Capture rate limit in github.ts

- [ ] 1.1 In `githubFetch`, after receiving a response, read `X-RateLimit-Remaining` and `X-RateLimit-Reset` headers
- [ ] 1.2 Store the latest values in a module-level object `rateLimitState: { remaining: number | null; resetAt: number | null }` (plain object — no framework dependency)
- [ ] 1.3 Export a `getRateLimitState()` accessor and an `onRateLimitUpdate` callback registration function so components can subscribe to changes without coupling to React
- [ ] 1.4 If `X-RateLimit-Remaining` is missing from a response (e.g. unauthenticated), leave the cached value unchanged

## 2. Header rate limit widget

- [ ] 2.1 In `Header.tsx`, subscribe to `onRateLimitUpdate` in a `useEffect` and store `remaining` / `resetAt` in local state
- [ ] 2.2 Render the widget only when a GitHub token is configured (`getGitHubToken() !== null`)
- [ ] 2.3 Display remaining count as `[remaining] / 5,000` with a narrow horizontal progress bar beneath it
- [ ] 2.4 Colour the bar: green (`remaining > 1000`), amber (`500–1000`), red (`< 500`)
- [ ] 2.5 Wrap the widget in a `title` tooltip showing the reset time: "Resets at [HH:MM local time]"
- [ ] 2.6 Show a skeleton/dash state when `remaining` is `null` (no API call made yet this session)

## 3. Low rate-limit warning banner

- [ ] 3.1 In `DeploymentDashboard.tsx`, read `getRateLimitState()` before triggering a deploy; if `remaining < 500`, prepend an amber `Alert` warning: "Only [N] GitHub API requests remaining (resets at [time]). Batch deployments may fail."
- [ ] 3.2 The warning is informational only — it does not block the deployment
