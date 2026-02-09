# Project Context

## Purpose
GitHub Actions Deployment Dashboard is a web application that provides a unified interface for managing and triggering GitHub Actions deployments across multiple repositories and pipelines. It enables teams to:
- Configure and manage multiple deployment pipelines with dynamic workflow inputs
- Trigger single or batch deployments with real-time status tracking and auto-refresh
- Follow structured production release processes with approval gates and compliance tracking
- Create GitHub releases and manage project configurations with import/export capabilities
- Track deployment history with batch grouping and monitor workflow runs with GitHub integration
- Support environment-specific deployments (dev, staging, QA, production) with visual indicators

## Tech Stack
- **Frontend**: React 18 + TypeScript (strict mode)
- **Styling**: Tailwind CSS + Shadcn/ui components with custom gradient themes
- **State Management**: React Hooks + localStorage + IndexedDB (dual persistence)
- **Build Tool**: Vite 6.3.5 with HMR and optimized builds
- **Icons**: Lucide React (1000+ icons)
- **YAML Parsing**: js-yaml for workflow file analysis
- **Deployment**: GitHub Actions → GitHub Pages with automated CI/CD
- **API Integration**: GitHub REST API v4 with rate limiting awareness

## Project Conventions

### Code Style
- **TypeScript**: Strict typing, avoid `any`, comprehensive interfaces for all props/state
- **React**: Functional components with hooks, single-purpose components, custom hooks for logic
- **Naming**: 
  - Components: PascalCase (`DeploymentDashboard`, `ProductionReleaseProcess`)
  - Files: kebab-case for utilities, PascalCase for components
  - Variables: camelCase (`buildNumbers`, `loadingPipelines`)
  - Constants: UPPER_SNAKE_CASE
  - CSS Classes: Tailwind utility classes with custom gradients
- **Imports**: Absolute imports from `src/`, grouped by type (React, libraries, local components, utilities)
- **File Organization**: Feature-based structure with shared utilities in `lib/`

### Architecture Patterns
- **Component Structure**: 
  - `components/ui/` - Reusable Shadcn/ui components (Button, Card, Dialog, etc.)
  - `components/` - Feature-specific components with clear responsibilities
  - `lib/` - Utility functions, API clients, and storage abstraction
- **State Management**: 
  - Local component state with `useState` for UI state
  - `useEffect` for side effects and API calls
  - Persistent data via localStorage + IndexedDB (dual storage for reliability)
  - No global state management - kept intentionally simple
- **Data Flow**: 
  - Props down, callbacks up pattern
  - API calls in component effects with proper cleanup
  - Storage operations abstracted in `lib/storage.ts`
  - Real-time updates via polling with smart intervals
- **Error Handling**: User-friendly error messages, graceful degradation, timeout handling

### UI/UX Patterns
- **Design System**: Purple gradient theme (`#7c3aed` to `#a855f7`) with semantic colors
- **Responsive Design**: Mobile-first approach with grid layouts and collapsible sections
- **Loading States**: Spinners, skeleton loading, and progress indicators
- **Status Indicators**: Color-coded badges, icons, and real-time status updates
- **Accessibility**: Proper ARIA labels, keyboard navigation, screen reader support

### Testing Strategy
- **Manual Testing**: Comprehensive test scenarios documented in `PRODUCTION_RELEASE_TESTING_GUIDE.md`
- **Browser Compatibility**: Chrome/Edge, Firefox, Safari (modern browsers with ES2020+ support)
- **Test Coverage Areas**:
  - Token management and authentication flows
  - Project CRUD operations with validation
  - Pipeline configuration and deployment triggers
  - Production release workflow (18 detailed test scenarios)
  - Import/export functionality with data integrity
  - Real-time status updates and polling behavior
  - Batch deployment operations
  - Error handling and edge cases

