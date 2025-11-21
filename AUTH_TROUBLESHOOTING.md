# Authentication Troubleshooting Guide

This guide helps you diagnose and fix common authentication issues.

## Common Issues and Solutions

### 1. "Missing Supabase environment variables"

**Problem:** The middleware can't find Supabase credentials.

**Solution:**
1. Create a `.env.local` file in the root directory
2. Add your Supabase credentials:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```
3. Restart your development server

### 2. OAuth Redirect URI Mismatch

**Problem:** Google OAuth fails with "redirect_uri_mismatch" error.

**Solution:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **APIs & Services** > **Credentials**
3. Click on your OAuth 2.0 Client ID
4. Add these authorized redirect URIs:
   - `https://<your-project-ref>.supabase.co/auth/v1/callback`
   - `http://localhost:3000/auth/callback` (for local development)
5. Save and wait a few minutes for changes to propagate

### 3. Supabase Google Provider Not Configured

**Problem:** "Provider not enabled" error when trying to sign in.

**Solution:**
1. Go to your [Supabase Dashboard](https://app.supabase.com/)
2. Navigate to **Authentication** > **Providers**
3. Find **Google** and click to enable it
4. Enter your Google **Client ID** and **Client Secret**
5. Click **Save**

### 4. Infinite Redirect Loop

**Problem:** Page keeps redirecting between login and dashboard.

**Solution:**
- Clear your browser cookies for the site
- Check browser console for errors
- Verify middleware is not redirecting authenticated users
- Check that the auth context is properly detecting the session

### 5. Session Not Persisting

**Problem:** User gets logged out on page refresh.

**Solution:**
- Verify cookies are being set correctly (check browser DevTools > Application > Cookies)
- Ensure `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set correctly
- Check that middleware is properly refreshing the session
- Verify Supabase project settings allow cookie-based sessions

### 6. "Authentication required" Error on API Routes

**Problem:** API routes return 401 even when logged in.

**Solution:**
- Verify the server-side Supabase client is correctly reading cookies
- Check that the `createClient` function in `lib/supabase/server.ts` is working
- Ensure cookies are being sent with API requests
- Check browser console for CORS errors

## Debugging Steps

### 1. Check Environment Variables

```bash
# In your terminal, verify env vars are loaded
echo $NEXT_PUBLIC_SUPABASE_URL
echo $NEXT_PUBLIC_SUPABASE_ANON_KEY
```

### 2. Check Browser Console

Open browser DevTools (F12) and check:
- **Console tab:** Look for authentication errors
- **Network tab:** Check API requests and responses
- **Application tab:** Check cookies and localStorage

### 3. Check Server Logs

Look at your terminal/console where the dev server is running for:
- Middleware errors
- API route errors
- Authentication errors

### 4. Test Authentication Flow

1. Go to `/login`
2. Click "Continue with Google"
3. Complete Google OAuth
4. Check if redirected to `/auth/callback`
5. Check if redirected to `/` (dashboard)
6. Verify user is logged in

### 5. Verify Supabase Setup

1. Go to Supabase Dashboard > Authentication > Users
2. Check if your user was created after OAuth
3. Go to Supabase Dashboard > Authentication > Providers
4. Verify Google provider is enabled and configured

## Testing Authentication

### Manual Test

1. Clear all cookies for your site
2. Visit the site - should redirect to `/login`
3. Click "Continue with Google"
4. Sign in with Google
5. Should redirect back to dashboard
6. Refresh page - should stay logged in

### Check Session

Add this to any page to debug:

```typescript
const { user, loading } = useAuth()
console.log('User:', user)
console.log('Loading:', loading)
```

## Still Having Issues?

1. **Check Supabase Status:** https://status.supabase.com/
2. **Review Supabase Docs:** https://supabase.com/docs/guides/auth
3. **Check Next.js Middleware:** Ensure middleware is properly configured
4. **Verify Cookie Settings:** Check that cookies are not being blocked

## Quick Fixes

### Reset Everything

1. Clear browser cookies
2. Restart dev server
3. Clear `.next` folder: `rm -rf .next`
4. Rebuild: `npm run build`

### Test Without Middleware

Temporarily comment out middleware redirects to test if the issue is middleware-related.

### Test Direct API Calls

Use curl or Postman to test API routes directly:

```bash
curl http://localhost:3000/api/horoscope
```

