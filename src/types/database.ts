// Database types for Supabase
// To regenerate: npx supabase gen types typescript --project-id <your-project-id> > src/types/database.ts

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      appointments: {
        Row: {
          id: string;
          organization_id: string;
          customer_id: string | null;
          title: string;
          description: string | null;
          start_time: string;
          end_time: string;
          location: string | null;
          status: "scheduled" | "completed" | "cancelled";
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          customer_id?: string | null;
          title: string;
          description?: string | null;
          start_time: string;
          end_time: string;
          location?: string | null;
          status?: "scheduled" | "completed" | "cancelled";
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          customer_id?: string | null;
          title?: string;
          description?: string | null;
          start_time?: string;
          end_time?: string;
          location?: string | null;
          status?: "scheduled" | "completed" | "cancelled";
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "appointments_organization_id_fkey";
            columns: ["organization_id"];
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "appointments_customer_id_fkey";
            columns: ["customer_id"];
            referencedRelation: "customers";
            referencedColumns: ["id"];
          }
        ];
      };
      whiteboard_tasks: {
        Row: {
          id: string;
          organization_id: string;
          title: string;
          description: string | null;
          status: "todo" | "in_progress" | "done";
          position_x: number;
          position_y: number;
          color: string;
          assigned_to: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          title: string;
          description?: string | null;
          status?: "todo" | "in_progress" | "done";
          position_x?: number;
          position_y?: number;
          color?: string;
          assigned_to?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          title?: string;
          description?: string | null;
          status?: "todo" | "in_progress" | "done";
          position_x?: number;
          position_y?: number;
          color?: string;
          assigned_to?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "whiteboard_tasks_organization_id_fkey";
            columns: ["organization_id"];
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          }
        ];
      };
      organizations: {
        Row: {
          id: string;
          name: string;
          settings: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          settings?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          settings?: Json;
          created_at?: string;
        };
        Relationships: [];
      };
      users: {
        Row: {
          id: string;
          organization_id: string | null;
          email: string;
          name: string | null;
          role: "owner" | "admin" | "member";
          avatar_url: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          organization_id?: string | null;
          email: string;
          name?: string | null;
          role?: "owner" | "admin" | "member";
          avatar_url?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string | null;
          email?: string;
          name?: string | null;
          role?: "owner" | "admin" | "member";
          avatar_url?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "users_organization_id_fkey";
            columns: ["organization_id"];
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          }
        ];
      };
      customers: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          company: string | null;
          email: string | null;
          phone: string | null;
          address: string | null;
          tags: string[];
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          company?: string | null;
          email?: string | null;
          phone?: string | null;
          address?: string | null;
          tags?: string[];
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          name?: string;
          company?: string | null;
          email?: string | null;
          phone?: string | null;
          address?: string | null;
          tags?: string[];
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "customers_organization_id_fkey";
            columns: ["organization_id"];
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          }
        ];
      };
      documents: {
        Row: {
          id: string;
          organization_id: string;
          customer_id: string | null;
          file_url: string;
          file_name: string;
          file_type: string | null;
          file_size: number | null;
          document_type: "invoice" | "receipt" | "contract" | "other" | null;
          raw_text: string | null;
          extracted_data: Json;
          status: "pending" | "processing" | "completed" | "failed";
          uploaded_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          customer_id?: string | null;
          file_url: string;
          file_name: string;
          file_type?: string | null;
          file_size?: number | null;
          document_type?: "invoice" | "receipt" | "contract" | "other" | null;
          raw_text?: string | null;
          extracted_data?: Json;
          status?: "pending" | "processing" | "completed" | "failed";
          uploaded_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          customer_id?: string | null;
          file_url?: string;
          file_name?: string;
          file_type?: string | null;
          file_size?: number | null;
          document_type?: "invoice" | "receipt" | "contract" | "other" | null;
          raw_text?: string | null;
          extracted_data?: Json;
          status?: "pending" | "processing" | "completed" | "failed";
          uploaded_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "documents_organization_id_fkey";
            columns: ["organization_id"];
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "documents_customer_id_fkey";
            columns: ["customer_id"];
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "documents_uploaded_by_fkey";
            columns: ["uploaded_by"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      document_audit_log: {
        Row: {
          id: string;
          document_id: string;
          user_id: string | null;
          action: string;
          details: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          document_id: string;
          user_id?: string | null;
          action: string;
          details?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          document_id?: string;
          user_id?: string | null;
          action?: string;
          details?: Json;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "document_audit_log_document_id_fkey";
            columns: ["document_id"];
            referencedRelation: "documents";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "document_audit_log_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      user_organization_id: {
        Args: Record<string, never>;
        Returns: string;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

// Helper types
export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
export type InsertTables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];
export type UpdateTables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];

// Convenience type aliases
export type Organization = Tables<"organizations">;
export type User = Tables<"users">;
export type Customer = Tables<"customers"> & { customer_number?: string };
export type Document = Tables<"documents"> & { document_number?: string };
export type DocumentAuditLog = Tables<"document_audit_log">;

// Phase 2 types - use Tables for database-compatible types
export type Appointment = Tables<"appointments">;

export interface DocumentFlag {
  id: string;
  document_id: string;
  flag_type: "past_due" | "duplicate_invoice" | "suspicious_amount" | "missing_data" | "other";
  severity: "info" | "warning" | "critical";
  message: string;
  details: Record<string, unknown>;
  resolved: boolean;
  resolved_by?: string;
  resolved_at?: string;
  created_at: string;
}

export interface DocumentDate {
  id: string;
  document_id: string;
  date_type: "due_date" | "invoice_date" | "expiration" | "effective" | "transaction" | "other";
  date_value: string;
  description?: string;
  created_at: string;
}

export type WhiteboardTask = Tables<"whiteboard_tasks">;

export interface TaskRecommendation {
  id: string;
  organization_id: string;
  entity_type: "customer" | "document";
  entity_id: string;
  recommendation_type: string;
  title: string;
  description?: string;
  action_url?: string;
  priority: number;
  dismissed: boolean;
  created_at: string;
}

export interface ActivityLogEntry {
  id: string;
  organization_id: string;
  user_id?: string;
  user_name?: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  entity_name?: string;
  details: Record<string, unknown>;
  created_at: string;
}

export interface SystemAlert {
  id: string;
  organization_id?: string;
  alert_type: "maintenance" | "warning" | "info" | "critical";
  title: string;
  message: string;
  starts_at?: string;
  ends_at?: string;
  dismissed_by: string[];
  active: boolean;
  created_at: string;
}
