import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@supabase/supabase-js'
import { timingSafeEqual } from 'crypto'

function isAuthorized(req: NextRequest): boolean {
  const expected = process.env.BUNNY_WEBHOOK_SECRET
  if (!expected) return false

  const provided = req.headers.get('x-webhook-secret') ?? req.nextUrl.searchParams.get('secret') ?? ''
  const expectedBuf = Buffer.from(expected)
  const providedBuf = Buffer.from(provided)
  if (expectedBuf.length !== providedBuf.length) return false
  return timingSafeEqual(expectedBuf, providedBuf)
}

// Bunny.net sends a webhook when video encoding completes.
// A URL configurada no painel do Bunny deve incluir ?secret=<BUNNY_WEBHOOK_SECRET>.
export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ ok: false }, { status: 401 })
  }

  const body = await req.json()

  // Bunny webhook payload includes VideoGuid and Status
  const { VideoGuid, Status, Length } = body

  if (!VideoGuid) return NextResponse.json({ ok: false }, { status: 400 })

  // Status 4 = finished encoding
  if (Status !== 4) return NextResponse.json({ ok: true })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const libraryId = process.env.BUNNY_STREAM_LIBRARY_ID
  const apiKey = process.env.BUNNY_STREAM_API_KEY
  const cdnHostname = process.env.BUNNY_STREAM_CDN_HOSTNAME

  // Build video URL
  const videoUrl = cdnHostname
    ? `https://${cdnHostname}/${libraryId}/${VideoGuid}/play`
    : null

  await supabase
    .from('lessons')
    .update({
      bunny_video_url: videoUrl,
      duration_seconds: Length ?? null,
    })
    .eq('bunny_video_id', VideoGuid)

  return NextResponse.json({ ok: true })
}
