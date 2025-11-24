import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * API endpoint to calculate active clients and update Airtable
 * 
 * This endpoint:
 * 1. Calculates the count of unique active clients from work samples
 * 2. Optionally filters by recent activity (within last 12 months)
 * 3. Updates the specified Airtable record with the count
 * 
 * Environment variables required:
 * - AIRTABLE_API_KEY: Your Airtable Personal Access Token
 * - AIRTABLE_BASE_ID: Your Airtable Base ID
 * - AIRTABLE_TABLE_NAME: The name of the table to update
 * - AIRTABLE_RECORD_ID: The ID of the record to update (optional, can be passed as query param)
 * - AIRTABLE_FIELD_NAME: The name of the field to update (default: "Active Clients")
 * 
 * Query parameters:
 * - recordId: Override the AIRTABLE_RECORD_ID env var
 * - fieldName: Override the AIRTABLE_FIELD_NAME env var (default: "Active Clients")
 * - months: Number of months to look back for "active" clients (default: 12, set to 0 for all time)
 */

interface AirtableUpdateResponse {
  id: string
  fields: Record<string, any>
  createdTime: string
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Get environment variables
    const airtableApiKey = process.env.AIRTABLE_API_KEY
    const airtableBaseId = process.env.AIRTABLE_BASE_ID
    const airtableTableName = process.env.AIRTABLE_TABLE_NAME

    if (!airtableApiKey || !airtableBaseId || !airtableTableName) {
      return NextResponse.json(
        { 
          error: 'Airtable configuration missing',
          details: 'Please set AIRTABLE_API_KEY, AIRTABLE_BASE_ID, and AIRTABLE_TABLE_NAME environment variables'
        },
        { status: 500 }
      )
    }

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const recordId = searchParams.get('recordId') || process.env.AIRTABLE_RECORD_ID
    const fieldName = searchParams.get('fieldName') || process.env.AIRTABLE_FIELD_NAME || 'Active Clients'
    const monthsParam = searchParams.get('months')
    const months = monthsParam ? parseInt(monthsParam, 10) : 12

    if (!recordId) {
      return NextResponse.json(
        { 
          error: 'Record ID required',
          details: 'Please provide AIRTABLE_RECORD_ID environment variable or recordId query parameter'
        },
        { status: 400 }
      )
    }

    // Calculate active clients count
    let query = supabase
      .from('work_samples')
      .select('client', { count: 'exact', head: false })

    // Filter by date if months > 0
    if (months > 0) {
      const cutoffDate = new Date()
      cutoffDate.setMonth(cutoffDate.getMonth() - months)
      const cutoffDateStr = cutoffDate.toISOString().split('T')[0]
      query = query.gte('date', cutoffDateStr)
    }

    // Only count records with a client value
    query = query.not('client', 'is', null)

    const { data: workSamples, error: queryError } = await query

    if (queryError) {
      console.error('Error fetching work samples:', queryError)
      return NextResponse.json(
        { error: 'Failed to fetch work samples', details: queryError.message },
        { status: 500 }
      )
    }

    // Get unique clients
    const uniqueClients = new Set<string>()
    workSamples?.forEach((sample: { client: string }) => {
      if (sample.client && sample.client.trim()) {
        uniqueClients.add(sample.client.trim())
      }
    })

    const activeClientsCount = uniqueClients.size

    // Update Airtable
    const airtableUrl = `https://api.airtable.com/v0/${airtableBaseId}/${encodeURIComponent(airtableTableName)}/${recordId}`
    
    const updateResponse = await fetch(airtableUrl, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${airtableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fields: {
          [fieldName]: activeClientsCount
        }
      })
    })

    if (!updateResponse.ok) {
      const errorText = await updateResponse.text()
      console.error('Airtable API error:', errorText)
      return NextResponse.json(
        { 
          error: 'Failed to update Airtable',
          details: errorText,
          statusCode: updateResponse.status
        },
        { status: updateResponse.status }
      )
    }

    const airtableData: AirtableUpdateResponse = await updateResponse.json()

    return NextResponse.json({
      success: true,
      activeClientsCount,
      uniqueClients: Array.from(uniqueClients).sort(),
      monthsLookback: months,
      airtableRecord: {
        id: airtableData.id,
        updatedField: fieldName,
        updatedValue: activeClientsCount
      }
    })

  } catch (error: any) {
    console.error('Error updating Airtable:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update Airtable', details: error.toString() },
      { status: 500 }
    )
  }
}

// GET endpoint to just calculate the count without updating Airtable
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const monthsParam = searchParams.get('months')
    const months = monthsParam ? parseInt(monthsParam, 10) : 12

    // Calculate active clients count
    let query = supabase
      .from('work_samples')
      .select('client', { count: 'exact', head: false })

    // Filter by date if months > 0
    if (months > 0) {
      const cutoffDate = new Date()
      cutoffDate.setMonth(cutoffDate.getMonth() - months)
      const cutoffDateStr = cutoffDate.toISOString().split('T')[0]
      query = query.gte('date', cutoffDateStr)
    }

    // Only count records with a client value
    query = query.not('client', 'is', null)

    const { data: workSamples, error: queryError } = await query

    if (queryError) {
      console.error('Error fetching work samples:', queryError)
      return NextResponse.json(
        { error: 'Failed to fetch work samples', details: queryError.message },
        { status: 500 }
      )
    }

    // Get unique clients
    const uniqueClients = new Set<string>()
    workSamples?.forEach((sample: { client: string }) => {
      if (sample.client && sample.client.trim()) {
        uniqueClients.add(sample.client.trim())
      }
    })

    const activeClientsCount = uniqueClients.size

    return NextResponse.json({
      activeClientsCount,
      uniqueClients: Array.from(uniqueClients).sort(),
      monthsLookback: months,
      totalWorkSamples: workSamples?.length || 0
    })

  } catch (error: any) {
    console.error('Error calculating active clients:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to calculate active clients', details: error.toString() },
      { status: 500 }
    )
  }
}

