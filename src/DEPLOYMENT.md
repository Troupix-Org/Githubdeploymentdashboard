# Deployment Guide for GitHub Pages

This guide will help you deploy the GitHub Actions Deployment Dashboard to GitHub Pages.

## Quick Start

### Option 1: User/Organization Site (username.github.io)

If you're deploying to `https://username.github.io`:

1. **Enable GitHub Pages:**
   ```
   Repository Settings → Pages → Source: GitHub Actions
   ```

2. **No additional configuration needed** - The workflow is ready to go!

3. **Push to main branch** or manually trigger the workflow from Actions tab.

### Option 2: Project Site (username.github.io/repo-name)

If you're deploying to `https://username.github.io/repo-name`:

1. **Create `vite.config.ts`** in the root directory:

   ```typescript
   import { defineConfig } from 'vite';
   import react from '@vitejs/plugin-react';
   
   export default defineConfig({
     plugins: [react()],
     base: '/repo-name/', // Replace 'repo-name' with your actual repository name
   });
   ```

2. **Enable GitHub Pages:**
   ```
   Repository Settings → Pages → Source: GitHub Actions
   ```

3. **Push to main branch** or manually trigger the workflow from Actions tab.

## Workflow Details

The deployment workflow (`.github/workflows/deploy.yml`) automatically:

1. ✅ Checks out the code
2. ✅ Sets up Node.js (v20)
3. ✅ Installs dependencies
4. ✅ Builds the production bundle
5. ✅ Deploys to GitHub Pages

### Workflow Triggers

The workflow runs on:
- **Push to main branch** - Automatic deployment
- **Manual trigger** - Via Actions tab ("workflow_dispatch")

## Troubleshooting

### 404 Error After Deployment

**Problem:** The page loads but shows 404 errors for assets or routes.

**Solution:** You likely need to set the `base` path in `vite.config.ts`:

```typescript
export default defineConfig({
  plugins: [react()],
  base: '/your-repo-name/', // Add this line
});
```

### Workflow Fails on Build

**Problem:** The build step fails in the workflow.

**Possible Solutions:**

1. **Check Node.js version:**
   - The workflow uses Node.js 20. If your local build uses a different version, update the workflow or your local environment.

2. **Missing dependencies:**
   - Ensure all dependencies are listed in `package.json`
   - Run `npm install` locally to verify

3. **Build errors:**
   - Run `npm run build` locally to see the full error message
   - Fix any TypeScript or build errors

### Deployment Permissions Error

**Problem:** Workflow fails with permissions error.

**Solution:** Ensure GitHub Pages is enabled in repository settings:
1. Go to Settings → Pages
2. Under "Source", select "GitHub Actions"
3. Save the changes

### Changes Not Reflecting After Deployment

**Problem:** Deployed site shows old content.

**Solutions:**

1. **Clear browser cache:**
   - Hard refresh: Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (Mac)

2. **Check workflow status:**
   - Go to Actions tab
   - Verify the latest workflow run completed successfully

3. **Wait a few minutes:**
   - GitHub Pages can take 1-2 minutes to update after deployment

## Manual Deployment

To trigger a manual deployment:

1. Go to the **Actions** tab in your repository
2. Click on **"Deploy to GitHub Pages"** workflow
3. Click **"Run workflow"** button
4. Select the branch (usually `main`)
5. Click **"Run workflow"** to start

## Advanced Configuration

### Custom Domain

To use a custom domain:

1. **Add CNAME file:**
   
   Create `/public/CNAME` (if using Vite) with your domain:
   ```
   yourdomain.com
   ```

2. **Configure DNS:**
   - Add an A record or CNAME record pointing to GitHub Pages
   - See [GitHub's custom domain docs](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site)

3. **Update vite.config.ts:**
   ```typescript
   export default defineConfig({
     plugins: [react()],
     base: '/', // Use root path for custom domain
   });
   ```

### Environment Variables

If you need to use environment variables during build:

1. **Add secrets to repository:**
   - Go to Settings → Secrets and variables → Actions
   - Add your secrets

2. **Update workflow:**
   ```yaml
   - name: Build
     run: npm run build
     env:
       VITE_API_KEY: ${{ secrets.API_KEY }}
   ```

### Build Optimization

To optimize the build:

1. **Update `vite.config.ts`:**
   ```typescript
   export default defineConfig({
     plugins: [react()],
     build: {
       rollupOptions: {
         output: {
           manualChunks: {
             'react-vendor': ['react', 'react-dom'],
             'ui-vendor': ['lucide-react'],
           },
         },
       },
     },
   });
   ```

## Monitoring Deployments

### Check Deployment Status

1. **Actions Tab:**
   - View all workflow runs
   - See build logs and errors

2. **Environments:**
   - Go to Code → Environments → github-pages
   - See deployment history and URLs

3. **Pages Settings:**
   - Settings → Pages
   - Shows the current deployment URL

### Deployment URL

After successful deployment, your app will be available at:

- **User/Org site:** `https://username.github.io`
- **Project site:** `https://username.github.io/repo-name`

The URL is also shown in:
- Actions workflow summary (deployment step)
- Settings → Pages section
- Environments section

## Security Considerations

- ⚠️ Never commit sensitive data (API keys, tokens) to the repository
- ⚠️ GitHub tokens entered in the app are stored in browser localStorage
- ⚠️ Use GitHub Secrets for any build-time sensitive configuration
- ⚠️ Consider using environment-specific configurations for production

## Support

If you encounter issues:

1. Check the [GitHub Pages documentation](https://docs.github.com/en/pages)
2. Review the [GitHub Actions documentation](https://docs.github.com/en/actions)
3. Check the workflow logs in the Actions tab
4. Open an issue in this repository

## Additional Resources

- [Vite Deployment Guide](https://vitejs.dev/guide/static-deploy.html)
- [GitHub Pages Documentation](https://docs.github.com/en/pages)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
