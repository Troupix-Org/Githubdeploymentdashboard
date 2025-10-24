# Features Documentation

Detailed documentation of all features in the GitHub Actions Deployment Dashboard.

## 🚀 Core Features

### 1. Token Management

**Setup & Storage**
- Secure token entry on first launch
- Storage in localStorage + IndexedDB for redundancy
- Easy logout/token removal
- Token validation against GitHub API

**Security Features**
- Local-only storage (no server transmission)
- Token never exposed in URLs or logs
- Logout clears all token data
- Support for fine-grained tokens

---

### 2. Project Management

**Create Projects**
- Custom project names and descriptions
- Multiple projects support
- Each project isolated with unique ID

**Edit Projects**
- Update name and description
- Add/remove repositories
- Configure multiple pipelines
- No data loss during edits

**Delete Projects**
- Confirmation dialog prevents accidents
- Removes all associated data
- Cannot be undone

**Import/Export**
- Export all projects as JSON
- Import from JSON file
- Share configurations across teams
- Backup and restore functionality

---

### 3. Repository Configuration

**Add Repositories**
- Simple owner/repo format
- Multiple repositories per project
- Validation of format
- Used across multiple pipelines

**Repository Display**
- Name for identification
- Full GitHub path shown
- Edit and delete options
- Used in pipeline selection

---

### 4. Pipeline Configuration

**Pipeline Setup**
- Custom pipeline names
- Select from project repositories
- Workflow file name (e.g., deploy.yml)
- Branch specification
- Optional environment tag

**Workflow Input Detection**
- Automatic YAML parsing
- Detects all `workflow_dispatch` inputs
- Supports multiple input types:
  - `string` - Text input
  - `number` - Numeric input
  - `boolean` - Checkbox
  - `choice` - Dropdown with options

**Default Values**
- Set default values for each input
- Saved per pipeline
- Auto-populate on load
- "Save Default" button for quick updates

**Latest Builds**
- Shows recent workflow runs
- Displays input values used
- "Copy" button to reuse values
- Expandable list of recent runs

---

### 5. Quick Deploy

**Single Pipeline Deployment**

Interface:
- Pipeline name badge
- Repository indicator
- Branch/environment display
- Dynamic input fields based on YAML
- Build number input (required)
- Deploy button

Process:
1. Enter build number
2. Fill in workflow inputs
3. Click "Deploy"
4. System triggers GitHub workflow
5. 3-second wait for run identification
6. Status tracked in Deployment Status

Feedback:
- Success message with link
- Error messages for failures
- Loading state during deployment
- Disabled state while deploying

---

### 6. Deploy All Pipelines

**Batch Deployment Feature**

Trigger:
- "Deploy All Pipelines" button
- Requires build numbers for all pipelines
- Optional global release number

**Confirmation Dialog** (New!)

Header:
- Title with pipeline count
- "Confirm Deployment" heading
- Close/cancel options

Global Release Section:
- Prominent display if set
- Golden gradient background
- Star icon indicator

Deployment Summary Table:
- Pipeline name
- Repository
- Branch
- Environment
- Build number

Edit Selection:
- "Edit Selection" button
- Checkbox for each pipeline
- Can deselect pipelines
- Selection counter (X/Y selected)
- "Done" button to finish editing

Warnings:
- Red alert if no pipelines selected
- Yellow alert if not all selected
- Info message about batching

Progress Tracking:
- Progress bar during deployment
- X/Y counter
- Sequential deployment status

Actions:
- Cancel button (disabled during deployment)
- Confirm button with gradient style
- Shows progress in button text

---

### 7. Deployment Status

**Batch Grouping** (New!)

