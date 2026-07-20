## 1. Data model

- [ ] 1.1 Add `buildNumberPattern?: string` to the `Pipeline` interface in `lib/storage.ts`

## 2. ProjectConfig — pattern field

- [ ] 2.1 In the pipeline edit form in `ProjectConfig.tsx`, add a "Build number pattern (regex)" text input after the existing branch/environment fields
- [ ] 2.2 Validate that the entered string is a valid regex when the field loses focus; if invalid, show an inline error "Invalid regex" and prevent saving
- [ ] 2.3 Show a live preview line beneath the pattern field: if the pipeline already has a `defaultInputValues.build_number`, test it against the current pattern and display ✅ "Matches default value" or ❌ "Default value does not match"
- [ ] 2.4 Persist `buildNumberPattern` when saving the pipeline

## 3. DeploymentDashboard — live validation

- [ ] 3.1 Add a `validateBuildNumber(value: string, pattern?: string): boolean` pure helper — returns `true` when `pattern` is undefined/empty OR when `new RegExp(pattern).test(value)` succeeds
- [ ] 3.2 In the build number `Input` for each pipeline, apply a green border (`border-green-400`) when the value is non-empty and valid, and a red border (`border-red-400`) when the value is non-empty and invalid
- [ ] 3.3 Show an inline error message `"Does not match expected format: [pattern]"` below the input when validation fails
- [ ] 3.4 Disable the individual Deploy button when the build number input is non-empty and fails validation
- [ ] 3.5 In `handleDeploy`, re-check the pattern and return early with `setError(...)` if validation fails (guards against programmatic calls)
- [ ] 3.6 In the Deploy All confirmation dialog, mark pipelines with invalid build numbers with a red "Invalid format" badge in the Build Number column
