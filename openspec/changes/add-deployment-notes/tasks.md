## 1. Data model

- [ ] 1.1 Add `notes?: string` to the `Deployment` interface in `lib/storage.ts`

## 2. Note editing UI

- [ ] 2.1 In the deployment status table Actions column, add a `StickyNote` (or `MessageSquare`) icon button after the Redeploy button; use a filled/coloured variant when the deployment already has a note
- [ ] 2.2 Clicking the button opens a `Popover` (use the existing `ui/popover.tsx`) containing a `textarea` (max 500 chars) pre-filled with the current note value and Save / Cancel buttons
- [ ] 2.3 On Save, update `deployment.notes`, call `saveDeployment(updatedDeployment)`, and refresh the local `deployments` state without a full `loadDeployments()` reload (patch the array in place)
- [ ] 2.4 On Cancel, close the popover with no changes

## 3. Note display in table

- [ ] 3.1 When a deployment has a non-empty note, display a small truncated chip (max 30 chars + "…") in the **Pipeline** cell below the pipeline name badge
- [ ] 3.2 Wrap the chip in a `title` tooltip showing the full note text
- [ ] 3.3 Apply a subtle yellow/amber tint to the chip (`background: #fef9c3`, `color: #854d0e`) to make it visually distinct from pipeline/status badges
