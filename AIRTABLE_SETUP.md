# Airtable Integration Setup

This guide explains how to set up automatic updates to your Airtable base with active client counts from your dashboard.

## Overview

The integration automatically calculates the number of unique active clients from your work samples database and updates a field in your Airtable base. You can configure it to count clients from the last 12 months (default) or all time.

## Setup Steps

### 1. Get Your Airtable Credentials

1. **Personal Access Token (API Key)**
   - Go to https://airtable.com/create/tokens
   - Click "Create new token"
   - Give it a name (e.g., "Dashboard Integration")
   - Grant scopes: `data.records:read` and `data.records:write`
   - Select the base(s) you want to access
   - Copy the token (starts with `pat...`)

2. **Base ID**
   - Go to your Airtable base
   - Click "Help" → "API documentation"
   - Find your Base ID (starts with `app...`)

3. **Table Name**
   - The name of the table you want to update (e.g., "Dashboard Stats", "Metrics")

4. **Record ID**
   - Go to your Airtable base
   - Open the record you want to update
   - In the URL, you'll see something like `recXXXXXXXXXXXXXX` - that's your Record ID
   - Or use the API to list records and find the ID

5. **Field Name**
   - The exact name of the field in Airtable that should store the count (e.g., "Active Clients", "Current Clients")

### 2. Set Environment Variables

Add these to your Vercel project (or `.env.local` for local development):

```bash
# Airtable Configuration
AIRTABLE_API_KEY=patXXXXXXXXXXXXXXXXXXXX
AIRTABLE_BASE_ID=appXXXXXXXXXXXXXXXXXXXX
AIRTABLE_TABLE_NAME=Dashboard Stats
AIRTABLE_RECORD_ID=recXXXXXXXXXXXXXXXXXXXX
AIRTABLE_FIELD_NAME=Active Clients
```

**In Vercel:**
1. Go to your project settings
2. Navigate to "Environment Variables"
3. Add each variable above
4. Redeploy your application

### 3. Test the Integration

#### Option A: Test via GET (just calculate, don't update)
```bash
# Get the count without updating Airtable
curl -X GET "https://your-app.vercel.app/api/airtable/update-active-clients?months=12" \
  -H "Cookie: your-auth-cookie"
```

#### Option B: Test via POST (calculate and update Airtable)
```bash
# Update Airtable with the count
curl -X POST "https://your-app.vercel.app/api/airtable/update-active-clients?months=12" \
  -H "Cookie: your-auth-cookie"
```

#### Option C: Use the browser
1. Log into your dashboard
2. Navigate to: `https://your-app.vercel.app/api/airtable/update-active-clients?months=12`
   - This will show you the count without updating
3. To update Airtable, you'll need to use a tool like Postman or create a simple button in your admin panel

### 4. Automate Updates (Optional)

You can set up automatic updates using:

#### Option A: Vercel Cron Jobs
Add to `vercel.json`:
```json
{
  "crons": [{
    "path": "/api/airtable/update-active-clients",
    "schedule": "0 9 * * *"
  }]
}
```
This runs daily at 9 AM UTC.

#### Option B: External Cron Service
Use a service like:
- [cron-job.org](https://cron-job.org)
- [EasyCron](https://www.easycron.com)
- [GitHub Actions](https://github.com/features/actions)

Set it to POST to: `https://your-app.vercel.app/api/airtable/update-active-clients`

**Note:** For external cron services, you may need to create a separate endpoint that uses an API key instead of authentication, or use Vercel's cron jobs.

## API Endpoint Details

### GET `/api/airtable/update-active-clients`
Calculates the active clients count but doesn't update Airtable.

**Query Parameters:**
- `months` (optional): Number of months to look back. Default: 12. Set to 0 for all time.

**Response:**
```json
{
  "activeClientsCount": 25,
  "uniqueClients": ["Client A", "Client B", ...],
  "monthsLookback": 12,
  "totalWorkSamples": 150
}
```

### POST `/api/airtable/update-active-clients`
Calculates the active clients count and updates Airtable.

**Query Parameters:**
- `months` (optional): Number of months to look back. Default: 12. Set to 0 for all time.
- `recordId` (optional): Override the `AIRTABLE_RECORD_ID` env var
- `fieldName` (optional): Override the `AIRTABLE_FIELD_NAME` env var

**Response:**
```json
{
  "success": true,
  "activeClientsCount": 25,
  "uniqueClients": ["Client A", "Client B", ...],
  "monthsLookback": 12,
  "airtableRecord": {
    "id": "recXXXXXXXXXXXXXX",
    "updatedField": "Active Clients",
    "updatedValue": 25
  }
}
```

## How It Works

1. The endpoint queries your `work_samples` table in Supabase
2. Filters by date (if `months > 0`) to only count recent clients
3. Extracts unique client names (ignoring null/empty values)
4. Counts the unique clients
5. Updates the specified Airtable record with the count

## Troubleshooting

### "Authentication required"
- Make sure you're logged into the dashboard
- The endpoint requires authentication

### "Airtable configuration missing"
- Check that all environment variables are set in Vercel
- Make sure variable names match exactly (case-sensitive)

### "Failed to update Airtable"
- Verify your API key has write permissions
- Check that the Base ID, Table Name, Record ID, and Field Name are correct
- Ensure the field in Airtable accepts numbers

### Count seems wrong
- Check the `months` parameter - it defaults to 12 months
- Set `months=0` to count all clients regardless of date
- Verify your work samples have the `client` field populated

## Manual Update Option

If you prefer to update manually, you can:
1. Call the GET endpoint to see the current count
2. Manually type the number into Airtable

Or create a simple admin button that calls the POST endpoint when clicked.

