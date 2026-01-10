export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      accuracy_metrics: {
        Row: {
          approved_documents: number | null
          auto_approved_corrections: number | null
          auto_approved_count: number | null
          avg_classification_confidence: number | null
          avg_extraction_confidence: number | null
          avg_processing_time_ms: number | null
          avg_review_time_ms: number | null
          created_at: string | null
          date: string
          document_type: string | null
          documents_with_corrections: number | null
          false_positive_flags: number | null
          flags_resolved: number | null
          high_conf_correct: number | null
          high_conf_total: number | null
          id: string
          low_conf_correct: number | null
          low_conf_total: number | null
          medium_conf_correct: number | null
          medium_conf_total: number | null
          organization_id: string | null
          rejected_documents: number | null
          total_documents: number | null
          total_field_corrections: number | null
          total_flags_raised: number | null
        }
        Insert: {
          approved_documents?: number | null
          auto_approved_corrections?: number | null
          auto_approved_count?: number | null
          avg_classification_confidence?: number | null
          avg_extraction_confidence?: number | null
          avg_processing_time_ms?: number | null
          avg_review_time_ms?: number | null
          created_at?: string | null
          date: string
          document_type?: string | null
          documents_with_corrections?: number | null
          false_positive_flags?: number | null
          flags_resolved?: number | null
          high_conf_correct?: number | null
          high_conf_total?: number | null
          id?: string
          low_conf_correct?: number | null
          low_conf_total?: number | null
          medium_conf_correct?: number | null
          medium_conf_total?: number | null
          organization_id?: string | null
          rejected_documents?: number | null
          total_documents?: number | null
          total_field_corrections?: number | null
          total_flags_raised?: number | null
        }
        Update: {
          approved_documents?: number | null
          auto_approved_corrections?: number | null
          auto_approved_count?: number | null
          avg_classification_confidence?: number | null
          avg_extraction_confidence?: number | null
          avg_processing_time_ms?: number | null
          avg_review_time_ms?: number | null
          created_at?: string | null
          date?: string
          document_type?: string | null
          documents_with_corrections?: number | null
          false_positive_flags?: number | null
          flags_resolved?: number | null
          high_conf_correct?: number | null
          high_conf_total?: number | null
          id?: string
          low_conf_correct?: number | null
          low_conf_total?: number | null
          medium_conf_correct?: number | null
          medium_conf_total?: number | null
          organization_id?: string | null
          rejected_documents?: number | null
          total_documents?: number | null
          total_field_corrections?: number | null
          total_flags_raised?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "accuracy_metrics_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
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
        Relationships: [
          {
            foreignKeyName: "activity_log_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
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
      anomaly_detections: {
        Row: {
          anomaly_type: string
          context: Json | null
          created_at: string | null
          detected_value: Json | null
          deviation_score: number | null
          document_id: string | null
          expected_range: Json | null
          field_name: string | null
          id: string
          organization_id: string | null
          resolution: string | null
          resolved: boolean | null
          resolved_at: string | null
          resolved_by: string | null
        }
        Insert: {
          anomaly_type: string
          context?: Json | null
          created_at?: string | null
          detected_value?: Json | null
          deviation_score?: number | null
          document_id?: string | null
          expected_range?: Json | null
          field_name?: string | null
          id?: string
          organization_id?: string | null
          resolution?: string | null
          resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
        }
        Update: {
          anomaly_type?: string
          context?: Json | null
          created_at?: string | null
          detected_value?: Json | null
          deviation_score?: number | null
          document_id?: string | null
          expected_range?: Json | null
          field_name?: string | null
          id?: string
          organization_id?: string | null
          resolution?: string | null
          resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "anomaly_detections_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anomaly_detections_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anomaly_detections_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "appointment_types_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "appointments_appointment_type_id_fkey"
            columns: ["appointment_type_id"]
            isOneToOne: false
            referencedRelation: "appointment_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_notes_updated_by_fkey"
            columns: ["notes_updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "customer_tag_assignments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_tag_assignments_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "person_tags"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "customers_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "document_audit_log_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_audit_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "document_dates_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      document_embeddings: {
        Row: {
          content_hash: string | null
          created_at: string | null
          document_id: string
          embedding: string | null
          id: string
          model: string | null
          organization_id: string
          updated_at: string | null
        }
        Insert: {
          content_hash?: string | null
          created_at?: string | null
          document_id: string
          embedding?: string | null
          id?: string
          model?: string | null
          organization_id: string
          updated_at?: string | null
        }
        Update: {
          content_hash?: string | null
          created_at?: string | null
          document_id?: string
          embedding?: string | null
          id?: string
          model?: string | null
          organization_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_embeddings_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: true
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_embeddings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      document_flags: {
        Row: {
          created_at: string | null
          details: Json | null
          detection_method: string | null
          document_id: string
          flag_type: string
          id: string
          message: string
          model_confidence: number | null
          resolved: boolean | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string | null
        }
        Insert: {
          created_at?: string | null
          details?: Json | null
          detection_method?: string | null
          document_id: string
          flag_type: string
          id?: string
          message: string
          model_confidence?: number | null
          resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string | null
        }
        Update: {
          created_at?: string | null
          details?: Json | null
          detection_method?: string | null
          document_id?: string
          flag_type?: string
          id?: string
          message?: string
          model_confidence?: number | null
          resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_flags_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_flags_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      document_queue: {
        Row: {
          attempts: number | null
          completed_at: string | null
          created_at: string | null
          document_id: string | null
          id: string
          last_error: string | null
          max_attempts: number | null
          next_retry_at: string | null
          organization_id: string | null
          priority: number | null
          processor: string | null
          started_at: string | null
          status: string | null
        }
        Insert: {
          attempts?: number | null
          completed_at?: string | null
          created_at?: string | null
          document_id?: string | null
          id?: string
          last_error?: string | null
          max_attempts?: number | null
          next_retry_at?: string | null
          organization_id?: string | null
          priority?: number | null
          processor?: string | null
          started_at?: string | null
          status?: string | null
        }
        Update: {
          attempts?: number | null
          completed_at?: string | null
          created_at?: string | null
          document_id?: string | null
          id?: string
          last_error?: string | null
          max_attempts?: number | null
          next_retry_at?: string | null
          organization_id?: string | null
          priority?: number | null
          processor?: string | null
          started_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_queue_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_queue_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          classification_confidence: number | null
          created_at: string
          customer_id: string | null
          deleted_at: string | null
          deleted_reason: string | null
          document_number: string | null
          document_type: string | null
          extracted_data: Json | null
          extraction_confidence: number | null
          file_name: string
          file_size: number | null
          file_type: string | null
          file_url: string
          id: string
          model_version: string | null
          organization_id: string
          raw_text: string | null
          review_priority: string | null
          status: string | null
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          classification_confidence?: number | null
          created_at?: string
          customer_id?: string | null
          deleted_at?: string | null
          deleted_reason?: string | null
          document_number?: string | null
          document_type?: string | null
          extracted_data?: Json | null
          extraction_confidence?: number | null
          file_name: string
          file_size?: number | null
          file_type?: string | null
          file_url: string
          id?: string
          model_version?: string | null
          organization_id: string
          raw_text?: string | null
          review_priority?: string | null
          status?: string | null
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          classification_confidence?: number | null
          created_at?: string
          customer_id?: string | null
          deleted_at?: string | null
          deleted_reason?: string | null
          document_number?: string | null
          document_type?: string | null
          extracted_data?: Json | null
          extraction_confidence?: number | null
          file_name?: string
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
          model_version?: string | null
          organization_id?: string
          raw_text?: string | null
          review_priority?: string | null
          status?: string | null
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      entity_matches: {
        Row: {
          created_at: string | null
          document_id: string
          entity_id: string
          extracted_value: string
          field_name: string
          id: string
          match_type: string | null
          similarity_score: number | null
          verified: boolean | null
        }
        Insert: {
          created_at?: string | null
          document_id: string
          entity_id: string
          extracted_value: string
          field_name: string
          id?: string
          match_type?: string | null
          similarity_score?: number | null
          verified?: boolean | null
        }
        Update: {
          created_at?: string | null
          document_id?: string
          entity_id?: string
          extracted_value?: string
          field_name?: string
          id?: string
          match_type?: string | null
          similarity_score?: number | null
          verified?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "entity_matches_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entity_matches_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "known_entities"
            referencedColumns: ["id"]
          },
        ]
      }
      experiment_results: {
        Row: {
          confidence_score: number | null
          correction_count: number | null
          created_at: string | null
          document_id: string
          experiment_id: string
          id: string
          is_control: boolean
          model_version_id: string
          processing_time_ms: number | null
          was_corrected: boolean | null
        }
        Insert: {
          confidence_score?: number | null
          correction_count?: number | null
          created_at?: string | null
          document_id: string
          experiment_id: string
          id?: string
          is_control: boolean
          model_version_id: string
          processing_time_ms?: number | null
          was_corrected?: boolean | null
        }
        Update: {
          confidence_score?: number | null
          correction_count?: number | null
          created_at?: string | null
          document_id?: string
          experiment_id?: string
          id?: string
          is_control?: boolean
          model_version_id?: string
          processing_time_ms?: number | null
          was_corrected?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "experiment_results_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "experiment_results_experiment_id_fkey"
            columns: ["experiment_id"]
            isOneToOne: false
            referencedRelation: "model_experiments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "experiment_results_model_version_id_fkey"
            columns: ["model_version_id"]
            isOneToOne: false
            referencedRelation: "model_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      field_corrections: {
        Row: {
          corrected_by: string | null
          corrected_value: Json | null
          correction_type: string
          created_at: string | null
          document_id: string
          field_name: string
          id: string
          model_version: string | null
          organization_id: string
          original_value: Json | null
          training_batch_id: string | null
          used_for_training: boolean | null
        }
        Insert: {
          corrected_by?: string | null
          corrected_value?: Json | null
          correction_type?: string
          created_at?: string | null
          document_id: string
          field_name: string
          id?: string
          model_version?: string | null
          organization_id: string
          original_value?: Json | null
          training_batch_id?: string | null
          used_for_training?: boolean | null
        }
        Update: {
          corrected_by?: string | null
          corrected_value?: Json | null
          correction_type?: string
          created_at?: string | null
          document_id?: string
          field_name?: string
          id?: string
          model_version?: string | null
          organization_id?: string
          original_value?: Json | null
          training_batch_id?: string | null
          used_for_training?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "field_corrections_corrected_by_fkey"
            columns: ["corrected_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "field_corrections_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "field_corrections_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      known_entities: {
        Row: {
          aliases: string[] | null
          canonical_name: string
          created_at: string | null
          created_by: string | null
          embedding: string | null
          entity_type: string
          id: string
          metadata: Json | null
          organization_id: string
          updated_at: string | null
          verified: boolean | null
        }
        Insert: {
          aliases?: string[] | null
          canonical_name: string
          created_at?: string | null
          created_by?: string | null
          embedding?: string | null
          entity_type: string
          id?: string
          metadata?: Json | null
          organization_id: string
          updated_at?: string | null
          verified?: boolean | null
        }
        Update: {
          aliases?: string[] | null
          canonical_name?: string
          created_at?: string | null
          created_by?: string | null
          embedding?: string | null
          entity_type?: string
          id?: string
          metadata?: Json | null
          organization_id?: string
          updated_at?: string | null
          verified?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "known_entities_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "known_entities_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      model_experiments: {
        Row: {
          control_model_id: string
          created_at: string | null
          created_by: string | null
          description: string | null
          end_date: string | null
          id: string
          minimum_sample_size: number | null
          model_type: string
          name: string
          start_date: string | null
          status: string | null
          success_metric: string | null
          traffic_percentage: number | null
          treatment_model_id: string
          updated_at: string | null
        }
        Insert: {
          control_model_id: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          minimum_sample_size?: number | null
          model_type: string
          name: string
          start_date?: string | null
          status?: string | null
          success_metric?: string | null
          traffic_percentage?: number | null
          treatment_model_id: string
          updated_at?: string | null
        }
        Update: {
          control_model_id?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          minimum_sample_size?: number | null
          model_type?: string
          name?: string
          start_date?: string | null
          status?: string | null
          success_metric?: string | null
          traffic_percentage?: number | null
          treatment_model_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "model_experiments_control_model_id_fkey"
            columns: ["control_model_id"]
            isOneToOne: false
            referencedRelation: "model_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "model_experiments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "model_experiments_treatment_model_id_fkey"
            columns: ["treatment_model_id"]
            isOneToOne: false
            referencedRelation: "model_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      model_versions: {
        Row: {
          accuracy_score: number | null
          activated_at: string | null
          base_model: string | null
          created_at: string | null
          deactivated_at: string | null
          id: string
          is_active: boolean | null
          is_default: boolean | null
          metadata: Json | null
          model_id: string
          model_type: string
          provider: string
          training_data_count: number | null
          version: string
        }
        Insert: {
          accuracy_score?: number | null
          activated_at?: string | null
          base_model?: string | null
          created_at?: string | null
          deactivated_at?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          metadata?: Json | null
          model_id: string
          model_type: string
          provider: string
          training_data_count?: number | null
          version: string
        }
        Update: {
          accuracy_score?: number | null
          activated_at?: string | null
          base_model?: string | null
          created_at?: string | null
          deactivated_at?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          metadata?: Json | null
          model_id?: string
          model_type?: string
          provider?: string
          training_data_count?: number | null
          version?: string
        }
        Relationships: []
      }
      organization_ai_settings: {
        Row: {
          amount_anomaly_threshold: number | null
          auto_approval_document_types: string[] | null
          auto_approval_enabled: boolean | null
          auto_approval_min_confidence: number | null
          auto_approval_require_no_flags: boolean | null
          auto_retrain_enabled: boolean | null
          created_at: string | null
          duplicate_similarity_threshold: number | null
          enable_duplicate_detection: boolean | null
          high_confidence_threshold: number | null
          id: string
          low_confidence_threshold: number | null
          medium_confidence_threshold: number | null
          organization_id: string | null
          retrain_accuracy_threshold: number | null
          retrain_correction_threshold: number | null
          updated_at: string | null
        }
        Insert: {
          amount_anomaly_threshold?: number | null
          auto_approval_document_types?: string[] | null
          auto_approval_enabled?: boolean | null
          auto_approval_min_confidence?: number | null
          auto_approval_require_no_flags?: boolean | null
          auto_retrain_enabled?: boolean | null
          created_at?: string | null
          duplicate_similarity_threshold?: number | null
          enable_duplicate_detection?: boolean | null
          high_confidence_threshold?: number | null
          id?: string
          low_confidence_threshold?: number | null
          medium_confidence_threshold?: number | null
          organization_id?: string | null
          retrain_accuracy_threshold?: number | null
          retrain_correction_threshold?: number | null
          updated_at?: string | null
        }
        Update: {
          amount_anomaly_threshold?: number | null
          auto_approval_document_types?: string[] | null
          auto_approval_enabled?: boolean | null
          auto_approval_min_confidence?: number | null
          auto_approval_require_no_flags?: boolean | null
          auto_retrain_enabled?: boolean | null
          created_at?: string | null
          duplicate_similarity_threshold?: number | null
          enable_duplicate_detection?: boolean | null
          high_confidence_threshold?: number | null
          id?: string
          low_confidence_threshold?: number | null
          medium_confidence_threshold?: number | null
          organization_id?: string | null
          retrain_accuracy_threshold?: number | null
          retrain_correction_threshold?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_ai_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "person_tags_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      processing_metrics: {
        Row: {
          classification_confidence: number | null
          created_at: string | null
          document_id: string | null
          extraction_confidence: number | null
          extraction_duration_ms: number | null
          id: string
          model_version: string | null
          ocr_duration_ms: number | null
          total_duration_ms: number | null
          validation_duration_ms: number | null
        }
        Insert: {
          classification_confidence?: number | null
          created_at?: string | null
          document_id?: string | null
          extraction_confidence?: number | null
          extraction_duration_ms?: number | null
          id?: string
          model_version?: string | null
          ocr_duration_ms?: number | null
          total_duration_ms?: number | null
          validation_duration_ms?: number | null
        }
        Update: {
          classification_confidence?: number | null
          created_at?: string | null
          document_id?: string | null
          extraction_confidence?: number | null
          extraction_duration_ms?: number | null
          id?: string
          model_version?: string | null
          ocr_duration_ms?: number | null
          total_duration_ms?: number | null
          validation_duration_ms?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "processing_metrics_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      retention_jobs: {
        Row: {
          completed_at: string | null
          documents_archived: number | null
          documents_deleted: number | null
          documents_processed: number | null
          errors: string[] | null
          id: string
          policy_id: string | null
          started_at: string | null
          status: string
        }
        Insert: {
          completed_at?: string | null
          documents_archived?: number | null
          documents_deleted?: number | null
          documents_processed?: number | null
          errors?: string[] | null
          id?: string
          policy_id?: string | null
          started_at?: string | null
          status: string
        }
        Update: {
          completed_at?: string | null
          documents_archived?: number | null
          documents_deleted?: number | null
          documents_processed?: number | null
          errors?: string[] | null
          id?: string
          policy_id?: string | null
          started_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "retention_jobs_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "retention_policies"
            referencedColumns: ["id"]
          },
        ]
      }
      retention_policies: {
        Row: {
          action: string
          created_at: string | null
          criteria: Json | null
          description: string | null
          enabled: boolean | null
          id: string
          name: string
          notify_before: number | null
          notify_emails: string[] | null
          organization_id: string | null
          retention_days: number
          updated_at: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          criteria?: Json | null
          description?: string | null
          enabled?: boolean | null
          id?: string
          name: string
          notify_before?: number | null
          notify_emails?: string[] | null
          organization_id?: string | null
          retention_days?: number
          updated_at?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          criteria?: Json | null
          description?: string | null
          enabled?: boolean | null
          id?: string
          name?: string
          notify_before?: number | null
          notify_emails?: string[] | null
          organization_id?: string | null
          retention_days?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "retention_policies_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "system_alerts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "task_attachments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "whiteboard_tasks"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "task_recommendations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "task_subtasks_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "whiteboard_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      training_batches: {
        Row: {
          completed_at: string | null
          created_at: string | null
          error_message: string | null
          id: string
          metrics: Json | null
          model_type: string
          result_model_id: string | null
          source_model_id: string | null
          started_at: string | null
          status: string | null
          training_config: Json | null
          training_examples_count: number | null
          validation_examples_count: number | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          metrics?: Json | null
          model_type: string
          result_model_id?: string | null
          source_model_id?: string | null
          started_at?: string | null
          status?: string | null
          training_config?: Json | null
          training_examples_count?: number | null
          validation_examples_count?: number | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          metrics?: Json | null
          model_type?: string
          result_model_id?: string | null
          source_model_id?: string | null
          started_at?: string | null
          status?: string | null
          training_config?: Json | null
          training_examples_count?: number | null
          validation_examples_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "training_batches_result_model_id_fkey"
            columns: ["result_model_id"]
            isOneToOne: false
            referencedRelation: "model_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_batches_source_model_id_fkey"
            columns: ["source_model_id"]
            isOneToOne: false
            referencedRelation: "model_versions"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "users_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      validation_rules: {
        Row: {
          created_at: string | null
          description: string | null
          document_types: string[] | null
          field_name: string | null
          id: string
          is_active: boolean | null
          name: string
          organization_id: string | null
          rule_config: Json
          rule_type: string
          severity: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          document_types?: string[] | null
          field_name?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          organization_id?: string | null
          rule_config?: Json
          rule_type: string
          severity?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          document_types?: string[] | null
          field_name?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          organization_id?: string | null
          rule_config?: Json
          rule_type?: string
          severity?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "validation_rules_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "whiteboard_tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whiteboard_tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whiteboard_tasks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whiteboard_tasks_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_organization_id: { Args: never; Returns: string }
      match_documents: {
        Args: {
          match_count?: number
          match_threshold?: number
          query_embedding: string
        }
        Returns: {
          document_id: string
          document_type: string
          file_name: string
          similarity: number
        }[]
      }
      match_entities: {
        Args: {
          entity_type_filter?: string
          match_count?: number
          match_threshold?: number
          query_embedding: string
        }
        Returns: {
          aliases: string[]
          canonical_name: string
          entity_id: string
          entity_type: string
          similarity: number
        }[]
      }
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
        SetofOptions: {
          from: "*"
          to: "customers"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      user_organization_id: { Args: never; Returns: string }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const

// Custom type exports for convenience
export type SystemAlert = Database["public"]["Tables"]["system_alerts"]["Row"]
export type Customer = Database["public"]["Tables"]["customers"]["Row"]
export type Organization = Database["public"]["Tables"]["organizations"]["Row"]
export type User = Database["public"]["Tables"]["users"]["Row"]
export type Document = Database["public"]["Tables"]["documents"]["Row"]
export type Appointment = Database["public"]["Tables"]["appointments"]["Row"]
export type AppointmentType = Database["public"]["Tables"]["appointment_types"]["Row"]
export type PersonTag = Database["public"]["Tables"]["person_tags"]["Row"]
export type WhiteboardTask = Database["public"]["Tables"]["whiteboard_tasks"]["Row"]
export type TaskAttachment = Database["public"]["Tables"]["task_attachments"]["Row"]
export type TaskSubtask = Database["public"]["Tables"]["task_subtasks"]["Row"]
export type DocumentAuditLog = Database["public"]["Tables"]["document_audit_log"]["Row"]

// Nested user type for joins (allows more flexible nullable fields)
type NestedUser = {
  id: string;
  name: string | null;
  email: string | null;
  avatar_url?: string | null;
  role?: string | null;
};

// Nested appointment type for joins
type NestedAppointmentType = {
  id: string;
  name: string;
  color: string;
};

// Composite types with joins
export type CustomerWithUserInfo = Customer & {
  users?: NestedUser | null;
  created_by_user?: NestedUser | null;
  updated_by_user?: NestedUser | null;
};

export type AppointmentWithDetails = Appointment & {
  appointment_types?: NestedAppointmentType | null;
  notes_user?: NestedUser | null;
  created_by_user?: NestedUser | null;
  updated_by_user?: NestedUser | null;
  assignees?: NestedUser[] | null;
  customers?: { id?: string; name: string | null; company: string | null; customer_number?: string } | null;
}
