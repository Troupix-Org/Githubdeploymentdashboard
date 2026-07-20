# Change: GitHub API Rate Limit Indicator

## Why
The app makes GitHub API calls for polling, workflow input fetching, and deployment
triggers. Users have no visibility into their remaining rate limit budget, leading to
confusing failures ("API rate limit exceeded") with no forewarning — especially during
heavy batch operations or frequent polling.

## What Changes
- Capture the `X-RateLimit-Remaining` and `X-RateLimit-Reset` response headers from every
  GitHub API call in `lib/github.ts` and expose them via a module-level store
- Display a rate limit indicator in the app header showing:
  - Remaining requests out of 5,000
  - A colour-coded progress bar (green → amber → red as the limit approaches)
  - Time until reset on hover
- Warn with an amber banner when remaining requests drop below 500
- The indicator is only shown when a token is configured

## Impact
- Affected specs: `api-rate-limit-indicator` (new capability)
- Affected code:
  - `src/lib/github.ts` — capture rate limit headers in `githubFetch`; export observable state
  - `src/components/Header.tsx` — rate limit display widget
  - `src/App.tsx` — pass rate limit state to Header (or use a module-level reactive store)
