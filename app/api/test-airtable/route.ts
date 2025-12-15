import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  console.log('🧪 Testing Airtable connection...')
  
  // Get Airtable configuration
  const apiKey = process.env.AIRTABLE_API_KEY
  const baseId = process.env.AIRTABLE_IMAGE_BASE_ID || process.env.AIRTABLE_AI_BASE_ID || process.env.AIRTABLE_BASE_ID
  const tableId = process.env.AIRTABLE_IMAGE_TABLE_ID || 'tblKPuAESzyVMrK5M'
  const tableName = process.env.AIRTABLE_IMAGE_TABLE_NAME || 'Image Generation'
  const tableIdentifier = tableId

  const results: any = {
    config: {
      hasApiKey: !!apiKey,
      apiKeyPrefix: apiKey ? apiKey.substring(0, 12) + '...' : 'MISSING',
      baseId: baseId || 'MISSING',
      tableId,
      tableName,
      tableIdentifier,
    },
    tests: []
  }

  // Test 1: Check configuration
  console.log('📋 Test 1: Configuration check')
  if (!apiKey || !baseId) {
    results.tests.push({
      name: 'Configuration Check',
      status: 'FAILED',
      error: 'Missing required environment variables',
      details: {
        hasApiKey: !!apiKey,
        hasBaseId: !!baseId
      }
    })
    return NextResponse.json(results, { status: 400 })
  }
  results.tests.push({
    name: 'Configuration Check',
    status: 'PASSED',
    details: results.config
  })

  // Test 2: List records (read test)
  console.log('📋 Test 2: List records (read test)')
  try {
    const listUrl = `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableIdentifier)}?maxRecords=1`
    console.log('   URL:', listUrl)
    
    const listResponse = await fetch(listUrl, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      }
    })

    const listResponseText = await listResponse.text()
    console.log('   Status:', listResponse.status, listResponse.statusText)
    console.log('   Response:', listResponseText.substring(0, 500))

    if (listResponse.ok) {
      const listData = JSON.parse(listResponseText)
      results.tests.push({
        name: 'List Records (Read)',
        status: 'PASSED',
        details: {
          recordCount: listData.records?.length || 0,
          hasRecords: (listData.records?.length || 0) > 0
        }
      })
    } else {
      results.tests.push({
        name: 'List Records (Read)',
        status: 'FAILED',
        error: `HTTP ${listResponse.status}: ${listResponse.statusText}`,
        details: {
          response: listResponseText.substring(0, 500)
        }
      })
    }
  } catch (error: any) {
    results.tests.push({
      name: 'List Records (Read)',
      status: 'FAILED',
      error: error.message,
      details: {
        stack: error.stack?.substring(0, 500)
      }
    })
  }

  // Test 3: Create a test record (write test)
  console.log('📋 Test 3: Create test record (write test)')
  try {
    const createUrl = `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableIdentifier)}`
    console.log('   URL:', createUrl)
    
    const testRecord = {
      records: [
        {
          fields: {
            'Image Prompt': `TEST RECORD - ${new Date().toISOString()}`,
            'Status': 'Pending',
            'Created At': new Date().toISOString().split('T')[0], // YYYY-MM-DD format
          }
        }
      ]
    }
    console.log('   Request body:', JSON.stringify(testRecord, null, 2))

    const createResponse = await fetch(createUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testRecord)
    })

    const createResponseText = await createResponse.text()
    console.log('   Status:', createResponse.status, createResponse.statusText)
    console.log('   Response:', createResponseText.substring(0, 1000))

    if (createResponse.ok) {
      const createData = JSON.parse(createResponseText)
      const createdRecord = createData.records?.[0]
      
      if (createdRecord?.id) {
        results.tests.push({
          name: 'Create Record (Write)',
          status: 'PASSED',
          details: {
            recordId: createdRecord.id,
            fields: createdRecord.fields
          }
        })

        // Test 4: Retrieve the record we just created
        console.log('📋 Test 4: Retrieve created record')
        try {
          const retrieveUrl = `${createUrl}/${createdRecord.id}`
          const retrieveResponse = await fetch(retrieveUrl, {
            headers: {
              'Authorization': `Bearer ${apiKey}`,
            }
          })

          const retrieveResponseText = await retrieveResponse.text()
          if (retrieveResponse.ok) {
            const retrieveData = JSON.parse(retrieveResponseText)
            results.tests.push({
              name: 'Retrieve Record',
              status: 'PASSED',
              details: {
                recordId: retrieveData.id,
                fields: retrieveData.fields
              }
            })
          } else {
            results.tests.push({
              name: 'Retrieve Record',
              status: 'FAILED',
              error: `HTTP ${retrieveResponse.status}: ${retrieveResponse.statusText}`,
              details: {
                response: retrieveResponseText.substring(0, 500)
              }
            })
          }
        } catch (error: any) {
          results.tests.push({
            name: 'Retrieve Record',
            status: 'FAILED',
            error: error.message
          })
        }
      } else {
        results.tests.push({
          name: 'Create Record (Write)',
          status: 'FAILED',
          error: 'Response missing record ID',
          details: {
            response: createData
          }
        })
      }
    } else {
      let errorDetails = createResponseText
      try {
        const errorData = JSON.parse(createResponseText)
        errorDetails = errorData
      } catch {
        // Not JSON, use as-is
      }

      results.tests.push({
        name: 'Create Record (Write)',
        status: 'FAILED',
        error: `HTTP ${createResponse.status}: ${createResponse.statusText}`,
        details: {
          response: errorDetails,
          troubleshooting: createResponse.status === 403 ? {
            message: '403 Forbidden usually means:',
            steps: [
              '1. API token doesn\'t have write access to the base',
              '2. Table ID/name is incorrect',
              '3. Field names don\'t match exactly (case-sensitive)',
              '4. Go to Airtable > Help > API documentation to verify permissions'
            ]
          } : null
        }
      })
    }
  } catch (error: any) {
    results.tests.push({
      name: 'Create Record (Write)',
      status: 'FAILED',
      error: error.message,
      details: {
        stack: error.stack?.substring(0, 500)
      }
    })
  }

  // Summary
  const passedTests = results.tests.filter((t: any) => t.status === 'PASSED').length
  const totalTests = results.tests.length
  results.summary = {
    passed: passedTests,
    total: totalTests,
    allPassed: passedTests === totalTests
  }

  console.log('✅ Test complete:', results.summary)

  return NextResponse.json(results, {
    status: results.summary.allPassed ? 200 : 400
  })
}

