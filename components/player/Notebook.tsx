'use client'

import { useEffect, useRef, useState } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { createClient } from '@/lib/supabase/client'
import { BookOpen, Loader2 } from 'lucide-react'

interface NotebookProps {
  courseId: string
  studentId: string
  initialContent?: any
}

export function Notebook({ courseId, studentId, initialContent }: NotebookProps) {
  const [saving, setSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [erro, setErro] = useState(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const editor = useEditor({
    // A página é renderizada no servidor antes de hidratar. Sem isso o Tiptap
    // v3 aborta com "SSR has been detected" — ele precisa saber que a primeira
    // renderização não deve montar o editor.
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: 'Suas anotações sobre este curso...' }),
    ],
    content: initialContent ?? '',
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[200px] p-4',
      },
    },
    onUpdate: ({ editor }) => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(() => saveContent(editor.getJSON()), 1500)
    },
  })

  async function saveContent(content: any) {
    setSaving(true)
    const supabase = createClient()
    const { error } = await supabase.from('notebooks').upsert(
      { student_id: studentId, course_id: courseId, content },
      { onConflict: 'student_id,course_id' }
    )
    setSaving(false)

    // Anotação perdida em silêncio é pior que anotação não salva: sem checar
    // o erro, a UI dizia "Salvo às HH:MM" mesmo com o upsert falhando.
    if (error) {
      setErro(true)
      return
    }
    setErro(false)
    setLastSaved(new Date())
  }

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
    }
  }, [])

  return (
    <div className="bg-white rounded-md border border-cobalto/15">
      <div className="flex items-center justify-between px-4 py-3 border-b border-cobalto/10">
        <div className="flex items-center gap-2 text-sm font-medium text-tinta">
          <BookOpen className="h-4 w-4 text-brasa-escura" />
          Caderno
        </div>
        <span className={`text-xs ${erro ? 'font-semibold text-red-700' : 'text-tinta-suave/70'}`}>
          {saving ? (
            <span className="flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" /> Salvando...
            </span>
          ) : erro ? (
            'Não foi possível salvar — não feche a página'
          ) : lastSaved ? (
            `Salvo às ${lastSaved.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
          ) : (
            'Autosave ativo'
          )}
        </span>
      </div>
      <EditorContent editor={editor} />
    </div>
  )
}
