## 1. Data model

- [ ] 1.1 Add `locked?: boolean` and `lockReason?: string` to the `Pipeline` interface in `lib/storage.ts`

## 2. Lock toggle and dialog

- [ ] 2.1 Add a `Lock` / `Unlock` icon button (Lucide `Lock` / `LockOpen`) in the pipeline header row, right-aligned next to the star button
- [ ] 2.2 Clicking "Lock" opens a small `Dialog` with a textarea for an optional reason (placeholder: "e.g. Change freeze until Monday") and Lock / Cancel buttons
- [ ] 2.3 Clicking "Unlock" opens a confirmation `AlertDialog`: "Unlock [pipeline name]? Deployments will be re-enabled." with Unlock / Cancel
- [ ] 2.4 On lock confirm: set `pipeline.locked = true`, `pipeline.lockReason = reason`, call `saveProject`, update local state
- [ ] 2.5 On unlock confirm: set `pipeline.locked = false`, clear `pipeline.lockReason`, call `saveProject`, update local state

## 3. Locked pipeline display in deploy form

- [ ] 3.1 When `pipeline.locked` is true, show an amber `🔒 Locked` badge in the pipeline header (alongside the pipeline name)
- [ ] 3.2 If `lockReason` is set, show it as italic text beneath the badge: *"Reason: [lockReason]"*
- [ ] 3.3 Replace the Deploy button with a disabled amber button labelled "🔒 Locked — cannot deploy"
- [ ] 3.4 Hide the individual workflow input fields for locked pipelines (no point filling them in)

## 4. Deploy All exclusion

- [ ] 4.1 When the "Deploy All" button is clicked, exclude locked pipelines from the initial `selectedPipelines` set
- [ ] 4.2 In the Deploy All confirmation dialog, show locked pipelines in the table (if `editingSelection` is active) with a `🔒 Locked` badge and their checkbox pre-unchecked and disabled — they cannot be re-added to the batch
