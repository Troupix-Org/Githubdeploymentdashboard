# Project Context

## Purpose
GitHub Actions Deployment Dashboard is a web application that provides a unified interface for managing and triggering GitHub Actions deployments across multiple repositories and pipelines. It enables teams to:
- Configure and manage multiple deployment pipelines
- Trigger single or batch deployments with real-time status tracking
- Follow structured production release processes with approval gates
- Create GitHub releases and manage project configurations
- Track deployment history and monitor workflow runs

## Tech Stack
- **Frontend**: React 18 + TypeScript
- **Styling**: Tailwind CSS + Shadcn/ui components
- **State Management**: React Hooks + localStorage + IndexedDB
- **Build Tool**: Vite 6.3.5
- **Icons**: Lucide React
- **YAML Parsing**: js-yaml
- **Deployment**: GitHub Actions → GitHub Pages
- **API Integration**: GitHub REST API

## Project Conventions

### Code Style
- **TypeScript**: Strict typing, avoid `any`, define interfaces for props and state
- **React**: Functional components with hooks, single-purpose components
- **Naming**: 
  - Components: PascalCase (`DeploymentDashboard`)
  - Files: kebab-case for utilities, PascalCase for components
  - Variables: camelCase
  - Constants: UPPER_SNAKE_CASE
- **Imports**: Absolute imports from `src/`, group by type (React, libraries, local)
- **File Organization**: Feature-based structure with shared utilities in `lib/`

### Architecture Patterns
- **Component Structure**: 
  - `components/ui/` - Reusable Shadcn/ui components
  - `components/` - Feature-specific components
  - `lib/` - Utility functions and API clients
- **State Management**: 
  - Local component state with `useState`
  - Persistent data via localStorage + IndexedDB (dual storage for reliability)
  - No global state management (Redux/Zustand) - kept simple
- **Data Flow**: 
  - Props down, callbacks up
  - API calls in custom hooks or component effects
  - Storage operations abstracted in `lib/storage.ts`
- **Error Handling**: User-friendly error messages, graceful degradation

### Testing Strategy
- **Manual Testing**: Comprehensive test scenarios documented in `PRODUCTION_RELEASE_TESTING_GUIDE.md`
- **Browser Compatibility**: Chrome/Edge, Firefox, Safari
- **Test Coverage Areas**:
  - Token management and authentication
  - Project CRUD operations
  - Pipeline configuration and deployment
  - Production release workflow (18 test scenarios)
  - Import/export functionality
  - Real-time status updates

### Git Workflow
- **Branching**: Feature branches from `main`
- **Commit Messages**: Conventional Commits format
  - `feat:` - New features
  - `fix:` - Bug fixes
  - `docs:` - Documentation
  - `style:` - Code formatting
  - `refactor:` - Code restructuring
  - `chore:` - Maintenance
- **Deployment**: Automatic deployment to GitHub Pages on push to `main`
- **Versioning**: Semantic versioning in `package.json`

## Domain Context

### Core Concepts
- **Project**: Container for repositories and pipelines with optional production release workflow
- **Repository**: GitHub repo (owner/repo format) containing workflow files
- **Pipeline**: Specific workflow file + branch + environment configuration
- **Deployment**: Single execution of a pipeline with build number and status tracking
- **Batch**: Group of deployments triggered together (identified by batchId)
- **Production Release**: 8-step formal workflow with approvals and compliance tracking

### Workflow Integration
- **GitHub Actions**: Triggers `workflow_dispatch` events with dynamic inputs
- **Input Types Supported**: string, number, boolean, choice (dropdown)
- **Status Tracking**: Polls GitHub API every 10-30 seconds for workflow run status
- **Smart Identification**: 3-second delay after trigger to ensure correct run capture

### Production Release Process
Sequential 8-step workflow:
1. Deploy to Staging (prerequisite)
2. Notify QA - Staging Ready (email)
3. QA Sign-off (approval gate)
4. Notify Stakeholders + Compliance File (email + file upload)
5. Product Owner Sign-off (approval gate)
6. Deploy to Production (deployment)
7. Notify QA - Production Complete (email)
8. Create GitHub Release (documentation)

## Important Constraints

### Security
- **Local-Only Storage**: GitHub tokens never sent to external servers
- **Token Permissions**: Requires `repo` and `workflow` scopes (or fine-grained equivalents)
- **Development Use**: Not designed for production secrets or PII collection
- **Browser Security**: Relies on localStorage/IndexedDB, not suitable for shared computers

### GitHub API Limits
- **Rate Limiting**: 5,000 requests/hour (authenticated)
- **Efficient Usage**: Caching, minimal API calls, status-only updates
- **Batch Operations**: Grouped deployments to reduce API calls

### Browser Compatibility
- **Modern Browsers**: ES2020+ features, requires localStorage and IndexedDB support
- **No Server**: Pure client-side application, no backend dependencies

### Data Persistence
- **Local Storage**: Project data, deployment history, production release state
- **No Cloud Sync**: Data tied to specific browser/device
- **Export/Import**: JSON-based backup and sharing mechanism

## External Dependencies

### GitHub API
- **REST API v4**: Workflow triggers, status checks, release creation
- **Endpoints Used**:
  - `/repos/{owner}/{repo}/actions/workflows`
  - `/repos/{owner}/{repo}/actions/runs`
  - `/repos/{owner}/{repo}/dispatches`
  - `/repos/{owner}/{repo}/releases`
- **Authentication**: Personal Access Tokens (classic or fine-grained)

### UI Libraries
- **Shadcn/ui**: Complete UI component system built on Radix UI
- **Radix UI**: Accessible, unstyled UI primitives
- **Lucide React**: Icon library with 1000+ icons
- **Tailwind CSS**: Utility-first CSS framework

### Build & Deployment
- **Vite**: Fast build tool with HMR and optimized production builds
- **GitHub Actions**: CI/CD pipeline for automated deployment
- **GitHub Pages**: Static site hosting with custom domain support

### Development Tools
- **TypeScript**: Type checking and enhanced developer experience
- **ESLint**: Code linting (implied by modern React setup)
- **PostCSS**: CSS processing for Tailwind

## Key File Structure
```
src/
├── components/
│   ├── ui/              # Shadcn/ui components
│   ├── DeploymentDashboard.tsx
│   ├── ProductionReleaseProcess.tsx
│   ├── ProjectManager.tsx
│   └── ReleaseCreator.tsx
├── lib/
│   ├── github.ts        # GitHub API client
│   ├── storage.ts       # Data persistence layer
│   └── utils.ts         # Utility functions
├── styles/
│   └── globals.css      # Global styles and Tailwind imports
└── App.tsx              # Main application component
```
