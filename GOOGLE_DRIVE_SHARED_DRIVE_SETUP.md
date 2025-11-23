# Google Drive Shared Drive Setup Guide

## Problem
If you're getting "Folder not found" errors and the service account can see 0 folders, the service account needs to be added as a **member of the shared drive itself**, not just individual folders.

## Step-by-Step Instructions

### 1. Verify the Folder ID

1. Open the folder in Google Drive: `https://drive.google.com/drive/folders/1qW1V7iNjyGH6hTbUVoy0caqkvYUG6Kk2`
2. Check the URL - the folder ID is the part after `/folders/`
3. Make sure there's no trailing period or extra characters
4. The folder ID should be: `1qW1V7iNjyGH6hTbUVoy0caqkvYUG6Kk2`

### 2. Add Service Account to Shared Drive

**Important:** You must add the service account to the **shared drive itself**, not just the folder.

1. Go to the shared drive: `https://drive.google.com/drive/folders/0AJ0UrK02gPTzUk9PVA`
2. Click on the **shared drive name** at the top left (or click the "i" info icon)
3. Click **"Manage members"** or go to the **"Members"** tab
4. Click **"Add members"** button
5. Enter this **EXACT** email:
   ```
   strat-dashboard-drive-service@dashboard-471004.iam.gserviceaccount.com
   ```
6. Select the role: **"Content Manager"** or **"Manager"** (NOT "Viewer" or "Commenter")
7. **Uncheck** "Notify people" (service accounts don't need notifications)
8. Click **"Send"** or **"Add"**

### 3. Verify the Service Account is Added

1. Go back to "Manage members"
2. You should see `strat-dashboard-drive-service@dashboard-471004.iam.gserviceaccount.com` in the members list
3. Verify the role is "Content Manager" or "Manager"

### 4. Wait for Permissions to Propagate

- Wait **1-2 minutes** for Google to propagate the permissions
- Sometimes it can take up to 5 minutes

### 5. Test Again

Run the test endpoint:
```
https://your-vercel-app.vercel.app/api/test-google-drive
```

You should now see:
- `step4_folder.status: "success"`
- The service account can see folders (not 0 folders)
- The folder is accessible

## Troubleshooting

### Still seeing "0 folders"?
- Double-check the service account email is exactly correct
- Verify the role is "Content Manager" or "Manager" (not Viewer)
- Make sure you added it to the **shared drive**, not just the folder
- Wait a few more minutes and try again

### "Insufficient Permission" when listing shared drives?
- This means the service account is not a member of the shared drive
- Follow step 2 above to add it as a member

### Still not working?
- Verify the folder ID is correct by opening it in Google Drive
- Check that the shared drive URL is correct: `0AJ0UrK02gPTzUk9PVA`
- Make sure you're using a Google Workspace account (not personal Gmail)

## Alternative: Use a Regular Google Drive Folder

If shared drives continue to cause issues, you can:
1. Create a regular folder in your personal Google Drive (not a shared drive)
2. Share that folder with the service account
3. Use that folder ID instead

Regular folders don't require the service account to be a member of a shared drive.



