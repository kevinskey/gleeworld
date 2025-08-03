export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      activity_logs: {
        Row: {
          action_type: string
          created_at: string
          details: Json | null
          id: string
          ip_address: unknown | null
          resource_id: string | null
          resource_type: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action_type: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: unknown | null
          resource_id?: string | null
          resource_type: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action_type?: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: unknown | null
          resource_id?: string | null
          resource_type?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      admin_contract_notifications: {
        Row: {
          admin_email: string
          contract_id: string
          created_at: string
          id: string
          is_read: boolean
          notification_type: string
          signature_id: string
        }
        Insert: {
          admin_email: string
          contract_id: string
          created_at?: string
          id?: string
          is_read?: boolean
          notification_type?: string
          signature_id: string
        }
        Update: {
          admin_email?: string
          contract_id?: string
          created_at?: string
          id?: string
          is_read?: boolean
          notification_type?: string
          signature_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_contract_notifications_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_contract_notifications_signature_id_fkey"
            columns: ["signature_id"]
            isOneToOne: false
            referencedRelation: "contract_signatures_v2"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_notifications: {
        Row: {
          admin_id: string
          contract_signature_id: string
          created_at: string
          id: string
          is_read: boolean
          message: string
          type: string
        }
        Insert: {
          admin_id: string
          contract_signature_id: string
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          type?: string
        }
        Update: {
          admin_id?: string
          contract_signature_id?: string
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_notifications_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_notifications_contract_signature_id_fkey"
            columns: ["contract_signature_id"]
            isOneToOne: false
            referencedRelation: "contract_signatures"
            referencedColumns: ["id"]
          },
        ]
      }
      alumnae_audio_stories: {
        Row: {
          audio_url: string
          created_at: string | null
          duration_seconds: number | null
          graduation_year: number | null
          id: string
          is_approved: boolean | null
          is_featured: boolean | null
          tags: string[] | null
          title: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          audio_url: string
          created_at?: string | null
          duration_seconds?: number | null
          graduation_year?: number | null
          id?: string
          is_approved?: boolean | null
          is_featured?: boolean | null
          tags?: string[] | null
          title: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          audio_url?: string
          created_at?: string | null
          duration_seconds?: number | null
          graduation_year?: number | null
          id?: string
          is_approved?: boolean | null
          is_featured?: boolean | null
          tags?: string[] | null
          title?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      alumnae_messages: {
        Row: {
          content: string
          created_at: string | null
          id: string
          is_approved: boolean | null
          recipient_type: string | null
          sender_id: string | null
          target_graduation_year: number | null
          updated_at: string | null
          visible_to: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          is_approved?: boolean | null
          recipient_type?: string | null
          sender_id?: string | null
          target_graduation_year?: number | null
          updated_at?: string | null
          visible_to?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          is_approved?: boolean | null
          recipient_type?: string | null
          sender_id?: string | null
          target_graduation_year?: number | null
          updated_at?: string | null
          visible_to?: string | null
        }
        Relationships: []
      }
      alumnae_stories: {
        Row: {
          content: string
          created_at: string | null
          graduation_year: number | null
          id: string
          image_url: string | null
          is_approved: boolean | null
          is_featured: boolean | null
          title: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          graduation_year?: number | null
          id?: string
          image_url?: string | null
          is_approved?: boolean | null
          is_featured?: boolean | null
          title: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          graduation_year?: number | null
          id?: string
          image_url?: string | null
          is_approved?: boolean | null
          is_featured?: boolean | null
          title?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      audio_archive: {
        Row: {
          artist_info: string | null
          audio_url: string
          category: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          duration_seconds: number | null
          id: string
          is_public: boolean | null
          performance_date: string | null
          performance_location: string | null
          play_count: number | null
          title: string
          updated_at: string | null
        }
        Insert: {
          artist_info?: string | null
          audio_url: string
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          duration_seconds?: number | null
          id?: string
          is_public?: boolean | null
          performance_date?: string | null
          performance_location?: string | null
          play_count?: number | null
          title: string
          updated_at?: string | null
        }
        Update: {
          artist_info?: string | null
          audio_url?: string
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          duration_seconds?: number | null
          id?: string
          is_public?: boolean | null
          performance_date?: string | null
          performance_location?: string | null
          play_count?: number | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      audition_time_blocks: {
        Row: {
          appointment_duration_minutes: number | null
          created_at: string | null
          end_date: string
          id: string
          is_active: boolean | null
          start_date: string
          updated_at: string | null
        }
        Insert: {
          appointment_duration_minutes?: number | null
          created_at?: string | null
          end_date: string
          id?: string
          is_active?: boolean | null
          start_date: string
          updated_at?: string | null
        }
        Update: {
          appointment_duration_minutes?: number | null
          created_at?: string | null
          end_date?: string
          id?: string
          is_active?: boolean | null
          start_date?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      budget_attachments: {
        Row: {
          budget_id: string | null
          created_at: string
          event_id: string | null
          file_type: string | null
          file_url: string
          filename: string
          id: string
          uploaded_by: string | null
        }
        Insert: {
          budget_id?: string | null
          created_at?: string
          event_id?: string | null
          file_type?: string | null
          file_url: string
          filename: string
          id?: string
          uploaded_by?: string | null
        }
        Update: {
          budget_id?: string | null
          created_at?: string
          event_id?: string | null
          file_type?: string | null
          file_url?: string
          filename?: string
          id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "budget_attachments_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "budgets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_attachments_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_categories: {
        Row: {
          allocated_amount: number
          budget_id: string
          created_at: string
          description: string | null
          id: string
          name: string
          remaining_amount: number | null
          spent_amount: number
          updated_at: string
        }
        Insert: {
          allocated_amount?: number
          budget_id: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          remaining_amount?: number | null
          spent_amount?: number
          updated_at?: string
        }
        Update: {
          allocated_amount?: number
          budget_id?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          remaining_amount?: number | null
          spent_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "budget_categories_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "budgets"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_permissions: {
        Row: {
          budget_id: string
          granted_at: string
          granted_by: string
          id: string
          permission_type: string
          user_id: string
        }
        Insert: {
          budget_id: string
          granted_at?: string
          granted_by: string
          id?: string
          permission_type: string
          user_id: string
        }
        Update: {
          budget_id?: string
          granted_at?: string
          granted_by?: string
          id?: string
          permission_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "budget_permissions_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "budgets"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_transactions: {
        Row: {
          amount: number
          budget_category_id: string | null
          budget_id: string
          created_at: string
          description: string | null
          finance_record_id: string | null
          id: string
          payment_id: string | null
          receipt_id: string | null
          transaction_date: string
          transaction_type: string
        }
        Insert: {
          amount: number
          budget_category_id?: string | null
          budget_id: string
          created_at?: string
          description?: string | null
          finance_record_id?: string | null
          id?: string
          payment_id?: string | null
          receipt_id?: string | null
          transaction_date: string
          transaction_type: string
        }
        Update: {
          amount?: number
          budget_category_id?: string | null
          budget_id?: string
          created_at?: string
          description?: string | null
          finance_record_id?: string | null
          id?: string
          payment_id?: string | null
          receipt_id?: string | null
          transaction_date?: string
          transaction_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "budget_transactions_budget_category_id_fkey"
            columns: ["budget_category_id"]
            isOneToOne: false
            referencedRelation: "budget_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_transactions_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "budgets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_transactions_finance_record_id_fkey"
            columns: ["finance_record_id"]
            isOneToOne: false
            referencedRelation: "finance_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_transactions_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "user_payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_transactions_receipt_id_fkey"
            columns: ["receipt_id"]
            isOneToOne: false
            referencedRelation: "receipts"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_user_associations: {
        Row: {
          added_at: string
          added_by: string
          budget_id: string
          id: string
          permission_type: string
          user_id: string
        }
        Insert: {
          added_at?: string
          added_by: string
          budget_id: string
          id?: string
          permission_type: string
          user_id: string
        }
        Update: {
          added_at?: string
          added_by?: string
          budget_id?: string
          id?: string
          permission_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "budget_user_associations_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "budgets"
            referencedColumns: ["id"]
          },
        ]
      }
      budgets: {
        Row: {
          allocated_amount: number
          budget_type: string
          contract_id: string | null
          created_at: string
          created_by: string
          description: string | null
          end_date: string | null
          event_id: string | null
          id: string
          remaining_amount: number | null
          spent_amount: number
          start_date: string
          status: string
          title: string
          total_amount: number
          updated_at: string
        }
        Insert: {
          allocated_amount?: number
          budget_type?: string
          contract_id?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          end_date?: string | null
          event_id?: string | null
          id?: string
          remaining_amount?: number | null
          spent_amount?: number
          start_date: string
          status?: string
          title: string
          total_amount?: number
          updated_at?: string
        }
        Update: {
          allocated_amount?: number
          budget_type?: string
          contract_id?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          end_date?: string | null
          event_id?: string | null
          id?: string
          remaining_amount?: number | null
          spent_amount?: number
          start_date?: string
          status?: string
          title?: string
          total_amount?: number
          updated_at?: string
        }
        Relationships: []
      }
      bulletin_posts: {
        Row: {
          category: string | null
          content: string
          created_at: string | null
          id: string
          is_alumnae_only: boolean | null
          is_featured: boolean | null
          is_public: boolean | null
          title: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          category?: string | null
          content: string
          created_at?: string | null
          id?: string
          is_alumnae_only?: boolean | null
          is_featured?: boolean | null
          is_public?: boolean | null
          title: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          category?: string | null
          content?: string
          created_at?: string | null
          id?: string
          is_alumnae_only?: boolean | null
          is_featured?: boolean | null
          is_public?: boolean | null
          title?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      contract_documents: {
        Row: {
          content: string
          created_at: string
          created_by: string
          id: string
          storage_path: string | null
          title: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by: string
          id?: string
          storage_path?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string
          id?: string
          storage_path?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      contract_recipients: {
        Row: {
          contract_id: string
          id: string
          notes: string | null
          recipient_email: string
          recipient_name: string | null
          sent_at: string
          signature_url: string | null
          signed_at: string | null
          status: string
        }
        Insert: {
          contract_id: string
          id?: string
          notes?: string | null
          recipient_email: string
          recipient_name?: string | null
          sent_at?: string
          signature_url?: string | null
          signed_at?: string | null
          status?: string
        }
        Update: {
          contract_id?: string
          id?: string
          notes?: string | null
          recipient_email?: string
          recipient_name?: string | null
          sent_at?: string
          signature_url?: string | null
          signed_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "contract_recipients_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts_v2"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_recipients_v2: {
        Row: {
          clicked_at: string | null
          contract_id: string
          created_at: string
          custom_message: string | null
          delivery_status: string | null
          email_status: string
          id: string
          is_resend: boolean
          opened_at: string | null
          recipient_email: string
          recipient_name: string
          resend_reason: string | null
          sent_at: string
          sent_by: string | null
        }
        Insert: {
          clicked_at?: string | null
          contract_id: string
          created_at?: string
          custom_message?: string | null
          delivery_status?: string | null
          email_status?: string
          id?: string
          is_resend?: boolean
          opened_at?: string | null
          recipient_email: string
          recipient_name: string
          resend_reason?: string | null
          sent_at?: string
          sent_by?: string | null
        }
        Update: {
          clicked_at?: string | null
          contract_id?: string
          created_at?: string
          custom_message?: string | null
          delivery_status?: string | null
          email_status?: string
          id?: string
          is_resend?: boolean
          opened_at?: string | null
          recipient_email?: string
          recipient_name?: string
          resend_reason?: string | null
          sent_at?: string
          sent_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contract_recipients_v2_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_recipients_v2_sent_by_fkey"
            columns: ["sent_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_signatures: {
        Row: {
          admin_id: string
          admin_signature_data: string | null
          admin_signed_at: string | null
          contract_id: string
          created_at: string
          id: string
          personalized_content: string | null
          status: string
          updated_at: string
          user_id: string
          user_signature_data: string | null
          user_signed_at: string | null
        }
        Insert: {
          admin_id: string
          admin_signature_data?: string | null
          admin_signed_at?: string | null
          contract_id: string
          created_at?: string
          id?: string
          personalized_content?: string | null
          status?: string
          updated_at?: string
          user_id: string
          user_signature_data?: string | null
          user_signed_at?: string | null
        }
        Update: {
          admin_id?: string
          admin_signature_data?: string | null
          admin_signed_at?: string | null
          contract_id?: string
          created_at?: string
          id?: string
          personalized_content?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          user_signature_data?: string | null
          user_signed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contract_signatures_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_signatures_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_signatures_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_signatures_v2: {
        Row: {
          admin_signature_data: string | null
          admin_signed_at: string | null
          artist_signature_data: string | null
          artist_signed_at: string | null
          contract_id: string
          created_at: string
          date_signed: string | null
          embedded_signatures: Json | null
          id: string
          pdf_storage_path: string | null
          signer_ip: unknown | null
          status: string
          updated_at: string
        }
        Insert: {
          admin_signature_data?: string | null
          admin_signed_at?: string | null
          artist_signature_data?: string | null
          artist_signed_at?: string | null
          contract_id: string
          created_at?: string
          date_signed?: string | null
          embedded_signatures?: Json | null
          id?: string
          pdf_storage_path?: string | null
          signer_ip?: unknown | null
          status?: string
          updated_at?: string
        }
        Update: {
          admin_signature_data?: string | null
          admin_signed_at?: string | null
          artist_signature_data?: string | null
          artist_signed_at?: string | null
          contract_id?: string
          created_at?: string
          date_signed?: string | null
          embedded_signatures?: Json | null
          id?: string
          pdf_storage_path?: string | null
          signer_ip?: unknown | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contract_signatures_v2_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts_v2"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_templates: {
        Row: {
          contract_type: string | null
          created_at: string
          created_by: string | null
          header_image_url: string | null
          id: string
          is_active: boolean
          name: string
          template_content: string
          updated_at: string
        }
        Insert: {
          contract_type?: string | null
          created_at?: string
          created_by?: string | null
          header_image_url?: string | null
          id?: string
          is_active?: boolean
          name: string
          template_content: string
          updated_at?: string
        }
        Update: {
          contract_type?: string | null
          created_at?: string
          created_by?: string | null
          header_image_url?: string | null
          id?: string
          is_active?: boolean
          name?: string
          template_content?: string
          updated_at?: string
        }
        Relationships: []
      }
      contract_user_assignments: {
        Row: {
          contract_id: string
          created_at: string
          id: string
          personalized_content: string | null
          signature_url: string | null
          signed_at: string | null
          status: string
          user_id: string
        }
        Insert: {
          contract_id: string
          created_at?: string
          id?: string
          personalized_content?: string | null
          signature_url?: string | null
          signed_at?: string | null
          status?: string
          user_id: string
        }
        Update: {
          contract_id?: string
          created_at?: string
          id?: string
          personalized_content?: string | null
          signature_url?: string | null
          signed_at?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contract_user_assignments_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "generated_contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      contracts: {
        Row: {
          content: string
          created_at: string
          created_by: string
          id: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by: string
          id?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string
          id?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contracts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      contracts_v2: {
        Row: {
          archived: boolean
          content: string
          created_at: string
          created_by: string | null
          id: string
          is_template: boolean
          status: string
          stipend_amount: number | null
          template_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          archived?: boolean
          content: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_template?: boolean
          status?: string
          stipend_amount?: number | null
          template_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          archived?: boolean
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_template?: boolean
          status?: string
          stipend_amount?: number | null
          template_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contracts_v2_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "contracts_v2"
            referencedColumns: ["id"]
          },
        ]
      }
      dashboard_settings: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          image_url: string | null
          setting_name: string
          setting_value: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          image_url?: string | null
          setting_name: string
          setting_value?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          image_url?: string | null
          setting_name?: string
          setting_value?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      event_class_list_members: {
        Row: {
          added_at: string | null
          added_by: string | null
          class_list_id: string
          id: string
          notes: string | null
          required_attendance: boolean | null
          role: string | null
          section: string | null
          user_id: string
          voice_part: string | null
        }
        Insert: {
          added_at?: string | null
          added_by?: string | null
          class_list_id: string
          id?: string
          notes?: string | null
          required_attendance?: boolean | null
          role?: string | null
          section?: string | null
          user_id: string
          voice_part?: string | null
        }
        Update: {
          added_at?: string | null
          added_by?: string | null
          class_list_id?: string
          id?: string
          notes?: string | null
          required_attendance?: boolean | null
          role?: string | null
          section?: string | null
          user_id?: string
          voice_part?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_class_list_members_added_by_fkey"
            columns: ["added_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_class_list_members_class_list_id_fkey"
            columns: ["class_list_id"]
            isOneToOne: false
            referencedRelation: "event_class_lists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_class_list_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      event_class_lists: {
        Row: {
          attendance_required: boolean | null
          created_at: string | null
          created_by: string | null
          description: string | null
          event_id: string
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          attendance_required?: boolean | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          event_id: string
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          attendance_required?: boolean | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          event_id?: string
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_class_lists_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_class_lists_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_contracts: {
        Row: {
          contract_id: string
          event_id: string
          id: string
          uploaded_at: string
        }
        Insert: {
          contract_id: string
          event_id: string
          id?: string
          uploaded_at?: string
        }
        Update: {
          contract_id?: string
          event_id?: string
          id?: string
          uploaded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_contracts_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_contracts_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_images: {
        Row: {
          created_by: string | null
          event_id: string | null
          file_size: number | null
          id: string
          image_name: string | null
          image_url: string
          is_primary: boolean
          uploaded_at: string
        }
        Insert: {
          created_by?: string | null
          event_id?: string | null
          file_size?: number | null
          id?: string
          image_name?: string | null
          image_url: string
          is_primary?: boolean
          uploaded_at?: string
        }
        Update: {
          created_by?: string | null
          event_id?: string | null
          file_size?: number | null
          id?: string
          image_name?: string | null
          image_url?: string
          is_primary?: boolean
          uploaded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_images_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "gw_events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_line_items: {
        Row: {
          amazon_url: string | null
          assigned_to_id: string | null
          category: string
          created_at: string
          event_id: string
          id: string
          item_description: string
          notes: string | null
          paid_from: string | null
          purchase_date_planned: string | null
          purchase_status: string | null
          quantity: number | null
          receipt_url: string | null
          subtotal: number | null
          unit_cost: number | null
          updated_at: string
          vendor_store: string | null
        }
        Insert: {
          amazon_url?: string | null
          assigned_to_id?: string | null
          category?: string
          created_at?: string
          event_id: string
          id?: string
          item_description: string
          notes?: string | null
          paid_from?: string | null
          purchase_date_planned?: string | null
          purchase_status?: string | null
          quantity?: number | null
          receipt_url?: string | null
          subtotal?: number | null
          unit_cost?: number | null
          updated_at?: string
          vendor_store?: string | null
        }
        Update: {
          amazon_url?: string | null
          assigned_to_id?: string | null
          category?: string
          created_at?: string
          event_id?: string
          id?: string
          item_description?: string
          notes?: string | null
          paid_from?: string | null
          purchase_date_planned?: string | null
          purchase_status?: string | null
          quantity?: number | null
          receipt_url?: string | null
          subtotal?: number | null
          unit_cost?: number | null
          updated_at?: string
          vendor_store?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_line_items_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_participants: {
        Row: {
          added_at: string
          event_id: string
          id: string
          notes: string | null
          required_attendance: boolean | null
          role: string | null
          section: string | null
          status: string
          user_id: string
          voice_part: string | null
        }
        Insert: {
          added_at?: string
          event_id: string
          id?: string
          notes?: string | null
          required_attendance?: boolean | null
          role?: string | null
          section?: string | null
          status?: string
          user_id: string
          voice_part?: string | null
        }
        Update: {
          added_at?: string
          event_id?: string
          id?: string
          notes?: string | null
          required_attendance?: boolean | null
          role?: string | null
          section?: string | null
          status?: string
          user_id?: string
          voice_part?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_participants_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_team_members: {
        Row: {
          created_at: string
          event_id: string
          id: string
          role: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          role?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          role?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_team_members_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          admin_fees: number | null
          approval_date: string | null
          approval_needed: boolean | null
          approved: boolean | null
          approver_name: string | null
          attendance_notes: string | null
          attendance_required: boolean | null
          attendance_type: string | null
          attendees: number | null
          brief_description: string | null
          budget_status: string | null
          club_support: number | null
          contingency: number | null
          coordinator_id: string | null
          created_at: string
          created_by: string
          date_submitted_for_approval: string | null
          description: string | null
          donations: number | null
          end_date: string | null
          event_date_end: string | null
          event_date_start: string | null
          event_lead_id: string | null
          event_name: string | null
          event_type: string
          expected_headcount: number | null
          faculty_advisor: string | null
          guest_speakers: string | null
          honoraria: number | null
          id: string
          image_url: string | null
          is_private: boolean | null
          is_travel_involved: boolean | null
          location: string | null
          misc_supplies: number | null
          net_total: number | null
          no_sing_rest_date_end: string | null
          no_sing_rest_date_start: string | null
          no_sing_rest_required: boolean | null
          purpose: string | null
          send_contracts: boolean
          start_date: string
          ticket_sales: number | null
          title: string
          total_expenses: number | null
          total_income: number | null
          updated_at: string
          volunteers: number | null
        }
        Insert: {
          admin_fees?: number | null
          approval_date?: string | null
          approval_needed?: boolean | null
          approved?: boolean | null
          approver_name?: string | null
          attendance_notes?: string | null
          attendance_required?: boolean | null
          attendance_type?: string | null
          attendees?: number | null
          brief_description?: string | null
          budget_status?: string | null
          club_support?: number | null
          contingency?: number | null
          coordinator_id?: string | null
          created_at?: string
          created_by: string
          date_submitted_for_approval?: string | null
          description?: string | null
          donations?: number | null
          end_date?: string | null
          event_date_end?: string | null
          event_date_start?: string | null
          event_lead_id?: string | null
          event_name?: string | null
          event_type?: string
          expected_headcount?: number | null
          faculty_advisor?: string | null
          guest_speakers?: string | null
          honoraria?: number | null
          id?: string
          image_url?: string | null
          is_private?: boolean | null
          is_travel_involved?: boolean | null
          location?: string | null
          misc_supplies?: number | null
          net_total?: number | null
          no_sing_rest_date_end?: string | null
          no_sing_rest_date_start?: string | null
          no_sing_rest_required?: boolean | null
          purpose?: string | null
          send_contracts?: boolean
          start_date: string
          ticket_sales?: number | null
          title: string
          total_expenses?: number | null
          total_income?: number | null
          updated_at?: string
          volunteers?: number | null
        }
        Update: {
          admin_fees?: number | null
          approval_date?: string | null
          approval_needed?: boolean | null
          approved?: boolean | null
          approver_name?: string | null
          attendance_notes?: string | null
          attendance_required?: boolean | null
          attendance_type?: string | null
          attendees?: number | null
          brief_description?: string | null
          budget_status?: string | null
          club_support?: number | null
          contingency?: number | null
          coordinator_id?: string | null
          created_at?: string
          created_by?: string
          date_submitted_for_approval?: string | null
          description?: string | null
          donations?: number | null
          end_date?: string | null
          event_date_end?: string | null
          event_date_start?: string | null
          event_lead_id?: string | null
          event_name?: string | null
          event_type?: string
          expected_headcount?: number | null
          faculty_advisor?: string | null
          guest_speakers?: string | null
          honoraria?: number | null
          id?: string
          image_url?: string | null
          is_private?: boolean | null
          is_travel_involved?: boolean | null
          location?: string | null
          misc_supplies?: number | null
          net_total?: number | null
          no_sing_rest_date_end?: string | null
          no_sing_rest_date_start?: string | null
          no_sing_rest_required?: boolean | null
          purpose?: string | null
          send_contracts?: boolean
          start_date?: string
          ticket_sales?: number | null
          title?: string
          total_expenses?: number | null
          total_income?: number | null
          updated_at?: string
          volunteers?: number | null
        }
        Relationships: []
      }
      excuse_request_history: {
        Row: {
          changed_by: string
          created_at: string
          excuse_request_id: string
          id: string
          notes: string | null
          status: string
        }
        Insert: {
          changed_by: string
          created_at?: string
          excuse_request_id: string
          id?: string
          notes?: string | null
          status: string
        }
        Update: {
          changed_by?: string
          created_at?: string
          excuse_request_id?: string
          id?: string
          notes?: string | null
          status?: string
        }
        Relationships: []
      }
      excuse_requests: {
        Row: {
          admin_notes: string | null
          created_at: string
          event_date: string
          event_id: string | null
          event_title: string
          forwarded_at: string | null
          forwarded_by: string | null
          id: string
          reason: string
          reviewed_at: string | null
          reviewed_by: string | null
          secretary_message: string | null
          secretary_message_sent_at: string | null
          secretary_message_sent_by: string | null
          status: string
          submitted_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          event_date: string
          event_id?: string | null
          event_title: string
          forwarded_at?: string | null
          forwarded_by?: string | null
          id?: string
          reason: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          secretary_message?: string | null
          secretary_message_sent_at?: string | null
          secretary_message_sent_by?: string | null
          status?: string
          submitted_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          event_date?: string
          event_id?: string | null
          event_title?: string
          forwarded_at?: string | null
          forwarded_by?: string | null
          id?: string
          reason?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          secretary_message?: string | null
          secretary_message_sent_at?: string | null
          secretary_message_sent_by?: string | null
          status?: string
          submitted_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      finance_records: {
        Row: {
          amount: number
          balance: number
          category: string
          created_at: string
          date: string
          description: string
          id: string
          notes: string | null
          reference: string | null
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          balance: number
          category: string
          created_at?: string
          date: string
          description: string
          id?: string
          notes?: string | null
          reference?: string | null
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          balance?: number
          category?: string
          created_at?: string
          date?: string
          description?: string
          id?: string
          notes?: string | null
          reference?: string | null
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      food_budget: {
        Row: {
          created_at: string
          event_id: string
          id: string
          item: string
          qty: number | null
          total: number | null
          unit_cost: number | null
          updated_at: string
          vendor_url: string | null
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          item: string
          qty?: number | null
          total?: number | null
          unit_cost?: number | null
          updated_at?: string
          vendor_url?: string | null
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          item?: string
          qty?: number | null
          total?: number | null
          unit_cost?: number | null
          updated_at?: string
          vendor_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "food_budget_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      generated_contracts: {
        Row: {
          contract_content: string
          created_at: string
          created_by: string
          event_dates: string
          event_id: string | null
          event_name: string
          id: string
          location: string
          lodging: boolean
          meals: boolean
          notes: string | null
          performance_times: string | null
          rehearsal_times: string | null
          status: string
          stipend: number | null
          transportation: boolean
          updated_at: string
        }
        Insert: {
          contract_content: string
          created_at?: string
          created_by: string
          event_dates: string
          event_id?: string | null
          event_name: string
          id?: string
          location: string
          lodging?: boolean
          meals?: boolean
          notes?: string | null
          performance_times?: string | null
          rehearsal_times?: string | null
          status?: string
          stipend?: number | null
          transportation?: boolean
          updated_at?: string
        }
        Update: {
          contract_content?: string
          created_at?: string
          created_by?: string
          event_dates?: string
          event_id?: string | null
          event_name?: string
          id?: string
          location?: string
          lodging?: boolean
          meals?: boolean
          notes?: string | null
          performance_times?: string | null
          rehearsal_times?: string | null
          status?: string
          stipend?: number | null
          transportation?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "generated_contracts_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      glee_history: {
        Row: {
          category: string | null
          created_at: string | null
          created_by: string | null
          description: string
          event_date: string
          id: string
          image_url: string | null
          is_featured: boolean | null
          title: string
          updated_at: string | null
          year_occurred: number
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          description: string
          event_date: string
          id?: string
          image_url?: string | null
          is_featured?: boolean | null
          title: string
          updated_at?: string | null
          year_occurred: number
        }
        Update: {
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string
          event_date?: string
          id?: string
          image_url?: string | null
          is_featured?: boolean | null
          title?: string
          updated_at?: string | null
          year_occurred?: number
        }
        Relationships: []
      }
      google_auth_tokens: {
        Row: {
          access_token: string
          created_at: string
          expires_at: string | null
          id: string
          refresh_token: string | null
          updated_at: string
          user_id: string | null
          user_type: string
        }
        Insert: {
          access_token: string
          created_at?: string
          expires_at?: string | null
          id?: string
          refresh_token?: string | null
          updated_at?: string
          user_id?: string | null
          user_type?: string
        }
        Update: {
          access_token?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          refresh_token?: string | null
          updated_at?: string
          user_id?: string | null
          user_type?: string
        }
        Relationships: []
      }
      gw_agendas: {
        Row: {
          agenda_items: Json
          created_at: string
          created_by: string
          id: string
          meeting_date: string
          meeting_type: string
          notes: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          agenda_items?: Json
          created_at?: string
          created_by: string
          id?: string
          meeting_date: string
          meeting_type?: string
          notes?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          agenda_items?: Json
          created_at?: string
          created_by?: string
          id?: string
          meeting_date?: string
          meeting_type?: string
          notes?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      gw_alumnae_notifications: {
        Row: {
          content: string
          created_at: string | null
          created_by: string | null
          id: string
          is_active: boolean | null
          notification_type: string | null
          target_audience: string | null
          target_filter: Json | null
          title: string
          updated_at: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          notification_type?: string | null
          target_audience?: string | null
          target_filter?: Json | null
          title: string
          updated_at?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          notification_type?: string | null
          target_audience?: string | null
          target_filter?: Json | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      gw_annotation_public_shares: {
        Row: {
          created_at: string | null
          description: string | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          is_public: boolean | null
          marked_score_id: string
          permission_type: string
          share_token: string
          shared_by: string
          title: string
          updated_at: string | null
          view_count: number | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          is_public?: boolean | null
          marked_score_id: string
          permission_type?: string
          share_token?: string
          shared_by: string
          title: string
          updated_at?: string | null
          view_count?: number | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          is_public?: boolean | null
          marked_score_id?: string
          permission_type?: string
          share_token?: string
          shared_by?: string
          title?: string
          updated_at?: string | null
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "gw_annotation_public_shares_marked_score_id_fkey"
            columns: ["marked_score_id"]
            isOneToOne: false
            referencedRelation: "gw_marked_scores"
            referencedColumns: ["id"]
          },
        ]
      }
      gw_annotation_shares: {
        Row: {
          created_at: string | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          marked_score_id: string
          message: string | null
          permission_type: string
          shared_at: string | null
          shared_by: string
          shared_with: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          marked_score_id: string
          message?: string | null
          permission_type?: string
          shared_at?: string | null
          shared_by: string
          shared_with: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          marked_score_id?: string
          message?: string | null
          permission_type?: string
          shared_at?: string | null
          shared_by?: string
          shared_with?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gw_annotation_shares_marked_score_id_fkey"
            columns: ["marked_score_id"]
            isOneToOne: false
            referencedRelation: "gw_marked_scores"
            referencedColumns: ["id"]
          },
        ]
      }
      gw_announcements: {
        Row: {
          announcement_type: string | null
          content: string
          created_at: string | null
          created_by: string | null
          expire_date: string | null
          id: string
          is_featured: boolean | null
          publish_date: string | null
          target_audience: string | null
          title: string
        }
        Insert: {
          announcement_type?: string | null
          content: string
          created_at?: string | null
          created_by?: string | null
          expire_date?: string | null
          id?: string
          is_featured?: boolean | null
          publish_date?: string | null
          target_audience?: string | null
          title: string
        }
        Update: {
          announcement_type?: string | null
          content?: string
          created_at?: string | null
          created_by?: string | null
          expire_date?: string | null
          id?: string
          is_featured?: boolean | null
          publish_date?: string | null
          target_audience?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "gw_announcements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "gw_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      gw_appointment_availability: {
        Row: {
          created_at: string
          day_of_week: number
          end_time: string
          id: string
          is_available: boolean
          start_time: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          day_of_week: number
          end_time: string
          id?: string
          is_available?: boolean
          start_time: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          day_of_week?: number
          end_time?: string
          id?: string
          is_available?: boolean
          start_time?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      gw_appointment_calendar_sync: {
        Row: {
          appointment_id: string | null
          calendar_type: string
          created_at: string
          external_event_id: string | null
          id: string
          last_sync_at: string | null
          sync_error: string | null
          sync_status: string | null
          updated_at: string
        }
        Insert: {
          appointment_id?: string | null
          calendar_type: string
          created_at?: string
          external_event_id?: string | null
          id?: string
          last_sync_at?: string | null
          sync_error?: string | null
          sync_status?: string | null
          updated_at?: string
        }
        Update: {
          appointment_id?: string | null
          calendar_type?: string
          created_at?: string
          external_event_id?: string | null
          id?: string
          last_sync_at?: string | null
          sync_error?: string | null
          sync_status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gw_appointment_calendar_sync_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "gw_appointments"
            referencedColumns: ["id"]
          },
        ]
      }
      gw_appointment_history: {
        Row: {
          action_type: string
          appointment_id: string | null
          created_at: string
          id: string
          new_values: Json | null
          notes: string | null
          old_values: Json | null
          performed_by: string | null
        }
        Insert: {
          action_type: string
          appointment_id?: string | null
          created_at?: string
          id?: string
          new_values?: Json | null
          notes?: string | null
          old_values?: Json | null
          performed_by?: string | null
        }
        Update: {
          action_type?: string
          appointment_id?: string | null
          created_at?: string
          id?: string
          new_values?: Json | null
          notes?: string | null
          old_values?: Json | null
          performed_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gw_appointment_history_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "gw_appointments"
            referencedColumns: ["id"]
          },
        ]
      }
      gw_appointment_types: {
        Row: {
          color: string | null
          created_at: string
          default_duration_minutes: number
          description: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          default_duration_minutes?: number
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          default_duration_minutes?: number
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      gw_appointments: {
        Row: {
          appointment_date: string
          appointment_type: string
          assigned_to: string | null
          client_email: string | null
          client_name: string
          client_phone: string | null
          created_at: string
          created_by: string | null
          description: string | null
          duration_minutes: number
          id: string
          notes: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          appointment_date: string
          appointment_type?: string
          assigned_to?: string | null
          client_email?: string | null
          client_name: string
          client_phone?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          duration_minutes?: number
          id?: string
          notes?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          appointment_date?: string
          appointment_type?: string
          assigned_to?: string | null
          client_email?: string | null
          client_name?: string
          client_phone?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          duration_minutes?: number
          id?: string
          notes?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      gw_attendance_excuses: {
        Row: {
          attendance_id: string
          created_at: string | null
          documentation_url: string | null
          id: string
          reason: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string | null
        }
        Insert: {
          attendance_id: string
          created_at?: string | null
          documentation_url?: string | null
          id?: string
          reason: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
        }
        Update: {
          attendance_id?: string
          created_at?: string | null
          documentation_url?: string | null
          id?: string
          reason?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gw_attendance_excuses_attendance_id_fkey"
            columns: ["attendance_id"]
            isOneToOne: false
            referencedRelation: "gw_event_attendance"
            referencedColumns: ["id"]
          },
        ]
      }
      gw_attendance_policies: {
        Row: {
          created_at: string | null
          created_by: string | null
          event_type: string
          id: string
          is_active: boolean | null
          max_unexcused_absences: number | null
          policy_description: string | null
          required_attendance_percentage: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          event_type: string
          id?: string
          is_active?: boolean | null
          max_unexcused_absences?: number | null
          policy_description?: string | null
          required_attendance_percentage?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          event_type?: string
          id?: string
          is_active?: boolean | null
          max_unexcused_absences?: number | null
          policy_description?: string | null
          required_attendance_percentage?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      gw_attendance_qr_codes: {
        Row: {
          created_at: string
          event_id: string
          expires_at: string
          generated_at: string
          generated_by: string
          id: string
          is_active: boolean
          location_data: Json | null
          max_scans: number | null
          qr_token: string
          scan_count: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          event_id: string
          expires_at: string
          generated_at?: string
          generated_by: string
          id?: string
          is_active?: boolean
          location_data?: Json | null
          max_scans?: number | null
          qr_token: string
          scan_count?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          event_id?: string
          expires_at?: string
          generated_at?: string
          generated_by?: string
          id?: string
          is_active?: boolean
          location_data?: Json | null
          max_scans?: number | null
          qr_token?: string
          scan_count?: number
          updated_at?: string
        }
        Relationships: []
      }
      gw_attendance_qr_scans: {
        Row: {
          created_at: string
          id: string
          ip_address: unknown | null
          qr_code_id: string
          scan_location: Json | null
          scanned_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          ip_address?: unknown | null
          qr_code_id: string
          scan_location?: Json | null
          scanned_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          ip_address?: unknown | null
          qr_code_id?: string
          scan_location?: Json | null
          scanned_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gw_attendance_qr_scans_qr_code_id_fkey"
            columns: ["qr_code_id"]
            isOneToOne: false
            referencedRelation: "gw_attendance_qr_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      gw_audio_files: {
        Row: {
          bitrate: number | null
          channels: number | null
          created_at: string | null
          file_url: string
          id: string
          music_file_id: string | null
          quality: string | null
          sample_rate: number | null
        }
        Insert: {
          bitrate?: number | null
          channels?: number | null
          created_at?: string | null
          file_url: string
          id?: string
          music_file_id?: string | null
          quality?: string | null
          sample_rate?: number | null
        }
        Update: {
          bitrate?: number | null
          channels?: number | null
          created_at?: string | null
          file_url?: string
          id?: string
          music_file_id?: string | null
          quality?: string | null
          sample_rate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "gw_audio_files_music_file_id_fkey"
            columns: ["music_file_id"]
            isOneToOne: false
            referencedRelation: "gw_music_files"
            referencedColumns: ["id"]
          },
        ]
      }
      gw_audition_logs: {
        Row: {
          applicant_email: string
          applicant_name: string
          applicant_picture_url: string | null
          application_data: Json | null
          audition_date: string
          audition_id: string | null
          audition_time: string
          created_at: string
          grade_data: Json | null
          graded_at: string | null
          graded_by: string | null
          id: string
          is_reviewed: boolean | null
          notes: string | null
          status: string | null
          updated_at: string
          user_id: string | null
          voice_part: string | null
        }
        Insert: {
          applicant_email: string
          applicant_name: string
          applicant_picture_url?: string | null
          application_data?: Json | null
          audition_date: string
          audition_id?: string | null
          audition_time: string
          created_at?: string
          grade_data?: Json | null
          graded_at?: string | null
          graded_by?: string | null
          id?: string
          is_reviewed?: boolean | null
          notes?: string | null
          status?: string | null
          updated_at?: string
          user_id?: string | null
          voice_part?: string | null
        }
        Update: {
          applicant_email?: string
          applicant_name?: string
          applicant_picture_url?: string | null
          application_data?: Json | null
          audition_date?: string
          audition_id?: string | null
          audition_time?: string
          created_at?: string
          grade_data?: Json | null
          graded_at?: string | null
          graded_by?: string | null
          id?: string
          is_reviewed?: boolean | null
          notes?: string | null
          status?: string | null
          updated_at?: string
          user_id?: string | null
          voice_part?: string | null
        }
        Relationships: []
      }
      gw_auditions: {
        Row: {
          additional_info: string | null
          audition_date: string
          audition_time: string
          created_at: string
          email: string
          first_name: string
          high_school_section: string | null
          high_school_years: string | null
          id: string
          instrument_details: string | null
          interested_in_leadership: boolean
          interested_in_music_fundamentals: boolean
          interested_in_voice_lessons: boolean
          is_soloist: boolean
          last_name: string
          personality_description: string
          phone: string
          plays_instrument: boolean
          reads_music: boolean
          sang_in_high_school: boolean
          sang_in_middle_school: boolean
          selfie_url: string | null
          soloist_rating: number | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          additional_info?: string | null
          audition_date: string
          audition_time: string
          created_at?: string
          email: string
          first_name: string
          high_school_section?: string | null
          high_school_years?: string | null
          id?: string
          instrument_details?: string | null
          interested_in_leadership?: boolean
          interested_in_music_fundamentals?: boolean
          interested_in_voice_lessons?: boolean
          is_soloist?: boolean
          last_name: string
          personality_description: string
          phone: string
          plays_instrument?: boolean
          reads_music?: boolean
          sang_in_high_school?: boolean
          sang_in_middle_school?: boolean
          selfie_url?: string | null
          soloist_rating?: number | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          additional_info?: string | null
          audition_date?: string
          audition_time?: string
          created_at?: string
          email?: string
          first_name?: string
          high_school_section?: string | null
          high_school_years?: string | null
          id?: string
          instrument_details?: string | null
          interested_in_leadership?: boolean
          interested_in_music_fundamentals?: boolean
          interested_in_voice_lessons?: boolean
          is_soloist?: boolean
          last_name?: string
          personality_description?: string
          phone?: string
          plays_instrument?: boolean
          reads_music?: boolean
          sang_in_high_school?: boolean
          sang_in_middle_school?: boolean
          selfie_url?: string | null
          soloist_rating?: number | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      gw_booking_requests: {
        Row: {
          assigned_to: string | null
          av_capabilities: string | null
          contact_email: string
          contact_person_name: string
          contact_phone: string
          contact_title: string | null
          created_at: string
          dietary_restrictions: string | null
          dressing_rooms_available: boolean | null
          event_date_end: string | null
          event_date_start: string
          event_description: string | null
          event_name: string
          event_recorded_livestreamed: boolean | null
          expected_attendance: number | null
          formal_contract_required: boolean | null
          honorarium_amount: number | null
          honorarium_offered: boolean | null
          how_heard_about_us: string | null
          id: string
          lighting_available: boolean | null
          lighting_description: string | null
          load_in_soundcheck_time: string | null
          lodging_nights: number | null
          lodging_provided: boolean | null
          meals_provided: boolean | null
          notes_for_choir: string | null
          notes_for_director: string | null
          organization_name: string
          performance_duration: string
          performance_time: string | null
          photo_video_permission: boolean | null
          piano_available: boolean | null
          piano_type: string | null
          preferred_arrival_point: string | null
          promotional_assets_requested: string[] | null
          recording_description: string | null
          rehearsal_time_provided: string | null
          sound_system_available: boolean | null
          sound_system_description: string | null
          stage_dimensions: string | null
          status: string
          theme_occasion: string | null
          travel_expenses_covered: string[] | null
          updated_at: string
          venue_address: string
          venue_name: string
          venue_type: string
          website: string | null
        }
        Insert: {
          assigned_to?: string | null
          av_capabilities?: string | null
          contact_email: string
          contact_person_name: string
          contact_phone: string
          contact_title?: string | null
          created_at?: string
          dietary_restrictions?: string | null
          dressing_rooms_available?: boolean | null
          event_date_end?: string | null
          event_date_start: string
          event_description?: string | null
          event_name: string
          event_recorded_livestreamed?: boolean | null
          expected_attendance?: number | null
          formal_contract_required?: boolean | null
          honorarium_amount?: number | null
          honorarium_offered?: boolean | null
          how_heard_about_us?: string | null
          id?: string
          lighting_available?: boolean | null
          lighting_description?: string | null
          load_in_soundcheck_time?: string | null
          lodging_nights?: number | null
          lodging_provided?: boolean | null
          meals_provided?: boolean | null
          notes_for_choir?: string | null
          notes_for_director?: string | null
          organization_name: string
          performance_duration: string
          performance_time?: string | null
          photo_video_permission?: boolean | null
          piano_available?: boolean | null
          piano_type?: string | null
          preferred_arrival_point?: string | null
          promotional_assets_requested?: string[] | null
          recording_description?: string | null
          rehearsal_time_provided?: string | null
          sound_system_available?: boolean | null
          sound_system_description?: string | null
          stage_dimensions?: string | null
          status?: string
          theme_occasion?: string | null
          travel_expenses_covered?: string[] | null
          updated_at?: string
          venue_address: string
          venue_name: string
          venue_type: string
          website?: string | null
        }
        Update: {
          assigned_to?: string | null
          av_capabilities?: string | null
          contact_email?: string
          contact_person_name?: string
          contact_phone?: string
          contact_title?: string | null
          created_at?: string
          dietary_restrictions?: string | null
          dressing_rooms_available?: boolean | null
          event_date_end?: string | null
          event_date_start?: string
          event_description?: string | null
          event_name?: string
          event_recorded_livestreamed?: boolean | null
          expected_attendance?: number | null
          formal_contract_required?: boolean | null
          honorarium_amount?: number | null
          honorarium_offered?: boolean | null
          how_heard_about_us?: string | null
          id?: string
          lighting_available?: boolean | null
          lighting_description?: string | null
          load_in_soundcheck_time?: string | null
          lodging_nights?: number | null
          lodging_provided?: boolean | null
          meals_provided?: boolean | null
          notes_for_choir?: string | null
          notes_for_director?: string | null
          organization_name?: string
          performance_duration?: string
          performance_time?: string | null
          photo_video_permission?: boolean | null
          piano_available?: boolean | null
          piano_type?: string | null
          preferred_arrival_point?: string | null
          promotional_assets_requested?: string[] | null
          recording_description?: string | null
          rehearsal_time_provided?: string | null
          sound_system_available?: boolean | null
          sound_system_description?: string | null
          stage_dimensions?: string | null
          status?: string
          theme_occasion?: string | null
          travel_expenses_covered?: string[] | null
          updated_at?: string
          venue_address?: string
          venue_name?: string
          venue_type?: string
          website?: string | null
        }
        Relationships: []
      }
      gw_buckets_of_love: {
        Row: {
          created_at: string
          decorations: string | null
          id: string
          is_anonymous: boolean
          likes: number | null
          message: string
          note_color: string
          recipient_user_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          decorations?: string | null
          id?: string
          is_anonymous?: boolean
          likes?: number | null
          message: string
          note_color?: string
          recipient_user_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          decorations?: string | null
          id?: string
          is_anonymous?: boolean
          likes?: number | null
          message?: string
          note_color?: string
          recipient_user_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      gw_buckets_of_love_likes: {
        Row: {
          created_at: string
          id: string
          message_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gw_buckets_of_love_likes_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "gw_buckets_of_love"
            referencedColumns: ["id"]
          },
        ]
      }
      gw_calendar_auto_sync: {
        Row: {
          calendar_id: string
          created_at: string
          id: string
          is_active: boolean
          last_sync_at: string | null
          sync_frequency_hours: number
          updated_at: string
          user_id: string
        }
        Insert: {
          calendar_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          last_sync_at?: string | null
          sync_frequency_hours?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          calendar_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          last_sync_at?: string | null
          sync_frequency_hours?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      gw_calendars: {
        Row: {
          color: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_default: boolean
          is_visible: boolean
          name: string
          updated_at: string
        }
        Insert: {
          color?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_default?: boolean
          is_visible?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_default?: boolean
          is_visible?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      gw_chaplain_announcements: {
        Row: {
          announcement_type: string | null
          content: string
          created_at: string
          created_by: string
          id: string
          is_published: boolean | null
          is_recurring: boolean | null
          media_urls: string[] | null
          recurrence_pattern: string | null
          scheduled_date: string | null
          target_audience: string | null
          title: string
          updated_at: string
        }
        Insert: {
          announcement_type?: string | null
          content: string
          created_at?: string
          created_by: string
          id?: string
          is_published?: boolean | null
          is_recurring?: boolean | null
          media_urls?: string[] | null
          recurrence_pattern?: string | null
          scheduled_date?: string | null
          target_audience?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          announcement_type?: string | null
          content?: string
          created_at?: string
          created_by?: string
          id?: string
          is_published?: boolean | null
          is_recurring?: boolean | null
          media_urls?: string[] | null
          recurrence_pattern?: string | null
          scheduled_date?: string | null
          target_audience?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      gw_chaplain_resources: {
        Row: {
          category: string
          content: string | null
          created_at: string
          created_by: string
          description: string | null
          file_url: string | null
          id: string
          is_editable: boolean | null
          resource_type: string
          title: string
          updated_at: string
          version: number | null
        }
        Insert: {
          category: string
          content?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          file_url?: string | null
          id?: string
          is_editable?: boolean | null
          resource_type: string
          title: string
          updated_at?: string
          version?: number | null
        }
        Update: {
          category?: string
          content?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          file_url?: string | null
          id?: string
          is_editable?: boolean | null
          resource_type?: string
          title?: string
          updated_at?: string
          version?: number | null
        }
        Relationships: []
      }
      gw_class_conflict_requests: {
        Row: {
          conflict_analysis: Json
          created_at: string
          final_approval: Json | null
          id: string
          rejection_reason: string | null
          schedule: Json
          secretary_approval: Json | null
          section_leader_approval: Json | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          conflict_analysis: Json
          created_at?: string
          final_approval?: Json | null
          id?: string
          rejection_reason?: string | null
          schedule: Json
          secretary_approval?: Json | null
          section_leader_approval?: Json | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          conflict_analysis?: Json
          created_at?: string
          final_approval?: Json | null
          id?: string
          rejection_reason?: string | null
          schedule?: Json
          secretary_approval?: Json | null
          section_leader_approval?: Json | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      gw_class_schedules: {
        Row: {
          academic_year: string
          class_name: string
          course_number: string
          created_at: string
          days_of_week: string[]
          end_time: string
          id: string
          is_active: boolean
          professor_name: string | null
          room_location: string | null
          semester: string
          start_time: string
          updated_at: string
          user_id: string
        }
        Insert: {
          academic_year?: string
          class_name: string
          course_number: string
          created_at?: string
          days_of_week: string[]
          end_time: string
          id?: string
          is_active?: boolean
          professor_name?: string | null
          room_location?: string | null
          semester?: string
          start_time: string
          updated_at?: string
          user_id: string
        }
        Update: {
          academic_year?: string
          class_name?: string
          course_number?: string
          created_at?: string
          days_of_week?: string[]
          end_time?: string
          id?: string
          is_active?: boolean
          professor_name?: string | null
          room_location?: string | null
          semester?: string
          start_time?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      gw_communication_deliveries: {
        Row: {
          channel: string
          clicked_at: string | null
          communication_id: string
          created_at: string
          delivered_at: string | null
          error_message: string | null
          external_id: string | null
          id: string
          opened_at: string | null
          recipient_email: string
          recipient_id: string | null
          recipient_name: string | null
          sent_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          channel: string
          clicked_at?: string | null
          communication_id: string
          created_at?: string
          delivered_at?: string | null
          error_message?: string | null
          external_id?: string | null
          id?: string
          opened_at?: string | null
          recipient_email: string
          recipient_id?: string | null
          recipient_name?: string | null
          sent_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          channel?: string
          clicked_at?: string | null
          communication_id?: string
          created_at?: string
          delivered_at?: string | null
          error_message?: string | null
          external_id?: string | null
          id?: string
          opened_at?: string | null
          recipient_email?: string
          recipient_id?: string | null
          recipient_name?: string | null
          sent_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gw_communication_deliveries_communication_id_fkey"
            columns: ["communication_id"]
            isOneToOne: false
            referencedRelation: "gw_communications"
            referencedColumns: ["id"]
          },
        ]
      }
      gw_communications: {
        Row: {
          channels: string[]
          content: string
          created_at: string
          delivery_summary: Json | null
          id: string
          recipient_groups: Json
          scheduled_for: string | null
          sender_id: string | null
          sent_at: string | null
          status: string
          template_id: string | null
          title: string
          total_recipients: number
          updated_at: string
        }
        Insert: {
          channels?: string[]
          content: string
          created_at?: string
          delivery_summary?: Json | null
          id?: string
          recipient_groups?: Json
          scheduled_for?: string | null
          sender_id?: string | null
          sent_at?: string | null
          status?: string
          template_id?: string | null
          title: string
          total_recipients?: number
          updated_at?: string
        }
        Update: {
          channels?: string[]
          content?: string
          created_at?: string
          delivery_summary?: Json | null
          id?: string
          recipient_groups?: Json
          scheduled_for?: string | null
          sender_id?: string | null
          sent_at?: string | null
          status?: string
          template_id?: string | null
          title?: string
          total_recipients?: number
          updated_at?: string
        }
        Relationships: []
      }
      gw_dues_payment_plans: {
        Row: {
          auto_debit: boolean | null
          created_at: string
          dues_record_id: string
          end_date: string | null
          frequency: string
          id: string
          installment_amount: number
          installments: number
          payment_method: string | null
          start_date: string
          status: string
          total_amount: number
          updated_at: string
          user_id: string
        }
        Insert: {
          auto_debit?: boolean | null
          created_at?: string
          dues_record_id: string
          end_date?: string | null
          frequency?: string
          id?: string
          installment_amount: number
          installments?: number
          payment_method?: string | null
          start_date: string
          status?: string
          total_amount: number
          updated_at?: string
          user_id: string
        }
        Update: {
          auto_debit?: boolean | null
          created_at?: string
          dues_record_id?: string
          end_date?: string | null
          frequency?: string
          id?: string
          installment_amount?: number
          installments?: number
          payment_method?: string | null
          start_date?: string
          status?: string
          total_amount?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      gw_dues_records: {
        Row: {
          academic_year: string
          amount: number
          created_at: string
          due_date: string
          id: string
          notes: string | null
          paid_date: string | null
          payment_method: string | null
          semester: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          academic_year: string
          amount: number
          created_at?: string
          due_date: string
          id?: string
          notes?: string | null
          paid_date?: string | null
          payment_method?: string | null
          semester: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          academic_year?: string
          amount?: number
          created_at?: string
          due_date?: string
          id?: string
          notes?: string | null
          paid_date?: string | null
          payment_method?: string | null
          semester?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      gw_dues_reminders: {
        Row: {
          created_at: string
          custom_message: string | null
          days_before_due: number
          dues_record_id: string | null
          id: string
          installment_id: string | null
          is_active: boolean | null
          last_sent_at: string | null
          next_send_at: string | null
          payment_plan_id: string | null
          reminder_frequency: string
          reminder_type: string
          template_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          custom_message?: string | null
          days_before_due?: number
          dues_record_id?: string | null
          id?: string
          installment_id?: string | null
          is_active?: boolean | null
          last_sent_at?: string | null
          next_send_at?: string | null
          payment_plan_id?: string | null
          reminder_frequency?: string
          reminder_type?: string
          template_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          custom_message?: string | null
          days_before_due?: number
          dues_record_id?: string | null
          id?: string
          installment_id?: string | null
          is_active?: boolean | null
          last_sent_at?: string | null
          next_send_at?: string | null
          payment_plan_id?: string | null
          reminder_frequency?: string
          reminder_type?: string
          template_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      gw_event_attendance: {
        Row: {
          attendance_status: string
          check_in_time: string | null
          check_out_time: string | null
          created_at: string | null
          event_id: string
          id: string
          notes: string | null
          recorded_by: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          attendance_status?: string
          check_in_time?: string | null
          check_out_time?: string | null
          created_at?: string | null
          event_id: string
          id?: string
          notes?: string | null
          recorded_by?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          attendance_status?: string
          check_in_time?: string | null
          check_out_time?: string | null
          created_at?: string | null
          event_id?: string
          id?: string
          notes?: string | null
          recorded_by?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gw_event_attendance_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "gw_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gw_event_attendance_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "gw_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "gw_event_attendance_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "user_dashboard_data"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "gw_event_attendance_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "gw_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "gw_event_attendance_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_dashboard_data"
            referencedColumns: ["user_id"]
          },
        ]
      }
      gw_event_rsvps: {
        Row: {
          event_id: string | null
          id: string
          notes: string | null
          response_date: string | null
          status: string | null
          user_id: string | null
        }
        Insert: {
          event_id?: string | null
          id?: string
          notes?: string | null
          response_date?: string | null
          status?: string | null
          user_id?: string | null
        }
        Update: {
          event_id?: string | null
          id?: string
          notes?: string | null
          response_date?: string | null
          status?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gw_event_rsvps_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "gw_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gw_event_rsvps_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "gw_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      gw_events: {
        Row: {
          address: string | null
          attendance_deadline: string | null
          attendance_notes: string | null
          attendance_required: boolean | null
          attendance_type: string | null
          calendar_id: string
          created_at: string | null
          created_by: string | null
          description: string | null
          end_date: string | null
          event_type: string | null
          excuse_required: boolean | null
          external_id: string | null
          external_source: string | null
          id: string
          image_url: string | null
          is_private: boolean | null
          is_public: boolean | null
          late_arrival_allowed: boolean | null
          location: string | null
          max_attendees: number | null
          registration_required: boolean | null
          start_date: string
          status: string | null
          tags: string[] | null
          title: string
          updated_at: string | null
          venue_name: string | null
        }
        Insert: {
          address?: string | null
          attendance_deadline?: string | null
          attendance_notes?: string | null
          attendance_required?: boolean | null
          attendance_type?: string | null
          calendar_id: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          event_type?: string | null
          excuse_required?: boolean | null
          external_id?: string | null
          external_source?: string | null
          id?: string
          image_url?: string | null
          is_private?: boolean | null
          is_public?: boolean | null
          late_arrival_allowed?: boolean | null
          location?: string | null
          max_attendees?: number | null
          registration_required?: boolean | null
          start_date: string
          status?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string | null
          venue_name?: string | null
        }
        Update: {
          address?: string | null
          attendance_deadline?: string | null
          attendance_notes?: string | null
          attendance_required?: boolean | null
          attendance_type?: string | null
          calendar_id?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          event_type?: string | null
          excuse_required?: boolean | null
          external_id?: string | null
          external_source?: string | null
          id?: string
          image_url?: string | null
          is_private?: boolean | null
          is_public?: boolean | null
          late_arrival_allowed?: boolean | null
          location?: string | null
          max_attendees?: number | null
          registration_required?: boolean | null
          start_date?: string
          status?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string | null
          venue_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gw_events_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "gw_calendars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gw_events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "gw_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      gw_executive_board_checkins: {
        Row: {
          action_type: string
          checked_by: string
          checked_to_user_id: string | null
          created_at: string
          event_id: string | null
          id: string
          item_condition: string
          item_name: string
          item_type: string
          notes: string | null
        }
        Insert: {
          action_type: string
          checked_by: string
          checked_to_user_id?: string | null
          created_at?: string
          event_id?: string | null
          id?: string
          item_condition?: string
          item_name: string
          item_type: string
          notes?: string | null
        }
        Update: {
          action_type?: string
          checked_by?: string
          checked_to_user_id?: string | null
          created_at?: string
          event_id?: string | null
          id?: string
          item_condition?: string
          item_name?: string
          item_type?: string
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gw_executive_board_checkins_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      gw_executive_board_files: {
        Row: {
          category: string
          created_at: string
          event_id: string | null
          file_path: string
          file_size: number | null
          file_type: string | null
          filename: string
          id: string
          is_public: boolean
          position_scope:
            | Database["public"]["Enums"]["executive_position"]
            | null
          task_id: string | null
          updated_at: string
          uploaded_by: string
        }
        Insert: {
          category?: string
          created_at?: string
          event_id?: string | null
          file_path: string
          file_size?: number | null
          file_type?: string | null
          filename: string
          id?: string
          is_public?: boolean
          position_scope?:
            | Database["public"]["Enums"]["executive_position"]
            | null
          task_id?: string | null
          updated_at?: string
          uploaded_by: string
        }
        Update: {
          category?: string
          created_at?: string
          event_id?: string | null
          file_path?: string
          file_size?: number | null
          file_type?: string | null
          filename?: string
          id?: string
          is_public?: boolean
          position_scope?:
            | Database["public"]["Enums"]["executive_position"]
            | null
          task_id?: string | null
          updated_at?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "gw_executive_board_files_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gw_executive_board_files_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "gw_executive_board_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      gw_executive_board_members: {
        Row: {
          academic_year: string
          appointed_date: string | null
          created_at: string
          id: string
          is_active: boolean
          notes: string | null
          position: Database["public"]["Enums"]["executive_position"]
          primary_tab: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          academic_year: string
          appointed_date?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          notes?: string | null
          position: Database["public"]["Enums"]["executive_position"]
          primary_tab?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          academic_year?: string
          appointed_date?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          notes?: string | null
          position?: Database["public"]["Enums"]["executive_position"]
          primary_tab?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      gw_executive_board_notifications: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_read: boolean
          message: string
          notification_type: string
          priority: string
          read_at: string | null
          recipient_position:
            | Database["public"]["Enums"]["executive_position"]
            | null
          recipient_user_id: string
          related_event_id: string | null
          related_task_id: string | null
          title: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_read?: boolean
          message: string
          notification_type?: string
          priority?: string
          read_at?: string | null
          recipient_position?:
            | Database["public"]["Enums"]["executive_position"]
            | null
          recipient_user_id: string
          related_event_id?: string | null
          related_task_id?: string | null
          title: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_read?: boolean
          message?: string
          notification_type?: string
          priority?: string
          read_at?: string | null
          recipient_position?:
            | Database["public"]["Enums"]["executive_position"]
            | null
          recipient_user_id?: string
          related_event_id?: string | null
          related_task_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "gw_executive_board_notifications_related_event_id_fkey"
            columns: ["related_event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gw_executive_board_notifications_related_task_id_fkey"
            columns: ["related_task_id"]
            isOneToOne: false
            referencedRelation: "gw_executive_board_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      gw_executive_board_progress_log: {
        Row: {
          action_description: string
          action_type: string
          created_at: string
          id: string
          metadata: Json | null
          related_entity_id: string | null
          related_entity_type: string | null
          user_id: string
          user_position:
            | Database["public"]["Enums"]["executive_position"]
            | null
        }
        Insert: {
          action_description: string
          action_type: string
          created_at?: string
          id?: string
          metadata?: Json | null
          related_entity_id?: string | null
          related_entity_type?: string | null
          user_id: string
          user_position?:
            | Database["public"]["Enums"]["executive_position"]
            | null
        }
        Update: {
          action_description?: string
          action_type?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          related_entity_id?: string | null
          related_entity_type?: string | null
          user_id?: string
          user_position?:
            | Database["public"]["Enums"]["executive_position"]
            | null
        }
        Relationships: []
      }
      gw_executive_board_tasks: {
        Row: {
          assigned_to_position:
            | Database["public"]["Enums"]["executive_position"]
            | null
          assigned_to_user_id: string | null
          completed_at: string | null
          created_at: string
          created_by: string
          description: string | null
          director_verified_at: string | null
          director_verified_by: string | null
          due_date: string | null
          event_id: string | null
          id: string
          priority: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to_position?:
            | Database["public"]["Enums"]["executive_position"]
            | null
          assigned_to_user_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          director_verified_at?: string | null
          director_verified_by?: string | null
          due_date?: string | null
          event_id?: string | null
          id?: string
          priority?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to_position?:
            | Database["public"]["Enums"]["executive_position"]
            | null
          assigned_to_user_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          director_verified_at?: string | null
          director_verified_by?: string | null
          due_date?: string | null
          event_id?: string | null
          id?: string
          priority?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gw_executive_board_tasks_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      gw_fans: {
        Row: {
          created_at: string | null
          fan_level: string | null
          id: string
          membership_date: string | null
          preferences: Json | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          fan_level?: string | null
          id?: string
          membership_date?: string | null
          preferences?: Json | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          fan_level?: string | null
          id?: string
          membership_date?: string | null
          preferences?: Json | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gw_fans_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "gw_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      gw_general_transactions: {
        Row: {
          amount: number
          category: string
          created_at: string
          created_by: string
          description: string
          id: string
          notes: string | null
          payment_method: string
          receipt_url: string | null
          transaction_date: string
          transaction_type: string
          updated_at: string
        }
        Insert: {
          amount: number
          category: string
          created_at?: string
          created_by: string
          description: string
          id?: string
          notes?: string | null
          payment_method: string
          receipt_url?: string | null
          transaction_date: string
          transaction_type: string
          updated_at?: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          created_by?: string
          description?: string
          id?: string
          notes?: string | null
          payment_method?: string
          receipt_url?: string | null
          transaction_date?: string
          transaction_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      gw_hero_settings: {
        Row: {
          background_image_url: string | null
          created_at: string | null
          display_order: number | null
          id: string
          is_active: boolean | null
          overlay_opacity: number | null
          subtitle: string | null
          text_color: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          background_image_url?: string | null
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          overlay_opacity?: number | null
          subtitle?: string | null
          text_color?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          background_image_url?: string | null
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          overlay_opacity?: number | null
          subtitle?: string | null
          text_color?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      gw_hero_slides: {
        Row: {
          action_button_enabled: boolean | null
          action_button_text: string | null
          action_button_url: string | null
          button_text: string | null
          created_at: string | null
          description: string | null
          description_position_horizontal: string | null
          description_position_vertical: string | null
          description_size: string | null
          display_order: number | null
          hero_settings_id: string | null
          id: string
          image_url: string | null
          ipad_image_url: string | null
          is_active: boolean | null
          link_url: string | null
          mobile_image_url: string | null
          slide_duration_seconds: number | null
          title: string | null
          title_position_horizontal: string | null
          title_position_vertical: string | null
          title_size: string | null
          usage_context: string | null
        }
        Insert: {
          action_button_enabled?: boolean | null
          action_button_text?: string | null
          action_button_url?: string | null
          button_text?: string | null
          created_at?: string | null
          description?: string | null
          description_position_horizontal?: string | null
          description_position_vertical?: string | null
          description_size?: string | null
          display_order?: number | null
          hero_settings_id?: string | null
          id?: string
          image_url?: string | null
          ipad_image_url?: string | null
          is_active?: boolean | null
          link_url?: string | null
          mobile_image_url?: string | null
          slide_duration_seconds?: number | null
          title?: string | null
          title_position_horizontal?: string | null
          title_position_vertical?: string | null
          title_size?: string | null
          usage_context?: string | null
        }
        Update: {
          action_button_enabled?: boolean | null
          action_button_text?: string | null
          action_button_url?: string | null
          button_text?: string | null
          created_at?: string | null
          description?: string | null
          description_position_horizontal?: string | null
          description_position_vertical?: string | null
          description_size?: string | null
          display_order?: number | null
          hero_settings_id?: string | null
          id?: string
          image_url?: string | null
          ipad_image_url?: string | null
          is_active?: boolean | null
          link_url?: string | null
          mobile_image_url?: string | null
          slide_duration_seconds?: number | null
          title?: string | null
          title_position_horizontal?: string | null
          title_position_vertical?: string | null
          title_size?: string | null
          usage_context?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gw_hero_slides_hero_settings_id_fkey"
            columns: ["hero_settings_id"]
            isOneToOne: false
            referencedRelation: "gw_hero_settings"
            referencedColumns: ["id"]
          },
        ]
      }
      gw_leadership_development: {
        Row: {
          approved_by: string | null
          created_at: string
          goals_set: string[] | null
          id: string
          is_approved: boolean
          mentor_feedback: string | null
          position: Database["public"]["Enums"]["executive_position"]
          reflection_content: string
          reflection_title: string
          semester: string
          skills_developed: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          approved_by?: string | null
          created_at?: string
          goals_set?: string[] | null
          id?: string
          is_approved?: boolean
          mentor_feedback?: string | null
          position: Database["public"]["Enums"]["executive_position"]
          reflection_content: string
          reflection_title: string
          semester: string
          skills_developed?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          approved_by?: string | null
          created_at?: string
          goals_set?: string[] | null
          id?: string
          is_approved?: boolean
          mentor_feedback?: string | null
          position?: Database["public"]["Enums"]["executive_position"]
          reflection_content?: string
          reflection_title?: string
          semester?: string
          skills_developed?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      gw_licensing_entries: {
        Row: {
          created_at: string
          created_by: string
          expires_on: string | null
          id: string
          is_active: boolean
          license_number: string | null
          license_type: string
          music_id: string
          performance_fee: number | null
          proof_url: string | null
          publisher: string | null
          rights_holder: string | null
          territory_restrictions: string | null
          updated_at: string
          usage_notes: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          expires_on?: string | null
          id?: string
          is_active?: boolean
          license_number?: string | null
          license_type: string
          music_id: string
          performance_fee?: number | null
          proof_url?: string | null
          publisher?: string | null
          rights_holder?: string | null
          territory_restrictions?: string | null
          updated_at?: string
          usage_notes?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          expires_on?: string | null
          id?: string
          is_active?: boolean
          license_number?: string | null
          license_type?: string
          music_id?: string
          performance_fee?: number | null
          proof_url?: string | null
          publisher?: string | null
          rights_holder?: string | null
          territory_restrictions?: string | null
          updated_at?: string
          usage_notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gw_licensing_entries_music_id_fkey"
            columns: ["music_id"]
            isOneToOne: false
            referencedRelation: "gw_sheet_music"
            referencedColumns: ["id"]
          },
        ]
      }
      gw_liturgical_events: {
        Row: {
          created_at: string
          created_by: string
          event_date: string
          event_name: string
          id: string
          music_selection_ids: string[] | null
          notes: string | null
          prayer_outline_url: string | null
          program_pdf_url: string | null
          reflection_leader_id: string | null
          scripture_reading: string | null
          synced_to_calendar: boolean | null
          updated_at: string
          worship_type: string
        }
        Insert: {
          created_at?: string
          created_by: string
          event_date: string
          event_name: string
          id?: string
          music_selection_ids?: string[] | null
          notes?: string | null
          prayer_outline_url?: string | null
          program_pdf_url?: string | null
          reflection_leader_id?: string | null
          scripture_reading?: string | null
          synced_to_calendar?: boolean | null
          updated_at?: string
          worship_type: string
        }
        Update: {
          created_at?: string
          created_by?: string
          event_date?: string
          event_name?: string
          id?: string
          music_selection_ids?: string[] | null
          notes?: string | null
          prayer_outline_url?: string | null
          program_pdf_url?: string | null
          reflection_leader_id?: string | null
          scripture_reading?: string | null
          synced_to_calendar?: boolean | null
          updated_at?: string
          worship_type?: string
        }
        Relationships: []
      }
      gw_marked_scores: {
        Row: {
          canvas_data: string | null
          created_at: string
          description: string | null
          file_url: string
          id: string
          is_shareable: boolean | null
          music_id: string
          share_settings: Json | null
          uploader_id: string
          voice_part: string
        }
        Insert: {
          canvas_data?: string | null
          created_at?: string
          description?: string | null
          file_url: string
          id?: string
          is_shareable?: boolean | null
          music_id: string
          share_settings?: Json | null
          uploader_id: string
          voice_part: string
        }
        Update: {
          canvas_data?: string | null
          created_at?: string
          description?: string | null
          file_url?: string
          id?: string
          is_shareable?: boolean | null
          music_id?: string
          share_settings?: Json | null
          uploader_id?: string
          voice_part?: string
        }
        Relationships: [
          {
            foreignKeyName: "gw_marked_scores_music_id_fkey"
            columns: ["music_id"]
            isOneToOne: false
            referencedRelation: "gw_sheet_music"
            referencedColumns: ["id"]
          },
        ]
      }
      gw_meeting_minutes: {
        Row: {
          action_items: string[]
          agenda_id: string | null
          agenda_items: string[]
          attendees: string[]
          created_at: string
          created_by: string
          discussion_points: string | null
          google_doc_id: string | null
          google_doc_url: string | null
          id: string
          meeting_date: string
          meeting_type: string
          next_meeting_date: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          action_items?: string[]
          agenda_id?: string | null
          agenda_items?: string[]
          attendees?: string[]
          created_at?: string
          created_by: string
          discussion_points?: string | null
          google_doc_id?: string | null
          google_doc_url?: string | null
          id?: string
          meeting_date: string
          meeting_type?: string
          next_meeting_date?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          action_items?: string[]
          agenda_id?: string | null
          agenda_items?: string[]
          attendees?: string[]
          created_at?: string
          created_by?: string
          discussion_points?: string | null
          google_doc_id?: string | null
          google_doc_url?: string | null
          id?: string
          meeting_date?: string
          meeting_type?: string
          next_meeting_date?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gw_meeting_minutes_agenda_id_fkey"
            columns: ["agenda_id"]
            isOneToOne: false
            referencedRelation: "gw_agendas"
            referencedColumns: ["id"]
          },
        ]
      }
      gw_member_care_records: {
        Row: {
          action_items: string[] | null
          care_date: string
          care_type: string
          completed_actions: string[] | null
          confidential_notes: string | null
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_active: boolean | null
          member_id: string
          title: string
          updated_at: string
        }
        Insert: {
          action_items?: string[] | null
          care_date: string
          care_type: string
          completed_actions?: string[] | null
          confidential_notes?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          member_id: string
          title: string
          updated_at?: string
        }
        Update: {
          action_items?: string[] | null
          care_date?: string
          care_type?: string
          completed_actions?: string[] | null
          confidential_notes?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          member_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      gw_member_communications: {
        Row: {
          communication_type: string
          content: string
          created_at: string
          created_by: string | null
          file_url: string | null
          id: string
          recipient_id: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          communication_type?: string
          content: string
          created_at?: string
          created_by?: string | null
          file_url?: string | null
          id?: string
          recipient_id?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          communication_type?: string
          content?: string
          created_at?: string
          created_by?: string | null
          file_url?: string | null
          id?: string
          recipient_id?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      gw_member_wardrobe_profiles: {
        Row: {
          bust_measurement: number | null
          created_at: string
          formal_dress_size: string | null
          height_measurement: number | null
          hips_measurement: number | null
          id: string
          inseam_measurement: number | null
          lipstick_shade: string | null
          measurements_taken_by: string | null
          measurements_taken_date: string | null
          pearl_status: string | null
          polo_size: string | null
          tshirt_size: string | null
          updated_at: string
          user_id: string
          waist_measurement: number | null
        }
        Insert: {
          bust_measurement?: number | null
          created_at?: string
          formal_dress_size?: string | null
          height_measurement?: number | null
          hips_measurement?: number | null
          id?: string
          inseam_measurement?: number | null
          lipstick_shade?: string | null
          measurements_taken_by?: string | null
          measurements_taken_date?: string | null
          pearl_status?: string | null
          polo_size?: string | null
          tshirt_size?: string | null
          updated_at?: string
          user_id: string
          waist_measurement?: number | null
        }
        Update: {
          bust_measurement?: number | null
          created_at?: string
          formal_dress_size?: string | null
          height_measurement?: number | null
          hips_measurement?: number | null
          id?: string
          inseam_measurement?: number | null
          lipstick_shade?: string | null
          measurements_taken_by?: string | null
          measurements_taken_date?: string | null
          pearl_status?: string | null
          polo_size?: string | null
          tshirt_size?: string | null
          updated_at?: string
          user_id?: string
          waist_measurement?: number | null
        }
        Relationships: []
      }
      gw_message_templates: {
        Row: {
          category: string
          content: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          name: string
          subject: string
          updated_at: string
          variables: string[]
        }
        Insert: {
          category?: string
          content: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name: string
          subject: string
          updated_at?: string
          variables?: string[]
        }
        Update: {
          category?: string
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name?: string
          subject?: string
          updated_at?: string
          variables?: string[]
        }
        Relationships: []
      }
      gw_music_analytics: {
        Row: {
          device_info: Json | null
          event_type: string
          id: string
          location_info: Json | null
          music_file_id: string | null
          play_duration: number | null
          session_id: string | null
          timestamp_played: string | null
          user_id: string | null
        }
        Insert: {
          device_info?: Json | null
          event_type: string
          id?: string
          location_info?: Json | null
          music_file_id?: string | null
          play_duration?: number | null
          session_id?: string | null
          timestamp_played?: string | null
          user_id?: string | null
        }
        Update: {
          device_info?: Json | null
          event_type?: string
          id?: string
          location_info?: Json | null
          music_file_id?: string | null
          play_duration?: number | null
          session_id?: string | null
          timestamp_played?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gw_music_analytics_music_file_id_fkey"
            columns: ["music_file_id"]
            isOneToOne: false
            referencedRelation: "gw_music_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gw_music_analytics_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "gw_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      gw_music_files: {
        Row: {
          album: string | null
          artist: string | null
          created_at: string | null
          duration: number | null
          file_size: number | null
          file_type: string | null
          file_url: string
          genre: string | null
          id: string
          is_public: boolean | null
          play_count: number | null
          title: string
          uploaded_by: string | null
        }
        Insert: {
          album?: string | null
          artist?: string | null
          created_at?: string | null
          duration?: number | null
          file_size?: number | null
          file_type?: string | null
          file_url: string
          genre?: string | null
          id?: string
          is_public?: boolean | null
          play_count?: number | null
          title: string
          uploaded_by?: string | null
        }
        Update: {
          album?: string | null
          artist?: string | null
          created_at?: string | null
          duration?: number | null
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          genre?: string | null
          id?: string
          is_public?: boolean | null
          play_count?: number | null
          title?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gw_music_files_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "gw_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      gw_news_items: {
        Row: {
          author_id: string | null
          category: string | null
          content: string
          created_at: string | null
          excerpt: string | null
          featured_image_url: string | null
          id: string
          is_featured: boolean | null
          is_published: boolean | null
          publish_date: string | null
          tags: string[] | null
          title: string
          updated_at: string | null
          view_count: number | null
        }
        Insert: {
          author_id?: string | null
          category?: string | null
          content: string
          created_at?: string | null
          excerpt?: string | null
          featured_image_url?: string | null
          id?: string
          is_featured?: boolean | null
          is_published?: boolean | null
          publish_date?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string | null
          view_count?: number | null
        }
        Update: {
          author_id?: string | null
          category?: string | null
          content?: string
          created_at?: string | null
          excerpt?: string | null
          featured_image_url?: string | null
          id?: string
          is_featured?: boolean | null
          is_published?: boolean | null
          publish_date?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string | null
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "gw_news_items_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "gw_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      gw_newsletters: {
        Row: {
          content: string
          created_at: string
          created_by: string | null
          id: string
          recipient_count: number | null
          scheduled_date: string | null
          sent_date: string | null
          status: string
          target_audience: string
          title: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by?: string | null
          id?: string
          recipient_count?: number | null
          scheduled_date?: string | null
          sent_date?: string | null
          status?: string
          target_audience: string
          title: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          recipient_count?: number | null
          scheduled_date?: string | null
          sent_date?: string | null
          status?: string
          target_audience?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      gw_notification_delivery_log: {
        Row: {
          clicked_at: string | null
          created_at: string
          delivered_at: string | null
          delivery_method: string
          error_message: string | null
          external_id: string | null
          id: string
          notification_id: string | null
          opened_at: string | null
          sent_at: string | null
          status: string
          user_id: string | null
        }
        Insert: {
          clicked_at?: string | null
          created_at?: string
          delivered_at?: string | null
          delivery_method: string
          error_message?: string | null
          external_id?: string | null
          id?: string
          notification_id?: string | null
          opened_at?: string | null
          sent_at?: string | null
          status?: string
          user_id?: string | null
        }
        Update: {
          clicked_at?: string | null
          created_at?: string
          delivered_at?: string | null
          delivery_method?: string
          error_message?: string | null
          external_id?: string | null
          id?: string
          notification_id?: string | null
          opened_at?: string | null
          sent_at?: string | null
          status?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gw_notification_delivery_log_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "gw_notifications"
            referencedColumns: ["id"]
          },
        ]
      }
      gw_notification_preferences: {
        Row: {
          announcement_email: boolean
          announcement_sms: boolean
          attendance_alerts: boolean
          contract_updates: boolean
          created_at: string
          email_enabled: boolean
          event_reminders: boolean
          financial_updates: boolean
          id: string
          marketing_emails: boolean
          phone_number: string | null
          push_enabled: boolean
          sms_enabled: boolean
          updated_at: string
          user_id: string | null
        }
        Insert: {
          announcement_email?: boolean
          announcement_sms?: boolean
          attendance_alerts?: boolean
          contract_updates?: boolean
          created_at?: string
          email_enabled?: boolean
          event_reminders?: boolean
          financial_updates?: boolean
          id?: string
          marketing_emails?: boolean
          phone_number?: string | null
          push_enabled?: boolean
          sms_enabled?: boolean
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          announcement_email?: boolean
          announcement_sms?: boolean
          attendance_alerts?: boolean
          contract_updates?: boolean
          created_at?: string
          email_enabled?: boolean
          event_reminders?: boolean
          financial_updates?: boolean
          id?: string
          marketing_emails?: boolean
          phone_number?: string | null
          push_enabled?: boolean
          sms_enabled?: boolean
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      gw_notifications: {
        Row: {
          action_label: string | null
          action_url: string | null
          category: string | null
          created_at: string
          expires_at: string | null
          id: string
          is_read: boolean
          message: string
          metadata: Json | null
          priority: number
          title: string
          type: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          action_label?: string | null
          action_url?: string | null
          category?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          is_read?: boolean
          message: string
          metadata?: Json | null
          priority?: number
          title: string
          type?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          action_label?: string | null
          action_url?: string | null
          category?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          is_read?: boolean
          message?: string
          metadata?: Json | null
          priority?: number
          title?: string
          type?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      gw_order_items: {
        Row: {
          created_at: string | null
          id: string
          order_id: string | null
          product_id: string | null
          product_title: string
          quantity: number
          total_price: number
          unit_price: number
          variant_id: string | null
          variant_title: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          order_id?: string | null
          product_id?: string | null
          product_title: string
          quantity?: number
          total_price: number
          unit_price: number
          variant_id?: string | null
          variant_title?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          order_id?: string | null
          product_id?: string | null
          product_title?: string
          quantity?: number
          total_price?: number
          unit_price?: number
          variant_id?: string | null
          variant_title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gw_order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "gw_user_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gw_order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "gw_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gw_order_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "gw_product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      gw_payment_plan_installments: {
        Row: {
          amount: number
          created_at: string
          due_date: string
          id: string
          installment_number: number
          notes: string | null
          paid_date: string | null
          payment_method: string | null
          payment_plan_id: string
          status: string
          transaction_id: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          due_date: string
          id?: string
          installment_number: number
          notes?: string | null
          paid_date?: string | null
          payment_method?: string | null
          payment_plan_id: string
          status?: string
          transaction_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          due_date?: string
          id?: string
          installment_number?: number
          notes?: string | null
          paid_date?: string | null
          payment_method?: string | null
          payment_plan_id?: string
          status?: string
          transaction_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gw_payment_plan_installments_payment_plan_id_fkey"
            columns: ["payment_plan_id"]
            isOneToOne: false
            referencedRelation: "gw_dues_payment_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      gw_payment_records: {
        Row: {
          amount: number
          created_at: string | null
          currency: string | null
          id: string
          order_id: string | null
          payment_id: string
          payment_method: string
          status: string | null
          transaction_data: Json | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          currency?: string | null
          id?: string
          order_id?: string | null
          payment_id: string
          payment_method: string
          status?: string | null
          transaction_data?: Json | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          currency?: string | null
          id?: string
          order_id?: string | null
          payment_id?: string
          payment_method?: string
          status?: string | null
          transaction_data?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "gw_payment_records_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "gw_user_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      gw_performance_reviews: {
        Row: {
          created_at: string
          id: string
          is_anonymous: boolean
          music_id: string | null
          notes: string | null
          rating: number
          rehearsal_date: string | null
          review_type: Database["public"]["Enums"]["review_type_enum"]
          reviewer_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_anonymous?: boolean
          music_id?: string | null
          notes?: string | null
          rating: number
          rehearsal_date?: string | null
          review_type: Database["public"]["Enums"]["review_type_enum"]
          reviewer_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_anonymous?: boolean
          music_id?: string | null
          notes?: string | null
          rating?: number
          rehearsal_date?: string | null
          review_type?: Database["public"]["Enums"]["review_type_enum"]
          reviewer_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      gw_performance_scores: {
        Row: {
          categories: Json
          comments: string | null
          created_at: string
          evaluator_id: string
          event_type: string
          id: string
          max_score: number
          overall_score: number | null
          percentage: number
          performer_id: string | null
          performer_name: string
          total_score: number
          updated_at: string
        }
        Insert: {
          categories?: Json
          comments?: string | null
          created_at?: string
          evaluator_id: string
          event_type?: string
          id?: string
          max_score?: number
          overall_score?: number | null
          percentage?: number
          performer_id?: string | null
          performer_name: string
          total_score?: number
          updated_at?: string
        }
        Update: {
          categories?: Json
          comments?: string | null
          created_at?: string
          evaluator_id?: string
          event_type?: string
          id?: string
          max_score?: number
          overall_score?: number | null
          percentage?: number
          performer_id?: string | null
          performer_name?: string
          total_score?: number
          updated_at?: string
        }
        Relationships: []
      }
      gw_permissions: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          id: string
          name: string
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      gw_personal_notes: {
        Row: {
          content: string
          created_at: string
          id: string
          music_id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          music_id: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          music_id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gw_personal_notes_music_id_fkey"
            columns: ["music_id"]
            isOneToOne: false
            referencedRelation: "gw_sheet_music"
            referencedColumns: ["id"]
          },
        ]
      }
      gw_playlist_tracks: {
        Row: {
          added_at: string | null
          added_by: string | null
          id: string
          music_file_id: string | null
          playlist_id: string | null
          position: number
        }
        Insert: {
          added_at?: string | null
          added_by?: string | null
          id?: string
          music_file_id?: string | null
          playlist_id?: string | null
          position: number
        }
        Update: {
          added_at?: string | null
          added_by?: string | null
          id?: string
          music_file_id?: string | null
          playlist_id?: string | null
          position?: number
        }
        Relationships: [
          {
            foreignKeyName: "gw_playlist_tracks_added_by_fkey"
            columns: ["added_by"]
            isOneToOne: false
            referencedRelation: "gw_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gw_playlist_tracks_music_file_id_fkey"
            columns: ["music_file_id"]
            isOneToOne: false
            referencedRelation: "gw_music_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gw_playlist_tracks_playlist_id_fkey"
            columns: ["playlist_id"]
            isOneToOne: false
            referencedRelation: "gw_playlists"
            referencedColumns: ["id"]
          },
        ]
      }
      gw_playlists: {
        Row: {
          cover_image_url: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_public: boolean | null
          title: string
          total_duration: number | null
          track_count: number | null
          updated_at: string | null
        }
        Insert: {
          cover_image_url?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          title: string
          total_duration?: number | null
          track_count?: number | null
          updated_at?: string | null
        }
        Update: {
          cover_image_url?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          title?: string
          total_duration?: number | null
          track_count?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gw_playlists_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "gw_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      gw_prayer_requests: {
        Row: {
          chaplain_response: string | null
          content: string
          created_at: string
          id: string
          is_anonymous: boolean
          responded_at: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          chaplain_response?: string | null
          content: string
          created_at?: string
          id?: string
          is_anonymous?: boolean
          responded_at?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          chaplain_response?: string | null
          content?: string
          created_at?: string
          id?: string
          is_anonymous?: boolean
          responded_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      gw_prayer_rotations: {
        Row: {
          assigned_date: string | null
          assigned_event_id: string | null
          completed: boolean | null
          created_at: string
          created_by: string
          id: string
          member_id: string
          notes: string | null
          role_type: string
          updated_at: string
        }
        Insert: {
          assigned_date?: string | null
          assigned_event_id?: string | null
          completed?: boolean | null
          created_at?: string
          created_by: string
          id?: string
          member_id: string
          notes?: string | null
          role_type: string
          updated_at?: string
        }
        Update: {
          assigned_date?: string | null
          assigned_event_id?: string | null
          completed?: boolean | null
          created_at?: string
          created_by?: string
          id?: string
          member_id?: string
          notes?: string | null
          role_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gw_prayer_rotations_assigned_event_id_fkey"
            columns: ["assigned_event_id"]
            isOneToOne: false
            referencedRelation: "gw_events"
            referencedColumns: ["id"]
          },
        ]
      }
      gw_pre_event_excuses: {
        Row: {
          created_at: string
          documentation_url: string | null
          event_id: string
          id: string
          reason: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          documentation_url?: string | null
          event_id: string
          id?: string
          reason: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          documentation_url?: string | null
          event_id?: string
          id?: string
          reason?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gw_pre_event_excuses_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "gw_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gw_pre_event_excuses_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "gw_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "gw_pre_event_excuses_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "user_dashboard_data"
            referencedColumns: ["user_id"]
          },
        ]
      }
      gw_product_variants: {
        Row: {
          barcode: string | null
          compare_at_price: number | null
          created_at: string | null
          id: string
          image_url: string | null
          inventory_quantity: number | null
          option1: string | null
          option2: string | null
          option3: string | null
          price: number
          product_id: string | null
          sku: string | null
          title: string
          weight: number | null
        }
        Insert: {
          barcode?: string | null
          compare_at_price?: number | null
          created_at?: string | null
          id?: string
          image_url?: string | null
          inventory_quantity?: number | null
          option1?: string | null
          option2?: string | null
          option3?: string | null
          price: number
          product_id?: string | null
          sku?: string | null
          title: string
          weight?: number | null
        }
        Update: {
          barcode?: string | null
          compare_at_price?: number | null
          created_at?: string | null
          id?: string
          image_url?: string | null
          inventory_quantity?: number | null
          option1?: string | null
          option2?: string | null
          option3?: string | null
          price?: number
          product_id?: string | null
          sku?: string | null
          title?: string
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "gw_product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "gw_products"
            referencedColumns: ["id"]
          },
        ]
      }
      gw_products: {
        Row: {
          compare_at_price: number | null
          created_at: string | null
          description: string | null
          id: string
          images: string[] | null
          inventory_quantity: number | null
          is_active: boolean | null
          price: number
          product_type: string | null
          requires_shipping: boolean | null
          tags: string[] | null
          title: string
          track_inventory: boolean | null
          updated_at: string | null
          vendor: string | null
          weight: number | null
        }
        Insert: {
          compare_at_price?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          images?: string[] | null
          inventory_quantity?: number | null
          is_active?: boolean | null
          price?: number
          product_type?: string | null
          requires_shipping?: boolean | null
          tags?: string[] | null
          title: string
          track_inventory?: boolean | null
          updated_at?: string | null
          vendor?: string | null
          weight?: number | null
        }
        Update: {
          compare_at_price?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          images?: string[] | null
          inventory_quantity?: number | null
          is_active?: boolean | null
          price?: number
          product_type?: string | null
          requires_shipping?: boolean | null
          tags?: string[] | null
          title?: string
          track_inventory?: boolean | null
          updated_at?: string | null
          vendor?: string | null
          weight?: number | null
        }
        Relationships: []
      }
      gw_profiles: {
        Row: {
          academic_major: string | null
          account_balance: number | null
          address: string | null
          allergies: string | null
          avatar_url: string | null
          bio: string | null
          calendar_feed_token: string | null
          can_dance: boolean | null
          class_year: number | null
          created_at: string | null
          current_cart_id: string | null
          default_shipping_address: Json | null
          design_history_ids: string[] | null
          dietary_restrictions: string[] | null
          disabled: boolean | null
          display_name: string | null
          dress_size: string | null
          dues_paid: boolean | null
          ecommerce_enabled: boolean | null
          email: string | null
          emergency_contact: string | null
          exec_board_role: string | null
          first_name: string | null
          full_name: string | null
          graduation_year: number | null
          hair_color: string | null
          has_tattoos: boolean | null
          headshot_url: string | null
          home_address: string | null
          id: string
          instruments_played: string[] | null
          is_admin: boolean | null
          is_exec_board: boolean | null
          is_section_leader: boolean | null
          is_super_admin: boolean | null
          join_date: string | null
          last_name: string | null
          last_sign_in_at: string | null
          mentor_opt_in: boolean | null
          middle_name: string | null
          music_role: string | null
          notes: string | null
          org: string | null
          parent_guardian_contact: string | null
          phone: string | null
          phone_number: string | null
          preferred_payment_method: string | null
          pronouns: string | null
          reunion_rsvp: boolean | null
          role: string | null
          role_tags: string[] | null
          school_address: string | null
          shoe_size: string | null
          social_media_links: Json | null
          special_roles: string[] | null
          status: string | null
          student_number: string | null
          title: string | null
          updated_at: string | null
          user_id: string | null
          verified: boolean | null
          visible_piercings: boolean | null
          voice_part: string | null
          website_url: string | null
          workplace: string | null
        }
        Insert: {
          academic_major?: string | null
          account_balance?: number | null
          address?: string | null
          allergies?: string | null
          avatar_url?: string | null
          bio?: string | null
          calendar_feed_token?: string | null
          can_dance?: boolean | null
          class_year?: number | null
          created_at?: string | null
          current_cart_id?: string | null
          default_shipping_address?: Json | null
          design_history_ids?: string[] | null
          dietary_restrictions?: string[] | null
          disabled?: boolean | null
          display_name?: string | null
          dress_size?: string | null
          dues_paid?: boolean | null
          ecommerce_enabled?: boolean | null
          email?: string | null
          emergency_contact?: string | null
          exec_board_role?: string | null
          first_name?: string | null
          full_name?: string | null
          graduation_year?: number | null
          hair_color?: string | null
          has_tattoos?: boolean | null
          headshot_url?: string | null
          home_address?: string | null
          id?: string
          instruments_played?: string[] | null
          is_admin?: boolean | null
          is_exec_board?: boolean | null
          is_section_leader?: boolean | null
          is_super_admin?: boolean | null
          join_date?: string | null
          last_name?: string | null
          last_sign_in_at?: string | null
          mentor_opt_in?: boolean | null
          middle_name?: string | null
          music_role?: string | null
          notes?: string | null
          org?: string | null
          parent_guardian_contact?: string | null
          phone?: string | null
          phone_number?: string | null
          preferred_payment_method?: string | null
          pronouns?: string | null
          reunion_rsvp?: boolean | null
          role?: string | null
          role_tags?: string[] | null
          school_address?: string | null
          shoe_size?: string | null
          social_media_links?: Json | null
          special_roles?: string[] | null
          status?: string | null
          student_number?: string | null
          title?: string | null
          updated_at?: string | null
          user_id?: string | null
          verified?: boolean | null
          visible_piercings?: boolean | null
          voice_part?: string | null
          website_url?: string | null
          workplace?: string | null
        }
        Update: {
          academic_major?: string | null
          account_balance?: number | null
          address?: string | null
          allergies?: string | null
          avatar_url?: string | null
          bio?: string | null
          calendar_feed_token?: string | null
          can_dance?: boolean | null
          class_year?: number | null
          created_at?: string | null
          current_cart_id?: string | null
          default_shipping_address?: Json | null
          design_history_ids?: string[] | null
          dietary_restrictions?: string[] | null
          disabled?: boolean | null
          display_name?: string | null
          dress_size?: string | null
          dues_paid?: boolean | null
          ecommerce_enabled?: boolean | null
          email?: string | null
          emergency_contact?: string | null
          exec_board_role?: string | null
          first_name?: string | null
          full_name?: string | null
          graduation_year?: number | null
          hair_color?: string | null
          has_tattoos?: boolean | null
          headshot_url?: string | null
          home_address?: string | null
          id?: string
          instruments_played?: string[] | null
          is_admin?: boolean | null
          is_exec_board?: boolean | null
          is_section_leader?: boolean | null
          is_super_admin?: boolean | null
          join_date?: string | null
          last_name?: string | null
          last_sign_in_at?: string | null
          mentor_opt_in?: boolean | null
          middle_name?: string | null
          music_role?: string | null
          notes?: string | null
          org?: string | null
          parent_guardian_contact?: string | null
          phone?: string | null
          phone_number?: string | null
          preferred_payment_method?: string | null
          pronouns?: string | null
          reunion_rsvp?: boolean | null
          role?: string | null
          role_tags?: string[] | null
          school_address?: string | null
          shoe_size?: string | null
          social_media_links?: Json | null
          special_roles?: string[] | null
          status?: string | null
          student_number?: string | null
          title?: string | null
          updated_at?: string | null
          user_id?: string | null
          verified?: boolean | null
          visible_piercings?: boolean | null
          voice_part?: string | null
          website_url?: string | null
          workplace?: string | null
        }
        Relationships: []
      }
      gw_public_form_submissions: {
        Row: {
          budget_range: string | null
          created_at: string
          email: string
          event_date: string | null
          event_location: string | null
          form_type: string
          full_name: string
          id: string
          message: string | null
          organization_name: string | null
          phone_number: string | null
          status: string
          submission_data: Json | null
          updated_at: string
        }
        Insert: {
          budget_range?: string | null
          created_at?: string
          email: string
          event_date?: string | null
          event_location?: string | null
          form_type: string
          full_name: string
          id?: string
          message?: string | null
          organization_name?: string | null
          phone_number?: string | null
          status?: string
          submission_data?: Json | null
          updated_at?: string
        }
        Update: {
          budget_range?: string | null
          created_at?: string
          email?: string
          event_date?: string | null
          event_location?: string | null
          form_type?: string
          full_name?: string
          id?: string
          message?: string | null
          organization_name?: string | null
          phone_number?: string | null
          status?: string
          submission_data?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      gw_receipts: {
        Row: {
          amount: number
          category: string
          created_at: string
          created_by: string
          description: string
          id: string
          notes: string | null
          payment_method: string
          receipt_image_url: string | null
          receipt_pdf_url: string | null
          reimbursable: boolean
          status: string
          tax_deductible: boolean
          transaction_date: string
          transaction_id: string | null
          updated_at: string
          vendor_name: string
        }
        Insert: {
          amount: number
          category: string
          created_at?: string
          created_by: string
          description: string
          id?: string
          notes?: string | null
          payment_method: string
          receipt_image_url?: string | null
          receipt_pdf_url?: string | null
          reimbursable?: boolean
          status?: string
          tax_deductible?: boolean
          transaction_date: string
          transaction_id?: string | null
          updated_at?: string
          vendor_name: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          created_by?: string
          description?: string
          id?: string
          notes?: string | null
          payment_method?: string
          receipt_image_url?: string | null
          receipt_pdf_url?: string | null
          reimbursable?: boolean
          status?: string
          tax_deductible?: boolean
          transaction_date?: string
          transaction_id?: string | null
          updated_at?: string
          vendor_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "gw_receipts_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "gw_general_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      gw_recordings: {
        Row: {
          associated_sheet_music_id: string | null
          audio_url: string
          created_at: string | null
          description: string | null
          duration: number | null
          file_size: number | null
          format: string | null
          id: string
          is_processed: boolean | null
          metadata: Json | null
          processing_status: string | null
          quality: string | null
          recorded_by: string | null
          recording_date: string | null
          title: string
        }
        Insert: {
          associated_sheet_music_id?: string | null
          audio_url: string
          created_at?: string | null
          description?: string | null
          duration?: number | null
          file_size?: number | null
          format?: string | null
          id?: string
          is_processed?: boolean | null
          metadata?: Json | null
          processing_status?: string | null
          quality?: string | null
          recorded_by?: string | null
          recording_date?: string | null
          title: string
        }
        Update: {
          associated_sheet_music_id?: string | null
          audio_url?: string
          created_at?: string | null
          description?: string | null
          duration?: number | null
          file_size?: number | null
          format?: string | null
          id?: string
          is_processed?: boolean | null
          metadata?: Json | null
          processing_status?: string | null
          quality?: string | null
          recorded_by?: string | null
          recording_date?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "gw_recordings_associated_sheet_music_id_fkey"
            columns: ["associated_sheet_music_id"]
            isOneToOne: false
            referencedRelation: "gw_sheet_music"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gw_recordings_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "gw_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      gw_rehearsal_feedback: {
        Row: {
          category: Database["public"]["Enums"]["feedback_category_enum"]
          created_at: string
          event_id: string | null
          id: string
          is_anonymous: boolean
          notes: string | null
          rating: number
          reviewer_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category: Database["public"]["Enums"]["feedback_category_enum"]
          created_at?: string
          event_id?: string | null
          id?: string
          is_anonymous?: boolean
          notes?: string | null
          rating: number
          reviewer_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: Database["public"]["Enums"]["feedback_category_enum"]
          created_at?: string
          event_id?: string | null
          id?: string
          is_anonymous?: boolean
          notes?: string | null
          rating?: number
          reviewer_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      gw_rehearsal_music_links: {
        Row: {
          created_at: string
          event_id: string
          id: string
          music_id: string
          notes: string | null
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          music_id: string
          notes?: string | null
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          music_id?: string
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gw_rehearsal_music_links_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "gw_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gw_rehearsal_music_links_music_id_fkey"
            columns: ["music_id"]
            isOneToOne: false
            referencedRelation: "gw_sheet_music"
            referencedColumns: ["id"]
          },
        ]
      }
      gw_running_ledger: {
        Row: {
          amount: number
          category: string | null
          created_at: string
          created_by: string
          description: string
          entry_date: string
          id: string
          notes: string | null
          reference_number: string | null
          running_balance: number
          transaction_type: string
          updated_at: string
        }
        Insert: {
          amount: number
          category?: string | null
          created_at?: string
          created_by: string
          description: string
          entry_date?: string
          id?: string
          notes?: string | null
          reference_number?: string | null
          running_balance: number
          transaction_type: string
          updated_at?: string
        }
        Update: {
          amount?: number
          category?: string | null
          created_at?: string
          created_by?: string
          description?: string
          entry_date?: string
          id?: string
          notes?: string | null
          reference_number?: string | null
          running_balance?: number
          transaction_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      gw_scores: {
        Row: {
          created_at: string | null
          id: string
          max_score: number | null
          notes: string | null
          performance_date: string | null
          recorded_by: string | null
          score_value: number
          sheet_music_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          max_score?: number | null
          notes?: string | null
          performance_date?: string | null
          recorded_by?: string | null
          score_value: number
          sheet_music_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          max_score?: number | null
          notes?: string | null
          performance_date?: string | null
          recorded_by?: string | null
          score_value?: number
          sheet_music_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gw_scores_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "gw_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gw_scores_sheet_music_id_fkey"
            columns: ["sheet_music_id"]
            isOneToOne: false
            referencedRelation: "gw_sheet_music"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gw_scores_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "gw_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      gw_security_audit_log: {
        Row: {
          action_type: string
          created_at: string | null
          details: Json | null
          id: string
          ip_address: unknown | null
          resource_id: string | null
          resource_type: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action_type: string
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: unknown | null
          resource_id?: string | null
          resource_type: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action_type?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: unknown | null
          resource_id?: string | null
          resource_type?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      gw_setlist_items: {
        Row: {
          created_at: string
          id: string
          music_id: string
          order_index: number
          setlist_id: string
          staging_notes: string | null
          tempo_notes: string | null
          voice_part_notes: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          music_id: string
          order_index: number
          setlist_id: string
          staging_notes?: string | null
          tempo_notes?: string | null
          voice_part_notes?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          music_id?: string
          order_index?: number
          setlist_id?: string
          staging_notes?: string | null
          tempo_notes?: string | null
          voice_part_notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gw_setlist_items_music_id_fkey"
            columns: ["music_id"]
            isOneToOne: false
            referencedRelation: "gw_sheet_music"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gw_setlist_items_setlist_id_fkey"
            columns: ["setlist_id"]
            isOneToOne: false
            referencedRelation: "gw_setlists"
            referencedColumns: ["id"]
          },
        ]
      }
      gw_setlists: {
        Row: {
          concert_name: string
          created_at: string
          created_by: string
          description: string | null
          event_date: string | null
          id: string
          is_published: boolean
          rehearsal_notes: string | null
          title: string
          updated_at: string
          venue: string | null
        }
        Insert: {
          concert_name: string
          created_at?: string
          created_by: string
          description?: string | null
          event_date?: string | null
          id?: string
          is_published?: boolean
          rehearsal_notes?: string | null
          title: string
          updated_at?: string
          venue?: string | null
        }
        Update: {
          concert_name?: string
          created_at?: string
          created_by?: string
          description?: string | null
          event_date?: string | null
          id?: string
          is_published?: boolean
          rehearsal_notes?: string | null
          title?: string
          updated_at?: string
          venue?: string | null
        }
        Relationships: []
      }
      gw_sheet_music: {
        Row: {
          archive_reason: string | null
          archived_date: string | null
          arranger: string | null
          audio_preview_url: string | null
          composer: string | null
          condition_notes: string | null
          copyright_year: number | null
          created_at: string | null
          created_by: string | null
          crop_recommendations: Json | null
          difficulty_level: string | null
          donor_name: string | null
          id: string
          is_archived: boolean
          is_public: boolean | null
          isbn_barcode: string | null
          key_signature: string | null
          language: string | null
          last_inventory_date: string | null
          notes: string | null
          pdf_url: string | null
          physical_copies_count: number | null
          physical_location: string | null
          publisher: string | null
          purchase_date: string | null
          purchase_price: number | null
          tags: string[] | null
          tempo_marking: string | null
          thumbnail_url: string | null
          time_signature: string | null
          title: string
          voice_parts: string[] | null
        }
        Insert: {
          archive_reason?: string | null
          archived_date?: string | null
          arranger?: string | null
          audio_preview_url?: string | null
          composer?: string | null
          condition_notes?: string | null
          copyright_year?: number | null
          created_at?: string | null
          created_by?: string | null
          crop_recommendations?: Json | null
          difficulty_level?: string | null
          donor_name?: string | null
          id?: string
          is_archived?: boolean
          is_public?: boolean | null
          isbn_barcode?: string | null
          key_signature?: string | null
          language?: string | null
          last_inventory_date?: string | null
          notes?: string | null
          pdf_url?: string | null
          physical_copies_count?: number | null
          physical_location?: string | null
          publisher?: string | null
          purchase_date?: string | null
          purchase_price?: number | null
          tags?: string[] | null
          tempo_marking?: string | null
          thumbnail_url?: string | null
          time_signature?: string | null
          title: string
          voice_parts?: string[] | null
        }
        Update: {
          archive_reason?: string | null
          archived_date?: string | null
          arranger?: string | null
          audio_preview_url?: string | null
          composer?: string | null
          condition_notes?: string | null
          copyright_year?: number | null
          created_at?: string | null
          created_by?: string | null
          crop_recommendations?: Json | null
          difficulty_level?: string | null
          donor_name?: string | null
          id?: string
          is_archived?: boolean
          is_public?: boolean | null
          isbn_barcode?: string | null
          key_signature?: string | null
          language?: string | null
          last_inventory_date?: string | null
          notes?: string | null
          pdf_url?: string | null
          physical_copies_count?: number | null
          physical_location?: string | null
          publisher?: string | null
          purchase_date?: string | null
          purchase_price?: number | null
          tags?: string[] | null
          tempo_marking?: string | null
          thumbnail_url?: string | null
          time_signature?: string | null
          title?: string
          voice_parts?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "gw_sheet_music_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "gw_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      gw_sheet_music_analytics: {
        Row: {
          action_type: string
          device_type: string | null
          id: string
          page_number: number | null
          session_duration: number | null
          sheet_music_id: string
          timestamp_recorded: string
          user_id: string | null
        }
        Insert: {
          action_type: string
          device_type?: string | null
          id?: string
          page_number?: number | null
          session_duration?: number | null
          sheet_music_id: string
          timestamp_recorded?: string
          user_id?: string | null
        }
        Update: {
          action_type?: string
          device_type?: string | null
          id?: string
          page_number?: number | null
          session_duration?: number | null
          sheet_music_id?: string
          timestamp_recorded?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gw_sheet_music_analytics_sheet_music_id_fkey"
            columns: ["sheet_music_id"]
            isOneToOne: false
            referencedRelation: "gw_sheet_music"
            referencedColumns: ["id"]
          },
        ]
      }
      gw_sheet_music_annotations: {
        Row: {
          annotation_data: Json
          annotation_type: string
          created_at: string
          id: string
          page_number: number
          position_data: Json
          sheet_music_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          annotation_data: Json
          annotation_type: string
          created_at?: string
          id?: string
          page_number: number
          position_data: Json
          sheet_music_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          annotation_data?: Json
          annotation_type?: string
          created_at?: string
          id?: string
          page_number?: number
          position_data?: Json
          sheet_music_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gw_sheet_music_annotations_sheet_music_id_fkey"
            columns: ["sheet_music_id"]
            isOneToOne: false
            referencedRelation: "gw_sheet_music"
            referencedColumns: ["id"]
          },
        ]
      }
      gw_sheet_music_notes: {
        Row: {
          author_id: string
          content: string
          created_at: string
          id: string
          music_id: string
          note_type: string
          role: string
          title: string
          updated_at: string
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string
          id?: string
          music_id: string
          note_type: string
          role: string
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          id?: string
          music_id?: string
          note_type?: string
          role?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gw_sheet_music_notes_music_id_fkey"
            columns: ["music_id"]
            isOneToOne: false
            referencedRelation: "gw_sheet_music"
            referencedColumns: ["id"]
          },
        ]
      }
      gw_sheet_music_permissions: {
        Row: {
          expires_at: string | null
          granted_at: string
          granted_by: string | null
          id: string
          is_active: boolean
          permission_type: string
          role: string | null
          sheet_music_id: string
          user_id: string | null
        }
        Insert: {
          expires_at?: string | null
          granted_at?: string
          granted_by?: string | null
          id?: string
          is_active?: boolean
          permission_type?: string
          role?: string | null
          sheet_music_id: string
          user_id?: string | null
        }
        Update: {
          expires_at?: string | null
          granted_at?: string
          granted_by?: string | null
          id?: string
          is_active?: boolean
          permission_type?: string
          role?: string | null
          sheet_music_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gw_sheet_music_permissions_sheet_music_id_fkey"
            columns: ["sheet_music_id"]
            isOneToOne: false
            referencedRelation: "gw_sheet_music"
            referencedColumns: ["id"]
          },
        ]
      }
      gw_site_settings: {
        Row: {
          description: string | null
          id: string
          is_public: boolean | null
          setting_key: string
          setting_type: string | null
          setting_value: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          description?: string | null
          id?: string
          is_public?: boolean | null
          setting_key: string
          setting_type?: string | null
          setting_value?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          description?: string | null
          id?: string
          is_public?: boolean | null
          setting_key?: string
          setting_type?: string | null
          setting_value?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gw_site_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "gw_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      gw_sms_logs: {
        Row: {
          created_at: string
          from_number: string
          id: string
          message_body: string
          message_sid: string
          notification_count: number | null
          processed_at: string
          to_number: string
        }
        Insert: {
          created_at?: string
          from_number: string
          id?: string
          message_body: string
          message_sid: string
          notification_count?: number | null
          processed_at?: string
          to_number: string
        }
        Update: {
          created_at?: string
          from_number?: string
          id?: string
          message_body?: string
          message_sid?: string
          notification_count?: number | null
          processed_at?: string
          to_number?: string
        }
        Relationships: []
      }
      gw_sms_notifications: {
        Row: {
          category: string | null
          created_at: string
          direction: string
          id: string
          is_read: boolean
          message: string
          phone_number: string
          priority: string
          sender_name: string | null
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          direction?: string
          id?: string
          is_read?: boolean
          message: string
          phone_number: string
          priority?: string
          sender_name?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string
          direction?: string
          id?: string
          is_read?: boolean
          message?: string
          phone_number?: string
          priority?: string
          sender_name?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      gw_social_media_posts: {
        Row: {
          announcement_id: string | null
          content: string
          created_at: string
          created_by: string | null
          engagement_metrics: Json | null
          error_message: string | null
          external_post_id: string | null
          id: string
          media_urls: string[] | null
          platform: string
          posted_at: string | null
          scheduled_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          announcement_id?: string | null
          content: string
          created_at?: string
          created_by?: string | null
          engagement_metrics?: Json | null
          error_message?: string | null
          external_post_id?: string | null
          id?: string
          media_urls?: string[] | null
          platform: string
          posted_at?: string | null
          scheduled_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          announcement_id?: string | null
          content?: string
          created_at?: string
          created_by?: string | null
          engagement_metrics?: Json | null
          error_message?: string | null
          external_post_id?: string | null
          id?: string
          media_urls?: string[] | null
          platform?: string
          posted_at?: string | null
          scheduled_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gw_social_media_posts_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "gw_announcements"
            referencedColumns: ["id"]
          },
        ]
      }
      gw_spiritual_reflections: {
        Row: {
          content: string
          created_at: string
          created_by: string
          event_id: string | null
          id: string
          is_featured: boolean | null
          is_published: boolean | null
          is_shared_to_members: boolean | null
          reflection_date: string
          reflection_type: string | null
          scripture_reference: string | null
          shared_at: string | null
          tags: string[] | null
          title: string
          updated_at: string
          visibility: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by: string
          event_id?: string | null
          id?: string
          is_featured?: boolean | null
          is_published?: boolean | null
          is_shared_to_members?: boolean | null
          reflection_date?: string
          reflection_type?: string | null
          scripture_reference?: string | null
          shared_at?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string
          visibility?: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string
          event_id?: string | null
          id?: string
          is_featured?: boolean | null
          is_published?: boolean | null
          is_shared_to_members?: boolean | null
          reflection_date?: string
          reflection_type?: string | null
          scripture_reference?: string | null
          shared_at?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "gw_spiritual_reflections_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "gw_events"
            referencedColumns: ["id"]
          },
        ]
      }
      gw_spotlight_analytics: {
        Row: {
          action_type: string
          created_at: string
          id: string
          ip_address: unknown | null
          referrer: string | null
          spotlight_id: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action_type: string
          created_at?: string
          id?: string
          ip_address?: unknown | null
          referrer?: string | null
          spotlight_id: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action_type?: string
          created_at?: string
          id?: string
          ip_address?: unknown | null
          referrer?: string | null
          spotlight_id?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gw_spotlight_analytics_spotlight_id_fkey"
            columns: ["spotlight_id"]
            isOneToOne: false
            referencedRelation: "gw_spotlight_content"
            referencedColumns: ["id"]
          },
        ]
      }
      gw_spotlight_content: {
        Row: {
          content: string | null
          created_at: string
          created_by: string
          description: string | null
          display_order: number | null
          external_link: string | null
          featured_event_id: string | null
          featured_person_id: string | null
          id: string
          image_url: string | null
          is_active: boolean
          is_featured: boolean
          publish_date: string | null
          spotlight_type: string
          title: string
          updated_at: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          display_order?: number | null
          external_link?: string | null
          featured_event_id?: string | null
          featured_person_id?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_featured?: boolean
          publish_date?: string | null
          spotlight_type?: string
          title: string
          updated_at?: string
        }
        Update: {
          content?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          display_order?: number | null
          external_link?: string | null
          featured_event_id?: string | null
          featured_person_id?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_featured?: boolean
          publish_date?: string | null
          spotlight_type?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_spotlight_event"
            columns: ["featured_event_id"]
            isOneToOne: false
            referencedRelation: "gw_events"
            referencedColumns: ["id"]
          },
        ]
      }
      gw_stipend_payments: {
        Row: {
          amount: number
          created_at: string
          created_by: string
          description: string
          id: string
          notes: string | null
          payment_date: string
          payment_method: string
          payment_type: string
          recipient_id: string
          reference_number: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          created_by: string
          description: string
          id?: string
          notes?: string | null
          payment_date: string
          payment_method: string
          payment_type: string
          recipient_id: string
          reference_number?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string
          description?: string
          id?: string
          notes?: string | null
          payment_date?: string
          payment_method?: string
          payment_type?: string
          recipient_id?: string
          reference_number?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      gw_tour_cities: {
        Row: {
          arrival_date: string | null
          city_name: string
          city_notes: string | null
          city_order: number
          country_code: string | null
          created_at: string | null
          departure_date: string | null
          id: string
          latitude: number | null
          longitude: number | null
          state_code: string | null
          tour_id: string
          updated_at: string | null
        }
        Insert: {
          arrival_date?: string | null
          city_name: string
          city_notes?: string | null
          city_order: number
          country_code?: string | null
          created_at?: string | null
          departure_date?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          state_code?: string | null
          tour_id: string
          updated_at?: string | null
        }
        Update: {
          arrival_date?: string | null
          city_name?: string
          city_notes?: string | null
          city_order?: number
          country_code?: string | null
          created_at?: string | null
          departure_date?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          state_code?: string | null
          tour_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gw_tour_cities_tour_id_fkey"
            columns: ["tour_id"]
            isOneToOne: false
            referencedRelation: "gw_tours"
            referencedColumns: ["id"]
          },
        ]
      }
      gw_tour_events: {
        Row: {
          budget_allocated: number | null
          created_at: string
          created_by: string
          description: string | null
          end_date: string | null
          id: string
          location: string
          setlist_id: string | null
          start_date: string
          title: string
          updated_at: string
          venue_contact: string | null
          venue_email: string | null
          venue_phone: string | null
        }
        Insert: {
          budget_allocated?: number | null
          created_at?: string
          created_by: string
          description?: string | null
          end_date?: string | null
          id?: string
          location: string
          setlist_id?: string | null
          start_date: string
          title: string
          updated_at?: string
          venue_contact?: string | null
          venue_email?: string | null
          venue_phone?: string | null
        }
        Update: {
          budget_allocated?: number | null
          created_at?: string
          created_by?: string
          description?: string | null
          end_date?: string | null
          id?: string
          location?: string
          setlist_id?: string | null
          start_date?: string
          title?: string
          updated_at?: string
          venue_contact?: string | null
          venue_email?: string | null
          venue_phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gw_tour_events_setlist_id_fkey"
            columns: ["setlist_id"]
            isOneToOne: false
            referencedRelation: "gw_setlists"
            referencedColumns: ["id"]
          },
        ]
      }
      gw_tour_logistics: {
        Row: {
          check_in_time: string | null
          check_out_time: string | null
          created_at: string | null
          estimated_audience_size: number | null
          hospitality_notes: string | null
          id: string
          lodging_address: string | null
          lodging_contact: string | null
          lodging_name: string | null
          meal_arrangements: string | null
          rehearsal_time: string | null
          show_time: string | null
          tour_city_id: string
          transport_notes: string | null
          updated_at: string | null
          venue_address: string | null
          venue_contact: string | null
          venue_email: string | null
          venue_name: string | null
          venue_phone: string | null
        }
        Insert: {
          check_in_time?: string | null
          check_out_time?: string | null
          created_at?: string | null
          estimated_audience_size?: number | null
          hospitality_notes?: string | null
          id?: string
          lodging_address?: string | null
          lodging_contact?: string | null
          lodging_name?: string | null
          meal_arrangements?: string | null
          rehearsal_time?: string | null
          show_time?: string | null
          tour_city_id: string
          transport_notes?: string | null
          updated_at?: string | null
          venue_address?: string | null
          venue_contact?: string | null
          venue_email?: string | null
          venue_name?: string | null
          venue_phone?: string | null
        }
        Update: {
          check_in_time?: string | null
          check_out_time?: string | null
          created_at?: string | null
          estimated_audience_size?: number | null
          hospitality_notes?: string | null
          id?: string
          lodging_address?: string | null
          lodging_contact?: string | null
          lodging_name?: string | null
          meal_arrangements?: string | null
          rehearsal_time?: string | null
          show_time?: string | null
          tour_city_id?: string
          transport_notes?: string | null
          updated_at?: string | null
          venue_address?: string | null
          venue_contact?: string | null
          venue_email?: string | null
          venue_name?: string | null
          venue_phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gw_tour_logistics_tour_city_id_fkey"
            columns: ["tour_city_id"]
            isOneToOne: false
            referencedRelation: "gw_tour_cities"
            referencedColumns: ["id"]
          },
        ]
      }
      gw_tour_participants: {
        Row: {
          created_at: string | null
          dietary_restrictions: string | null
          emergency_contact: string | null
          id: string
          room_assignment: string | null
          status: string | null
          tour_id: string
          updated_at: string | null
          user_id: string
          voice_part: string | null
        }
        Insert: {
          created_at?: string | null
          dietary_restrictions?: string | null
          emergency_contact?: string | null
          id?: string
          room_assignment?: string | null
          status?: string | null
          tour_id: string
          updated_at?: string | null
          user_id: string
          voice_part?: string | null
        }
        Update: {
          created_at?: string | null
          dietary_restrictions?: string | null
          emergency_contact?: string | null
          id?: string
          room_assignment?: string | null
          status?: string | null
          tour_id?: string
          updated_at?: string | null
          user_id?: string
          voice_part?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gw_tour_participants_tour_id_fkey"
            columns: ["tour_id"]
            isOneToOne: false
            referencedRelation: "gw_tours"
            referencedColumns: ["id"]
          },
        ]
      }
      gw_tour_tasks: {
        Row: {
          assignee_id: string | null
          completed: boolean
          completed_at: string | null
          created_at: string
          description: string | null
          due_date: string | null
          event_id: string
          id: string
          priority: string | null
          task_type: string
          title: string
          updated_at: string
        }
        Insert: {
          assignee_id?: string | null
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          event_id: string
          id?: string
          priority?: string | null
          task_type: string
          title: string
          updated_at?: string
        }
        Update: {
          assignee_id?: string | null
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          event_id?: string
          id?: string
          priority?: string | null
          task_type?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gw_tour_tasks_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "gw_tour_events"
            referencedColumns: ["id"]
          },
        ]
      }
      gw_tours: {
        Row: {
          budget: number | null
          created_at: string | null
          created_by: string
          end_date: string
          id: string
          name: string
          notes: string | null
          number_of_singers: number | null
          start_date: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          budget?: number | null
          created_at?: string | null
          created_by: string
          end_date: string
          id?: string
          name: string
          notes?: string | null
          number_of_singers?: number | null
          start_date: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          budget?: number | null
          created_at?: string | null
          created_by?: string
          end_date?: string
          id?: string
          name?: string
          notes?: string | null
          number_of_singers?: number | null
          start_date?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      gw_travel_logs: {
        Row: {
          arrival_location: string | null
          arrival_time: string | null
          booking_reference: string | null
          confirmed: boolean
          cost: number | null
          created_at: string
          departure_location: string | null
          departure_time: string | null
          event_id: string
          id: string
          notes: string | null
          person_id: string
          travel_mode: string
          updated_at: string
        }
        Insert: {
          arrival_location?: string | null
          arrival_time?: string | null
          booking_reference?: string | null
          confirmed?: boolean
          cost?: number | null
          created_at?: string
          departure_location?: string | null
          departure_time?: string | null
          event_id: string
          id?: string
          notes?: string | null
          person_id: string
          travel_mode: string
          updated_at?: string
        }
        Update: {
          arrival_location?: string | null
          arrival_time?: string | null
          booking_reference?: string | null
          confirmed?: boolean
          cost?: number | null
          created_at?: string
          departure_location?: string | null
          departure_time?: string | null
          event_id?: string
          id?: string
          notes?: string | null
          person_id?: string
          travel_mode?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gw_travel_logs_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "gw_tour_events"
            referencedColumns: ["id"]
          },
        ]
      }
      gw_uniform_assignments: {
        Row: {
          assigned_by: string | null
          condition_notes: string | null
          created_at: string
          id: string
          issued_date: string
          item: string
          return_due: string | null
          returned: boolean
          size: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_by?: string | null
          condition_notes?: string | null
          created_at?: string
          id?: string
          issued_date?: string
          item: string
          return_due?: string | null
          returned?: boolean
          size?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_by?: string | null
          condition_notes?: string | null
          created_at?: string
          id?: string
          issued_date?: string
          item?: string
          return_due?: string | null
          returned?: boolean
          size?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      gw_user_appointment_preferences: {
        Row: {
          advance_booking_days: number | null
          allow_same_day_booking: boolean | null
          apple_calendar_sync: boolean | null
          appointment_type_id: string | null
          buffer_time_minutes: number | null
          created_at: string
          google_calendar_sync: boolean | null
          id: string
          max_daily_appointments: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          advance_booking_days?: number | null
          allow_same_day_booking?: boolean | null
          apple_calendar_sync?: boolean | null
          appointment_type_id?: string | null
          buffer_time_minutes?: number | null
          created_at?: string
          google_calendar_sync?: boolean | null
          id?: string
          max_daily_appointments?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          advance_booking_days?: number | null
          allow_same_day_booking?: boolean | null
          apple_calendar_sync?: boolean | null
          appointment_type_id?: string | null
          buffer_time_minutes?: number | null
          created_at?: string
          google_calendar_sync?: boolean | null
          id?: string
          max_daily_appointments?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gw_user_appointment_preferences_appointment_type_id_fkey"
            columns: ["appointment_type_id"]
            isOneToOne: false
            referencedRelation: "gw_appointment_types"
            referencedColumns: ["id"]
          },
        ]
      }
      gw_user_orders: {
        Row: {
          billing_address: Json | null
          created_at: string | null
          currency: string | null
          guest_email: string | null
          id: string
          notes: string | null
          order_number: string
          payment_id: string | null
          payment_method: string | null
          payment_status: string | null
          shipping_address: Json | null
          shipping_amount: number | null
          status: string | null
          subtotal: number
          tax_amount: number | null
          total_amount: number
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          billing_address?: Json | null
          created_at?: string | null
          currency?: string | null
          guest_email?: string | null
          id?: string
          notes?: string | null
          order_number: string
          payment_id?: string | null
          payment_method?: string | null
          payment_status?: string | null
          shipping_address?: Json | null
          shipping_amount?: number | null
          status?: string | null
          subtotal: number
          tax_amount?: number | null
          total_amount: number
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          billing_address?: Json | null
          created_at?: string | null
          currency?: string | null
          guest_email?: string | null
          id?: string
          notes?: string | null
          order_number?: string
          payment_id?: string | null
          payment_method?: string | null
          payment_status?: string | null
          shipping_address?: Json | null
          shipping_amount?: number | null
          status?: string | null
          subtotal?: number
          tax_amount?: number | null
          total_amount?: number
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gw_user_orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "gw_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      gw_user_permissions: {
        Row: {
          expires_at: string | null
          granted_at: string | null
          granted_by: string | null
          id: string
          permission_id: string | null
          user_id: string | null
        }
        Insert: {
          expires_at?: string | null
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          permission_id?: string | null
          user_id?: string | null
        }
        Update: {
          expires_at?: string | null
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          permission_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gw_user_permissions_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "gw_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gw_user_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "gw_permissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gw_user_permissions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "gw_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      gw_vocal_health_entries: {
        Row: {
          created_at: string
          date: string
          hours_slept: number | null
          hydration_level: Database["public"]["Enums"]["hydration_level_enum"]
          id: string
          notes: string | null
          updated_at: string
          user_id: string
          vocal_status: Database["public"]["Enums"]["vocal_status_enum"]
        }
        Insert: {
          created_at?: string
          date?: string
          hours_slept?: number | null
          hydration_level: Database["public"]["Enums"]["hydration_level_enum"]
          id?: string
          notes?: string | null
          updated_at?: string
          user_id: string
          vocal_status: Database["public"]["Enums"]["vocal_status_enum"]
        }
        Update: {
          created_at?: string
          date?: string
          hours_slept?: number | null
          hydration_level?: Database["public"]["Enums"]["hydration_level_enum"]
          id?: string
          notes?: string | null
          updated_at?: string
          user_id?: string
          vocal_status?: Database["public"]["Enums"]["vocal_status_enum"]
        }
        Relationships: []
      }
      gw_wardrobe_announcements: {
        Row: {
          announcement_type: string | null
          auto_remind: boolean | null
          created_at: string
          created_by: string
          id: string
          image_url: string | null
          is_urgent: boolean | null
          message: string
          scheduled_send_date: string | null
          sent_at: string | null
          target_audience: string | null
          target_user_ids: string[] | null
          title: string
          updated_at: string
          voice_sections: string[] | null
        }
        Insert: {
          announcement_type?: string | null
          auto_remind?: boolean | null
          created_at?: string
          created_by: string
          id?: string
          image_url?: string | null
          is_urgent?: boolean | null
          message: string
          scheduled_send_date?: string | null
          sent_at?: string | null
          target_audience?: string | null
          target_user_ids?: string[] | null
          title: string
          updated_at?: string
          voice_sections?: string[] | null
        }
        Update: {
          announcement_type?: string | null
          auto_remind?: boolean | null
          created_at?: string
          created_by?: string
          id?: string
          image_url?: string | null
          is_urgent?: boolean | null
          message?: string
          scheduled_send_date?: string | null
          sent_at?: string | null
          target_audience?: string | null
          target_user_ids?: string[] | null
          title?: string
          updated_at?: string
          voice_sections?: string[] | null
        }
        Relationships: []
      }
      gw_wardrobe_checkouts: {
        Row: {
          checked_in_at: string | null
          checked_in_by: string | null
          checked_out_at: string
          checked_out_by: string
          checkout_condition: string | null
          color: string | null
          created_at: string
          due_date: string | null
          id: string
          inventory_item_id: string
          member_id: string
          notes: string | null
          quantity: number
          receipt_generated: boolean | null
          return_condition: string | null
          size: string
          status: string
          updated_at: string
        }
        Insert: {
          checked_in_at?: string | null
          checked_in_by?: string | null
          checked_out_at?: string
          checked_out_by: string
          checkout_condition?: string | null
          color?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          inventory_item_id: string
          member_id: string
          notes?: string | null
          quantity?: number
          receipt_generated?: boolean | null
          return_condition?: string | null
          size: string
          status?: string
          updated_at?: string
        }
        Update: {
          checked_in_at?: string | null
          checked_in_by?: string | null
          checked_out_at?: string
          checked_out_by?: string
          checkout_condition?: string | null
          color?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          inventory_item_id?: string
          member_id?: string
          notes?: string | null
          quantity?: number
          receipt_generated?: boolean | null
          return_condition?: string | null
          size?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gw_wardrobe_checkouts_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "gw_wardrobe_inventory"
            referencedColumns: ["id"]
          },
        ]
      }
      gw_wardrobe_files: {
        Row: {
          created_at: string
          file_category: string | null
          file_name: string
          file_type: string
          file_url: string
          id: string
          updated_at: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          file_category?: string | null
          file_name: string
          file_type: string
          file_url: string
          id?: string
          updated_at?: string
          uploaded_by: string
        }
        Update: {
          created_at?: string
          file_category?: string | null
          file_name?: string
          file_type?: string
          file_url?: string
          id?: string
          updated_at?: string
          uploaded_by?: string
        }
        Relationships: []
      }
      gw_wardrobe_inventory: {
        Row: {
          category: string
          color_available: string[] | null
          condition: string
          created_at: string
          created_by: string | null
          id: string
          item_name: string
          low_stock_threshold: number | null
          notes: string | null
          quantity_available: number
          quantity_checked_out: number
          quantity_total: number
          size_available: string[] | null
          updated_at: string
        }
        Insert: {
          category: string
          color_available?: string[] | null
          condition?: string
          created_at?: string
          created_by?: string | null
          id?: string
          item_name: string
          low_stock_threshold?: number | null
          notes?: string | null
          quantity_available?: number
          quantity_checked_out?: number
          quantity_total?: number
          size_available?: string[] | null
          updated_at?: string
        }
        Update: {
          category?: string
          color_available?: string[] | null
          condition?: string
          created_at?: string
          created_by?: string | null
          id?: string
          item_name?: string
          low_stock_threshold?: number | null
          notes?: string | null
          quantity_available?: number
          quantity_checked_out?: number
          quantity_total?: number
          size_available?: string[] | null
          updated_at?: string
        }
        Relationships: []
      }
      gw_wardrobe_orders: {
        Row: {
          actual_delivery_date: string | null
          budget_notes: string | null
          created_at: string
          estimated_cost: number | null
          expected_delivery_date: string | null
          id: string
          item_description: string
          notes: string | null
          order_date: string | null
          order_type: string
          ordered_by: string
          quantities: Json | null
          received_by: string | null
          status: string
          updated_at: string
          vendor_name: string | null
        }
        Insert: {
          actual_delivery_date?: string | null
          budget_notes?: string | null
          created_at?: string
          estimated_cost?: number | null
          expected_delivery_date?: string | null
          id?: string
          item_description: string
          notes?: string | null
          order_date?: string | null
          order_type: string
          ordered_by: string
          quantities?: Json | null
          received_by?: string | null
          status?: string
          updated_at?: string
          vendor_name?: string | null
        }
        Update: {
          actual_delivery_date?: string | null
          budget_notes?: string | null
          created_at?: string
          estimated_cost?: number | null
          expected_delivery_date?: string | null
          id?: string
          item_description?: string
          notes?: string | null
          order_date?: string | null
          order_type?: string
          ordered_by?: string
          quantities?: Json | null
          received_by?: string | null
          status?: string
          updated_at?: string
          vendor_name?: string | null
        }
        Relationships: []
      }
      gw_wellness_checkins: {
        Row: {
          created_at: string
          follow_up_needed: boolean | null
          id: string
          is_anonymous: boolean | null
          private_notes: string | null
          spiritual_reflection: string | null
          submitted_date: string
          user_id: string | null
          wellness_status: string
        }
        Insert: {
          created_at?: string
          follow_up_needed?: boolean | null
          id?: string
          is_anonymous?: boolean | null
          private_notes?: string | null
          spiritual_reflection?: string | null
          submitted_date?: string
          user_id?: string | null
          wellness_status: string
        }
        Update: {
          created_at?: string
          follow_up_needed?: boolean | null
          id?: string
          is_anonymous?: boolean | null
          private_notes?: string | null
          spiritual_reflection?: string | null
          submitted_date?: string
          user_id?: string | null
          wellness_status?: string
        }
        Relationships: []
      }
      gw_youtube_videos: {
        Row: {
          added_by: string | null
          category: string | null
          created_at: string | null
          description: string | null
          duration: number | null
          id: string
          is_featured: boolean | null
          published_at: string | null
          tags: string[] | null
          thumbnail_url: string | null
          title: string
          view_count: number | null
          youtube_id: string
        }
        Insert: {
          added_by?: string | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          duration?: number | null
          id?: string
          is_featured?: boolean | null
          published_at?: string | null
          tags?: string[] | null
          thumbnail_url?: string | null
          title: string
          view_count?: number | null
          youtube_id: string
        }
        Update: {
          added_by?: string | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          duration?: number | null
          id?: string
          is_featured?: boolean | null
          published_at?: string | null
          tags?: string[] | null
          thumbnail_url?: string | null
          title?: string
          view_count?: number | null
          youtube_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gw_youtube_videos_added_by_fkey"
            columns: ["added_by"]
            isOneToOne: false
            referencedRelation: "gw_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      id_document_submissions: {
        Row: {
          created_at: string
          expires_at: string | null
          file_path: string
          file_size: number
          id: string
          mime_type: string
          original_filename: string
          submission_date: string
          updated_at: string
          user_id: string
          verification_notes: string | null
          verification_status: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          file_path: string
          file_size: number
          id?: string
          mime_type: string
          original_filename: string
          submission_date?: string
          updated_at?: string
          user_id: string
          verification_notes?: string | null
          verification_status?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          file_path?: string
          file_size?: number
          id?: string
          mime_type?: string
          original_filename?: string
          submission_date?: string
          updated_at?: string
          user_id?: string
          verification_notes?: string | null
          verification_status?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: []
      }
      library_inventory_entries: {
        Row: {
          copies_found: number | null
          id: string
          location_found: string | null
          notes: string | null
          physical_condition: string | null
          scanned_at: string
          scanned_by: string
          session_id: string
          sheet_music_id: string
        }
        Insert: {
          copies_found?: number | null
          id?: string
          location_found?: string | null
          notes?: string | null
          physical_condition?: string | null
          scanned_at?: string
          scanned_by: string
          session_id: string
          sheet_music_id: string
        }
        Update: {
          copies_found?: number | null
          id?: string
          location_found?: string | null
          notes?: string | null
          physical_condition?: string | null
          scanned_at?: string
          scanned_by?: string
          session_id?: string
          sheet_music_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "library_inventory_entries_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "library_inventory_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "library_inventory_entries_sheet_music_id_fkey"
            columns: ["sheet_music_id"]
            isOneToOne: false
            referencedRelation: "gw_sheet_music"
            referencedColumns: ["id"]
          },
        ]
      }
      library_inventory_sessions: {
        Row: {
          completed_at: string | null
          created_by: string
          id: string
          notes: string | null
          session_name: string
          started_at: string
          total_items_scanned: number | null
        }
        Insert: {
          completed_at?: string | null
          created_by: string
          id?: string
          notes?: string | null
          session_name: string
          started_at?: string
          total_items_scanned?: number | null
        }
        Update: {
          completed_at?: string | null
          created_by?: string
          id?: string
          notes?: string | null
          session_name?: string
          started_at?: string
          total_items_scanned?: number | null
        }
        Relationships: []
      }
      materials_budget: {
        Row: {
          cost: number | null
          created_at: string
          event_id: string
          id: string
          item: string
          purpose: string | null
          qty: number | null
          updated_at: string
          vendor_url: string | null
        }
        Insert: {
          cost?: number | null
          created_at?: string
          event_id: string
          id?: string
          item: string
          purpose?: string | null
          qty?: number | null
          updated_at?: string
          vendor_url?: string | null
        }
        Update: {
          cost?: number | null
          created_at?: string
          event_id?: string
          id?: string
          item?: string
          purpose?: string | null
          qty?: number | null
          updated_at?: string
          vendor_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "materials_budget_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      media_budget: {
        Row: {
          cost: number | null
          created_at: string
          event_id: string
          id: string
          item: string
          notes: string | null
          qty: number | null
          updated_at: string
        }
        Insert: {
          cost?: number | null
          created_at?: string
          event_id: string
          id?: string
          item: string
          notes?: string | null
          qty?: number | null
          updated_at?: string
        }
        Update: {
          cost?: number | null
          created_at?: string
          event_id?: string
          id?: string
          item?: string
          notes?: string | null
          qty?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "media_budget_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      music_albums: {
        Row: {
          artist: string
          cover_image_url: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          release_date: string | null
          title: string
          updated_at: string
        }
        Insert: {
          artist: string
          cover_image_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          release_date?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          artist?: string
          cover_image_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          release_date?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      music_tracks: {
        Row: {
          album_id: string | null
          artist: string
          audio_url: string
          created_at: string
          created_by: string | null
          duration: number | null
          genre: string | null
          id: string
          lyrics: string | null
          play_count: number | null
          title: string
          track_number: number | null
          updated_at: string
        }
        Insert: {
          album_id?: string | null
          artist: string
          audio_url: string
          created_at?: string
          created_by?: string | null
          duration?: number | null
          genre?: string | null
          id?: string
          lyrics?: string | null
          play_count?: number | null
          title: string
          track_number?: number | null
          updated_at?: string
        }
        Update: {
          album_id?: string | null
          artist?: string
          audio_url?: string
          created_at?: string
          created_by?: string | null
          duration?: number | null
          genre?: string | null
          id?: string
          lyrics?: string | null
          play_count?: number | null
          title?: string
          track_number?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "music_tracks_album_id_fkey"
            columns: ["album_id"]
            isOneToOne: false
            referencedRelation: "music_albums"
            referencedColumns: ["id"]
          },
        ]
      }
      performers: {
        Row: {
          address: string | null
          airport_preference: string | null
          allergies: string | null
          created_at: string | null
          email: string
          first_name: string
          id: string
          last_name: string
          meal_option: string | null
          phone: string | null
          real_id_photo_url: string | null
          signed_contract_url: string | null
          signed_w9_url: string | null
          status: Database["public"]["Enums"]["performer_status"] | null
          submitted_at: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          address?: string | null
          airport_preference?: string | null
          allergies?: string | null
          created_at?: string | null
          email: string
          first_name: string
          id?: string
          last_name: string
          meal_option?: string | null
          phone?: string | null
          real_id_photo_url?: string | null
          signed_contract_url?: string | null
          signed_w9_url?: string | null
          status?: Database["public"]["Enums"]["performer_status"] | null
          submitted_at?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          address?: string | null
          airport_preference?: string | null
          allergies?: string | null
          created_at?: string | null
          email?: string
          first_name?: string
          id?: string
          last_name?: string
          meal_option?: string | null
          phone?: string | null
          real_id_photo_url?: string | null
          signed_contract_url?: string | null
          signed_w9_url?: string | null
          status?: Database["public"]["Enums"]["performer_status"] | null
          submitted_at?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      playlist_tracks: {
        Row: {
          added_at: string
          id: string
          playlist_id: string
          position: number
          track_id: string
        }
        Insert: {
          added_at?: string
          id?: string
          playlist_id: string
          position: number
          track_id: string
        }
        Update: {
          added_at?: string
          id?: string
          playlist_id?: string
          position?: number
          track_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "playlist_tracks_playlist_id_fkey"
            columns: ["playlist_id"]
            isOneToOne: false
            referencedRelation: "playlists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "playlist_tracks_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "music_tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      playlists: {
        Row: {
          cover_image_url: string | null
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_public: boolean | null
          name: string
          updated_at: string
        }
        Insert: {
          cover_image_url?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_public?: boolean | null
          name: string
          updated_at?: string
        }
        Update: {
          cover_image_url?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_public?: boolean | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      pr_image_tag_associations: {
        Row: {
          created_at: string
          id: string
          image_id: string | null
          tag_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          image_id?: string | null
          tag_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          image_id?: string | null
          tag_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pr_image_tag_associations_image_id_fkey"
            columns: ["image_id"]
            isOneToOne: false
            referencedRelation: "pr_images"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pr_image_tag_associations_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "pr_image_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      pr_image_tags: {
        Row: {
          color: string | null
          created_at: string
          id: string
          name: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      pr_images: {
        Row: {
          caption: string | null
          created_at: string
          event_id: string | null
          file_path: string
          file_size: number | null
          filename: string
          id: string
          is_featured: boolean | null
          mime_type: string | null
          original_filename: string | null
          photographer_id: string | null
          taken_at: string | null
          updated_at: string
          uploaded_at: string
          uploaded_by: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          event_id?: string | null
          file_path: string
          file_size?: number | null
          filename: string
          id?: string
          is_featured?: boolean | null
          mime_type?: string | null
          original_filename?: string | null
          photographer_id?: string | null
          taken_at?: string | null
          updated_at?: string
          uploaded_at?: string
          uploaded_by: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          event_id?: string | null
          file_path?: string
          file_size?: number | null
          filename?: string
          id?: string
          is_featured?: boolean | null
          mime_type?: string | null
          original_filename?: string | null
          photographer_id?: string | null
          taken_at?: string | null
          updated_at?: string
          uploaded_at?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "pr_images_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "gw_events"
            referencedColumns: ["id"]
          },
        ]
      }
      press_kit_items: {
        Row: {
          content: string | null
          created_at: string
          description: string | null
          file_path: string | null
          file_url: string | null
          id: string
          is_featured: boolean | null
          item_type: string
          metadata: Json | null
          press_kit_id: string
          sort_order: number | null
          title: string
          updated_at: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          description?: string | null
          file_path?: string | null
          file_url?: string | null
          id?: string
          is_featured?: boolean | null
          item_type: string
          metadata?: Json | null
          press_kit_id: string
          sort_order?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          content?: string | null
          created_at?: string
          description?: string | null
          file_path?: string | null
          file_url?: string | null
          id?: string
          is_featured?: boolean | null
          item_type?: string
          metadata?: Json | null
          press_kit_id?: string
          sort_order?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "press_kit_items_press_kit_id_fkey"
            columns: ["press_kit_id"]
            isOneToOne: false
            referencedRelation: "press_kits"
            referencedColumns: ["id"]
          },
        ]
      }
      press_kit_shares: {
        Row: {
          access_token: string | null
          created_at: string
          downloaded_at: string | null
          expires_at: string | null
          id: string
          press_kit_id: string
          recipient_email: string | null
          recipient_name: string | null
          shared_by: string
          view_count: number | null
        }
        Insert: {
          access_token?: string | null
          created_at?: string
          downloaded_at?: string | null
          expires_at?: string | null
          id?: string
          press_kit_id: string
          recipient_email?: string | null
          recipient_name?: string | null
          shared_by: string
          view_count?: number | null
        }
        Update: {
          access_token?: string | null
          created_at?: string
          downloaded_at?: string | null
          expires_at?: string | null
          id?: string
          press_kit_id?: string
          recipient_email?: string | null
          recipient_name?: string | null
          shared_by?: string
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "press_kit_shares_press_kit_id_fkey"
            columns: ["press_kit_id"]
            isOneToOne: false
            referencedRelation: "press_kits"
            referencedColumns: ["id"]
          },
        ]
      }
      press_kits: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_featured: boolean | null
          is_public: boolean | null
          metadata: Json | null
          status: string | null
          template_type: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_featured?: boolean | null
          is_public?: boolean | null
          metadata?: Json | null
          status?: string | null
          template_type?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_featured?: boolean | null
          is_public?: boolean | null
          metadata?: Json | null
          status?: string | null
          template_type?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      product_categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          slug: string
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          slug: string
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          slug?: string
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      product_images: {
        Row: {
          alt_text: string | null
          created_at: string
          id: string
          image_url: string
          is_primary: boolean
          product_id: string
          sort_order: number | null
        }
        Insert: {
          alt_text?: string | null
          created_at?: string
          id?: string
          image_url: string
          is_primary?: boolean
          product_id: string
          sort_order?: number | null
        }
        Update: {
          alt_text?: string | null
          created_at?: string
          id?: string
          image_url?: string
          is_primary?: boolean
          product_id?: string
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          dimensions: Json | null
          id: string
          is_active: boolean
          is_featured: boolean
          manage_stock: boolean
          metadata: Json | null
          name: string
          price: number | null
          sale_price: number | null
          short_description: string | null
          sku: string | null
          stock_quantity: number | null
          tags: string[] | null
          updated_at: string
          weight: number | null
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          dimensions?: Json | null
          id?: string
          is_active?: boolean
          is_featured?: boolean
          manage_stock?: boolean
          metadata?: Json | null
          name: string
          price?: number | null
          sale_price?: number | null
          short_description?: string | null
          sku?: string | null
          stock_quantity?: number | null
          tags?: string[] | null
          updated_at?: string
          weight?: number | null
        }
        Update: {
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          dimensions?: Json | null
          id?: string
          is_active?: boolean
          is_featured?: boolean
          manage_stock?: boolean
          metadata?: Json | null
          name?: string
          price?: number | null
          sale_price?: number | null
          short_description?: string | null
          sku?: string | null
          stock_quantity?: number | null
          tags?: string[] | null
          updated_at?: string
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          academic_major: string | null
          allergies: string | null
          avatar_url: string | null
          bio: string | null
          can_dance: boolean | null
          class_year: number | null
          created_at: string | null
          dietary_restrictions: string[] | null
          dress_size: string | null
          email: string | null
          emergency_contact: string | null
          full_name: string | null
          hair_color: string | null
          has_tattoos: boolean | null
          home_address: string | null
          id: string
          instruments_played: string[] | null
          parent_guardian_contact: string | null
          phone_number: string | null
          preferred_payment_method:
            | Database["public"]["Enums"]["payment_method_enum"]
            | null
          pronouns: string | null
          role: string | null
          school_address: string | null
          shoe_size: string | null
          social_media_links: Json | null
          student_number: string | null
          updated_at: string | null
          visible_piercings: boolean | null
          voice_part: Database["public"]["Enums"]["voice_part_enum"] | null
          website_url: string | null
          workplace: string | null
        }
        Insert: {
          academic_major?: string | null
          allergies?: string | null
          avatar_url?: string | null
          bio?: string | null
          can_dance?: boolean | null
          class_year?: number | null
          created_at?: string | null
          dietary_restrictions?: string[] | null
          dress_size?: string | null
          email?: string | null
          emergency_contact?: string | null
          full_name?: string | null
          hair_color?: string | null
          has_tattoos?: boolean | null
          home_address?: string | null
          id: string
          instruments_played?: string[] | null
          parent_guardian_contact?: string | null
          phone_number?: string | null
          preferred_payment_method?:
            | Database["public"]["Enums"]["payment_method_enum"]
            | null
          pronouns?: string | null
          role?: string | null
          school_address?: string | null
          shoe_size?: string | null
          social_media_links?: Json | null
          student_number?: string | null
          updated_at?: string | null
          visible_piercings?: boolean | null
          voice_part?: Database["public"]["Enums"]["voice_part_enum"] | null
          website_url?: string | null
          workplace?: string | null
        }
        Update: {
          academic_major?: string | null
          allergies?: string | null
          avatar_url?: string | null
          bio?: string | null
          can_dance?: boolean | null
          class_year?: number | null
          created_at?: string | null
          dietary_restrictions?: string[] | null
          dress_size?: string | null
          email?: string | null
          emergency_contact?: string | null
          full_name?: string | null
          hair_color?: string | null
          has_tattoos?: boolean | null
          home_address?: string | null
          id?: string
          instruments_played?: string[] | null
          parent_guardian_contact?: string | null
          phone_number?: string | null
          preferred_payment_method?:
            | Database["public"]["Enums"]["payment_method_enum"]
            | null
          pronouns?: string | null
          role?: string | null
          school_address?: string | null
          shoe_size?: string | null
          social_media_links?: Json | null
          student_number?: string | null
          updated_at?: string | null
          visible_piercings?: boolean | null
          voice_part?: Database["public"]["Enums"]["voice_part_enum"] | null
          website_url?: string | null
          workplace?: string | null
        }
        Relationships: []
      }
      promo_budget: {
        Row: {
          cost: number | null
          created_at: string
          description: string | null
          event_id: string
          id: string
          item: string
          notes: string | null
          updated_at: string
        }
        Insert: {
          cost?: number | null
          created_at?: string
          description?: string | null
          event_id: string
          id?: string
          item: string
          notes?: string | null
          updated_at?: string
        }
        Update: {
          cost?: number | null
          created_at?: string
          description?: string | null
          event_id?: string
          id?: string
          item?: string
          notes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "promo_budget_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      receipts: {
        Row: {
          amount: number
          category: string
          created_at: string
          created_by: string
          description: string
          event_id: string | null
          id: string
          notes: string | null
          purchase_date: string
          receipt_image_url: string | null
          receipt_number: string | null
          template_id: string | null
          updated_at: string
          vendor_name: string
        }
        Insert: {
          amount: number
          category?: string
          created_at?: string
          created_by: string
          description: string
          event_id?: string | null
          id?: string
          notes?: string | null
          purchase_date: string
          receipt_image_url?: string | null
          receipt_number?: string | null
          template_id?: string | null
          updated_at?: string
          vendor_name: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          created_by?: string
          description?: string
          event_id?: string | null
          id?: string
          notes?: string | null
          purchase_date?: string
          receipt_image_url?: string | null
          receipt_number?: string | null
          template_id?: string | null
          updated_at?: string
          vendor_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "receipts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipts_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipts_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "contract_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      rhythm_transcriptions: {
        Row: {
          audio_data: string | null
          created_at: string
          id: string
          rhythm_notation: Json
          tempo: number | null
          time_signature: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          audio_data?: string | null
          created_at?: string
          id?: string
          rhythm_notation: Json
          tempo?: number | null
          time_signature?: string | null
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          audio_data?: string | null
          created_at?: string
          id?: string
          rhythm_notation?: Json
          tempo?: number | null
          time_signature?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      role_change_audit: {
        Row: {
          changed_at: string | null
          changed_by: string
          id: string
          ip_address: unknown | null
          new_role: string
          old_role: string | null
          reason: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          changed_at?: string | null
          changed_by: string
          id?: string
          ip_address?: unknown | null
          new_role: string
          old_role?: string | null
          reason?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          changed_at?: string | null
          changed_by?: string
          id?: string
          ip_address?: unknown | null
          new_role?: string
          old_role?: string | null
          reason?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      scholarship_sources: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          last_scraped_at: string | null
          name: string
          scrape_frequency_hours: number | null
          selector_config: Json | null
          updated_at: string
          url: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          last_scraped_at?: string | null
          name: string
          scrape_frequency_hours?: number | null
          selector_config?: Json | null
          updated_at?: string
          url: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          last_scraped_at?: string | null
          name?: string
          scrape_frequency_hours?: number | null
          selector_config?: Json | null
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      scholarships: {
        Row: {
          amount: string | null
          created_at: string | null
          created_by: string | null
          deadline: string | null
          description: string | null
          eligibility: string | null
          id: string
          is_active: boolean | null
          is_featured: boolean | null
          link: string | null
          scraped_from_url: string | null
          source: string | null
          tags: string[] | null
          title: string
          updated_at: string | null
        }
        Insert: {
          amount?: string | null
          created_at?: string | null
          created_by?: string | null
          deadline?: string | null
          description?: string | null
          eligibility?: string | null
          id?: string
          is_active?: boolean | null
          is_featured?: boolean | null
          link?: string | null
          scraped_from_url?: string | null
          source?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string | null
        }
        Update: {
          amount?: string | null
          created_at?: string | null
          created_by?: string | null
          deadline?: string | null
          description?: string | null
          eligibility?: string | null
          id?: string
          is_active?: boolean | null
          is_featured?: boolean | null
          link?: string | null
          scraped_from_url?: string | null
          source?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      security_rate_limits: {
        Row: {
          action_type: string
          count: number | null
          created_at: string | null
          id: string
          identifier: string
          window_start: string | null
        }
        Insert: {
          action_type: string
          count?: number | null
          created_at?: string | null
          id?: string
          identifier: string
          window_start?: string | null
        }
        Update: {
          action_type?: string
          count?: number | null
          created_at?: string | null
          id?: string
          identifier?: string
          window_start?: string | null
        }
        Relationships: []
      }
      setlist_items: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          position: number
          setlist_id: string
          sheet_music_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          position: number
          setlist_id: string
          sheet_music_id: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          position?: number
          setlist_id?: string
          sheet_music_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "setlist_items_setlist_id_fkey"
            columns: ["setlist_id"]
            isOneToOne: false
            referencedRelation: "setlists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "setlist_items_sheet_music_id_fkey"
            columns: ["sheet_music_id"]
            isOneToOne: false
            referencedRelation: "gw_sheet_music"
            referencedColumns: ["id"]
          },
        ]
      }
      setlists: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_public: boolean
          performance_date: string | null
          title: string
          updated_at: string
          venue: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_public?: boolean
          performance_date?: string | null
          title: string
          updated_at?: string
          venue?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_public?: boolean
          performance_date?: string | null
          title?: string
          updated_at?: string
          venue?: string | null
        }
        Relationships: []
      }
      singer_contract_assignments: {
        Row: {
          assigned_at: string
          contract_id: string
          id: string
          notes: string | null
          signature_url: string | null
          signed_at: string | null
          singer_id: string
          status: string
        }
        Insert: {
          assigned_at?: string
          contract_id: string
          id?: string
          notes?: string | null
          signature_url?: string | null
          signed_at?: string | null
          singer_id: string
          status?: string
        }
        Update: {
          assigned_at?: string
          contract_id?: string
          id?: string
          notes?: string | null
          signature_url?: string | null
          signed_at?: string | null
          singer_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "singer_contract_assignments_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "singer_contract_assignments_singer_id_fkey"
            columns: ["singer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      square_integrations: {
        Row: {
          access_token: string
          application_id: string
          auto_sync_interval_hours: number
          created_at: string
          environment: string
          id: string
          last_sync_at: string | null
          location_id: string
          refresh_token: string | null
          sync_enabled: boolean
          updated_at: string
          user_id: string
          webhook_signature_key: string | null
        }
        Insert: {
          access_token: string
          application_id: string
          auto_sync_interval_hours?: number
          created_at?: string
          environment?: string
          id?: string
          last_sync_at?: string | null
          location_id: string
          refresh_token?: string | null
          sync_enabled?: boolean
          updated_at?: string
          user_id: string
          webhook_signature_key?: string | null
        }
        Update: {
          access_token?: string
          application_id?: string
          auto_sync_interval_hours?: number
          created_at?: string
          environment?: string
          id?: string
          last_sync_at?: string | null
          location_id?: string
          refresh_token?: string | null
          sync_enabled?: boolean
          updated_at?: string
          user_id?: string
          webhook_signature_key?: string | null
        }
        Relationships: []
      }
      square_product_mappings: {
        Row: {
          created_at: string
          id: string
          integration_id: string
          last_synced_at: string
          local_product_id: string
          square_catalog_object_id: string
          square_item_variation_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          integration_id: string
          last_synced_at?: string
          local_product_id: string
          square_catalog_object_id: string
          square_item_variation_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          integration_id?: string
          last_synced_at?: string
          local_product_id?: string
          square_catalog_object_id?: string
          square_item_variation_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "square_product_mappings_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "square_integrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "square_product_mappings_local_product_id_fkey"
            columns: ["local_product_id"]
            isOneToOne: false
            referencedRelation: "gw_products"
            referencedColumns: ["id"]
          },
        ]
      }
      square_sync_logs: {
        Row: {
          completed_at: string | null
          error_message: string | null
          id: string
          integration_id: string
          items_created: number
          items_failed: number
          items_processed: number
          items_updated: number
          started_at: string
          status: string
          sync_type: string
        }
        Insert: {
          completed_at?: string | null
          error_message?: string | null
          id?: string
          integration_id: string
          items_created?: number
          items_failed?: number
          items_processed?: number
          items_updated?: number
          started_at?: string
          status?: string
          sync_type: string
        }
        Update: {
          completed_at?: string | null
          error_message?: string | null
          id?: string
          integration_id?: string
          items_created?: number
          items_failed?: number
          items_processed?: number
          items_updated?: number
          started_at?: string
          status?: string
          sync_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "square_sync_logs_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "square_integrations"
            referencedColumns: ["id"]
          },
        ]
      }
      story_images: {
        Row: {
          created_by: string | null
          display_order: number | null
          file_size: number | null
          id: string
          image_name: string | null
          image_url: string
          story_id: string | null
          uploaded_at: string | null
        }
        Insert: {
          created_by?: string | null
          display_order?: number | null
          file_size?: number | null
          id?: string
          image_name?: string | null
          image_url: string
          story_id?: string | null
          uploaded_at?: string | null
        }
        Update: {
          created_by?: string | null
          display_order?: number | null
          file_size?: number | null
          id?: string
          image_name?: string | null
          image_url?: string
          story_id?: string | null
          uploaded_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "story_images_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "alumnae_stories"
            referencedColumns: ["id"]
          },
        ]
      }
      task_notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          notification_type: string
          task_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          notification_type: string
          task_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          notification_type?: string
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_notifications_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assigned_by: string
          assigned_to: string
          completed_at: string | null
          content_id: string | null
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          priority: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_by: string
          assigned_to: string
          completed_at?: string | null
          content_id?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_by?: string
          assigned_to?: string
          completed_at?: string | null
          content_id?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      track_likes: {
        Row: {
          created_at: string
          id: string
          track_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          track_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          track_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "track_likes_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "music_tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      transport_budget: {
        Row: {
          cost: number | null
          created_at: string
          description: string | null
          event_id: string
          id: string
          item: string
          notes: string | null
          updated_at: string
        }
        Insert: {
          cost?: number | null
          created_at?: string
          description?: string | null
          event_id: string
          id?: string
          item: string
          notes?: string | null
          updated_at?: string
        }
        Update: {
          cost?: number | null
          created_at?: string
          description?: string | null
          event_id?: string
          id?: string
          item?: string
          notes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transport_budget_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      user_notifications: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_read: boolean
          message: string
          related_contract_id: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_read?: boolean
          message: string
          related_contract_id?: string | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_read?: boolean
          message?: string
          related_contract_id?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_notifications_related_contract_id_fkey"
            columns: ["related_contract_id"]
            isOneToOne: false
            referencedRelation: "contracts_v2"
            referencedColumns: ["id"]
          },
        ]
      }
      user_payments: {
        Row: {
          amount: number | null
          contract_id: string | null
          created_at: string
          id: string
          notes: string | null
          paid_by: string | null
          payment_date: string | null
          payment_method: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number | null
          contract_id?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          paid_by?: string | null
          payment_date?: string | null
          payment_method?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number | null
          contract_id?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          paid_by?: string | null
          payment_date?: string | null
          payment_method?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_payments_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts_v2"
            referencedColumns: ["id"]
          },
        ]
      }
      user_preferences: {
        Row: {
          calendar_controls_enabled: boolean
          created_at: string
          id: string
          selected_calendars: string[] | null
          tooltip_delay: number
          tooltips_enabled: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          calendar_controls_enabled?: boolean
          created_at?: string
          id?: string
          selected_calendars?: string[] | null
          tooltip_delay?: number
          tooltips_enabled?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          calendar_controls_enabled?: boolean
          created_at?: string
          id?: string
          selected_calendars?: string[] | null
          tooltip_delay?: number
          tooltips_enabled?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      username_permissions: {
        Row: {
          created_at: string | null
          expires_at: string | null
          granted_at: string | null
          granted_by: string | null
          id: string
          is_active: boolean | null
          module_name: string
          notes: string | null
          updated_at: string | null
          user_email: string
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          is_active?: boolean | null
          module_name: string
          notes?: string | null
          updated_at?: string | null
          user_email: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          is_active?: boolean | null
          module_name?: string
          notes?: string | null
          updated_at?: string | null
          user_email?: string
        }
        Relationships: []
      }
      w9_forms: {
        Row: {
          created_at: string
          form_data: Json
          id: string
          status: string
          storage_path: string
          submitted_at: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          form_data?: Json
          id?: string
          status?: string
          storage_path: string
          submitted_at?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          form_data?: Json
          id?: string
          status?: string
          storage_path?: string
          submitted_at?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      wardrobe_checkouts: {
        Row: {
          checked_in_at: string | null
          checked_in_by: string | null
          checked_out_at: string
          checked_out_by: string | null
          color: string | null
          due_date: string | null
          id: string
          item_id: string
          notes: string | null
          quantity: number
          size: string | null
          status: string
          user_id: string
        }
        Insert: {
          checked_in_at?: string | null
          checked_in_by?: string | null
          checked_out_at?: string
          checked_out_by?: string | null
          color?: string | null
          due_date?: string | null
          id?: string
          item_id: string
          notes?: string | null
          quantity?: number
          size?: string | null
          status?: string
          user_id: string
        }
        Update: {
          checked_in_at?: string | null
          checked_in_by?: string | null
          checked_out_at?: string
          checked_out_by?: string | null
          color?: string | null
          due_date?: string | null
          id?: string
          item_id?: string
          notes?: string | null
          quantity?: number
          size?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wardrobe_checkouts_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "wardrobe_items"
            referencedColumns: ["id"]
          },
        ]
      }
      wardrobe_items: {
        Row: {
          available_quantity: number
          category: string
          color_options: string[] | null
          created_at: string
          id: string
          name: string
          notes: string | null
          size_options: string[] | null
          total_quantity: number
          updated_at: string
        }
        Insert: {
          available_quantity?: number
          category: string
          color_options?: string[] | null
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          size_options?: string[] | null
          total_quantity?: number
          updated_at?: string
        }
        Update: {
          available_quantity?: number
          category?: string
          color_options?: string[] | null
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          size_options?: string[] | null
          total_quantity?: number
          updated_at?: string
        }
        Relationships: []
      }
      youtube_channels: {
        Row: {
          auto_sync: boolean | null
          channel_description: string | null
          channel_handle: string | null
          channel_id: string
          channel_name: string
          channel_url: string
          created_at: string
          created_by: string | null
          featured_video_count: number | null
          id: string
          last_synced_at: string | null
          subscriber_count: number | null
          thumbnail_url: string | null
          updated_at: string
          video_count: number | null
        }
        Insert: {
          auto_sync?: boolean | null
          channel_description?: string | null
          channel_handle?: string | null
          channel_id: string
          channel_name: string
          channel_url: string
          created_at?: string
          created_by?: string | null
          featured_video_count?: number | null
          id?: string
          last_synced_at?: string | null
          subscriber_count?: number | null
          thumbnail_url?: string | null
          updated_at?: string
          video_count?: number | null
        }
        Update: {
          auto_sync?: boolean | null
          channel_description?: string | null
          channel_handle?: string | null
          channel_id?: string
          channel_name?: string
          channel_url?: string
          created_at?: string
          created_by?: string | null
          featured_video_count?: number | null
          id?: string
          last_synced_at?: string | null
          subscriber_count?: number | null
          thumbnail_url?: string | null
          updated_at?: string
          video_count?: number | null
        }
        Relationships: []
      }
      youtube_videos: {
        Row: {
          category: string | null
          channel_id: string
          comment_count: number | null
          created_at: string
          description: string | null
          display_order: number | null
          duration: string | null
          id: string
          is_featured: boolean | null
          like_count: number | null
          published_at: string | null
          tags: string[] | null
          thumbnail_url: string | null
          title: string
          updated_at: string
          video_id: string
          video_url: string
          view_count: number | null
        }
        Insert: {
          category?: string | null
          channel_id: string
          comment_count?: number | null
          created_at?: string
          description?: string | null
          display_order?: number | null
          duration?: string | null
          id?: string
          is_featured?: boolean | null
          like_count?: number | null
          published_at?: string | null
          tags?: string[] | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string
          video_id: string
          video_url: string
          view_count?: number | null
        }
        Update: {
          category?: string | null
          channel_id?: string
          comment_count?: number | null
          created_at?: string
          description?: string | null
          display_order?: number | null
          duration?: string | null
          id?: string
          is_featured?: boolean | null
          like_count?: number | null
          published_at?: string | null
          tags?: string[] | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          video_id?: string
          video_url?: string
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "youtube_videos_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "youtube_channels"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      user_dashboard_data: {
        Row: {
          email: string | null
          full_name: string | null
          payments_received: number | null
          signed_contracts: number | null
          total_amount_received: number | null
          total_contracts: number | null
          unread_notifications: number | null
          user_id: string | null
          w9_forms_count: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      admin_create_user: {
        Args: {
          user_email: string
          user_full_name?: string
          user_role?: string
        }
        Returns: Json
      }
      calculate_event_budget_totals: {
        Args: { event_id_param: string }
        Returns: undefined
      }
      check_executive_board_access: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      check_rate_limit: {
        Args: {
          identifier_param: string
          action_type_param: string
          max_attempts?: number
          window_minutes?: number
        }
        Returns: boolean
      }
      check_rate_limit_secure: {
        Args: {
          identifier_param: string
          action_type_param: string
          max_attempts?: number
          window_minutes?: number
        }
        Returns: boolean
      }
      check_vocal_health_alerts: {
        Args: { target_user_id: string }
        Returns: boolean
      }
      cleanup_expired_notifications: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      cleanup_old_rehearsals: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      create_notification_with_delivery: {
        Args: {
          p_user_id: string
          p_title: string
          p_message: string
          p_type?: string
          p_category?: string
          p_action_url?: string
          p_action_label?: string
          p_metadata?: Json
          p_priority?: number
          p_expires_at?: string
          p_send_email?: boolean
          p_send_sms?: boolean
        }
        Returns: string
      }
      create_recurring_rehearsals: {
        Args: { start_date: string; end_date: string; created_by_id?: string }
        Returns: number
      }
      create_secure_file_access: {
        Args: {
          p_user_id: string
          p_bucket_id: string
          p_file_path: string
          p_access_type?: string
        }
        Returns: boolean
      }
      create_task_notification: {
        Args: {
          task_id_param: string
          user_id_param: string
          notification_type_param: string
          message_param: string
        }
        Returns: string
      }
      current_user_is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      decrypt_square_token: {
        Args: { encrypted_token: string }
        Returns: string
      }
      delete_user_and_data: {
        Args: { target_user_id: string }
        Returns: boolean
      }
      encrypt_square_token: {
        Args: { token: string }
        Returns: string
      }
      generate_qr_token: {
        Args: { event_id_param: string }
        Returns: string
      }
      generate_secure_qr_token: {
        Args: { event_id_param: string }
        Returns: string
      }
      generate_sheet_music_filename: {
        Args: {
          p_title: string
          p_composer?: string
          p_voice_part?: string
          p_version?: number
        }
        Returns: string
      }
      get_all_user_profiles: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: string
          email: string
          full_name: string
          role: string
          created_at: string
        }[]
      }
      get_avatar_url: {
        Args: { user_id_param: string }
        Returns: string
      }
      get_current_user_role: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_graduation_decade: {
        Args: { grad_year: number }
        Returns: string
      }
      get_on_this_day_content: {
        Args: { target_date?: string }
        Returns: {
          id: string
          title: string
          description: string
          year_occurred: number
          years_ago: number
          category: string
          image_url: string
        }[]
      }
      get_track_like_count: {
        Args: { track_uuid: string }
        Returns: number
      }
      get_upcoming_license_expirations: {
        Args: { days_ahead?: number }
        Returns: {
          id: string
          music_title: string
          license_type: string
          expires_on: string
          days_until_expiry: number
        }[]
      }
      get_user_admin_status: {
        Args: { user_id_param: string }
        Returns: Json
      }
      get_user_executive_position: {
        Args: { user_id_param: string }
        Returns: Database["public"]["Enums"]["executive_position"]
      }
      get_user_username_permissions: {
        Args: { user_email_param: string }
        Returns: {
          module_name: string
          granted_at: string
          expires_at: string
          notes: string
        }[]
      }
      has_role: {
        Args: {
          _user_id: string
          _role: Database["public"]["Enums"]["app_role"]
        }
        Returns: boolean
      }
      has_username_permission: {
        Args: { user_email_param: string; module_name_param: string }
        Returns: boolean
      }
      increment_annotation_share_views: {
        Args: { share_token_param: string }
        Returns: undefined
      }
      increment_love_message_likes: {
        Args: { message_id_param: string }
        Returns: number
      }
      increment_play_count: {
        Args: { track_uuid: string }
        Returns: undefined
      }
      insert_performance_score: {
        Args: {
          p_performer_id: string
          p_performer_name: string
          p_evaluator_id: string
          p_event_type: string
          p_categories: string
          p_total_score: number
          p_max_score: number
          p_percentage: number
          p_overall_score: number
          p_comments: string
        }
        Returns: string
      }
      is_admin: {
        Args: { _user_id: string }
        Returns: boolean
      }
      is_current_user_admin_or_super_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_current_user_gw_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_current_user_tour_manager: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_current_user_treasurer: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_executive_board_member: {
        Args: { user_id_param: string }
        Returns: boolean
      }
      is_executive_board_member_or_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_super_admin: {
        Args: { _user_id: string }
        Returns: boolean
      }
      is_user_admin_or_super_admin: {
        Args: { user_id_param: string }
        Returns: boolean
      }
      is_user_tour_manager: {
        Args: { user_id_param: string }
        Returns: boolean
      }
      log_activity: {
        Args: {
          p_user_id: string
          p_action_type: string
          p_resource_type: string
          p_resource_id?: string
          p_details?: Json
          p_ip_address?: unknown
          p_user_agent?: string
        }
        Returns: string
      }
      log_admin_action: {
        Args: {
          p_action_type: string
          p_target_user_id: string
          p_details?: Json
        }
        Returns: string
      }
      log_appointment_action: {
        Args: {
          p_appointment_id: string
          p_action_type: string
          p_performed_by?: string
          p_old_values?: Json
          p_new_values?: Json
          p_notes?: string
        }
        Returns: string
      }
      log_executive_board_action: {
        Args: {
          p_action_type: string
          p_action_description: string
          p_related_entity_type?: string
          p_related_entity_id?: string
          p_metadata?: Json
        }
        Returns: string
      }
      log_security_event: {
        Args: {
          p_action_type: string
          p_resource_type: string
          p_resource_id?: string
          p_details?: Json
          p_ip_address?: unknown
          p_user_agent?: string
        }
        Returns: string
      }
      log_sheet_music_action: {
        Args: {
          p_sheet_music_id: string
          p_user_id: string
          p_action_type: string
          p_page_number?: number
          p_session_duration?: number
          p_device_type?: string
        }
        Returns: string
      }
      log_sheet_music_analytics: {
        Args: {
          sheet_music_id_param: string
          user_id_param: string
          action_type_param: string
          page_number_param?: number
          session_duration_param?: number
          device_type_param?: string
        }
        Returns: string
      }
      mark_notification_read: {
        Args: { p_notification_id: string }
        Returns: boolean
      }
      process_qr_attendance_scan: {
        Args: {
          qr_token_param: string
          user_id_param: string
          scan_location_param?: Json
          user_agent_param?: string
          ip_address_param?: unknown
        }
        Returns: Json
      }
      secure_update_user_role: {
        Args: { target_user_id: string; new_role: string; reason?: string }
        Returns: boolean
      }
      toggle_love_message_like: {
        Args: { message_id_param: string }
        Returns: Json
      }
      trigger_scholarship_update: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      update_user_role: {
        Args: { user_id: string; new_role: string }
        Returns: boolean
      }
      user_can_access_sheet_music: {
        Args: { sheet_music_id_param: string; user_id_param: string }
        Returns: boolean
      }
      user_can_edit_budget: {
        Args: { budget_id_param: string; created_by_param: string }
        Returns: boolean
      }
      user_can_view_budget: {
        Args: { budget_id_param: string; created_by_param: string }
        Returns: boolean
      }
      user_has_budget_permission: {
        Args: { budget_id_param: string; permission_type_param: string }
        Returns: boolean
      }
      validate_password_strength: {
        Args: { password_text: string }
        Returns: Json
      }
      verify_admin_access: {
        Args: { user_id_param: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user" | "super-admin"
      executive_position:
        | "president"
        | "secretary"
        | "treasurer"
        | "tour_manager"
        | "wardrobe_manager"
        | "librarian"
        | "historian"
        | "pr_coordinator"
        | "chaplain"
        | "data_analyst"
        | "assistant_chaplain"
        | "student_conductor"
        | "section_leader_s1"
        | "section_leader_s2"
        | "section_leader_a1"
        | "section_leader_a2"
        | "set_up_crew_manager"
      feedback_category_enum:
        | "Vocal Blend"
        | "Rhythmic Precision"
        | "Diction"
        | "Posture"
        | "Energy"
      hydration_level_enum: "Low" | "Normal" | "High"
      payment_method_enum: "zelle" | "cashapp" | "venmo" | "apple_pay" | "check"
      performer_status: "draft" | "submitted" | "approved"
      review_type_enum:
        | "Self Assessment"
        | "Section Leader Review"
        | "Admin Review"
        | "Peer Review"
      vocal_status_enum: "Healthy" | "Fatigued" | "Sore" | "Injured"
      voice_part_enum: "S1" | "S2" | "A1" | "A2" | "T1" | "T2" | "B1" | "B2"
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
    Enums: {
      app_role: ["admin", "user", "super-admin"],
      executive_position: [
        "president",
        "secretary",
        "treasurer",
        "tour_manager",
        "wardrobe_manager",
        "librarian",
        "historian",
        "pr_coordinator",
        "chaplain",
        "data_analyst",
        "assistant_chaplain",
        "student_conductor",
        "section_leader_s1",
        "section_leader_s2",
        "section_leader_a1",
        "section_leader_a2",
        "set_up_crew_manager",
      ],
      feedback_category_enum: [
        "Vocal Blend",
        "Rhythmic Precision",
        "Diction",
        "Posture",
        "Energy",
      ],
      hydration_level_enum: ["Low", "Normal", "High"],
      payment_method_enum: ["zelle", "cashapp", "venmo", "apple_pay", "check"],
      performer_status: ["draft", "submitted", "approved"],
      review_type_enum: [
        "Self Assessment",
        "Section Leader Review",
        "Admin Review",
        "Peer Review",
      ],
      vocal_status_enum: ["Healthy", "Fatigued", "Sore", "Injured"],
      voice_part_enum: ["S1", "S2", "A1", "A2", "T1", "T2", "B1", "B2"],
    },
  },
} as const
