import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createHmac } from 'crypto'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const lessonId = req.nextUrl.searchParams.get('lessonId')
  if (!lessonId) return NextResponse.json({ error: 'Missing lessonId' }, { status: 400 })

  // Fetch lesson + course
  const { data: lesson } = await supabase
    .from('lessons')
    .select('id, bunny_video_id, is_free_preview, course_id, courses!inner(id, status)')
    .eq('id', lessonId)
    .single()

  if (!lesson || !lesson.bunny_video_id) {
    return NextResponse.json({ error: 'Lesson not found or no video' }, { status: 404 })
  }

  const course = (lesson as any).courses

  // Free preview: skip enrollment check
  if (!lesson.is_free_preview) {
    const { data: enrollment } = await supabase
      .from('enrollments')
      .select('id')
      .eq('student_id', user.id)
      .eq('course_id', lesson.course_id)
      .single()

    if (!enrollment) {
      // Check if user is the teacher
      const { data: courseOwner } = await supabase
        .from('courses')
        .select('teacher_id')
        .eq('id', lesson.course_id)
        .single()

      if (courseOwner?.teacher_id !== user.id) {
        return NextResponse.json({ error: 'Not enrolled' }, { status: 403 })
      }
    }
  }

  const libraryId = process.env.BUNNY_STREAM_LIBRARY_ID
  const tokenAuthKey = process.env.BUNNY_STREAM_TOKEN_AUTH_KEY
  const cdnHostname = process.env.BUNNY_STREAM_CDN_HOSTNAME

  if (!libraryId || !tokenAuthKey || !cdnHostname) {
    return NextResponse.json({ error: 'Bunny.net não configurado' }, { status: 503 })
  }

  // Generate signed URL (4h expiry)
  const videoId = lesson.bunny_video_id
  const expiresAt = Math.floor(Date.now() / 1000) + 4 * 3600
  const path = `/${libraryId}/${videoId}/play`
  const tokenRaw = `${tokenAuthKey}${path}${expiresAt}`
  const token = createHmac('sha256', tokenAuthKey)
    .update(`${tokenAuthKey}${path}${expiresAt}`)
    .digest('hex')

  const signedUrl = `https://${cdnHostname}${path}?token=${token}&expires=${expiresAt}`

  return NextResponse.json({ signedUrl })
}
