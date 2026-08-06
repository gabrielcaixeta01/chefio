'use client'

import { useState, useRef } from 'react'
import { toast } from 'sonner'
import { Upload as tus } from 'tus-js-client'
import { Upload, CheckCircle, Loader2 } from 'lucide-react'

interface VideoUploaderProps {
  lessonId: string
  onUploaded?: () => void
}

export function VideoUploader({ lessonId, onUploaded }: VideoUploaderProps) {
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [done, setDone] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('video/')) {
      toast.error('Selecione um arquivo de vídeo.')
      return
    }

    setUploading(true)
    setProgress(0)
    setDone(false)

    try {
      // 1. Solicitar credenciais de upload assinadas ao nosso servidor
      // (a AccessKey do Bunny nunca sai do servidor — só a assinatura TUS)
      const res = await fetch('/api/bunny/upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lessonId, fileName: file.name }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Erro ao obter URL de upload')
      }

      const { tusEndpoint, libraryId, videoId, signature, expiration } = await res.json()

      // 2. Upload resumível direto para o Bunny via protocolo TUS
      await new Promise<void>((resolve, reject) => {
        const upload = new tus(file, {
          endpoint: tusEndpoint,
          retryDelays: [0, 3000, 5000, 10000, 20000],
          headers: {
            AuthorizationSignature: signature,
            AuthorizationExpire: String(expiration),
            VideoId: videoId,
            LibraryId: String(libraryId),
          },
          metadata: {
            filetype: file.type,
            title: file.name,
          },
          onError: (error) => reject(error),
          onProgress: (bytesUploaded, bytesTotal) => {
            setProgress(Math.round((bytesUploaded / bytesTotal) * 100))
          },
          onSuccess: () => resolve(),
        })
        upload.start()
      })

      setDone(true)
      toast.success('Vídeo enviado! O processamento pode levar alguns minutos.')
      onUploaded?.()
    } catch (err: any) {
      toast.error(err.message ?? 'Erro no upload do vídeo.')
    } finally {
      setUploading(false)
      setProgress(0)
    }
  }

  if (done) {
    return (
      <div className="flex items-center gap-2 text-green-600 text-sm">
        <CheckCircle className="h-4 w-4" />
        Vídeo enviado com sucesso. Processamento em andamento...
      </div>
    )
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={handleFileChange}
        disabled={uploading}
      />

      {uploading ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Loader2 className="h-4 w-4 animate-spin" />
            Enviando... {progress}%
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-orange-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-700 bg-white hover:bg-gray-50 transition-colors"
        >
          <Upload className="h-4 w-4" />
          Selecionar vídeo
        </button>
      )}

      <p className="text-xs text-gray-400 mt-1">MP4, MOV ou AVI. Sem limite de tamanho.</p>
    </div>
  )
}
