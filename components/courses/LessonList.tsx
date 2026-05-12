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
import type { Lesson } from '@/types/database'
import { LessonForm } from './LessonForm'
import { Button } from '@/components/ui/button'
import { GripVertical, Plus, Pencil, Trash2, Lock, Eye, Video } from 'lucide-react'
import { formatDuration } from '@/lib/utils'

interface LessonListProps {
  courseId: string
  lessons: Lesson[]
}

function SortableLesson({
  lesson,
  onEdit,
  onDelete,
}: {
  lesson: Lesson
  onEdit: (lesson: Lesson) => void
  onDelete: (id: string) => void
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
      className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg group"
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab text-gray-300 hover:text-gray-500 touch-none"
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-900 truncate">{lesson.title}</span>
          {lesson.is_free_preview && (
            <span className="inline-flex items-center gap-1 text-xs text-green-600 bg-green-50 px-1.5 py-0.5 rounded">
              <Eye className="h-3 w-3" />
              Preview
            </span>
          )}
          {!lesson.is_free_preview && (
            <span className="inline-flex items-center gap-1 text-xs text-gray-400">
              <Lock className="h-3 w-3" />
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          {lesson.bunny_video_id ? (
            <span className="inline-flex items-center gap-1 text-xs text-blue-600">
              <Video className="h-3 w-3" />
              {lesson.duration_seconds ? formatDuration(lesson.duration_seconds) : 'Vídeo enviado'}
            </span>
          ) : (
            <span className="text-xs text-gray-400">Sem vídeo</span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => onEdit(lesson)}
          className="p-1.5 text-gray-400 hover:text-gray-700 rounded"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => onDelete(lesson.id)}
          className="p-1.5 text-gray-400 hover:text-red-600 rounded"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}

export function LessonList({ courseId, lessons: initialLessons }: LessonListProps) {
  const [lessons, setLessons] = useState<Lesson[]>(initialLessons)
  const [showForm, setShowForm] = useState(false)
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null)

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

  async function handleDelete(id: string) {
    if (!confirm('Tem certeza que deseja excluir esta aula?')) return
    const supabase = createClient()
    const { error } = await supabase.from('lessons').delete().eq('id', id)
    if (error) {
      toast.error('Erro ao excluir aula.')
    } else {
      setLessons((prev) => prev.filter((l) => l.id !== id))
      toast.success('Aula excluída.')
    }
  }

  function handleEdit(lesson: Lesson) {
    setEditingLesson(lesson)
    setShowForm(true)
  }

  function handleFormClose() {
    setShowForm(false)
    setEditingLesson(null)
  }

  function handleLessonSaved(lesson: Lesson) {
    setLessons((prev) => {
      const exists = prev.find((l) => l.id === lesson.id)
      if (exists) return prev.map((l) => (l.id === lesson.id ? lesson : l))
      return [...prev, lesson]
    })
    handleFormClose()
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
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
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
          className="w-full flex items-center justify-center gap-2 p-3 border-2 border-dashed border-gray-200 rounded-lg text-sm text-gray-500 hover:border-orange-300 hover:text-orange-600 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Adicionar aula
        </button>
      )}
    </div>
  )
}
