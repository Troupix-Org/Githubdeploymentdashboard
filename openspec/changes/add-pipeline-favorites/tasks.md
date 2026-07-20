## 1. Data model

- [ ] 1.1 Add `starred?: boolean` to the `Pipeline` interface in `lib/storage.ts`

## 2. Star toggle in deploy form

- [ ] 2.1 In the pipeline header row inside the deploy section, add a `Star` icon button (Lucide) in the top-right corner next to the latest build info
- [ ] 2.2 When `pipeline.starred` is `true`, render the star filled with the accent purple (`#7c3aed`); when `false`/undefined, render it as an outline in muted gray
- [ ] 2.3 On click, toggle `pipeline.starred`, update the project via `saveProject`, and update local `project` state so the UI responds instantly (no page reload)

## 3. Sorted pipeline list

- [ ] 3.1 Derive `sortedPipelines` from `project.pipelines` — starred pipelines first in their original order, then unstarred in their original order
- [ ] 3.2 Use `sortedPipelines` in place of `project.pipelines` when rendering the deploy form pipeline rows
- [ ] 3.3 When at least one starred and one unstarred pipeline both exist, render a thin separator `<hr>` with label "Other pipelines" between the two groups

## 4. Persistence

- [ ] 4.1 Call `saveProject(updatedProject)` after toggling to persist the `starred` field to IndexedDB
- [ ] 4.2 Verify that existing pipelines without `starred` field are treated as unstarred (no migration needed — optional field defaults to `undefined`/falsy)
