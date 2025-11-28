import { NextRequest, NextResponse } from 'next/server'

/**
 * POST - Send Slack DM to curator
 * Uses Slack Web API to send a direct message
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

    const slackBotToken = process.env.SLACK_BOT_TOKEN
    if (!slackBotToken) {
      console.warn('SLACK_BOT_TOKEN not configured, skipping Slack notification')
      return NextResponse.json({ 
        success: false, 
        message: 'Slack bot token not configured' 
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

    // First, open a DM conversation with the user
    const openDmResponse = await fetch('https://slack.com/api/conversations.open', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${slackBotToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        users: slack_id
      }),
    })

    const dmData = await openDmResponse.json()
    if (!dmData.ok || !dmData.channel?.id) {
      console.error('Failed to open DM:', dmData.error)
      let errorMessage = 'Failed to open Slack DM'
      let details = dmData.error
      
      if (dmData.error === 'missing_scope') {
        errorMessage = 'Slack bot is missing required permissions'
        details = 'The Slack bot token needs the "im:write" and "chat:write" scopes. Please add these scopes to your Slack app in the Slack API settings.'
      }
      
      return NextResponse.json(
        { error: errorMessage, details },
        { status: 500 }
      )
    }

    const channelId = dmData.channel.id

    // Send the message to the DM
    const message = {
      channel: channelId,
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
            text: `Hey! You've been randomly selected to curate the weekly playlist.\n\n*Curation Period:*\n• Starts: ${startDateFormatted}\n• Ends: ${endDateFormatted}\n\nYou'll have curator permissions starting now, and your curation period begins in 3 days.`
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

    const sendMessageResponse = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${slackBotToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    })

    const messageData = await sendMessageResponse.json()
    if (!messageData.ok) {
      console.error('Failed to send Slack message:', messageData.error)
      return NextResponse.json(
        { error: 'Failed to send Slack DM', details: messageData.error },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, channel: channelId })
  } catch (error: any) {
    console.error('Error sending Slack notification:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

