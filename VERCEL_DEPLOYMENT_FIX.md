# Fix Vercel Deployment Not Triggering

## Problem
Pushes to GitHub (`codeandtheory/strategy-dashboard-new`) are not triggering Vercel deployments.

## Root Cause
The repository moved from `karenpiper/strategy-dashboard-new` to `codeandtheory/strategy-dashboard-new`, but Vercel is still connected to the old location.

## Solution Steps

### Option 1: Reconnect Repository in Vercel (Recommended)

1. **Go to Vercel Dashboard**
   - Visit https://vercel.com
   - Sign in and navigate to your project: `strategy-dashboard-new`

2. **Disconnect Old Repository**
   - Go to **Settings** → **Git**
   - Click **"Disconnect"** or **"Change Repository"**
   - Confirm disconnection

3. **Reconnect to New Repository**
   - Click **"Connect Git Repository"**
   - Select **GitHub** as your Git provider
   - Search for: `codeandtheory/strategy-dashboard-new`
   - Click **"Import"**

4. **Configure Settings**
   - **Production Branch**: `main`
   - **Root Directory**: `strategy-dashboard-new` (if the project is in a subdirectory)
   - **Framework Preset**: Next.js (should auto-detect)
   - **Build Command**: `npm run build` (should auto-detect)
   - **Output Directory**: `.next` (should auto-detect)

5. **Automatic Deployments**
   - By default, Vercel automatically deploys when you connect a Git repository
   - If you need to check: Go to **Settings** → **Git** → Look for deployment settings
   - Automatic deployments are usually enabled by default when connecting a repo

6. **Test**
   - Make a small change (e.g., add a comment to a file)
   - Commit and push to `main`
   - Check Vercel dashboard - should see a new deployment triggered

### Option 2: Update GitHub App Permissions

If the repository is in a different organization:

1. **In GitHub (Easier Method)**
   - Go to: https://github.com/organizations/codeandtheory/settings/installations
   - Or: GitHub → Your Profile → Settings → Applications → Installed GitHub Apps
   - Find **"Vercel"** in the list
   - Click **"Configure"**
   - Under **"Repository access"**, ensure `strategy-dashboard-new` is selected
   - Or select **"All repositories"** if you want Vercel to access all repos
   - Click **"Save"**

2. **Alternative: Check in Vercel**
   - Go to: https://vercel.com/account/integrations
   - Look for GitHub integration
   - Click to manage/configure
   - Check which organizations/repositories are connected

### Option 3: Manual Deployment (Temporary Workaround)

While fixing the integration:

1. **In Vercel Dashboard**
   - Go to **Deployments**
   - Find the latest deployment
   - Click **"..."** menu → **"Redeploy"**
   - Or click **"Deploy"** button → **"Deploy Latest Commit"**

2. **Or use Vercel CLI**
   ```bash
   cd strategy-dashboard-new
   vercel --prod
   ```

## Verification

After reconnecting:

1. **Check Git Integration**
   - Vercel → Your Project → **Settings** → **Git**
   - Should show: `codeandtheory/strategy-dashboard-new` as the connected repository
   - Should show: `main` as production branch (or check the branch dropdown)

2. **Check Recent Deployments**
   - Vercel → Your Project → **Deployments** tab
   - Should see deployments with commit messages matching your pushes
   - Each deployment should show the commit SHA and message

3. **Test Automatic Deployment**
   - Make a small commit and push to `main` branch
   - Within 1-2 minutes, check Vercel dashboard → Deployments
   - Should see a new deployment appear automatically with status "Building" or "Ready"

## Common Issues

### "Repository not found"
- The repository might be private and Vercel doesn't have access
- Check GitHub organization settings → Third-party access → Vercel

### "Branch not found"
- Ensure you're pushing to `main` branch
- Check Vercel settings → Git → Production Branch matches your default branch

### "Webhook not received"
- GitHub might be blocking webhooks
- Check GitHub repository → **Settings** → **Webhooks** (in the left sidebar)
- Should see a Vercel webhook with recent deliveries
- If not, Vercel will create one automatically after reconnecting the repository
- Click on the webhook to see recent delivery attempts and any errors

### Still Not Working?

1. **Check Vercel Project Settings**
   - Go to: Vercel → Your Project → **Settings** → **Git**
   - Look at the repository connection status
   - Check if there are any error messages or warnings

2. **Check GitHub Webhooks**
   - Go to: GitHub → `codeandtheory/strategy-dashboard-new` → **Settings** → **Webhooks**
   - Find the Vercel webhook
   - Click on it to see recent deliveries
   - Check if recent pushes show as "200 OK" or if there are errors

3. **Check Vercel Deployments Tab**
   - Go to: Vercel → Your Project → **Deployments**
   - Look for any failed deployments or error messages
   - Check the build logs for any issues

4. **Manual Trigger Test**
   - In Vercel → Deployments → Click **"Redeploy"** on latest
   - If manual deploy works but auto-deploy doesn't, it's a webhook/integration issue
   - If manual deploy also fails, it's a build configuration issue

## Quick Check Commands

```bash
# Verify git remote is correct
git remote -v
# Should show: codeandtheory/strategy-dashboard-new

# Verify you're on main branch
git branch
# Should show: * main

# Verify latest commit is pushed
git log origin/main -1
# Should match your latest commit
```