Each batch shows:
- Batch number (#1, #2, #3...)
- Timestamp of deployment
- Number of pipelines
- Global release number badge (if set)

Batch Header Style:
- Purple gradient background
- Prominent batch indicator
- Pipeline count badge
- Release number in gold

Individual Pipeline Status:
- Status icon and badge
- Pipeline name
- Environment badge (color-coded)
- Build number
- Repository name
- Actions (link to GitHub)

Status Types:
- ⏳ **Pending** - Triggered, waiting
- ⟳ **In Progress** - Currently running
- ✅ **Success** - Completed successfully
- ❌ **Failure** - Failed with errors

**Auto-Refresh**
- Updates every 10 seconds
- Manual refresh button
- Animated refresh icon
- Preserves scroll position

**Status Details**
- Click 🔗 to view on GitHub
- Direct link to workflow run
- See logs and details
- Monitor in real-time

---

### 8. Latest Builds Display

**Per Pipeline View**

Information shown:
- Last 5 workflow runs
- Commit information (message, author)
- Workflow status and conclusion
- Link to GitHub run
- Input values used

**Copy Functionality**
- "Copy" button for each build
- Copies all input values
- Auto-fills current form
- Saves time on similar deployments

**Expand/Collapse**
- "Show More" / "Show Less" toggle
- Saves screen space
- Per-pipeline control
- Smooth animations

---

### 9. Release Creation

**GitHub Release Features**

Form Fields:
- Repository selection
- Tag name (e.g., v1.0.0)
- Release title
- Release notes (markdown supported)
- Pre-release checkbox
- Draft checkbox

Process:
1. Select repository
2. Enter tag and title
3. Write release notes
4. Choose release type
5. Click "Create Release"

Result:
- Release created on GitHub
- Success confirmation
- Link to view release
- Error handling

**Markdown Support**
- Full markdown syntax
- Preview not built-in (use GitHub)
- Headers, lists, code blocks
- Links and images supported

---

### 10. Collapsible Sections

**Space Management**

All major sections collapsible:
- Quick Deploy
- Latest Builds
- Deployment Status
- Create Release

Features:
- Chevron indicator (up/down)
- Smooth animations
- State preserved during session
- Click header to toggle

Benefits:
- Ultra-compact interface
- Focus on active section
- Reduced scrolling
- Better organization

---

## 🎨 Design Features

### Visual Design

**Color Scheme**
- Primary: Purple (#7c3aed)
- Secondary: Pink (#ec4899)
- Accents: Gradient combinations
- Professional slate background

**Environment Colors**
- 🔴 Production - Red
- 🟡 Staging - Yellow/Orange
- 🔵 QA/Test - Blue
- 🟢 Development - Green
- 🟣 Other - Purple

**Status Colors**
- ✅ Success - Green
- ❌ Failure - Red
- ⟳ In Progress - Blue
- ⏳ Pending - Gray

### Typography

- System font stack
- Clear hierarchy
- Monospace for code/builds
- Adequate contrast

### Interactions

- Hover effects on buttons
- Loading states
- Smooth transitions
- Clear feedback

---

## 🔧 Technical Features

### Data Persistence

**LocalStorage**
- Projects and configurations
- GitHub token
- Quick access
- Synchronous operations

**IndexedDB**
- Deployments history
- Large data storage
- Asynchronous operations
- Backup for localStorage

### GitHub API Integration

**Operations**
- Trigger workflow runs
- Fetch workflow files
- Get workflow runs status
- Create releases
- Fetch commits

**Rate Limiting**
- 5,000 requests/hour (authenticated)
- Efficient caching
- Minimal API calls
- Status-only updates

### Performance

**Optimizations**
- Component memoization
- Efficient re-renders
- Lazy loading where possible
- Auto-refresh throttling

**Bundle Size**
- Code splitting
- Tree shaking
- Minification
- Gzip compression

---

## 🎯 Workflow Features

### Input Types Support

**String Inputs**
```yaml
workflow_dispatch:
  inputs:
    version:
      description: 'Version number'
      required: true
      type: string
```
→ Text input field

**Number Inputs**
```yaml
workflow_dispatch:
  inputs:
    timeout:
      description: 'Timeout in seconds'
      required: false
      type: number
```
→ Number input field

**Boolean Inputs**
```yaml
workflow_dispatch:
  inputs:
    dry_run:
      description: 'Perform a dry run'
      required: false
      type: boolean
```
→ Checkbox

**Choice Inputs**
```yaml
workflow_dispatch:
  inputs:
    environment:
      description: 'Target environment'
      required: true
      type: choice
      options:
        - production
        - staging
        - development
```
→ Dropdown select

### Smart Features

**3-Second Delay**
- Prevents incorrect run identification
- Allows GitHub time to process
- Ensures latest run is captured
- User feedback during wait

**Validation**
- Required field checking
- Format validation
- Duplicate prevention
- Error messages

---

## 📊 Monitoring Features

### Real-Time Updates

**Status Polling**
- Checks every 10 seconds
- Updates in background
- Shows current state
- No page refresh needed

**Status Transitions**
- Pending → In Progress
- In Progress → Success/Failure
- Visual feedback on change
- Notification-ready architecture

### Batch Tracking

**Session Grouping**
- Each trigger = new batch
- Unique batch ID
- Timestamp tracking
- Pipeline count

**Visual Organization**
- Newest first (#1 = latest)
- Clear separation
- Easy to scan
- Quick identification

---

## 🔐 Security Features

### Token Security

**Storage**
- Browser-local only
- No server transmission
- Encrypted storage (browser-dependent)
- Easy removal

**Validation**
- Test token on save
- Verify permissions
- Error on invalid token
- Graceful handling

### Data Security

**Privacy**
- No external analytics
- No data collection
- Local-only processing
- User control

**Best Practices**
- Fine-grained tokens recommended
- Minimum permissions
- Regular rotation encouraged
- Clear documentation

---

## 🚀 Future Feature Ideas

See [CONTRIBUTING.md](CONTRIBUTING.md) for planned enhancements and how to contribute new features!

---

Last Updated: October 2025
