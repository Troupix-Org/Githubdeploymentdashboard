## 1. Filter state

- [ ] 1.1 Add state variables: `searchQuery: string`, `statusFilters: Deployment['status'][]`, `environmentFilter: string` to `DeploymentDashboard`
- [ ] 1.2 Derive `filteredDeployments` from `deployments` applying all three filters simultaneously; memoize with `useMemo`
- [ ] 1.3 Derive `filteredBatchIds` from `sortedBatchIds` — include a batch only if it contains at least one matching deployment
- [ ] 1.4 Replace `sortedBatchIds` usages in the render with `filteredBatchIds`; hide non-matching rows within each batch

## 2. Filter toolbar UI

- [ ] 2.1 Add a filter toolbar between the Deployment Status card header and the batch list (only rendered when `deployments.length > 0`)
- [ ] 2.2 Add a text `Input` for `searchQuery` with placeholder "Search build number or pipeline…" and a `Search` icon (Lucide)
- [ ] 2.3 Add status filter chip buttons (All, Pending, In Progress, Success, Failure) — active chip highlighted purple; "All" deselects other filters
- [ ] 2.4 Add an environment `Select` dropdown populated with unique environments from current project deployments; include an "All environments" default option
- [ ] 2.5 Show a "Clear filters" text button when any filter is active; clicking it resets all three states
- [ ] 2.6 Show a results summary line when filters are active: "Showing X of Y deployments"

## 3. Reset on navigation

- [ ] 3.1 Reset all filter state in the `useEffect` that depends on `project.id` (alongside the existing `loadDeployments` call)
