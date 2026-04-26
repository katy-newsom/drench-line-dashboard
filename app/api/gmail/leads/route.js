import { NextResponse } from 'next/server'
import { google } from 'googleapis'

const INBOX_EMAIL = 'connerandkaty@gmail.com'

const SPONSOR_KEYWORDS = ['sponsor', 'advertise', 'partnership']
const LISTENER_KEYWORDS = ['question', "q&a", 'listener']

function matchesKeywords(subject, keywords) {
  const lower = (subject || '').toLowerCase()
  return keywords.some(k => lower.includes(k))
}

function getSnippet(body, lines = 3) {
  if (!body) return ''
  try {
    const decoded = Buffer.from(body, 'base64').toString('utf-8')
    return decoded.split('\n').filter(l => l.trim()).slice(0, lines).join('\n')
  } catch {
    return ''
  }
}

function parseMessage(msg) {
  const headers = msg.payload?.headers ?? []
  const get = name => headers.find(h => h.name.toLowerCase() === name.toLowerCase())?.value ?? ''

  const subject = get('Subject')
  const from = get('From')
  const date = get('Date')

  let bodyData = ''
  const parts = msg.payload?.parts ?? []
  if (parts.length > 0) {
    const textPart = parts.find(p => p.mimeType === 'text/plain')
    bodyData = textPart?.body?.data ?? parts[0]?.body?.data ?? ''
  } else {
    bodyData = msg.payload?.body?.data ?? ''
  }

  return {
    id: msg.id,
    subject,
    from,
    date,
    snippet: getSnippet(bodyData),
  }
}

async function getGmailClient() {
  const auth = new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET
  )
  auth.setCredentials({ refresh_token: process.env.GMAIL_REFRESH_TOKEN })
  return google.gmail({ version: 'v1', auth })
}

export async function GET() {
  if (!process.env.GMAIL_CLIENT_ID || !process.env.GMAIL_CLIENT_SECRET || !process.env.GMAIL_REFRESH_TOKEN) {
    return NextResponse.json({ error: 'Gmail credentials not configured' }, { status: 503 })
  }

  try {
    const gmail = await getGmailClient()

    const listRes = await gmail.users.messages.list({
      userId: INBOX_EMAIL,
      maxResults: 50,
      q: 'in:inbox',
    })

    const messages = listRes.data.messages ?? []
    if (messages.length === 0) {
      return NextResponse.json({ sponsors: [], listeners: [] })
    }

    const details = await Promise.all(
      messages.map(m =>
        gmail.users.messages.get({ userId: INBOX_EMAIL, id: m.id, format: 'full' }).then(r => r.data)
      )
    )

    const parsed = details.map(parseMessage)

    const sponsors = parsed.filter(m => matchesKeywords(m.subject, SPONSOR_KEYWORDS))
    const listeners = parsed.filter(m => matchesKeywords(m.subject, LISTENER_KEYWORDS))

    return NextResponse.json({ sponsors, listeners })
  } catch (err) {
    console.error('GET /api/gmail/leads', err)
    return NextResponse.json({ error: 'Unable to load — check Gmail connection' }, { status: 500 })
  }
}
