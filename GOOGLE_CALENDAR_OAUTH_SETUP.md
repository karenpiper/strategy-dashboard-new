# Google Calendar Access Setup Guide

This guide explains how the dashboard accesses Google Calendar events, including shared calendars.

## How It Works

The dashboard uses your existing Google OAuth session (from Supabase login) to request calendar access. This means:
- ✅ You can access any calendar you have permission to view (including shared calendars you don't own)
- ✅ No need to share calendars with service accounts
- ✅ Uses the same Google account you're already logged in with

## Setup

### Step 1: Configure Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **APIs & Services** > **Credentials**
3. Click on your OAuth 2.0 Client ID (the same one used for Supabase)
4. Under **Authorized JavaScript origins**, add:
   - Your production domain (e.g., `https://yourdomain.com`)
   - For local development: `http://localhost:3000`
   - For Vercel preview deployments: `https://*.vercel.app`
5. Under **Authorized redirect URIs**, make sure you have:
   - `https://<your-project-ref>.supabase.co/auth/v1/callback` (for Supabase login)
   - `http://localhost:3000/auth/callback` (for local development)
   - **Also add your current origin** (e.g., `https://yourdomain.com` or `http://localhost:3000`) - this is needed for GSI token client
6. Click **Save**

### Step 2: Add Environment Variable

Add this to your `.env.local`:

```env
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_oauth_client_id
```

**Important:** This should be the same Client ID you're using for Supabase Google OAuth authentication. You can find it in:
1. Your Supabase Dashboard → Authentication → Providers → Google
2. Or in Google Cloud Console → APIs & Services → Credentials

## How It Works

1. When you log in with Google via Supabase, you're already authenticated with Google
2. The dashboard requests additional calendar permissions using Google Identity Services
3. A consent dialog may appear asking for calendar access (one-time)
4. The access token is cached and used to fetch calendar events
5. The token automatically refreshes when needed

## Fallback Authentication

If `NEXT_PUBLIC_GOOGLE_CLIENT_ID` is not set, the dashboard will fall back to:
- OAuth2 refresh token (if `GOOGLE_OAUTH_REFRESH_TOKEN` is set)
- Service account (if service account credentials are set)

---

## Alternative: Manual OAuth2 Setup (Not Recommended)

If you prefer not to use the client-side token approach, you can set up OAuth2 with a refresh token:

## Step 1: Create OAuth2 Credentials in Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project (or create a new one)
3. Navigate to **APIs & Services** > **Credentials**
4. Click **Create Credentials** > **OAuth client ID**
5. If prompted, configure the OAuth consent screen:
   - Choose **Internal** (if you have a Google Workspace) or **External**
   - Fill in the required fields (App name, User support email, etc.)
   - Add your email to test users if using External
   - Click **Save and Continue** through the scopes (you can skip adding scopes here)
   - Click **Save and Continue** through test users
   - Click **Back to Dashboard**
6. Choose **Desktop app** as the application type (or **Web application** if you prefer)
7. Give it a name (e.g., "Dashboard Calendar Access")
8. Click **Create**
9. Copy the **Client ID** and **Client Secret**

## Step 2: Generate a Refresh Token

You need to generate a refresh token that will be used to get access tokens automatically. Here's a simple way to do it:

### Option A: Using Google's OAuth2 Playground (Easiest)

1. Go to [Google OAuth2 Playground](https://developers.google.com/oauthplayground/)
2. Click the gear icon (⚙️) in the top right
3. Check **"Use your own OAuth credentials"**
4. Enter your **Client ID** and **Client Secret** from Step 1
5. In the left panel, find and select:
   - `https://www.googleapis.com/auth/calendar.readonly`
6. Click **Authorize APIs**
7. Sign in with your Google account (the one that has access to the shared calendars)
8. Click **Allow** to grant permissions
9. Click **Exchange authorization code for tokens**
10. Copy the **Refresh token** (it's a long string)

### Option B: Using a Script (More Control)

Create a file `get-refresh-token.js`:

```javascript
const { google } = require('googleapis');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Replace these with your credentials from Step 1
const CLIENT_ID = 'YOUR_CLIENT_ID';
const CLIENT_SECRET = 'YOUR_CLIENT_SECRET';
const REDIRECT_URI = 'http://localhost:3000/auth/callback';

const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);

// Generate the auth URL
const scopes = ['https://www.googleapis.com/auth/calendar.readonly'];
const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: scopes,
});

console.log('Authorize this app by visiting this url:', authUrl);
rl.question('Enter the code from that page here: ', (code) => {
  rl.close();
  oauth2Client.getToken(code, (err, token) => {
    if (err) return console.error('Error retrieving access token', err);
    console.log('Refresh Token:', token.refresh_token);
    console.log('Full token object:', JSON.stringify(token, null, 2));
  });
});
```

Run it:
```bash
node get-refresh-token.js
```

Follow the prompts to get your refresh token.

## Step 3: Add Environment Variables

Add these to your `.env.local` file:

```env
GOOGLE_OAUTH_CLIENT_ID=your_client_id_here
GOOGLE_OAUTH_CLIENT_SECRET=your_client_secret_here
GOOGLE_OAUTH_REFRESH_TOKEN=your_refresh_token_here
```

## Step 4: Enable Google Calendar API

Make sure the Google Calendar API is enabled in your Google Cloud project:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **APIs & Services** > **Library**
3. Search for "Google Calendar API"
4. Click on it and click **Enable**

## Step 5: Test It

Restart your development server and check if the calendar events are loading. The API will automatically use OAuth2 if these environment variables are set, otherwise it will fall back to service account authentication.

## Troubleshooting

### Error 400: redirect_uri_mismatch

**Problem:** You see "Access blocked: This app's request is invalid" with error 400: redirect_uri_mismatch

**Solution:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **APIs & Services** > **Credentials**
3. Click on your OAuth 2.0 Client ID
4. Under **Authorized JavaScript origins**, add your current origin:
   - For production: `https://yourdomain.com`
   - For local: `http://localhost:3000`
   - For Vercel: `https://*.vercel.app` (or your specific preview URL)
5. Under **Authorized redirect URIs**, also add your current origin (same as above)
6. Click **Save** and wait a few minutes for changes to propagate
7. Clear your browser cache and try again

**Note:** The origin must match exactly (including http vs https and the port number)

### "Invalid grant" error
- Your refresh token may have expired or been revoked
- Generate a new refresh token following Step 2

### "Access denied" or "Permission denied"
- Make sure you're using the Google account that has access to the shared calendars
- The refresh token is tied to the account you used when generating it

### Still getting 404 errors for shared calendars
- Verify you can see the calendar in your Google Calendar app
- Make sure you're using OAuth2 (check that the environment variables are set)
- Check server logs to see which authentication method is being used
- If using service account, make sure the calendars are shared with the service account email

## Notes

- The refresh token doesn't expire (unless revoked), so you only need to generate it once
- Keep your refresh token secure - treat it like a password
- If you need to access calendars from multiple Google accounts, you'll need separate refresh tokens for each account

