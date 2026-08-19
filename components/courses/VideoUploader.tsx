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

      const { tusEndpoint, libraryId, videoId, signature, expiration, aguardandoAprovacao } =
        await res.json()

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
      // Troca de vídeo em curso já vendido não entra no ar sozinha (decisão 3.4).
      toast.success(
        aguardandoAprovacao
          ? 'Vídeo enviado e mandado para aprovação do admin. O vídeo atual continua no ar até a resposta.'
          : 'Vídeo enviado! O processamento pode levar alguns minutos.'
      )
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
      <div className="flex items-center gap-2 text-emerald-600 text-sm">
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
          <div className="flex items-center gap-2 text-sm text-tinta-suave">
            <Loader2 className="h-4 w-4 animate-spin" />
            Enviando... {progress}%
          </div>
          <div className="w-full bg-cobalto/15 rounded-sm h-2">
            <div
              className="bg-brasa h-2 rounded-sm transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex items-center gap-2 px-3 py-2 border border-cobalto/20 rounded-md text-sm text-tinta bg-white hover:bg-cal-fundo transition-colors"
        >
          <Upload className="h-4 w-4" />
          Selecionar vídeo
        </button>
      )}

      <p className="text-xs text-tinta-suave/70 mt-1">MP4, MOV ou AVI. Sem limite de tamanho.</p>
    </div>
  )
}
