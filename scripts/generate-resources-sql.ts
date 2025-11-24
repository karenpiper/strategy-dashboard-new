/**
 * Generate SQL INSERT statement from CSV file
 * Usage: npx tsx scripts/generate-resources-sql.ts path/to/resources.csv
 */

import * as fs from 'fs'
import { resolve } from 'path'

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

function escapeSQLString(value: string | null | undefined): string {
  if (!value || value.trim() === '') {
    return 'NULL'
  }
  // Escape single quotes by doubling them
  const escaped = value.replace(/'/g, "''")
  return `'${escaped}'`
}

function formatArray(tags: string): string {
  if (!tags || tags.trim() === '') {
    return "ARRAY[]::TEXT[]"
  }
  const tagArray = tags.split(',').map(tag => tag.trim()).filter(Boolean)
  if (tagArray.length === 0) {
    return "ARRAY[]::TEXT[]"
  }
  const escapedTags = tagArray.map(tag => `'${tag.replace(/'/g, "''")}'`).join(', ')
  return `ARRAY[${escapedTags}]`
}

async function generateSQL() {
  try {
    // Get CSV file path from command line argument or use default
    const csvPath = process.argv[2] || resolve(process.cwd(), '../../Downloads/Team Resources-Grid view.csv')
    
    if (!fs.existsSync(csvPath)) {
      console.error(`CSV file not found: ${csvPath}`)
      process.exit(1)
    }

    const fileContent = fs.readFileSync(csvPath, 'utf-8')
    const lines = fileContent.split(/\r?\n/)

    if (lines.length < 2) {
      console.error('CSV file must have at least a header row and one data row')
      process.exit(1)
    }

    // Parse header
    const headers = parseCSVLine(lines[0])
    const records: Record<string, string>[] = []

    // Parse data rows - handle multi-line quoted fields
    let currentLine = ''
    let inQuotedField = false
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i]
      
      // Check if we're in a quoted field
      const quoteCount = (line.match(/"/g) || []).length
      if (quoteCount % 2 !== 0) {
        inQuotedField = !inQuotedField
      }
      
      currentLine += (currentLine ? '\n' : '') + line
      
      // If we're not in a quoted field and the line ends, process it
      if (!inQuotedField && currentLine.trim()) {
        const values = parseCSVLine(currentLine)
        const record: Record<string, string> = {}
        headers.forEach((header, index) => {
          record[header] = values[index] || ''
        })
        records.push(record)
        currentLine = ''
      }
    }

    // Process any remaining line
    if (currentLine.trim()) {
      const values = parseCSVLine(currentLine)
      const record: Record<string, string> = {}
      headers.forEach((header, index) => {
        record[header] = values[index] || ''
      })
      records.push(record)
    }

    console.log(`Found ${records.length} resources to process`)

    // Generate SQL INSERT statements
    const sqlStatements: string[] = []
    sqlStatements.push('-- Insert team resources from CSV')
    sqlStatements.push('-- Generated from Team Resources-Grid view.csv')
    sqlStatements.push('')
    sqlStatements.push('INSERT INTO public.resources (name, primary_category, secondary_tags, link, source, description, username, password, instructions, documentation) VALUES')
    sqlStatements.push('')

    const valueRows: string[] = []

    for (const record of records) {
      // Clean up the name field (remove quotes and newlines)
      const name = record.Name?.replace(/"/g, '').replace(/\n/g, ' ').trim()
      
      if (!name) {
        console.warn('Skipping record with no name')
        continue
      }

      const primaryCategory = record.Primary?.trim() || 'Other'
      const secondaryTags = record.Secondary?.trim() || ''
      const link = record.Link?.trim() || ''
      const source = record.Source?.trim() || null
      const description = record.Description?.trim() || null
      const username = record.Username?.trim() || null
      const password = record.Password?.trim() || null
      const instructions = record.Instructions?.trim() || null
      const documentation = record.Documentation?.trim() || null

      // Build the VALUES row
      const values = [
        escapeSQLString(name),
        escapeSQLString(primaryCategory),
        formatArray(secondaryTags),
        escapeSQLString(link),
        escapeSQLString(source),
        escapeSQLString(description),
        escapeSQLString(username),
        escapeSQLString(password),
        escapeSQLString(instructions),
        escapeSQLString(documentation)
      ]

      valueRows.push(`  (${values.join(', ')})`)
    }

    // Join all value rows with commas, except the last one
    sqlStatements.push(valueRows.join(',\n'))
    sqlStatements.push(';')
    sqlStatements.push('')

    // Write to SQL file
    const sqlContent = sqlStatements.join('\n')
    const outputPath = resolve(process.cwd(), 'supabase/insert-resources.sql')
    fs.writeFileSync(outputPath, sqlContent, 'utf-8')
    
    console.log(`SQL file generated: ${outputPath}`)
    console.log(`Total records: ${valueRows.length}`)
  } catch (error) {
    console.error('Error generating SQL:', error)
    process.exit(1)
  }
}

generateSQL()

