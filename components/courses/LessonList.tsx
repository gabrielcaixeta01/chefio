'use client'

import { useState } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import type { Lesson, LessonChangeRequest } from '@/types/database'
import { LessonForm } from './LessonForm'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Notice } from '@/components/ui/notice'
import { GripVertical, Plus, Pencil, Trash2, Lock, Eye, Video, Clock } from 'lucide-react'
import { formatDuration } from '@/lib/utils'

interface LessonListProps {
  courseId: string
  lessons: Lesson[]
  /**
   * Curso já vendido: remover aula e trocar vídeo passam a depender do admin
   * (decisão 3.4). O banco recusa direto — isto aqui só evita que a pessoa
   * descubra a regra por uma mensagem de erro.
   */
  temAlunos?: boolean
  pedidosPendentes?: Pick<LessonChangeRequest, 'id' | 'lesson_id' | 'type'>[]
}

function SortableLesson({
  lesson,
  onEdit,
  onDelete,
  pedidoPendente,
}: {
  lesson: Lesson
  onEdit: (lesson: Lesson) => void
  onDelete: (lesson: Lesson) => void
  pedidoPendente?: 'remove' | 'replace_video'
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: lesson.id })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 p-3 bg-cal border border-cobalto/15 rounded-sm group"
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab text-cobalto/25 hover:text-tinta-suave touch-none"
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-tinta truncate">{lesson.title}</span>
          {lesson.is_free_preview && (
            <span className="inline-flex items-center gap-1 text-xs text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
              <Eye className="h-3 w-3" />
              Preview
            </span>
          )}
          {!lesson.is_free_preview && (
            <span className="inline-flex items-center gap-1 text-xs text-tinta-suave/70">
              <Lock className="h-3 w-3" />
            </span>
          )}
          {pedidoPendente && (
            <span className="inline-flex items-center gap-1 rounded bg-amber-50 px-1.5 py-0.5 text-xs text-amber-700">
              <Clock className="h-3 w-3" />
              {pedidoPendente === 'remove' ? 'Remoção em análise' : 'Vídeo novo em análise'}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          {lesson.bunny_video_id ? (
            <span className="inline-flex items-center gap-1 text-xs text-cobalto">
              <Video className="h-3 w-3" />
              {lesson.duration_seconds ? formatDuration(lesson.duration_seconds) : 'Vídeo enviado'}
            </span>
          ) : (
            <span className="text-xs text-tinta-suave/70">Sem vídeo</span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => onEdit(lesson)}
          className="p-1.5 text-tinta-suave/70 hover:text-tinta rounded"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => onDelete(lesson)}
          disabled={pedidoPendente === 'remove'}
          className="p-1.5 text-tinta-suave/70 hover:text-red-600 rounded disabled:opacity-40"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}

export function LessonList({
  courseId,
  lessons: initialLessons,
  temAlunos = false,
  pedidosPendentes = [],
}: LessonListProps) {
  const [lessons, setLessons] = useState<Lesson[]>(initialLessons)
  const [showForm, setShowForm] = useState(false)
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null)
  const [pedindoRemocao, setPedindoRemocao] = useState<Lesson | null>(null)
  const [motivo, setMotivo] = useState('')
  const [enviandoPedido, setEnviandoPedido] = useState(false)
  const [pedidos, setPedidos] = useState(pedidosPendentes)

  const tipoPendentePorAula = new Map(pedidos.map((p) => [p.lesson_id, p.type]))

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = lessons.findIndex((l) => l.id === active.id)
    const newIndex = lessons.findIndex((l) => l.id === over.id)
    const reordered = arrayMove(lessons, oldIndex, newIndex)
    setLessons(reordered)

    const supabase = createClient()
    await Promise.all(
      reordered.map((lesson, index) =>
        supabase.from('lessons').update({ order_index: index + 1 }).eq('id', lesson.id)
      )
    )
  }

  async function handleDelete(lesson: Lesson) {
    // Curso já vendido: a aula não sai daqui, sai da fila do admin (3.4).
    if (temAlunos) {
      setMotivo('')
      setPedindoRemocao(lesson)
      return
    }

    if (!confirm('Tem certeza que deseja excluir esta aula?')) return
    const supabase = createClient()
    const { error } = await supabase.from('lessons').delete().eq('id', lesson.id)
    if (error) {
      toast.error('Erro ao excluir aula.')
    } else {
      setLessons((prev) => prev.filter((l) => l.id !== lesson.id))
      toast.success('Aula excluída.')
    }
  }

  async function enviarPedidoRemocao() {
    if (!pedindoRemocao) return
    setEnviandoPedido(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const { data, error } = await supabase
      .from('lesson_change_requests')
      .insert({
        lesson_id: pedindoRemocao.id,
        lesson_title: pedindoRemocao.title,
        course_id: courseId,
        teacher_id: user!.id,
        type: 'remove',
        reason: motivo.trim() || null,
      })
      .select('id, lesson_id, type')
      .single()

    if (error) {
      // 23505 = já existe pedido em aberto para esta aula (índice parcial).
      toast.error(
        error.code === '23505'
          ? 'Já existe um pedido em análise para esta aula.'
          : 'Não foi possível enviar o pedido.'
      )
    } else {
      setPedidos((prev) => [...prev, data])
      toast.success('Pedido enviado. O admin vai avaliar a remoção.')
      setPedindoRemocao(null)
    }
    setEnviandoPedido(false)
  }

  function handleEdit(lesson: Lesson) {
    setEditingLesson(lesson)
    setShowForm(true)
  }

  function handleFormClose() {
    setShowForm(false)
    setEditingLesson(null)
  }

  function handleLessonSaved(lesson: Lesson, manterAberto: boolean) {
    setLessons((prev) => {
      const exists = prev.find((l) => l.id === lesson.id)
      if (exists) return prev.map((l) => (l.id === lesson.id ? lesson : l))
      return [...prev, lesson]
    })

    if (!manterAberto) {
      handleFormClose()
      return
    }

    // Aula recém-criada: mantém o formulário montado pro upload de vídeo e
    // passa pro modo de edição, senão um segundo submit criaria uma aula nova
    // em vez de atualizar a que acabou de nascer.
    setEditingLesson(lesson)
  }

  return (
    <div className="space-y-3">
      {lessons.length > 0 && (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={lessons.map((l) => l.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {lessons.map((lesson) => (
                <SortableLesson
                  key={lesson.id}
                  lesson={lesson}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  pedidoPendente={tipoPendentePorAula.get(lesson.id)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {pedindoRemocao && (
        <div className="rounded-md border border-amber-300 bg-amber-50/60 p-4">
          <p className="text-sm font-medium text-tinta">
            Pedir remoção de “{pedindoRemocao.title}”
          </p>
          <p className="mt-1 text-xs text-tinta-suave">
            Este curso já tem alunos. Tirar uma aula do ar apaga o progresso de quem já assistiu,
            então a remoção passa pelo admin. A aula continua no ar até a resposta.
          </p>
          <Textarea
            className="mt-3 bg-cal"
            rows={2}
            placeholder="Por que esta aula precisa sair? (opcional)"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
          />
          <div className="mt-3 flex gap-2">
            <Button size="sm" disabled={enviandoPedido} onClick={enviarPedidoRemocao}>
              {enviandoPedido ? 'Enviando…' : 'Enviar pedido'}
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={enviandoPedido}
              onClick={() => setPedindoRemocao(null)}
            >
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {temAlunos && lessons.length > 0 && (
        <Notice tipo="info">
          Curso com alunos matriculados: você edita título, descrição, ordem e adiciona aulas
          à vontade. Remover uma aula ou trocar o vídeo de uma já publicada depende de aprovação
          do admin.
        </Notice>
      )}

      {showForm ? (
        <LessonForm
          courseId={courseId}
          lesson={editingLesson ?? undefined}
          orderIndex={lessons.length + 1}
          onSaved={handleLessonSaved}
          onCancel={handleFormClose}
        />
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="w-full flex items-center justify-center gap-2 p-3 border-2 border-dashed border-cobalto/15 rounded-sm text-sm text-tinta-suave hover:border-brasa/50 hover:text-brasa-escura transition-colors"
        >
          <Plus className="h-4 w-4" />
          Adicionar aula
        </button>
      )}
    </div>
  )
}
