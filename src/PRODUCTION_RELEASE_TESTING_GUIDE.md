# Production Release Process - Testing Guide

## Testing Checklist

Use this guide to validate the Production Release Process implementation.

## Prerequisites

1. ✅ GitHub token configured with `repo` and `workflow` permissions
2. ✅ At least one project created
3. ✅ Project has repositories configured
4. ✅ Project has pipelines configured with environment labels:
   - At least one pipeline with environment containing "staging" or "qa"
   - At least one pipeline with environment containing "prod" or "production"
5. ✅ Project marked as "Production Release" (checkbox enabled)

## Test Scenario 1: Process Activation

### Expected Behavior
- Production Release Process card appears in DeploymentDashboard
- Card positioned after Deployment Status section
- Card shows "Production Release Process" title
- "PRODUCTION" badge displayed
- Progress bar visible (0% initially)
- "0 of 8 steps completed" text displayed

### Steps to Test
1. Navigate to a project without production pipelines
   - ✅ Production Release Process should NOT appear
2. Navigate to a project with production pipelines
   - ✅ Production Release Process should appear
3. Toggle project's "Production Release" flag off
   - ✅ Production Release Process should disappear (if no prod pipelines)

---

## Test Scenario 2: Step 1 - Deploy to Staging

### Expected Behavior
- Step 1 automatically detected if staging deployments exist
- Step shows as "Completed" if staging deployments successful
- No action button (automatic)

### Steps to Test
1. Deploy to staging pipeline manually
2. Wait for deployment to complete
3. Refresh deployment status
   - ✅ Step 1 should show green checkmark
   - ✅ Status badge: "Completed"
   - ✅ Progress bar: 12.5% (1/8)

---

## Test Scenario 3: Step 2 - Notify QA Staging Ready

### Expected Behavior
- "Compose Email" button appears when Step 1 complete
- Dialog opens with email template
- Template includes project name, release number, pipelines
- Can add recipients (comma-separated)
- Can edit subject and body
- "Copy to Clipboard" button works
- "Mark as Sent" button enables after recipients added

### Steps to Test
1. Complete Step 1
2. Click "Compose Email" on Step 2
   - ✅ Dialog opens
   - ✅ Email template pre-filled
3. Add recipients: `qa@example.com, tester@example.com`
   - ✅ Input accepts comma-separated emails
4. Click "Copy to Clipboard"
   - ✅ Email copied to clipboard
5. Paste into email client (manual verification)
   - ✅ Format correct: To, Subject, Body
6. Return and click "Mark as Sent"
   - ✅ Dialog closes
   - ✅ Step 2 shows green checkmark
   - ✅ Status: "Completed"
   - ✅ Blue info box shows: "Email sent to: qa@example.com, tester@example.com"
   - ✅ Progress bar: 25% (2/8)

---

## Test Scenario 4: Step 3 - QA Sign-off

### Expected Behavior
- "Provide Sign-off" button appears after Step 2
- Dialog opens with sign-off form
- Required fields validated
- Data persists in localStorage
- Completed step displays approval info

### Steps to Test
1. Complete Steps 1 and 2
2. Click "Provide Sign-off" on Step 3
   - ✅ Dialog opens with form
3. Try clicking "Approve Sign-off" without filling form
   - ✅ Button disabled (tester name required)
4. Fill in form:
   - Tester Name: "John Doe"
   - Test Date: today's date
   - Environment: "staging"
   - Check "All tests passed"
   - Comments: "All integration tests passed successfully"
5. Click "Approve Sign-off"
   - ✅ Dialog closes
   - ✅ Step 3 shows green checkmark
   - ✅ Status: "Completed"
   - ✅ Green info box displays:
     - Tester: John Doe
     - Date: [selected date]
     - Environment: staging
     - Comments: All integration tests passed successfully
   - ✅ Progress bar: 37.5% (3/8)
6. Reload page
   - ✅ QA sign-off data still displayed (localStorage persistence)

---

## Test Scenario 5: Step 4 - Notify Production Release

### Expected Behavior
- "Compose Email" button appears after Step 3
- Compliance file upload required
- Email template includes QA sign-off info
- File stored and downloadable

### Steps to Test
1. Complete Steps 1-3
2. Click "Compose Email" on Step 4
   - ✅ Dialog opens
3. Try clicking "Mark as Sent" without uploading file
   - ✅ Button disabled (compliance file required)
4. Create a test compliance file (compliance.txt):
   ```
   QA Compliance Report
   Project: Test Project
   Release: 1.0.0
   Tester: John Doe
   Date: 2025-10-24
   Status: PASSED
   All tests successful.
   ```
