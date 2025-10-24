# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Batch grouping for deployment status - each deployment session is now grouped separately
- Comprehensive Deploy All confirmation dialog with deployment summary table
- Edit selection capability in Deploy All dialog
- Selection counter showing X/Y pipelines selected
- Batch number indicator in deployment status (#1, #2, #3...)
- Global release number badge in batch headers
- GitHub Pages deployment workflow
- Comprehensive documentation (README, DEPLOYMENT, CONTRIBUTING)
- MIT License

### Changed
- Deployment Status section now displays sessions in batches
- Deploy All dialog redesigned with better UX and clarity
- Improved visual hierarchy with gradient backgrounds
- Enhanced warning messages for deployment confirmation

### Technical
- Added `batchId` field to Deployment interface
- Automatic batch ID generation for individual and group deployments
- Improved deployment grouping and sorting logic
- Better TypeScript type safety throughout

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