### Git Workflow
- **Branching**: Feature branches from `main` with descriptive names
- **Commit Messages**: Conventional Commits format
  - `feat:` - New features and enhancements
  - `fix:` - Bug fixes and patches
  - `docs:` - Documentation updates
  - `style:` - Code formatting and UI improvements
  - `refactor:` - Code restructuring without behavior changes
  - `chore:` - Maintenance and dependency updates
- **Deployment**: Automatic deployment to GitHub Pages on push to `main`
- **Versioning**: Semantic versioning in `package.json`

## Domain Context

### Core Concepts
- **Project**: Container for repositories and pipelines with optional production release workflow
  - Regular projects: Standard deployment workflows
  - Production projects: 8-step formal release process with approvals
- **Repository**: GitHub repo (owner/repo format) containing workflow files and environments
- **Pipeline**: Specific workflow file + branch + environment + default input values configuration
- **Deployment**: Single execution of a pipeline with build number, status tracking, and workflow run linking
- **Batch**: Group of deployments triggered together (identified by batchId and timestamp)
- **Production Release**: 8-step formal workflow with approvals, compliance tracking, and stakeholder notifications
- **Workflow Inputs**: Dynamic form generation based on GitHub workflow input definitions

### Workflow Integration
- **GitHub Actions**: Triggers `workflow_dispatch` events with dynamic inputs and environment targeting
- **Input Types Supported**: 
  - `string` - Text inputs with validation
  - `number` - Numeric inputs
  - `boolean` - Checkbox controls
  - `choice` - Dropdown selections with predefined options
  - `environment` - Auto-populated from GitHub environments
- **Status Tracking**: Intelligent polling every 10-30 seconds based on deployment age
- **Smart Identification**: 3-second delay after trigger + build number matching for accurate run capture
- **Build Number Management**: Latest build detection from branch with manual override capability

### Production Release Process
Sequential 8-step workflow with state persistence:
1. **Deploy to Staging** (prerequisite deployment)
2. **Notify QA - Staging Ready** (automated email notification)
3. **QA Sign-off** (approval gate with timestamp)
4. **Notify Stakeholders + Compliance File** (email + file upload requirement)
5. **Product Owner Sign-off** (final approval gate)
6. **Deploy to Production** (production deployment trigger)
7. **Notify QA - Production Complete** (completion notification)
8. **Create GitHub Release** (automated release creation with notes)

### Data Models
```typescript
interface Project {
  id: string;
  name: string;
  repositories: Repository[];
  pipelines: Pipeline[];
  isProductionRelease?: boolean;
  createdAt: number;
  updatedAt: number;
}

interface Pipeline {
  id: string;
  name: string;
  repositoryId: string;
  workflowFile: string;
  branch: string;
  environment?: string;
  defaultInputValues?: Record<string, any>;
}

interface Deployment {
  id: string;
  projectId: string;
  pipelineId: string;
  buildNumber: string;
  status: 'pending' | 'in_progress' | 'success' | 'failure';
  batchId?: string;
  workflowRunId?: number;
  startedAt: number;
  completedAt?: number;
}
```

## Important Constraints

### Security
- **Local-Only Storage**: GitHub tokens never transmitted to external servers
- **Token Permissions**: Requires `repo` and `workflow` scopes (or fine-grained equivalents)
- **Development Use**: Designed for development teams, not production secrets or PII
- **Browser Security**: Relies on localStorage/IndexedDB, not suitable for shared/public computers
- **API Security**: All GitHub API calls made directly from browser with user's token

### GitHub API Limits
- **Rate Limiting**: 5,000 requests/hour for authenticated users
- **Efficient Usage**: Smart caching, minimal API calls, status-only polling
- **Batch Operations**: Grouped deployments to reduce API overhead
- **Retry Logic**: Built-in retry for transient failures

### Browser Compatibility
- **Modern Browsers**: Requires ES2020+ features, localStorage, and IndexedDB support
- **No Server Dependencies**: Pure client-side application with no backend requirements
- **Local Development**: Vite dev server for development, static files for production