5. Click "Choose File" and upload compliance.txt
   - ✅ Upload badge appears: "Uploaded"
   - ✅ File info displayed: filename and upload date
6. Add recipients: `po@example.com, stakeholder@example.com`
7. Review email preview
   - ✅ Includes QA sign-off details
   - ✅ Mentions compliance documentation
8. Click "Copy to Clipboard"
   - ✅ Email copied
9. Click "Mark as Sent"
   - ✅ Dialog closes
   - ✅ Step 4 shows green checkmark
   - ✅ Status: "Completed"
   - ✅ Blue info box displays:
     - Compliance File: compliance.txt
     - Uploaded: [date and time]
     - Email sent to: po@example.com, stakeholder@example.com
     - Download button available
   - ✅ Progress bar: 50% (4/8)
10. Click download button in info box
    - ✅ File downloads correctly

---

## Test Scenario 6: Step 5 - Product Owner Sign-off

### Expected Behavior
- "Approve Release" button appears after Step 4
- Approval form with validation
- Warning about authorization
- Data persists

### Steps to Test
1. Complete Steps 1-4
2. Click "Approve Release" on Step 5
   - ✅ Dialog opens with warning message
3. Try approving without PO name
   - ✅ Button disabled
4. Fill in form:
   - Product Owner Name: "Jane Smith"
   - Approval Date: today's date
   - Comments: "Approved for production deployment"
5. Click "Approve Sign-off"
   - ✅ Dialog closes
   - ✅ Step 5 shows green checkmark
   - ✅ Status: "Completed"
   - ✅ Green info box displays:
     - Product Owner: Jane Smith
     - Approval Date: [selected date]
     - Comments: Approved for production deployment
   - ✅ Progress bar: 62.5% (5/8)

---

## Test Scenario 7: Step 6 - Deploy to Production

### Expected Behavior
- "Deploy to Production" button appears after Step 5
- Opens deployment dialog with production pipelines pre-selected
- Real-time status tracking
- Step status updates automatically

### Steps to Test
1. Complete Steps 1-5
2. Click "Deploy to Production" on Step 6
   - ✅ System scrolls/focuses on deployment section
   - ✅ Production pipelines selected in deployment form
   - ✅ Deploy All dialog may open (implementation dependent)
3. Configure build numbers for production pipelines
4. Execute deployment
   - ✅ Step 6 status changes to "In Progress"
   - ✅ Purple spinning icon appears
5. Wait for deployment to complete
   - ✅ Step 6 status changes to "Completed"
   - ✅ Green checkmark appears
   - ✅ Progress bar: 75% (6/8)

---

## Test Scenario 8: Step 7 - Notify QA Production Complete

### Expected Behavior
- "Compose Email" button appears after Step 6
- Email template includes production deployment info
- Email request verification testing

### Steps to Test
1. Complete Steps 1-6
2. Click "Compose Email" on Step 7
   - ✅ Dialog opens
   - ✅ Email preview shows production info
   - ✅ Lists deployed production pipelines
3. Click "Copy to Clipboard"
   - ✅ Email copied
4. Click "Mark as Sent"
   - ✅ Dialog closes
   - ✅ Step 7 shows green checkmark
   - ✅ Status: "Completed"
   - ✅ Progress bar: 87.5% (7/8)

---

## Test Scenario 9: Step 8 - Create GitHub Release

### Expected Behavior
- "Create Release" button appears after Step 7
- Repository selection dialog
- Opens ReleaseCreator component
- Can create release on GitHub

### Steps to Test
1. Complete Steps 1-7
2. Click "Create Release" on Step 8
   - ✅ Dialog opens
   - ✅ Repository dropdown shows project repositories
3. Select a repository
4. Click "Create Release"
   - ✅ Release creator opens
   - ✅ Pre-filled with deployment information
5. Fill in release details and publish (or cancel)
   - ✅ If published, Step 8 can be marked complete
   - ✅ Progress bar: 100% (8/8)

---

## Test Scenario 10: Reset Process

### Expected Behavior
- "Reset Process" button available when expanded
- Confirmation dialog appears
- All data cleared
- Process restarts from beginning

### Steps to Test
1. Complete several steps
2. Expand Production Release Process
3. Click "Reset Process" button
   - ✅ Confirmation dialog appears
   - ✅ Warning about irreversible action
4. Click "Cancel"
   - ✅ Nothing happens
   - ✅ Data preserved
