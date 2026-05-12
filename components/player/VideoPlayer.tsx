'use client'

import { useEffect, useState } from 'react'
import { Loader2, AlertCircle } from 'lucide-react'

interface VideoPlayerProps {
  lessonId: string
  onEnded?: () => void
}

export function VideoPlayer({ lessonId, onEnded }: VideoPlayerProps) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/bunny/signed-url?lessonId=${lessonId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.signedUrl) setSignedUrl(data.signedUrl)
        else setError(data.error ?? 'Erro ao carregar vídeo')
      })
      .catch(() => setError('Erro ao carregar vídeo'))
  }, [lessonId])

  if (error) {
    return (
      <div className="aspect-video bg-gray-900 rounded-xl flex items-center justify-center">
        <div className="text-center text-white">
          <AlertCircle className="h-10 w-10 mx-auto mb-2 text-red-400" />
          <p className="text-sm text-gray-300">{error}</p>
        </div>
      </div>
    )
  }

  if (!signedUrl) {
    return (
      <div className="aspect-video bg-gray-900 rounded-xl flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-white animate-spin" />
      </div>
    )
  }

  return (
    <div className="aspect-video rounded-xl overflow-hidden bg-black">
      <iframe
        src={signedUrl}
        className="w-full h-full"
        allowFullScreen
        allow="autoplay; encrypted-media"
        onLoad={() => {
          // Bunny player posts messages — listen for video end
          const handler = (e: MessageEvent) => {
            if (e.data?.event === 'ended') onEnded?.()
          }
          window.addEventListener('message', handler)
          return () => window.removeEventListener('message', handler)
        }}
      />
    </div>
  )
}
