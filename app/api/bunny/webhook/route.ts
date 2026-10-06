import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@supabase/supabase-js'
import { timingSafeEqual } from 'crypto'
import { urlDoVideo } from '@/lib/bunny'

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

  // 4 = codificação concluída; 5 = erro de codificação; 6 = envio falhou.
  // Os demais (processando, transcodificando, legendas) não mudam nada para a
  // aula: quem consulta o andamento é a rota de status.
  if (Status !== 4 && Status !== 5 && Status !== 6) return NextResponse.json({ ok: true })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  if (Status !== 4) {
    await supabase
      .from('lessons')
      .update({ video_status: 'failed' })
      .eq('bunny_video_id', VideoGuid)
    return NextResponse.json({ ok: true })
  }

  await supabase
    .from('lessons')
    .update({
      video_status: 'ready',
      bunny_video_url: urlDoVideo(VideoGuid),
      duration_seconds: Length ? Math.round(Length) : null,
    })
    .eq('bunny_video_id', VideoGuid)

  return NextResponse.json({ ok: true })
}
