# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added - Production Release Process
- **8-Step Production Release Workflow** - Complete guided process for production deployments
  - Step 1: Deploy to Staging (pre-requisite check)
  - Step 2: Notify QA - Staging Ready (email composition)
  - Step 3: QA Sign-off (approval gate with tester details)
  - Step 4: Notify Stakeholders with Compliance File (email + file upload)
  - Step 5: Product Owner Sign-off (final approval gate)
  - Step 6: Deploy to Production (execution trigger)
  - Step 7: Notify QA - Production Complete (verification request)
  - Step 8: Create GitHub Release (documentation)
- **Email Template Generation** - Pre-filled email templates for all notification steps
- **Approval Gates** - QA and Product Owner sign-off dialogs with form validation
- **Compliance File Upload** - Support for .txt, .pdf, .doc, .docx, .md files
- **Data Persistence** - All sign-offs, compliance files, and email records stored in localStorage
- **Progress Tracking** - Visual progress bar showing completion percentage (0-100%)
- **Sequential Execution** - Steps must be completed in order, with validation
- **Stored Information Display** - Completed steps show approval details in expandable cards
- **Reset Process Functionality** - Clear all production release data with confirmation
- **Collapsible Production Stepper** - Compact view showing all steps, expanded view with details
- **Email Copy to Clipboard** - Easy copying of email templates for external sending
- **Compliance File Download** - Download uploaded compliance files for review
- **Production Pipeline Auto-Detection** - Automatic selection of production pipelines for step 6
- **Visual Status Indicators** - Color-coded icons and badges for each step status
- **Documentation Suite**:
  - PRODUCTION_RELEASE_PROCESS.md - Complete process documentation
  - PRODUCTION_RELEASE_QUICKSTART.md - Quick start guide
  - PRODUCTION_RELEASE_VISUAL_GUIDE.md - Visual diagrams and interface examples
- **Production Project Flag** - `isProductionRelease` flag to enable production workflow

### Added - Deployment Features
- Batch grouping for deployment status - each deployment session is now grouped separately
- Comprehensive Deploy All confirmation dialog with deployment summary table
- Edit selection capability in Deploy All dialog
- Selection counter showing X/Y pipelines selected
- Batch number indicator in deployment status (#1, #2, #3...)
- Global release number badge in batch headers
- **Intelligent Auto-Refresh System** - Adaptive polling for deployment status
  - 10-second intervals for recent deployments (< 2 minutes old)
  - 20-second intervals for active deployments (2-5 minutes old)
  - 30-second intervals for older deployments (> 5 minutes)
  - Real-time countdown display showing next refresh time
  - Automatic pause when no active deployments
- **Visual Refresh Indicators** - Live countdown badge with spinning icon
- GitHub Pages deployment workflow
- Comprehensive documentation (README, DEPLOYMENT, CONTRIBUTING)
- MIT License

### Changed
- Deployment Status section now displays sessions in batches
- Deploy All dialog redesigned with better UX and clarity
- Improved visual hierarchy with gradient backgrounds
- Enhanced warning messages for deployment confirmation
- **Production Release Process only shown for projects with production pipelines**
- README.md updated with Production Release Process section

### Technical
- Added `batchId` field to Deployment interface
- Automatic batch ID generation for individual and group deployments
- Improved deployment grouping and sorting logic
- Better TypeScript type safety throughout
- **ProductionReleaseProcess component** - New React component with full workflow logic
- **Email template generators** - Dynamic templates based on project and deployment data
- **LocalStorage key namespacing** - Project-specific storage keys for production release data
- **Integration with DeploymentDashboard** - Seamless production workflow integration
- **Conditional rendering** - Production process only shown when appropriate

## [1.0.0] - Initial Release

### Added
- GitHub token setup and secure storage (localStorage + IndexedDB)
- Project management (create, edit, delete, import/export)
- Repository configuration with owner/repo format
- Pipeline configuration with workflow file detection
- Dynamic workflow input detection and UI generation
- Build number management per pipeline
- Global release number support
- Single pipeline deployment
- Deploy All pipelines functionality
- Real-time deployment status tracking
- GitHub Actions workflow run monitoring
- Direct links to GitHub workflow runs
- GitHub release creation with custom release notes
- Collapsible sections for organized interface
- Ultra-compact UI with purple/pink color scheme
- Professional slate gradient background
- Smart workflow run identification with 3-second delay
- Latest builds display per pipeline
- Environment-specific badges (dev, qa, staging, prod)
- Auto-refresh deployment status every 10 seconds

### Features
- Multi-repository support per project
- Hierarchical release numbers (global + per-pipeline builds)
- Workflow input auto-detection from YAML files
- Default values for workflow inputs
- Export/import projects as JSON
- Responsive design

### UI Components
- Token setup screen
- Project list with search/filter
- Project configuration editor
- Deployment dashboard with multiple sections:
  - Quick Deploy
  - Latest Builds
  - Deployment Status
  - Create Release
- Import/Export dialog
- Release creator with markdown support

### Technical Stack
- React 18+ with TypeScript
- Tailwind CSS for styling
- Shadcn/ui component library
- Lucide React for icons
- GitHub REST API integration
- LocalStorage + IndexedDB for data persistence

[Unreleased]: https://github.com/YOUR_USERNAME/YOUR_REPO/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/YOUR_USERNAME/YOUR_REPO/releases/tag/v1.0.0
