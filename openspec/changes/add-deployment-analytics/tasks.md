## 1. Data derivation helpers (pure functions, no new state)

- [ ] 1.1 Add `getSuccessRateData(deployments)` — returns `[{ name: 'Success', value: N }, { name: 'Failed', value: N }]`
- [ ] 1.2 Add `getDeploymentsPerDay(deployments, days = 14)` — returns array of `{ date: 'DD/MM', count: N }` for the last 14 days, zero-filling missing days
- [ ] 1.3 Add `getAvgDurationByPipeline(deployments, pipelines)` — returns array of `{ name: string, avgMs: number }` for pipelines with at least one completed deployment, sorted descending

## 2. Analytics card component

- [ ] 2.1 Add an Analytics `Collapsible` card after the Deployment Status card in `DeploymentDashboard`; render only when `deployments.length >= 3`
- [ ] 2.2 Add a `BarChart` (recharts) for deployments per day — x-axis dates, y-axis integer count, purple bars matching the app theme
- [ ] 2.3 Add a `PieChart` / `RadialBarChart` (recharts) for success vs failure — green for success, red for failure; show counts in the centre label
- [ ] 2.4 Add a horizontal `BarChart` for avg duration by pipeline — format duration as `Xm Ys` using the existing `formatDuration` helper; show only pipelines with data
- [ ] 2.5 Each chart has a small section header and is wrapped in a responsive container (`ResponsiveContainer width="100%"`)
- [ ] 2.6 Hide the duration chart when fewer than 2 pipelines have completed deployments (would be a single-bar chart with no comparative value)
