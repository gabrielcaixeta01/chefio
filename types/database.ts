// Tipos de domínio reutilizáveis
export type Role = 'owner' | 'admin' | 'teacher' | 'student'
export type CourseStatus = 'draft' | 'pending_review' | 'approved' | 'rejected'
export type TeacherStatus = 'pending' | 'active' | 'suspended'
export type OrderStatus = 'pending' | 'paid' | 'shipped' | 'delivered'
export type PayoutStatus = 'pending' | 'paid' | 'failed'
/** `refund_clawback` é a linha negativa que desconta um reembolso do próximo repasse (regra 2.2). */
export type PayoutType = 'sale' | 'refund_clawback'
/** `chargeback` é contestação no cartão: tira o acesso, mas quem arca é a plataforma (regra 2.4). */
export type RefundStatus = 'none' | 'requested' | 'refunded' | 'rejected' | 'chargeback'
/** Mudança em aula de curso já vendido: só entra com aval do admin (regra 3.4). */
export type LessonChangeType = 'remove' | 'replace_video'
export type LessonChangeStatus = 'pending' | 'approved' | 'rejected'

// Tipos de linha (Row) por tabela
export type Profile = Database['public']['Tables']['profiles']['Row']
export type TeacherProfile = Database['public']['Tables']['teacher_profiles']['Row']
export type Course = Database['public']['Tables']['courses']['Row']
export type Lesson = Database['public']['Tables']['lessons']['Row']
export type LessonAttachment = Database['public']['Tables']['lesson_attachments']['Row']
export type Product = Database['public']['Tables']['products']['Row']
export type LessonProduct = Database['public']['Tables']['lesson_products']['Row']
export type Enrollment = Database['public']['Tables']['enrollments']['Row']
export type LessonProgress = Database['public']['Tables']['lesson_progress']['Row']
export type Notebook = Database['public']['Tables']['notebooks']['Row']
export type Order = Database['public']['Tables']['orders']['Row']
export type OrderItem = Database['public']['Tables']['order_items']['Row']
export type TeacherPayout = Database['public']['Tables']['teacher_payouts']['Row']
export type Coupon = Database['public']['Tables']['coupons']['Row']
export type LessonChangeRequest = Database['public']['Tables']['lesson_change_requests']['Row']
export type ActiveSession = Database['public']['Tables']['active_sessions']['Row']
export type Document = Database['public']['Tables']['documents']['Row']

// CourseWithTeacher, LessonWithProducts e EnrollmentWithCourse viviam aqui e
// foram removidos na revisão de 10/08/2026: zero importações no projeto, e o
// primeiro descrevia um join (`teacher.teacher_profile`) que o PostgREST nem
// resolve — não existe FK entre courses e teacher_profiles. As páginas que
// fazem join continuam com `as any`; substituir isso por tipos de verdade é
// item de ⚪ Qualidade no MELHORIAS.md, não se resolve declarando shapes que
// ninguém usa.

