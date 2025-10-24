# GitHub Actions Deployment Dashboard

[![Deploy to GitHub Pages](https://github.com/YOUR_USERNAME/YOUR_REPO/actions/workflows/deploy.yml/badge.svg)](https://github.com/YOUR_USERNAME/YOUR_REPO/actions/workflows/deploy.yml)
[![CI](https://github.com/YOUR_USERNAME/YOUR_REPO/actions/workflows/ci.yml/badge.svg)](https://github.com/YOUR_USERNAME/YOUR_REPO/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

A web application to manage and trigger GitHub Actions deployments with ease. Configure multiple pipelines, track deployment status, and create releases - all from a unified interface.

> **Note:** Replace `YOUR_USERNAME/YOUR_REPO` in the badge URLs above with your actual GitHub username and repository name.

## 📚 Documentation

- **[Quick Start Guide](QUICKSTART.md)** - Get started in 5 minutes
- **[Features Documentation](FEATURES.md)** - Detailed feature descriptions
- **[Production Release Process](PRODUCTION_RELEASE_PROCESS.md)** - 8-step production workflow
- **[Production Release Quick Start](PRODUCTION_RELEASE_QUICKSTART.md)** - Quick guide for production releases
- **[Production Release Visual Guide](PRODUCTION_RELEASE_VISUAL_GUIDE.md)** - Visual workflow diagrams
- **[Deployment Guide](DEPLOYMENT.md)** - Deploy to GitHub Pages
- **[Contributing](CONTRIBUTING.md)** - How to contribute
- **[Security Policy](SECURITY.md)** - Security guidelines and best practices
- **[Changelog](CHANGELOG.md)** - Version history

## Features

- 🚀 **Multi-Pipeline Deployment** - Deploy multiple pipelines simultaneously with batch tracking
- 📊 **Real-time Status Tracking** - Monitor deployments grouped by session with live updates
- 🔄 **Dynamic Workflow Integration** - Automatically detects and adapts to your GitHub Actions workflow inputs
- 🏷️ **Release Management** - Create GitHub releases with custom release notes
- 🏭 **Production Release Process** - 8-step workflow with QA sign-offs, PO approvals, and compliance tracking
- 💾 **Project Import/Export** - Save and share project configurations via JSON
- 🔐 **Secure Token Storage** - GitHub token stored locally in browser (localStorage + IndexedDB)

## 📸 Screenshots

### Deployment Dashboard
The main interface shows all your pipelines with quick deploy actions and real-time status tracking.

### Batch Deployment Status
Deployments are grouped by session - each trigger creates a new batch with:
- 🔢 **Batch number and timestamp** - Clear identification
- 📦 **Pipeline count** - Number of pipelines in the batch
- ⭐ **Global release number** - Displayed prominently (if set)
- 📊 **Individual status tracking** - Per-pipeline monitoring

### Deploy All Confirmation
A comprehensive confirmation dialog prevents accidental deployments:
- 📋 Full deployment summary table
- ✏️ Edit selection capability
- ⚠️ Warning messages for unselected pipelines
- 📈 Real-time progress tracking

## GitHub Pages Deployment

This project is configured for automatic deployment to GitHub Pages.

### Setup Instructions

1. **Enable GitHub Pages in your repository:**
   - Go to `Settings` → `Pages`
   - Under "Source", select `GitHub Actions`

2. **Configure base path (if deploying to a project page):**
   
   If your repository is `username/repo-name` and will be deployed to `username.github.io/repo-name/`, you need to set the base path in your build configuration.
   
   Create a `vite.config.ts` file in the root:
   
   ```typescript
   import { defineConfig } from 'vite';
   import react from '@vitejs/plugin-react';
   
   export default defineConfig({
     plugins: [react()],
     base: '/repo-name/', // Replace with your repository name
   });
   ```

3. **Automatic Deployment:**
   
   The workflow will automatically deploy when you push to the `main` branch. You can also trigger it manually from the Actions tab.

### Manual Deployment

You can trigger a deployment manually:
- Go to the `Actions` tab in your repository
- Select the "Deploy to GitHub Pages" workflow
- Click "Run workflow"

## Local Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Configuration

### Adding a GitHub Token

On first launch, you'll be prompted to enter a GitHub Personal Access Token with the following permissions:
- `repo` - Full control of private repositories
- `workflow` - Update GitHub Action workflows

**Note:** This application is designed for development use and should not be used to collect PII or secure sensitive production data.

### Project Setup

1. Create a new project
2. Add repositories (owner/repo format)
3. Configure pipelines:
   - Select repository
   - Enter workflow filename (e.g., `deploy.yml`)
   - Set branch and environment
   - The system will auto-detect workflow inputs

### Deploy All Confirmation

When clicking "Deploy All", you'll see a comprehensive confirmation dialog showing:
- **Deployment Summary Table** - Full overview of all selected pipelines
- **Pipeline Details** - Name, repository, branch, environment, and build number
- **Edit Selection** - Modify which pipelines to deploy before confirming
- **Global Release Number** - Displayed prominently if set
- **Selection Counter** - Shows X/Y pipelines selected
- **Warnings** - Alerts if some pipelines won't be deployed
- **Real-time Progress** - Live deployment progress with X/Y counter

The confirmation dialog helps prevent accidental deployments by requiring explicit review before proceeding.

## Production Release Process

For projects requiring formal production deployment procedures, enable the **Production Release** flag when creating or editing a project. This activates an 8-step guided workflow:

### Process Overview

```
Step 1: ✓ Deploy to Staging (Pre-requisite)
Step 2: ✉️ Notify QA - Staging Ready
Step 3: ✅ QA Sign-off
Step 4: ✉️ Notify Stakeholders + Compliance File
Step 5: ✅ Product Owner Sign-off
Step 6: 🚀 Deploy to Production
Step 7: ✉️ Notify QA - Production Complete
Step 8: 📝 Create GitHub Release
```

### Key Features

- **Sequential Execution** - Steps must be completed in order
- **Sign-off Gates** - QA and PO approvals required before production
- **Compliance Tracking** - Upload and store QA compliance documentation
- **Email Templates** - Pre-filled templates for stakeholder communication
- **Progress Tracking** - Visual progress bar and status indicators
- **Data Persistence** - All sign-offs and files stored locally
- **Stored Information Display** - View approval details for completed steps

### Quick Actions

Each step type has specific actions:

- **Email Steps (2, 4, 7)**: Compose email → Copy to clipboard → Send → Mark as sent
- **Approval Gates (3, 5)**: Enter approver details → Add comments → Sign off
- **Deployment (6)**: Trigger production pipelines → Monitor status
- **Release (8)**: Select repository → Create release with notes

### Documentation

- See [Production Release Process](PRODUCTION_RELEASE_PROCESS.md) for full documentation
- See [Production Release Quick Start](PRODUCTION_RELEASE_QUICKSTART.md) for quick guide
- See [Production Release Visual Guide](PRODUCTION_RELEASE_VISUAL_GUIDE.md) for visual diagrams

## Architecture

- **Frontend:** React + TypeScript + Tailwind CSS
- **State Management:** React Hooks + localStorage + IndexedDB
- **UI Components:** Shadcn/ui
- **Icons:** Lucide React
- **Deployment:** GitHub Actions → GitHub Pages

## Security Notes

⚠️ **Important:** 
- GitHub tokens are stored in your browser's localStorage and IndexedDB
- Never share your project JSON exports if they contain sensitive information
- This tool is meant for development/staging deployments
- Always use fine-grained tokens with minimum required permissions

## License

MIT License - See LICENSE file for details

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
