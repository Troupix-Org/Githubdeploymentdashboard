# Production Release Process

This document describes the 8-step production release process implemented in the GitHub Deploy application for projects marked as "Production Release".

## Overview

The production release process ensures a controlled, documented, and approved deployment to production environments with proper QA validation and stakeholder sign-offs at critical stages.

## Process Steps

### Step 1: Deploy to Staging
**Status**: Assumed complete before process starts
**Description**: Staging environment must be up to date with the current release

The system checks for recent deployments to staging/QA environments and marks this step as complete when such deployments are successful.

### Step 2: Notify QA - Staging Ready
**Required Action**: Send email
**Description**: Notify the QA team that staging is ready for testing

**Actions**:
- Click "Compose Email" button
- Add email recipients (comma-separated)
- Review and customize the email template
- Copy email to clipboard or send via your email client
- Mark as sent to proceed

**Email Template Includes**:
- Project name and release number
- List of deployed pipelines
- Request for QA testing and sign-off

### Step 3: QA Sign-off
**Required Action**: Record approval
**Description**: QA team provides formal approval after testing

**Required Information**:
- Tester name (required)
- Test date (required)
- Test environment (staging/production)
- Test results (all tests must pass)
- Optional comments

The sign-off is stored locally and can be referenced in subsequent steps.

### Step 4: Notify - Start Production Release
**Required Action**: Send email with compliance file
**Description**: Inform stakeholders that production deployment will begin

**Actions**:
- Upload QA release compliance file (required)
- Add email recipients
- Review email template with QA approval information
- Copy and send email
- Mark as sent

**Compliance File**:
- Can be .txt, .pdf, .doc, .docx, or .md format
- Should contain QA test results, approval, and any compliance requirements
- Stored locally and attached to the process

### Step 5: Product Owner Sign-off
**Required Action**: Record approval
**Description**: Product Owner provides final approval for production deployment

**Required Information**:
- Product Owner name (required)
- Approval date (required)
- Optional comments or conditions

This is the final approval gate before production deployment can proceed.

### Step 6: Deploy to Production
**Required Action**: Execute deployment
**Description**: Trigger production deployment workflows

**Actions**:
- Click "Deploy to Production"
- System opens the deployment section
- Configure and trigger production pipelines
- Monitor deployment progress

The system tracks production deployments and updates the step status automatically.

### Step 7: Notify QA - Production Complete
**Required Action**: Send email
**Description**: Inform QA team that production deployment is complete

**Actions**:
- Click "Compose Email"
- Review email template with deployment details
- Copy and send email requesting production verification
- Mark as sent

**Email includes**:
- Production deployment completion confirmation
- List of deployed pipelines
- Request for production verification tests

### Step 8: Create GitHub Release
**Required Action**: Generate release
**Description**: Create GitHub release with release notes

**Actions**:
- Click "Create Release"
- Select repository
- Release creator opens with pre-filled information
- Add release notes and details
- Publish release to GitHub

## Data Persistence

All sign-offs, compliance files, and email records are stored in browser localStorage with project-specific keys:

- `prod_release_{projectId}_qa_signoff`
- `prod_release_{projectId}_po_signoff`
- `prod_release_{projectId}_compliance_file`
- `prod_release_{projectId}_staging_email_sent`
- `prod_release_{projectId}_prod_email_sent`
- `prod_release_{projectId}_prod_complete_email_sent`
- `prod_release_{projectId}_email_recipients`

## Process Controls

### Sequential Execution
Steps must be completed in order. Each step is only executable when all previous steps are completed.

### Reset Process
A "Reset Process" button is available to clear all stored data and start fresh. This requires confirmation as it cannot be undone.

### Visual Indicators
- **Progress bar**: Shows overall completion percentage
- **Step badges**: Indicate status (Pending, In Progress, Completed)
- **Collapsed view**: Shows all steps and their status at a glance
- **Expanded view**: Full details and action buttons for each step

## Email Templates

All email templates are customizable and include:
- Project and release information
- Relevant pipeline details
- Appropriate call-to-action
- Professional formatting

Templates can be copied to clipboard for use in your preferred email client.

## Best Practices

1. **Document Everything**: Use the comments fields in sign-offs to record important details
2. **Save Compliance Files**: Keep QA compliance documentation for audit trails
3. **Verify Recipients**: Double-check email recipients before marking as sent
4. **Test in Staging**: Ensure thorough QA testing before proceeding to production
5. **Monitor Deployments**: Watch the deployment status closely during production rollout
6. **Complete All Steps**: Follow the full 8-step process for production releases

## Troubleshooting

### Step Not Executable
**Issue**: A step button is disabled
**Solution**: Complete all previous steps first

### Lost Data
**Issue**: Sign-offs or files disappeared
**Solution**: Data is stored in localStorage and may be cleared by browser settings. Use the export feature to backup project configuration.

### Email Not Working
**Issue**: Email composition doesn't work
**Solution**: Copy the template to clipboard and paste into your email client manually

### Deployment Failed
**Issue**: Production deployment step failed
**Solution**: Check deployment logs, fix issues, and retry. The stepper allows retry of failed deployments.

## Security Considerations

- Email addresses are stored locally
- Compliance files are stored in browser localStorage
- No sensitive data is transmitted to external servers
- GitHub tokens remain in localStorage (POC implementation)
- For production use, implement proper backend storage and authentication

## Future Enhancements

Potential improvements for production environments:
- Backend API for data persistence
- Email integration for automated sending
- Slack/Teams notifications
- Approval workflows with digital signatures
- Audit trail export
- Integration with project management tools
- Compliance reporting