// Formato esperado pelo @supabase/supabase-js
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          name: string
          role: string
          avatar_url: string | null
          created_at: string
        }
        Insert: {
          id: string
          name: string
          role?: string
          avatar_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          role?: string
          avatar_url?: string | null
          created_at?: string
        }
        Relationships: []
      }
      teacher_profiles: {
        Row: {
          id: string
          user_id: string
          bio: string | null
          stripe_account_id: string | null
          commission_rate: number
          status: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          bio?: string | null
          stripe_account_id?: string | null
          commission_rate?: number
          status?: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          bio?: string | null
          stripe_account_id?: string | null
          commission_rate?: number
          status?: string
          created_at?: string
        }
        Relationships: [{ foreignKeyName: 'teacher_profiles_user_id_fkey'; columns: ['user_id']; referencedRelation: 'profiles'; referencedColumns: ['id'] }]
      }
      courses: {
        Row: {
          id: string
          teacher_id: string
          title: string
          slug: string
          description: string | null
          thumbnail_url: string | null
          price: number
          category: string | null
          status: string
          rejection_reason: string | null
          archived_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          teacher_id: string
          title: string
          slug: string
          description?: string | null
          thumbnail_url?: string | null
          price?: number
          category?: string | null
          status?: string
          rejection_reason?: string | null
          archived_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          teacher_id?: string
          title?: string
          slug?: string
          description?: string | null
          thumbnail_url?: string | null
          price?: number
          category?: string | null
          status?: string
          rejection_reason?: string | null
          archived_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [{ foreignKeyName: 'courses_teacher_id_fkey'; columns: ['teacher_id']; referencedRelation: 'profiles'; referencedColumns: ['id'] }]
      }
      lessons: {
        Row: {
          id: string
          course_id: string
          title: string
          description: string | null
          bunny_video_id: string | null
          bunny_video_url: string | null
          duration_seconds: number | null
          order_index: number
          is_free_preview: boolean
          created_at: string
        }
        Insert: {
          id?: string
          course_id: string
          title: string
          description?: string | null
          bunny_video_id?: string | null
          bunny_video_url?: string | null
          duration_seconds?: number | null
          order_index?: number
          is_free_preview?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          course_id?: string
          title?: string
          description?: string | null
          bunny_video_id?: string | null
          bunny_video_url?: string | null
          duration_seconds?: number | null
          order_index?: number
          is_free_preview?: boolean
          created_at?: string
        }
        Relationships: [{ foreignKeyName: 'lessons_course_id_fkey'; columns: ['course_id']; referencedRelation: 'courses'; referencedColumns: ['id'] }]
      }
      lesson_attachments: {
        Row: { id: string; lesson_id: string; name: string; file_url: string; created_at: string }
        Insert: { id?: string; lesson_id: string; name: string; file_url: string; created_at?: string }
        Update: { id?: string; lesson_id?: string; name?: string; file_url?: string; created_at?: string }
        Relationships: []
      }
      products: {
        Row: { id: string; name: string; description: string | null; price: number; image_url: string | null; stock: number; is_active: boolean; created_at: string }
        Insert: { id?: string; name: string; description?: string | null; price: number; image_url?: string | null; stock?: number; is_active?: boolean; created_at?: string }
        Update: { id?: string; name?: string; description?: string | null; price?: number; image_url?: string | null; stock?: number; is_active?: boolean; created_at?: string }
        Relationships: []
      }
      lesson_products: {
        Row: { lesson_id: string; product_id: string }
        Insert: { lesson_id: string; product_id: string }
        Update: { lesson_id?: string; product_id?: string }
        Relationships: []
      }
      enrollments: {
        Row: { id: string; student_id: string; course_id: string; stripe_payment_intent_id: string | null; amount_paid: number; created_at: string; refund_status: RefundStatus; refund_requested_at: string | null; refunded_at: string | null; refund_amount: number | null; refund_reason: string | null; refund_review_note: string | null; refunded_by: string | null; coupon_id: string | null; discount_amount: number }
        Insert: { id?: string; student_id: string; course_id: string; stripe_payment_intent_id?: string | null; amount_paid?: number; created_at?: string; refund_status?: RefundStatus; refund_requested_at?: string | null; refunded_at?: string | null; refund_amount?: number | null; refund_reason?: string | null; refund_review_note?: string | null; refunded_by?: string | null; coupon_id?: string | null; discount_amount?: number }
        Update: { id?: string; student_id?: string; course_id?: string; stripe_payment_intent_id?: string | null; amount_paid?: number; created_at?: string; refund_status?: RefundStatus; refund_requested_at?: string | null; refunded_at?: string | null; refund_amount?: number | null; refund_reason?: string | null; refund_review_note?: string | null; refunded_by?: string | null; coupon_id?: string | null; discount_amount?: number }
        Relationships: []
      }
      lesson_progress: {
        Row: { student_id: string; lesson_id: string; completed_at: string | null; last_watched_seconds: number }
        Insert: { student_id: string; lesson_id: string; completed_at?: string | null; last_watched_seconds?: number }
        Update: { student_id?: string; lesson_id?: string; completed_at?: string | null; last_watched_seconds?: number }
        Relationships: []
      }
      notebooks: {
        Row: { id: string; student_id: string; course_id: string; content: Record<string, unknown> | null; updated_at: string }
        Insert: { id?: string; student_id: string; course_id: string; content?: Record<string, unknown> | null; updated_at?: string }
        Update: { id?: string; student_id?: string; course_id?: string; content?: Record<string, unknown> | null; updated_at?: string }
        Relationships: []
      }
      orders: {
        Row: { id: string; student_id: string; status: string; total: number; stripe_payment_intent_id: string | null; created_at: string }
        Insert: { id?: string; student_id: string; status?: string; total: number; stripe_payment_intent_id?: string | null; created_at?: string }
        Update: { id?: string; student_id?: string; status?: string; total?: number; stripe_payment_intent_id?: string | null; created_at?: string }
        Relationships: []
      }
      order_items: {
        Row: { id: string; order_id: string; product_id: string; quantity: number; unit_price: number }
        Insert: { id?: string; order_id: string; product_id: string; quantity: number; unit_price: number }
        Update: { id?: string; order_id?: string; product_id?: string; quantity?: number; unit_price?: number }
        Relationships: []
      }
      teacher_payouts: {
        Row: { id: string; teacher_id: string; amount: number; status: string; stripe_transfer_id: string | null; period_start: string | null; period_end: string | null; created_at: string; type: PayoutType; enrollment_id: string | null }
        Insert: { id?: string; teacher_id: string; amount: number; status?: string; stripe_transfer_id?: string | null; period_start?: string | null; period_end?: string | null; created_at?: string; type?: PayoutType; enrollment_id?: string | null }
        Update: { id?: string; teacher_id?: string; amount?: number; status?: string; stripe_transfer_id?: string | null; period_start?: string | null; period_end?: string | null; created_at?: string; type?: PayoutType; enrollment_id?: string | null }
        Relationships: []
      }
      coupons: {
        Row: { id: string; code: string; discount_percent: number; course_id: string | null; max_redemptions: number | null; redemptions: number; expires_at: string | null; active: boolean; created_by: string | null; created_at: string }
        Insert: { id?: string; code: string; discount_percent: number; course_id?: string | null; max_redemptions?: number | null; redemptions?: number; expires_at?: string | null; active?: boolean; created_by?: string | null; created_at?: string }
        Update: { id?: string; code?: string; discount_percent?: number; course_id?: string | null; max_redemptions?: number | null; redemptions?: number; expires_at?: string | null; active?: boolean; created_by?: string | null; created_at?: string }
        Relationships: []
      }
      lesson_change_requests: {
        Row: { id: string; lesson_id: string | null; lesson_title: string; course_id: string; teacher_id: string; type: LessonChangeType; new_bunny_video_id: string | null; reason: string | null; status: LessonChangeStatus; review_note: string | null; reviewed_by: string | null; reviewed_at: string | null; created_at: string }
        Insert: { id?: string; lesson_id?: string | null; lesson_title: string; course_id: string; teacher_id: string; type: LessonChangeType; new_bunny_video_id?: string | null; reason?: string | null; status?: LessonChangeStatus; review_note?: string | null; reviewed_by?: string | null; reviewed_at?: string | null; created_at?: string }
        Update: { id?: string; lesson_id?: string | null; lesson_title?: string; course_id?: string; teacher_id?: string; type?: LessonChangeType; new_bunny_video_id?: string | null; reason?: string | null; status?: LessonChangeStatus; review_note?: string | null; reviewed_by?: string | null; reviewed_at?: string | null; created_at?: string }
        Relationships: []
      }
      active_sessions: {
        Row: { session_id: string; user_id: string; user_agent: string | null; revoked_at: string | null; created_at: string; last_seen_at: string }
        Insert: { session_id: string; user_id: string; user_agent?: string | null; revoked_at?: string | null; created_at?: string; last_seen_at?: string }
        Update: { session_id?: string; user_id?: string; user_agent?: string | null; revoked_at?: string | null; created_at?: string; last_seen_at?: string }
        Relationships: []
      }
      documents: {
        Row: { id: string; teacher_id: string; name: string; file_url: string; file_type: string | null; created_at: string }
        Insert: { id?: string; teacher_id: string; name: string; file_url: string; file_type?: string | null; created_at?: string }
        Update: { id?: string; teacher_id?: string; name?: string; file_url?: string; file_type?: string | null; created_at?: string }
        Relationships: []
      }
    }
    Views: {
      teacher_profiles_public: {
        Row: { user_id: string; bio: string | null }
        Relationships: []
      }
    }
    Functions: {
      get_my_role: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      create_product_order: {
        Args: {
          p_student_id: string
          p_stripe_payment_intent_id: string | null
          p_items: { product_id: string; quantity: number }[]
        }
        Returns: string
      }
      get_admin_dashboard_stats: {
        Args: Record<PropertyKey, never>
        Returns: {
          total_courses: number
          pending_courses: number
          total_teachers: number
          total_students: number
          total_revenue: number
        }[]
      }
      get_admin_financial_totals: {
        Args: Record<PropertyKey, never>
        Returns: { total_gross: number; total_payouts: number; total_sales: number }[]
      }
      get_admin_monthly_revenue: {
        Args: { months_back?: number }
        Returns: { month: string; total: number }[]
      }
      get_my_teacher_revenue_by_course: {
        Args: Record<PropertyKey, never>
        Returns: { course_id: string; title: string; sale_count: number; gross: number }[]
      }
      request_refund: {
        Args: { p_enrollment_id: string; p_reason: string }
        Returns: undefined
      }
      process_refund: {
        Args: { p_enrollment_id: string; p_amount: number; p_clawback?: boolean; p_status?: RefundStatus }
        Returns: undefined
      }
      redeem_coupon: {
        Args: { p_coupon_id: string }
        Returns: undefined
      }
      curso_tem_aluno: {
        Args: { p_course_id: string }
        Returns: boolean
      }
      touch_session: {
        Args: { p_session_id: string; p_user_agent?: string | null }
        Returns: boolean
      }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
