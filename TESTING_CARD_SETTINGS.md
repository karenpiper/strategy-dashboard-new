# Testing Dashboard Card Settings

## Setup

1. **Run the SQL migration** to create the `dashboard_card_settings` table:
   ```sql
   -- Run this in your Supabase SQL editor:
   -- File: supabase/create-dashboard-card-settings-table.sql
   ```

2. **Verify the table was created**:
   - Go to Supabase Dashboard → Table Editor
   - You should see `dashboard_card_settings` table with all 19 cards (all set to `is_visible: true` by default)

## Testing Steps

### 1. Test Admin Settings Page

1. **Navigate to Admin Settings**:
   - Go to `/admin/settings` (or click "Settings" in the admin navigation)
   - You must be logged in as an admin user

2. **Verify Card List**:
   - You should see all 19 cards listed with toggle switches
   - All cards should be ON (green) by default
   - Cards should have readable names (e.g., "Horoscope", "Snaps", "Events")

3. **Toggle Cards**:
   - Toggle OFF "Beast Babe" card
   - Toggle OFF "Snaps" card
   - Toggle OFF "Horoscope" card
   - Toggle OFF "Events" card
   - Toggle OFF "Team Pulse" card
   - Click "Save Settings"

4. **Verify Save**:
   - You should see a green success message: "Settings saved successfully!"
   - Check browser console for any errors

### 2. Test Dashboard Visibility

1. **Navigate to Main Dashboard**:
   - Go to `/` (home page)
   - Refresh the page to ensure fresh data

2. **Verify Cards Are Hidden**:
   - **Beast Babe card** should NOT be visible
   - **Snaps card** should NOT be visible
   - **Horoscope card** should NOT be visible
   - **Events card** should NOT be visible
   - **Team Pulse card** should NOT be visible

3. **Toggle Cards Back On**:
   - Go back to `/admin/settings`
   - Toggle all cards back ON
   - Click "Save Settings"

4. **Verify Cards Are Visible**:
   - Go back to main dashboard
   - Refresh the page
   - All cards should now be visible again

### 3. Test API Endpoints

1. **Test GET endpoint** (should work for any authenticated user):
   ```bash
   curl -X GET http://localhost:3000/api/dashboard-cards \
     -H "Cookie: your-session-cookie"
   ```
   - Should return JSON with `settings` object and `allSettings` array

2. **Test PUT endpoint** (should only work for admins):
   ```bash
   curl -X PUT http://localhost:3000/api/dashboard-cards \
     -H "Content-Type: application/json" \
     -H "Cookie: your-session-cookie" \
     -d '{
       "updates": [
         {"card_name": "horoscope", "is_visible": false}
       ]
     }'
   ```
   - Should return `{"success": true, "results": [...]}`
   - Non-admin users should get 403 error

### 4. Test Edge Cases

1. **Non-admin Access**:
   - Log in as a non-admin user
   - Try to access `/admin/settings`
   - Should see message: "Admin access required to manage card settings"

2. **Default Behavior**:
   - If card settings fail to load, cards should default to visible (backwards compatibility)
   - Check browser console for warnings

3. **Loading State**:
   - Cards should show while settings are loading
   - Once loaded, visibility should update

## Cards Currently Wrapped

The following cards have visibility checks implemented:
- ✅ Beast Babe (`beast-babe`)
- ✅ Snaps (`snaps`)
- ✅ Horoscope (`horoscope`)
- ✅ Events (`events`)
- ✅ Team Pulse (`team-pulse`)

## Cards Not Yet Wrapped

These cards still need visibility checks added:
- ⏳ Pipeline (`pipeline`)
- ⏳ Timezones (`timezones`)
- ⏳ Playlist (`playlist`)
- ⏳ Friday Drop (`friday-drop`)
- ⏳ Who Needs What (`who-needs-what`)
- ⏳ Wins Wall (`wins-wall`)
- ⏳ Ask Hive (`ask-hive`)
- ⏳ Loom Standup (`loom-standup`)
- ⏳ Inspiration War (`inspiration-war`)
- ⏳ Search (`search`)
- ⏳ Launch Pad (`launch-pad`)
- ⏳ Brand Redesign (`brand-redesign`)
- ⏳ Stats (`stats`)

## Troubleshooting

### Cards not hiding/showing
- Check browser console for errors
- Verify the API endpoint is working: `/api/dashboard-cards`
- Check Supabase table has correct data
- Clear browser cache and refresh

### Settings page not loading
- Verify you're logged in as admin
- Check browser console for errors
- Verify API endpoint is accessible

### API errors
- Check Supabase RLS policies are correct
- Verify user has `base_role = 'admin'` in profiles table
- Check server logs for detailed error messages




