/**
 * Import playlists from CSV file
 * 
 * Usage:
 *   npx tsx scripts/import-playlists-from-csv.ts <path-to-csv-file>
 * 
 * CSV format:
 *   Date,Title,Curator,Description,URL,Apple Playlist
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'
import { parse } from 'csv-parse/sync'

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables')
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

interface CSVRow {
  Date: string
  Title: string
  Curator: string
  Description: string
  URL: string
  'Apple Playlist': string
}

async function fetchPlaylistCover(spotifyUrl: string): Promise<string | null> {
  try {
    // Extract playlist ID from URL
    const playlistIdMatch = spotifyUrl.match(/playlist\/([a-zA-Z0-9]+)/)
    if (!playlistIdMatch) {
      console.warn(`Could not extract playlist ID from URL: ${spotifyUrl}`)
      return null
    }

    const playlistId = playlistIdMatch[1]

    // Call the Spotify API endpoint
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/spotify/playlist`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url: spotifyUrl }),
    })

    if (!response.ok) {
      console.warn(`Failed to fetch playlist data for ${spotifyUrl}`)
      return null
    }

    const data = await response.json()
    return data.coverUrl || null
  } catch (error) {
    console.warn(`Error fetching playlist cover for ${spotifyUrl}:`, error)
    return null
  }
}

async function lookupCuratorAvatar(curatorName: string): Promise<string | null> {
  try {
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('avatar_url, full_name, email')
      .or(`full_name.ilike.%${curatorName}%,email.ilike.%${curatorName}%`)
      .limit(1)

    if (error) {
      console.warn(`Error looking up curator ${curatorName}:`, error)
      return null
    }

    if (profiles && profiles.length > 0 && profiles[0].avatar_url) {
      return profiles[0].avatar_url
    }

    return null
  } catch (error) {
    console.warn(`Error looking up curator avatar for ${curatorName}:`, error)
    return null
  }
}

async function importPlaylists(csvFilePath: string) {
  console.log(`Reading CSV file: ${csvFilePath}`)

  const csvContent = fs.readFileSync(csvFilePath, 'utf-8')
  const records: CSVRow[] = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  })

  console.log(`Found ${records.length} playlists to import`)

  let successCount = 0
  let errorCount = 0

  for (let i = 0; i < records.length; i++) {
    const row = records[i]
    console.log(`\n[${i + 1}/${records.length}] Processing: ${row.Title || 'Untitled'} by ${row.Curator}`)

    try {
      // Parse date (format: M/D/YYYY)
      const [month, day, year] = row.Date.split('/')
      const date = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`

      // Fetch cover image from Spotify
      let coverUrl: string | null = null
      if (row.URL) {
        console.log(`  Fetching cover image from Spotify...`)
        coverUrl = await fetchPlaylistCover(row.URL)
        if (coverUrl) {
          console.log(`  ✓ Found cover image`)
        } else {
          console.log(`  ⚠ No cover image found`)
        }
      }

      // Look up curator avatar
      let curatorPhotoUrl: string | null = null
      if (row.Curator) {
        console.log(`  Looking up curator avatar...`)
        curatorPhotoUrl = await lookupCuratorAvatar(row.Curator)
        if (curatorPhotoUrl) {
          console.log(`  ✓ Found curator avatar`)
        } else {
          console.log(`  ⚠ No curator avatar found`)
        }
      }

      // Insert playlist
      const { data, error } = await supabase
        .from('playlists')
        .insert({
          date,
          title: row.Title?.trim() || null,
          curator: row.Curator?.trim() || 'Unknown',
          description: row.Description?.trim() || null,
          spotify_url: row.URL?.trim() || '',
          apple_playlist_url: row['Apple Playlist']?.trim() || null,
          cover_url: coverUrl,
          curator_photo_url: curatorPhotoUrl,
        })
        .select()
        .single()

      if (error) {
        // Check if it's a duplicate (unique constraint violation)
        if (error.code === '23505') {
          console.log(`  ⚠ Playlist already exists, skipping`)
        } else {
          console.error(`  ✗ Error:`, error.message)
          errorCount++
        }
      } else {
        console.log(`  ✓ Successfully imported playlist`)
        successCount++
      }

      // Add a small delay to avoid rate limiting
      if (i < records.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500))
      }
    } catch (error: any) {
      console.error(`  ✗ Error processing playlist:`, error.message)
      errorCount++
    }
  }

  console.log(`\n=== Import Complete ===`)
  console.log(`Successfully imported: ${successCount}`)
  console.log(`Errors: ${errorCount}`)
  console.log(`Total: ${records.length}`)
}

// Main execution
const csvFilePath = process.argv[2]

if (!csvFilePath) {
  console.error('Usage: npx tsx scripts/import-playlists-from-csv.ts <path-to-csv-file>')
  process.exit(1)
}

if (!fs.existsSync(csvFilePath)) {
  console.error(`CSV file not found: ${csvFilePath}`)
  process.exit(1)
}

importPlaylists(csvFilePath)
  .then(() => {
    console.log('\nDone!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Fatal error:', error)
    process.exit(1)
  })


