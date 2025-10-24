# Quick Start Guide

Get up and running with the GitHub Actions Deployment Dashboard in 5 minutes!

## 🚀 Step 1: Setup GitHub Token

1. **Create a Personal Access Token:**
   - Go to GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
   - Click "Generate new token (classic)"
   - Give it a descriptive name: "Deployment Dashboard"
   - Select scopes:
     - ✅ `repo` (Full control of private repositories)
     - ✅ `workflow` (Update GitHub Action workflows)
   - Click "Generate token"
   - **Copy the token** (you won't see it again!)

2. **Enter Token in App:**
   - Open the application
   - Paste your token in the input field
   - Click "Save Token"

## 📦 Step 2: Create Your First Project

1. **Click "Add New Project"**
2. **Enter project details:**
   - Name: e.g., "My App"
   - Description: e.g., "Production deployment pipelines"
3. **Click "Create"**

## 🔧 Step 3: Add a Repository

1. **In Project Config, click "Add Repository"**
2. **Enter repository details:**
   - Name: e.g., "backend-api"
   - Owner: Your GitHub username or organization
   - Repo: Repository name
   - Example: `owner: mycompany`, `repo: my-api`
3. **Click "Add Repository"**

## ⚙️ Step 4: Configure a Pipeline

1. **Click "Add Pipeline"**
2. **Fill in pipeline details:**
   - Name: e.g., "Production Deploy"
   - Repository: Select from dropdown
   - Workflow File: e.g., `deploy.yml`
   - Branch: e.g., `main`
   - Environment: e.g., `production`
3. **Click "Add Pipeline"**

The system will automatically detect workflow inputs from your YAML file!

## 🎯 Step 5: Deploy!

### Single Pipeline Deployment

1. **Go to "Deployment Dashboard"**
2. **Find your pipeline in Quick Deploy section**
3. **Enter build number** (e.g., `1.0.0` or `123`)
4. **Fill in any additional workflow inputs**
5. **Click "Deploy"**
6. **Monitor status** in the Deployment Status section

### Deploy Multiple Pipelines

1. **Enter build numbers** for all pipelines you want to deploy
2. **Set global release number** (optional, e.g., `v2.0.0`)
3. **Click "Deploy All Pipelines"**
4. **Review the confirmation dialog:**
   - Check all pipeline details
   - Edit selection if needed
   - Confirm to proceed
5. **Watch progress** in real-time

## 📊 Monitoring Deployments

Each deployment batch shows:
- **Batch number** (#1, #2, #3...)
- **Timestamp** when triggered
- **Number of pipelines** in the batch
- **Global release number** (if set)
- **Individual status** for each pipeline:
  - ⏳ Pending
  - ⟳ In Progress
  - ✅ Success
  - ❌ Failure

Click the 🔗 icon to view the workflow run on GitHub.

## 🏷️ Creating Releases

1. **Navigate to "Create Release" section**
2. **Select repository**
3. **Enter tag name** (e.g., `v1.0.0`)
4. **Write release notes** (markdown supported)
5. **Check "Pre-release"** if needed
6. **Click "Create Release"**

## 💾 Backup & Share

### Export Project

1. **Go to Projects list**
2. **Click "Import/Export" button**
3. **Click "Export Projects"**
4. **Save the JSON file**

### Import Project

1. **Click "Import/Export"**
2. **Click "Import from File"**
3. **Select your JSON file**
4. **Projects are restored!**

## 🔄 Workflow YAML Example

Here's a sample workflow file that works with this dashboard:

```yaml
name: Deploy to Production

on:
  workflow_dispatch:
    inputs:
      build_number:
        description: 'Build number'
        required: true
        type: string
      environment:
        description: 'Target environment'
        required: false
        default: 'production'
        type: choice
        options:
          - production
          - staging
          - qa

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      
      - name: Deploy
        run: |
          echo "Deploying build ${{ inputs.build_number }}"
          echo "To environment: ${{ inputs.environment }}"
          # Your deployment commands here
```

The dashboard will automatically detect and create inputs for:
- `build_number` (text input)
- `environment` (dropdown with options)

## 📱 Tips & Tricks

### Quick Actions
- **Ctrl+Click** on pipeline name to copy it
- **Refresh button** manually updates deployment status
- **Auto-refresh** happens every 10 seconds
- **Collapsible sections** save screen space

### Workflow Inputs
- The dashboard auto-detects all `workflow_dispatch` inputs
- Supports: `string`, `number`, `boolean`, `choice`
- **Save default values** for frequently used inputs
- **Copy from latest build** to reuse previous values

### Batch Deployments
- **Newest batches** appear at the top (#1 is most recent)
- Each batch is **independent** and isolated
- **Edit selection** before confirming Deploy All
- **Progress tracking** shows X/Y completed

### Keyboard Shortcuts
- `Esc` - Close dialogs
- `Enter` - Submit forms (in most cases)

## ⚠️ Important Notes

1. **Token Security:**
   - Tokens are stored locally in your browser
   - Never share your project exports publicly if they contain sensitive data
   - Use fine-grained tokens with minimum permissions

2. **GitHub API Limits:**
   - Rate limit: 5,000 requests/hour for authenticated requests
   - The dashboard is optimized to minimize API calls

3. **Browser Support:**
   - Chrome, Firefox, Safari, Edge (latest versions)
   - Requires JavaScript and localStorage enabled

## 🆘 Need Help?

- 📖 Check [README.md](README.md) for detailed documentation
- 🚀 See [DEPLOYMENT.md](DEPLOYMENT.md) for GitHub Pages setup
- 🤝 Read [CONTRIBUTING.md](CONTRIBUTING.md) to contribute
- 🐛 [Open an issue](https://github.com/YOUR_USERNAME/YOUR_REPO/issues) for bugs

## 🎉 You're Ready!

Start deploying with confidence using batch tracking, comprehensive confirmations, and real-time monitoring!

---

**Pro Tip:** Bookmark the deployment dashboard for quick access to your deployment pipelines! 🔖