### Data Persistence
- **Dual Storage**: localStorage (primary) + IndexedDB (backup) for reliability
- **No Cloud Sync**: Data tied to specific browser/device combination
- **Export/Import**: JSON-based backup and team sharing mechanism
- **Data Migration**: Automatic schema updates for backward compatibility

## External Dependencies

### GitHub API
- **REST API v4**: Primary integration for all GitHub operations
- **Key Endpoints**:
  - `/repos/{owner}/{repo}/actions/workflows` - Workflow discovery and input parsing
  - `/repos/{owner}/{repo}/actions/runs` - Status monitoring and run details
  - `/repos/{owner}/{repo}/actions/workflows/{id}/dispatches` - Deployment triggers
  - `/repos/{owner}/{repo}/releases` - Release creation and management
  - `/repos/{owner}/{repo}/environments` - Environment enumeration
- **Authentication**: Personal Access Tokens (classic or fine-grained)
- **Error Handling**: Comprehensive error parsing with user-friendly messages

### UI Libraries
- **Shadcn/ui**: Complete UI component system built on Radix UI primitives
- **Radix UI**: Accessible, unstyled UI primitives for complex components
- **Lucide React**: Comprehensive icon library with consistent styling
- **Tailwind CSS**: Utility-first CSS framework with custom configuration

### Build & Deployment
- **Vite**: Lightning-fast build tool with HMR and optimized production builds
- **GitHub Actions**: Automated CI/CD pipeline with deployment to GitHub Pages
- **GitHub Pages**: Static site hosting with custom domain and HTTPS support

### Development Tools
- **TypeScript**: Strict type checking with comprehensive type definitions
- **ESLint + Prettier**: Code quality and formatting (implied by modern setup)
- **PostCSS**: CSS processing for Tailwind and custom styles

## Key Features Implementation

### Real-time Status Updates
- **Adaptive Polling**: 10s (first 2min) → 20s (2-5min) → 30s (5min+)
- **Visual Indicators**: Loading spinners, progress bars, status badges
- **Batch Tracking**: Grouped deployment status with batch-level operations
- **Auto-refresh**: Silent updates with user notifications for completions

### Dynamic Form Generation
- **Workflow Input Parsing**: Automatic form generation from GitHub workflow definitions
- **Input Type Support**: String, number, boolean, choice, environment
- **Default Value Management**: Per-pipeline default values with star indicators
- **Validation**: Required field validation with user-friendly error messages

### Deployment Management
- **Single Deployments**: Individual pipeline deployment with input validation
- **Batch Deployments**: Multi-pipeline deployment with progress tracking
- **Build Number Detection**: Latest build auto-detection with manual override
- **History Tracking**: Comprehensive deployment history with filtering and search

## Key File Structure
```
src/
├── components/
│   ├── ui/                          # Shadcn/ui component library
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── dialog.tsx
│   │   └── ...
│   ├── DeploymentDashboard.tsx      # Main deployment interface (1000+ lines)
│   ├── ProductionReleaseProcess.tsx # 8-step production workflow
│   ├── ProductionReleaseTabs.tsx    # Tabbed production interface
│   ├── ProjectManager.tsx           # Project CRUD operations
│   └── ReleaseCreator.tsx          # GitHub release creation
├── lib/
│   ├── github.ts                   # GitHub API client with rate limiting
│   ├── storage.ts                  # Dual persistence layer (localStorage + IndexedDB)
│   └── utils.ts                    # Utility functions and helpers
├── styles/
│   └── globals.css                 # Global styles and Tailwind configuration
└── App.tsx                         # Root application component
```

## Performance Considerations
- **Lazy Loading**: Components loaded on-demand to reduce initial bundle size
- **Efficient Re-renders**: Proper React key usage and memoization where needed
- **API Optimization**: Minimal API calls with intelligent caching strategies
- **Bundle Size**: Tree-shaking and code splitting for optimal loading performance
