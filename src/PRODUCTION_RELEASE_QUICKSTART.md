# Production Release Process - Quick Start Guide

## Setup

### 1. Mark Project as Production Release
When creating or editing a project, enable the "Production Release" checkbox. This activates the 8-step production release process.

### 2. Configure Pipelines
Ensure your pipelines have proper environment labels:
- **Staging pipelines**: Use environment name containing "staging", "stg", or "qa"
- **Production pipelines**: Use environment name containing "prod" or "production"

## Process Overview

```
┌─────────────────────────────────────────────────────────────┐
│                   PRODUCTION RELEASE FLOW                    │
└─────────────────────────────────────────────────────────────┘

Step 1: ✓ Deploy to Staging (Pre-requisite)
        ↓
Step 2: ✉ Email QA Team → Staging Ready for Testing
        ↓
Step 3: ✓ QA Sign-off → All Tests Passed
        ↓
Step 4: ✉ Email Stakeholders → Starting Production + Compliance Doc
        ↓
Step 5: ✓ Product Owner Sign-off → Approved for Production
        ↓
Step 6: 🚀 Deploy to Production → Execute Deployment
        ↓
Step 7: ✉ Email QA Team → Production Deployed, Verify
        ↓
Step 8: 📝 Create GitHub Release → Document Release
```

## Quick Actions

### For Each Email Step (2, 4, 7):
1. Click **"Compose Email"**
2. Add recipients (comma-separated emails)
3. Review/edit template
4. Click **"Copy to Clipboard"**
5. Paste in your email client and send
6. Return and click **"Mark as Sent"**

### For QA Sign-off (Step 3):
1. Click **"Provide Sign-off"**
2. Enter tester name (required)
3. Select test date
4. Check "All tests passed" (required)
5. Add comments (optional)
6. Click **"Approve Sign-off"**

### For Production Release Email (Step 4):
1. Click **"Compose Email"** 
2. Click **"Choose File"** to upload QA compliance document
3. Wait for upload confirmation
4. Add recipients
5. Review email and click **"Copy to Clipboard"**
6. Send email with attached compliance file
7. Click **"Mark as Sent"**

### For PO Sign-off (Step 5):
1. Click **"Approve Release"**
2. Enter Product Owner name (required)
3. Select approval date
4. Add comments (optional)
5. Click **"Approve Sign-off"**

### For Production Deployment (Step 6):
1. Click **"Deploy to Production"**
2. System scrolls to deployment section
3. Enter build numbers for production pipelines
4. Click **"Deploy"** buttons
5. Monitor deployment status in real-time

### For GitHub Release (Step 8):
1. Click **"Create Release"**
2. Select repository
3. Release creator opens
4. Fill in release notes
5. Publish to GitHub

## Tips

✅ **Use the Help Button**: Access full documentation anytime
📥 **Export Report**: Generate a complete process report with all sign-offs
🔄 **Reset if Needed**: Clear all data to start fresh (confirmation required)
👁️ **Monitor Progress**: Progress bar shows overall completion
📧 **Save Recipients**: Email addresses are saved for future use

## Common Workflows

### Standard Release
1. Deploy to staging
2. Send QA email → Get sign-off
3. Upload compliance doc → Send prod email
4. Get PO approval
5. Deploy to production
6. Notify QA → Verify
7. Create GitHub release

### Hotfix Release
Same process but with abbreviated testing:
- Faster QA cycles
- Expedited approvals
- Same documentation requirements

### Rollback
If production deployment fails:
1. Document issue in step 6
2. Create rollback deployment
3. Repeat steps 6-8 for rollback

## Data Storage

All process data is stored locally:
- QA sign-offs
- PO approvals  
- Compliance files
- Email records

**Export regularly** to maintain audit trail!

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Can't execute step | Complete previous steps first |
| Lost sign-off data | Check browser localStorage, may need to re-enter |
| Email not sending | Use "Copy to Clipboard" and send manually |
| Deployment stuck | Check GitHub Actions directly, refresh status |

## Best Practices

1. ✅ Complete steps in order
2. ✅ Document everything in comments
3. ✅ Save compliance files externally
4. ✅ Export reports after completion
5. ✅ Verify production after step 7
6. ✅ Create detailed release notes

## Need Help?

- Click **Help** button in the stepper
- See `/PRODUCTION_RELEASE_PROCESS.md` for full documentation
- Check deployment logs in GitHub Actions
- Review project configuration if steps don't appear

---

**Remember**: This is a POC implementation. For production use, implement:
- Backend API for persistence
- Automated email sending
- Digital signature workflows
- Enhanced audit trails
