/**
 * Import resources from CSV file
 * Usage: npx tsx scripts/import-resources-from-csv.ts path/to/resources.csv
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve } from 'path'
import * as fs from 'fs'
import * as readline from 'readline'

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') })
config({ path: resolve(process.cwd(), '.env') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables')
  throw new Error('Missing Supabase environment variables')
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    
    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  result.push(current.trim())
  return result
}

async function importResources() {
  try {
    // Get CSV file path from command line argument or use default
    const csvPath = process.argv[2] || resolve(process.cwd(), '../../Downloads/Team Resources-Grid view.csv')
    
    if (!fs.existsSync(csvPath)) {
      console.error(`CSV file not found: ${csvPath}`)
      process.exit(1)
    }

    const fileStream = fs.createReadStream(csvPath)
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity
    })

    const lines: string[] = []
    for await (const line of rl) {
      lines.push(line)
    }

    if (lines.length < 2) {
      console.error('CSV file must have at least a header row and one data row')
      process.exit(1)
    }

    // Parse header
    const headers = parseCSVLine(lines[0])
    const records: Record<string, string>[] = []

    // Parse data rows
    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i])
      const record: Record<string, string> = {}
      headers.forEach((header, index) => {
        record[header] = values[index] || ''
      })
      records.push(record)
    }

    console.log(`Found ${records.length} resources to import`)

    // Process each record
    for (const record of records) {
      // Clean up the name field (remove quotes and newlines)
      const name = record.Name?.replace(/"/g, '').replace(/\n/g, ' ').trim()
      
      if (!name) {
        console.warn('Skipping record with no name:', record)
        continue
      }

      // Parse secondary tags (comma-separated string)
      const secondaryTags = record.Secondary
        ? record.Secondary.split(',').map((tag: string) => tag.trim()).filter(Boolean)
        : []

      const resource = {
        name,
        primary_category: record.Primary || 'Other',
        secondary_tags: secondaryTags,
        link: record.Link || '',
        source: record.Source || null,
        description: record.Description || null,
        username: record.Username || null,
        password: record.Password || null,
        instructions: record.Instructions || null,
        documentation: record.Documentation || null,
        view_count: 0
      }

      // Check if resource already exists
      const { data: existing } = await supabase
        .from('resources')
        .select('id')
        .eq('name', name)
        .single()

      if (existing) {
        // Update existing resource
        const { error } = await supabase
          .from('resources')
          .update(resource)
          .eq('id', existing.id)

        if (error) {
          console.error(`Error updating resource ${name}:`, error)
        } else {
          console.log(`Updated: ${name}`)
        }
      } else {
        // Insert new resource
        const { error } = await supabase
          .from('resources')
          .insert(resource)

        if (error) {
          console.error(`Error inserting resource ${name}:`, error)
        } else {
          console.log(`Inserted: ${name}`)
        }
      }
    }

    console.log('Import completed!')
  } catch (error) {
    console.error('Error importing resources:', error)
    process.exit(1)
  }
}

importResources()

