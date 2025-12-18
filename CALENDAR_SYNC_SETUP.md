# Calendar Sync Setup Guide

This guide explains how to set up the calendar sync system that uses a Google Service Account to sync calendar events in the background.

## Overview

The calendar sync system:
- ✅ Uses Google Service Account (JWT) authentication - no user OAuth required
- ✅ Syncs events automatically in the background
- ✅ Stores events in database for fast access
- ✅ Works with shared calendars and public calendars (with proper setup)

## Prerequisites

1. **Google Service Account** - Same one used for Google Drive
2. **Calendar API Enabled** - Enable Google Calendar API in Google Cloud Console
3. **Service Account Access** - Service account must be granted access to calendars

## Setup Steps

### 1. Enable Google Calendar API

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **APIs & Services** > **Library**
3. Search for "Google Calendar API"
4. Click **Enable**

### 2. Grant Service Account Access to Calendars

The service account needs to be explicitly granted access to each calendar, even if they're public.

#### For Calendars You Own:

1. Open the calendar in Google Calendar
2. Click the three dots next to the calendar name → **Settings and sharing**
3. Under **Share with specific people**, click **Add people**
4. Add your service account email (found in `GOOGLE_SERVICE_ACCOUNT_JSON` or `GOOGLE_CLIENT_EMAIL`)
5. Set permission to **See all event details** (read-only is sufficient)
6. **Uncheck** "Notify people" (service accounts don't need notifications)
7. Click **Send**

#### For Public Calendars You Don't Own:

For public calendars (like Google's holiday calendars), you have a few options:

**Option A: Request Access (Recommended)**
- Contact the calendar owner and request they add your service account
- Provide them with your service account email

**Option B: Use Calendar's Public iCal Feed (Alternative)**
- Some public calendars provide iCal feeds that don't require authentication
- This would require a different implementation (not currently supported)

**Option C: Remove from Sync**
- If you can't get access, remove the calendar from `GOOGLE_CALENDAR_IDS`
- The sync will continue with other calendars

### 3. Configure Environment Variables

Add to your `.env.local` or Vercel environment variables:

```env
# Service Account (same as Google Drive)
GOOGLE_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"...","private_key_id":"...","private_key":"...","client_email":"...","client_id":"...","auth_uri":"...","token_uri":"...","auth_provider_x509_cert_url":"...","client_x509_cert_url":"..."}

# OR use individual vars:
GOOGLE_CLIENT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Calendar IDs to sync (comma-separated)
GOOGLE_CALENDAR_IDS=codeandtheory.com_6elnqlt8ok3kmcpim2vge0qqqk@group.calendar.google.com,codeandtheory.com_ojeuiov0bhit2k17g8d6gj4i68@group.calendar.google.com,codeandtheory.com_5b18ulcjgibgffc35hbtmv6sfs@group.calendar.google.com,en.usa#holiday@group.v.calendar.google.com
```

### 4. Deploy Database Schema

Run the SQL migration in Supabase:

```sql
-- Run: strategy-dashboard-new/supabase/create-synced-calendar-events-table.sql
```

### 5. Run Initial Sync

Test the sync manually:

```bash
# Using curl
curl -X POST "https://your-domain.com/api/calendar/sync?calendarIds=YOUR_CALENDAR_ID"

# Or visit in browser (GET request will show instructions)
```

### 6. Set Up Automated Sync (Vercel Cron)

Add to `vercel.json`:

```json
{
  "crons": [{
    "path": "/api/calendar/sync-scheduled",
    "schedule": "0 * * * *"
  }]
}
```

This will sync calendars every hour automatically.

## Troubleshooting

### Error: "Permission denied"

**Cause:** Service account doesn't have access to the calendar.

**Solution:**
1. Verify the service account email is correct
2. Share the calendar with the service account email
3. For public calendars you don't own, request access from the owner

### Error: "Calendar not found"

**Cause:** Calendar ID is incorrect or service account doesn't have access.

**Solution:**
1. Verify the calendar ID is correct
2. Ensure the service account has been granted access
3. Check that the calendar hasn't been deleted or renamed

### Error: "Google Calendar API is not enabled"

**Cause:** Calendar API is not enabled in Google Cloud Console.

**Solution:**
1. Go to Google Cloud Console
2. Enable Google Calendar API
3. Wait a few minutes for changes to propagate

### Public Calendars Not Syncing

**Cause:** Even public calendars require explicit access for service accounts.

**Solution:**
1. Request the calendar owner to add your service account
2. Or remove the calendar from sync if access isn't possible
3. The sync will continue with other calendars that have access

## Service Account Email

To find your service account email:

1. Check `GOOGLE_SERVICE_ACCOUNT_JSON` → `client_email` field
2. Or check `GOOGLE_CLIENT_EMAIL` environment variable
3. Or look in Google Cloud Console → IAM & Admin → Service Accounts

## Testing

Test the sync endpoint:

```bash
# Sync specific calendars
POST /api/calendar/sync?calendarIds=CALENDAR_ID_1,CALENDAR_ID_2

# Sync all calendars from env var
POST /api/calendar/sync

# Check sync results
GET /api/calendar?calendarIds=CALENDAR_ID_1
```

## Notes

- Events are synced in the background - users don't need to authenticate
- Sync continues even if some calendars fail
- Failed calendars are logged with helpful error messages
- Events are soft-deleted when removed from Google Calendar
- Manual calendar events are merged with synced events