5. Click "Reset Process" again, then "OK"
   - ✅ All steps return to "Pending"
   - ✅ Progress bar: 0%
   - ✅ Step count: 0 of 8
   - ✅ All stored data cleared (check browser localStorage)
6. Reload page
   - ✅ Reset state persists
   - ✅ No stored sign-offs or files

---

## Test Scenario 11: Sequential Execution

### Expected Behavior
- Cannot skip steps
- Must complete in order
- Clear error messages for blocked steps

### Steps to Test
1. Fresh process (or after reset)
2. Try clicking action on Step 3 (before completing 1-2)
   - ✅ No action button visible OR
   - ✅ Warning message: "Complete previous steps before proceeding"
3. Complete Step 2, skip to Step 4
   - ✅ Step 4 blocked until Step 3 completed
4. Complete steps in order
   - ✅ Each step unlocks the next
   - ✅ No skipping allowed

---

## Test Scenario 12: Collapsed/Expanded Views

### Expected Behavior
- Compact view shows all steps horizontally
- Expanded view shows vertical layout with details
- Toggle between views

### Steps to Test
1. Click Production Release Process title
   - ✅ Expands to show full details
   - ✅ Chevron changes from down to up
2. Complete a few steps and collapse
   - ✅ Shows step icons in horizontal flow
   - ✅ Icons color-coded by status
   - ✅ Progress bar visible
3. Click again to expand
   - ✅ Shows detailed view
   - ✅ Current step highlighted
   - ✅ Stored data visible for completed steps

---

## Test Scenario 13: Data Persistence

### Expected Behavior
- All data survives page reload
- Stored in localStorage with project-specific keys
- Can export/import project with configuration

### Steps to Test
1. Complete Steps 1-5 with full data
2. Note all entered information
3. Reload page (F5 or Ctrl+R)
   - ✅ Progress bar shows same percentage
   - ✅ Completed steps still show green checkmarks
   - ✅ Stored data still displayed (QA sign-off, PO approval, etc.)
   - ✅ Email recipients preserved
   - ✅ Compliance file info preserved
4. Open browser DevTools → Application → Local Storage
   - ✅ Keys exist: `prod_release_{projectId}_*`
   - ✅ Data in JSON format
5. Export project
   - ✅ Project configuration exports (pipelines, repos)
   - ⚠️ Note: Production release data NOT in export (localStorage only)

---

## Test Scenario 14: Email Template Quality

### Expected Behavior
- Professional formatting
- All relevant information included
- Customizable
- Proper grammar and structure

### Steps to Test
1. Generate email for Step 2 (Staging Ready)
   - ✅ Subject clear and tagged
   - ✅ Body includes project name, release number
   - ✅ Lists staging pipelines
   - ✅ Clear call-to-action
2. Generate email for Step 4 (Production Start)
   - ✅ Includes QA sign-off information
   - ✅ References compliance documentation
   - ✅ Lists production pipelines
   - ✅ Mentions PO approval requirement
3. Generate email for Step 7 (Production Complete)
   - ✅ Confirms deployment completion
   - ✅ Lists deployed pipelines
   - ✅ Requests verification testing

---

## Test Scenario 15: Multiple Projects

### Expected Behavior
- Each project has separate production release data
- No cross-contamination
- Switching projects shows correct data

### Steps to Test
1. Create Project A with production pipelines
2. Start production release, complete Step 2-3
3. Create Project B with production pipelines
4. Start production release on Project B
   - ✅ Project B starts at Step 1 (0% progress)
   - ✅ No data from Project A visible
5. Switch back to Project A
   - ✅ Shows Steps 2-3 completed
   - ✅ Data preserved
6. Check localStorage keys
   - ✅ Different keys for each project
   - ✅ `prod_release_{projectA_id}_*`
   - ✅ `prod_release_{projectB_id}_*`

---

## Test Scenario 16: Error Handling

### Expected Behavior
- Graceful handling of missing data
- Clear error messages
- No crashes

### Steps to Test
1. Manually delete localStorage keys (via DevTools)
2. Reload page
   - ✅ Process resets gracefully
   - ✅ No errors in console
3. Try uploading invalid file type
   - ✅ File input respects accept attribute
4. Enter invalid email format
   - ✅ Can still proceed (validation minimal, user responsible)

---

## Test Scenario 17: Visual Polish

### Expected Behavior
- Consistent styling with rest of application
- Professional appearance
- Clear visual hierarchy
- Smooth animations

### Steps to Test
1. Review overall styling
   - ✅ Purple/pink gradient theme consistent
   - ✅ Cards match other sections
   - ✅ Icons appropriate and clear
