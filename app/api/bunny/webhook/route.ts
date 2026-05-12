import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@supabase/supabase-js'

// Bunny.net sends a webhook when video encoding completes
export async function POST(req: NextRequest) {
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
