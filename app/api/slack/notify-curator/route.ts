import { NextRequest, NextResponse } from 'next/server'

/**
 * POST - Send Slack notification to curator
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { slack_id, curator_name, curation_url, start_date, end_date } = body

    if (!slack_id) {
      return NextResponse.json(
        { error: 'Slack ID is required' },
        { status: 400 }
      )
    }

    const slackWebhookUrl = process.env.SLACK_WEBHOOK_URL
    if (!slackWebhookUrl) {
      console.warn('SLACK_WEBHOOK_URL not configured, skipping Slack notification')
      return NextResponse.json({ 
        success: false, 
        message: 'Slack webhook not configured' 
      })
    }

    const startDateFormatted = new Date(start_date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })

    const endDateFormatted = new Date(end_date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })

    const message = {
      text: `🎵 Curator Assignment: ${curator_name}`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: `🎵 You've been selected as Curator!`,
            emoji: true
          }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `Hey <@${slack_id}>! You've been randomly selected to curate the weekly playlist.\n\n*Curation Period:*\n• Starts: ${startDateFormatted}\n• Ends: ${endDateFormatted}\n\nYou'll have curator permissions starting now, and your curation period begins in 3 days.`
          }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: 'Ready to start curating?'
          },
          accessory: {
            type: 'button',
            text: {
              type: 'plain_text',
              text: 'Open Curator Dashboard',
              emoji: true
            },
            url: curation_url,
            style: 'primary'
          }
        },
        {
          type: 'divider'
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: 'This assignment was made using our fair rotation system to ensure everyone gets a chance to curate.'
            }
          ]
        }
      ]
    }

    const response = await fetch(slackWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Slack API error:', errorText)
      return NextResponse.json(
        { error: 'Failed to send Slack notification', details: errorText },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error sending Slack notification:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