2. Test interactions
   - ✅ Button hover states work
   - ✅ Smooth expand/collapse animations
   - ✅ Progress bar animates
3. Check responsiveness
   - ✅ Works on different screen sizes
   - ✅ Mobile-friendly (if applicable)

---

## Test Scenario 18: Integration with Existing Features

### Expected Behavior
- Seamless integration with deployment dashboard
- Production deployment triggers work
- Release creation integrates properly

### Steps to Test
1. Step 6 production deployment
   - ✅ Triggers same deployment flow as regular deployment
   - ✅ Appears in Deployment Status section
   - ✅ Real-time tracking works
2. Step 8 release creation
   - ✅ Opens same ReleaseCreator used elsewhere
   - ✅ Can create release normally
3. Auto-refresh deployment status
   - ✅ Updates Step 6 status automatically
   - ✅ Intelligent polling intervals work

---

## Browser Compatibility Testing

### Chrome/Edge
- ✅ All features work
- ✅ File upload works
- ✅ Clipboard copy works
- ✅ localStorage works

### Firefox
- ✅ All features work
- ✅ File upload works
- ✅ Clipboard copy works
- ✅ localStorage works

### Safari
- ✅ All features work
- ✅ File upload works
- ✅ Clipboard copy works
- ✅ localStorage works

---

## Performance Testing

### Load Time
- ✅ Component renders quickly
- ✅ No noticeable lag when expanding

### Memory Usage
- ✅ No memory leaks over time
- ✅ localStorage size reasonable

### Interactions
- ✅ Dialogs open/close smoothly
- ✅ Form inputs responsive
- ✅ Button clicks instant

---

## Documentation Validation

### README.md
- ✅ Production Release Process mentioned
- ✅ Links to documentation correct

### PRODUCTION_RELEASE_PROCESS.md
- ✅ Comprehensive step descriptions
- ✅ All features documented
- ✅ Clear and accurate

### PRODUCTION_RELEASE_QUICKSTART.md
- ✅ Quick reference available
- ✅ Steps summarized correctly
- ✅ Easy to follow

### PRODUCTION_RELEASE_VISUAL_GUIDE.md
- ✅ Visual diagrams clear
- ✅ ASCII art renders correctly
- ✅ Examples comprehensive

### FEATURES.md
- ✅ Production Release Process section added
- ✅ All features listed
- ✅ Accurate descriptions

---

## Test Results Summary

| Test Scenario | Status | Notes |
|--------------|--------|-------|
| Process Activation | ⬜ | |
| Step 1 - Staging | ⬜ | |
| Step 2 - Notify QA | ⬜ | |
| Step 3 - QA Sign-off | ⬜ | |
| Step 4 - Prod Email + File | ⬜ | |
| Step 5 - PO Sign-off | ⬜ | |
| Step 6 - Deploy Prod | ⬜ | |
| Step 7 - Notify Complete | ⬜ | |
| Step 8 - Create Release | ⬜ | |
| Reset Process | ⬜ | |
| Sequential Execution | ⬜ | |
| Collapsed/Expanded | ⬜ | |
| Data Persistence | ⬜ | |
| Email Templates | ⬜ | |
| Multiple Projects | ⬜ | |
| Error Handling | ⬜ | |
| Visual Polish | ⬜ | |
| Integration | ⬜ | |

**Legend:**
- ⬜ Not Tested
- ✅ Passed
- ❌ Failed
- ⚠️ Partial/Issues

---

## Bug Report Template

If you find issues during testing, use this template:

```markdown
### Bug Report

**Test Scenario:** [Name]
**Step:** [Specific step that failed]
**Expected:** [What should happen]
**Actual:** [What actually happened]
**Browser:** [Chrome/Firefox/Safari/Edge]
**Console Errors:** [Any errors in console]
**Screenshots:** [If applicable]
**Steps to Reproduce:**
1. 
2. 
3. 

**Additional Notes:**
```

---

## Success Criteria

The Production Release Process is considered complete and working when:

1. ✅ All 18 test scenarios pass
2. ✅ No console errors during normal use
3. ✅ Data persists across page reloads
4. ✅ Sequential execution enforced
5. ✅ All dialogs functional
6. ✅ Email templates complete and professional
7. ✅ File upload/download works
8. ✅ Integration with existing features seamless
9. ✅ Visual design consistent
10. ✅ Documentation complete and accurate

---

**Testing Date:** _____________
**Tester Name:** _____________
**Version:** _____________
**Overall Result:** ⬜ PASS / ⬜ FAIL / ⬜ PARTIAL

**Notes:**
