# BUILD_VERSION Update Feature

## Overview

A new step has been added to the production release process (Step 9) that allows you to update the `BUILD_VERSION` variable across all repositories in your project.

## How It Works

### Step 9: Update BUILD_VERSION

After creating GitHub releases (Step 8), you can now update the `BUILD_VERSION` variable to reflect the current release number. This step will:

1. **Scan all repositories** in the project for `BUILD_VERSION` variables
2. **Check multiple locations**:
   - Repository-level Actions variables
   - Environment-specific variables (for each environment)
3. **Allow selective updates** - choose whether to update at the repository level or environment level
4. **Display current values** - see what the current BUILD_VERSION is set to
5. **Provide update status** - visual indicators showing which repositories are up-to-date

### Using the BUILD_VERSION Updater

1. Navigate to Step 9 in the Production Release Process
2. Click **"Update Variables"** button
3. The dialog will automatically suggest the next version (current release + 1 minor, in major.minor format)
   - Example: If current release is `1.2.0`, it will suggest `1.3`
   - You can modify this target version if needed
4. **Important**: If any repository's BUILD_VERSION doesn't match the current release version, you'll see a warning. This may indicate:
   - BUILD_VERSION wasn't updated in a previous release
   - The repository is on a different version cycle
   - You may not need to update BUILD_VERSION for this release
5. The dialog will show all repositories with their BUILD_VERSION locations:
   - **Repository** - Variables at the repository level
   - **Environment Buttons** - Variables specific to each environment (e.g., staging, production)
6. For each repository:
   - Select where the BUILD_VERSION should be updated (Repository or specific Environment)
   - View the current value
   - Click **"Update to [version]"** to update the variable
7. Once all repositories show "Up to date", click **"Complete"** to mark the step as done

### Permissions Required

Your GitHub Personal Access Token must have the following scopes:
- `repo` - Full control of private repositories
- `workflow` - Update GitHub Actions workflows

Additionally, you need **write access** to:
- Repository variables (for repository-level updates)
- Environment variables (for environment-specific updates)

### Features

- **Smart version increment** - Automatically suggests next version using major.minor format (e.g., 1.2, 1.3, 2.0)
- **Flexible version input** - Modify the target version to any format you need
- **Mismatch detection** - Warns when current BUILD_VERSION doesn't match the release version
- **Auto-detection** - Automatically detects existing BUILD_VERSION variables
- **Multi-location support** - Update variables at repository or environment level
- **Visual feedback** - See which repositories need updates with color-coded badges
- **Bulk management** - Manage BUILD_VERSION across multiple repositories in one interface
- **Safe updates** - Only updates variables that already exist
- **Real-time refresh** - Values refresh after each update

### Version Format

The updater uses a **major.minor** format by default (e.g., `1.2`, `1.3`, `2.0`), which is common for build versions. The system will:

- Parse your current release version (e.g., `1.2.0`)
- Increment the minor version by 1
- Return only major.minor (e.g., `1.3`)

**Examples:**
- `1.2.0` → suggests `1.3`
- `1.9` → suggests `1.10`
- `2.0.5` → suggests `2.1`
- `3` → suggests `4.0`

You can always modify the suggested version to match your specific needs.

### Important Notes

1. **Variable must exist first** - The BUILD_VERSION variable must already exist in GitHub. The updater will not create new variables, only update existing ones.

2. **No release number** - If you see an error about "No release number available", you need to create a production release first (this sets the release number that will be used as the BUILD_VERSION).

3. **Access errors** - If you see "No Access" on a repository, your token may not have the required permissions for that repository.

4. **Environment-specific** - If you have different BUILD_VERSION values for different environments (e.g., staging vs production), you can update them independently.

### API Endpoints Used

- `GET /repos/{owner}/{repo}/actions/variables` - List repository variables
- `PATCH /repos/{owner}/{repo}/actions/variables/{variable_name}` - Update repository variable
- `GET /repos/{owner}/{repo}/environments` - List environments
- `GET /repos/{owner}/{repo}/environments/{environment_name}/variables` - List environment variables
- `PATCH /repos/{owner}/{repo}/environments/{environment_name}/variables/{variable_name}` - Update environment variable

### Troubleshooting

**Problem**: "BUILD_VERSION variable not found"
**Solution**: Create the BUILD_VERSION variable in GitHub first:
1. Go to your repository Settings > Secrets and variables > Actions > Variables
2. Click "New repository variable"
3. Name: `BUILD_VERSION`
4. Value: Initial version (e.g., "1.0.0")

**Problem**: "No Access" badge on repository
**Solution**: 
1. Verify your token has the correct scopes (`repo`, `workflow`)
2. Ensure you have write access to the repository
3. Try regenerating your GitHub token with the correct permissions

**Problem**: Nothing happens when clicking "Update Variables"
**Solution**:
1. Check browser console for errors
2. Verify that a production release exists and has a release number
3. Ensure repositories are configured in the project

## Integration with Production Release Process

This step is designed to be the final step in the production release process:

1. Deploy to Staging
2. Notify QA - Staging Ready
3. QA Sign-off
4. Notify - Start Production Release
5. Product Owner Sign-off
6. Deploy to Production
7. Notify QA - Production Complete
8. Create GitHub Release
9. **Update BUILD_VERSION** ← New step

By updating BUILD_VERSION after creating the release, you ensure that your CI/CD pipelines always reference the correct version number for future builds.
