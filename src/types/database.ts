export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      activity_log: {
        Row: {
          action: string
          created_at: string | null
          details: Json | null
          entity_id: string | null
          entity_name: string | null
          entity_type: string
          id: string
          organization_id: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          details?: Json | null
          entity_id?: string | null
          entity_name?: string | null
          entity_type: string
          id?: string
          organization_id: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          details?: Json | null
          entity_id?: string | null
          entity_name?: string | null
          entity_type?: string
          id?: string
          organization_id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      admin_sessions: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      admin_verification_codes: {
        Row: {
          code: string
          created_at: string
          email: string
          expires_at: string
          id: string
          used: boolean
        }
        Insert: {
          code: string
          created_at?: string
          email: string
          expires_at: string
          id?: string
          used?: boolean
        }
        Update: {
          code?: string
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          used?: boolean
        }
        Relationships: []
      }
      appointment_types: {
        Row: {
          color: string
          created_at: string
          id: string
          name: string
          organization_id: string
          updated_at: string
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          name: string
          organization_id: string
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          name?: string
          organization_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      appointments: {
        Row: {
          appointment_type_id: string | null
          assignee_ids: string[] | null
          created_at: string | null
          created_by: string | null
          customer_id: string | null
          customer_ids: string[] | null
          description: string | null
          end_time: string | null
          id: string
          location: string | null
          notes: string | null
          notes_updated_at: string | null
          notes_updated_by: string | null
          organization_id: string
          start_time: string
          status: string | null
          title: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          appointment_type_id?: string | null
          assignee_ids?: string[] | null
          created_at?: string | null
          created_by?: string | null
          customer_id?: string | null
          customer_ids?: string[] | null
          description?: string | null
          end_time?: string | null
          id?: string
          location?: string | null
          notes?: string | null
          notes_updated_at?: string | null
          notes_updated_by?: string | null
          organization_id: string
          start_time: string
          status?: string | null
          title: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          appointment_type_id?: string | null
          assignee_ids?: string[] | null
          created_at?: string | null
          created_by?: string | null
          customer_id?: string | null
          customer_ids?: string[] | null
          description?: string | null
          end_time?: string | null
          id?: string
          location?: string | null
          notes?: string | null
          notes_updated_at?: string | null
          notes_updated_by?: string | null
          organization_id?: string
          start_time?: string
          status?: string | null
          title?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      customer_tag_assignments: {
        Row: {
          created_at: string | null
          customer_id: string
          id: string
          tag_id: string
        }
        Insert: {
          created_at?: string | null
          customer_id: string
          id?: string
          tag_id: string
        }
        Update: {
          created_at?: string | null
          customer_id?: string
          id?: string
          tag_id?: string
        }
        Relationships: []
      }
      customers: {
        Row: {
          address: string | null
          company: string | null
          created_at: string
          created_by: string | null
          customer_number: string | null
          email: string | null
          id: string
          name: string
          notes: string | null
          organization_id: string
          phone: string | null
          tags: string[] | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          address?: string | null
          company?: string | null
          created_at?: string
          created_by?: string | null
          customer_number?: string | null
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          organization_id: string
          phone?: string | null
          tags?: string[] | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          address?: string | null
          company?: string | null
          created_at?: string
          created_by?: string | null
          customer_number?: string | null
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          organization_id?: string
          phone?: string | null
          tags?: string[] | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      document_audit_log: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          document_id: string
          id: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          document_id: string
          id?: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          document_id?: string
          id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      document_dates: {
        Row: {
          created_at: string | null
          date_type: string
          date_value: string
          description: string | null
          document_id: string
          id: string
          is_manual: boolean | null
          label: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          date_type: string
          date_value: string
          description?: string | null
          document_id: string
          id?: string
          is_manual?: boolean | null
          label?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          date_type?: string
          date_value?: string
          description?: string | null
          document_id?: string
          id?: string
          is_manual?: boolean | null
          label?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      document_flags: {
        Row: {
          created_at: string | null
          details: Json | null
          document_id: string
          flag_type: string
          id: string
          message: string
          resolved: boolean | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string | null
        }
        Insert: {
          created_at?: string | null
          details?: Json | null
          document_id: string
          flag_type: string
          id?: string
          message: string
          resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string | null
        }
        Update: {
          created_at?: string | null
          details?: Json | null
          document_id?: string
          flag_type?: string
          id?: string
          message?: string
          resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string | null
        }
        Relationships: []
      }
      documents: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          customer_id: string | null
          deleted_at: string | null
          document_number: string | null
          document_type: string | null
          extracted_data: Json | null
          file_name: string
          file_size: number | null
          file_type: string | null
          file_url: string
          id: string
          organization_id: string
          raw_text: string | null
          status: string | null
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          customer_id?: string | null
          deleted_at?: string | null
          document_number?: string | null
          document_type?: string | null
          extracted_data?: Json | null
          file_name: string
          file_size?: number | null
          file_type?: string | null
          file_url: string
          id?: string
          organization_id: string
          raw_text?: string | null
          status?: string | null
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          customer_id?: string | null
          deleted_at?: string | null
          document_number?: string | null
          document_type?: string | null
          extracted_data?: Json | null
          file_name?: string
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
          organization_id?: string
          raw_text?: string | null
          status?: string | null
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: []
      }
      organizations: {
        Row: {
          created_at: string
          id: string
          name: string
          settings: Json | null
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          settings?: Json | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          settings?: Json | null
        }
        Relationships: []
      }
      person_tags: {
        Row: {
          color: string
          created_at: string | null
          id: string
          name: string
          organization_id: string
          updated_at: string | null
        }
        Insert: {
          color?: string
          created_at?: string | null
          id?: string
          name: string
          organization_id: string
          updated_at?: string | null
        }
        Update: {
          color?: string
          created_at?: string | null
          id?: string
          name?: string
          organization_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      system_alerts: {
        Row: {
          active: boolean | null
          alert_type: string
          created_at: string | null
          dismissed_by: string[] | null
          ends_at: string | null
          id: string
          message: string
          organization_id: string | null
          starts_at: string | null
          target_organization_ids: string[] | null
          title: string
        }
        Insert: {
          active?: boolean | null
          alert_type: string
          created_at?: string | null
          dismissed_by?: string[] | null
          ends_at?: string | null
          id?: string
          message: string
          organization_id?: string | null
          starts_at?: string | null
          target_organization_ids?: string[] | null
          title: string
        }
        Update: {
          active?: boolean | null
          alert_type?: string
          created_at?: string | null
          dismissed_by?: string[] | null
          ends_at?: string | null
          id?: string
          message?: string
          organization_id?: string | null
          starts_at?: string | null
          target_organization_ids?: string[] | null
          title?: string
        }
        Relationships: []
      }
      task_attachments: {
        Row: {
          created_at: string
          file_name: string
          file_size: number | null
          file_type: string | null
          file_url: string
          id: string
          task_id: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          file_name: string
          file_size?: number | null
          file_type?: string | null
          file_url: string
          id?: string
          task_id: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          file_name?: string
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
          task_id?: string
          uploaded_by?: string | null
        }
        Relationships: []
      }
      task_recommendations: {
        Row: {
          action_url: string | null
          created_at: string | null
          description: string | null
          dismissed: boolean | null
          entity_id: string
          entity_type: string
          id: string
          organization_id: string
          priority: number | null
          recommendation_type: string
          title: string
        }
        Insert: {
          action_url?: string | null
          created_at?: string | null
          description?: string | null
          dismissed?: boolean | null
          entity_id: string
          entity_type: string
          id?: string
          organization_id: string
          priority?: number | null
          recommendation_type: string
          title: string
        }
        Update: {
          action_url?: string | null
          created_at?: string | null
          description?: string | null
          dismissed?: boolean | null
          entity_id?: string
          entity_type?: string
          id?: string
          organization_id?: string
          priority?: number | null
          recommendation_type?: string
          title?: string
        }
        Relationships: []
      }
      task_subtasks: {
        Row: {
          completed: boolean
          created_at: string
          id: string
          position: number
          task_id: string
          title: string
          updated_at: string
        }
        Insert: {
          completed?: boolean
          created_at?: string
          id?: string
          position?: number
          task_id: string
          title: string
          updated_at?: string
        }
        Update: {
          completed?: boolean
          created_at?: string
          id?: string
          position?: number
          task_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          id: string
          name: string | null
          organization_id: string | null
          role: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          id: string
          name?: string | null
          organization_id?: string | null
          role?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          id?: string
          name?: string | null
          organization_id?: string | null
          role?: string | null
        }
        Relationships: []
      }
      whiteboard_tasks: {
        Row: {
          assigned_to: string | null
          assigned_to_ids: string[] | null
          color: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          due_date: string | null
          id: string
          labels: string[] | null
          organization_id: string
          position: number | null
          position_x: number | null
          position_y: number | null
          priority: string | null
          status: string | null
          title: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          assigned_to?: string | null
          assigned_to_ids?: string[] | null
          color?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          labels?: string[] | null
          organization_id: string
          position?: number | null
          position_x?: number | null
          position_y?: number | null
          priority?: string | null
          status?: string | null
          title: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          assigned_to?: string | null
          assigned_to_ids?: string[] | null
          color?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          labels?: string[] | null
          organization_id?: string
          position?: number | null
          position_x?: number | null
          position_y?: number | null
          priority?: string | null
          status?: string | null
          title?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_organization_id: { Args: Record<string, never>; Returns: string }
      search_customers: {
        Args: { search_term: string }
        Returns: {
          address: string | null
          company: string | null
          created_at: string
          created_by: string | null
          customer_number: string | null
          email: string | null
          id: string
          name: string
          notes: string | null
          organization_id: string
          phone: string | null
          tags: string[] | null
          updated_at: string
          updated_by: string | null
        }[]
      }
      user_organization_id: { Args: Record<string, never>; Returns: string }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof Database
}
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof Database
}
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof Database
}
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof Database
}
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

// Custom type exports for convenience
export type Document = Tables<"documents">
export type Customer = Tables<"customers">
export type User = Tables<"users">
export type Organization = Tables<"organizations">
export type Appointment = Tables<"appointments">
export type AppointmentType = Tables<"appointment_types">
export type WhiteboardTask = Tables<"whiteboard_tasks">
export type DocumentAuditLog = Tables<"document_audit_log">
export type DocumentFlag = Tables<"document_flags">
export type DocumentDate = Tables<"document_dates">
export type TaskAttachment = Tables<"task_attachments">
export type TaskSubtask = Tables<"task_subtasks">
export type ActivityLog = Tables<"activity_log">
export type PersonTag = Tables<"person_tags">
export type CustomerTagAssignment = Tables<"customer_tag_assignments">
export type TaskRecommendation = Tables<"task_recommendations">
export type SystemAlert = Tables<"system_alerts">
export type AdminSession = Tables<"admin_sessions">
export type AdminVerificationCode = Tables<"admin_verification_codes">

// Extended types with user info
export interface UserInfo {
  id?: string;
  name: string | null;
  email: string | null;
}

export interface CustomerWithUserInfo extends Customer {
  created_by_user?: UserInfo | null;
  updated_by_user?: UserInfo | null;
}

export interface AppointmentWithDetails extends Appointment {
  created_by_user?: UserInfo | null;
  updated_by_user?: UserInfo | null;
  notes_user?: UserInfo | null;
  assignees?: UserInfo[] | null;
  appointment_type?: Partial<AppointmentType> | null;
  // Aliases for compatibility with different query patterns
  appointment_types?: Partial<AppointmentType> | null;
  customers?: { name: string; company: string | null } | null;
}
