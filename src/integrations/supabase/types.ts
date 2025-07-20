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
            foreignKeyName: "admin_notifications_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "user_dashboard_data"
            referencedColumns: ["user_id"]
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
      budget_attachments: {
        Row: {
          created_at: string
          event_id: string
          file_type: string | null
          file_url: string
          filename: string
          id: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          event_id: string
          file_type?: string | null
          file_url: string
          filename: string
          id?: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          event_id?: string
          file_type?: string | null
          file_url?: string
          filename?: string
          id?: string
          uploaded_by?: string | null
        }
        Relationships: [
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
          {
            foreignKeyName: "contract_recipients_v2_sent_by_fkey"
            columns: ["sent_by"]
            isOneToOne: false
            referencedRelation: "user_dashboard_data"
            referencedColumns: ["user_id"]
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
            foreignKeyName: "contract_signatures_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "user_dashboard_data"
            referencedColumns: ["user_id"]
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
          {
            foreignKeyName: "contract_signatures_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_dashboard_data"
            referencedColumns: ["user_id"]
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
          {
            foreignKeyName: "contracts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_dashboard_data"
            referencedColumns: ["user_id"]
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
          status: string
          user_id: string
        }
        Insert: {
          added_at?: string
          event_id: string
          id?: string
          status?: string
          user_id: string
        }
        Update: {
          added_at?: string
          event_id?: string
          id?: string
          status?: string
          user_id?: string
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
        }
        Insert: {
          created_at?: string
          day_of_week: number
          end_time: string
          id?: string
          is_available?: boolean
          start_time: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          day_of_week?: number
          end_time?: string
          id?: string
          is_available?: boolean
          start_time?: string
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
            foreignKeyName: "gw_event_attendance_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "gw_profiles"
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
          created_at: string | null
          created_by: string | null
          description: string | null
          end_date: string | null
          event_type: string | null
          id: string
          image_url: string | null
          is_public: boolean | null
          location: string | null
          max_attendees: number | null
          registration_required: boolean | null
          start_date: string
          status: string | null
          title: string
          updated_at: string | null
          venue_name: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          event_type?: string | null
          id?: string
          image_url?: string | null
          is_public?: boolean | null
          location?: string | null
          max_attendees?: number | null
          registration_required?: boolean | null
          start_date: string
          status?: string | null
          title: string
          updated_at?: string | null
          venue_name?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          event_type?: string | null
          id?: string
          image_url?: string | null
          is_public?: boolean | null
          location?: string | null
          max_attendees?: number | null
          registration_required?: boolean | null
          start_date?: string
          status?: string | null
          title?: string
          updated_at?: string | null
          venue_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gw_events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "gw_profiles"
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
          account_balance: number | null
          address: string | null
          avatar_url: string | null
          bio: string | null
          class_year: number | null
          created_at: string | null
          current_cart_id: string | null
          default_shipping_address: Json | null
          design_history_ids: string[] | null
          disabled: boolean | null
          dues_paid: boolean | null
          ecommerce_enabled: boolean | null
          email: string | null
          exec_board_role: string | null
          first_name: string | null
          full_name: string | null
          id: string
          is_admin: boolean | null
          is_exec_board: boolean | null
          is_section_leader: boolean | null
          is_super_admin: boolean | null
          join_date: string | null
          last_name: string | null
          last_sign_in_at: string | null
          music_role: string | null
          notes: string | null
          org: string | null
          phone: string | null
          role: string | null
          role_tags: string[] | null
          special_roles: string[] | null
          status: string | null
          title: string | null
          updated_at: string | null
          user_id: string | null
          voice_part: string | null
        }
        Insert: {
          account_balance?: number | null
          address?: string | null
          avatar_url?: string | null
          bio?: string | null
          class_year?: number | null
          created_at?: string | null
          current_cart_id?: string | null
          default_shipping_address?: Json | null
          design_history_ids?: string[] | null
          disabled?: boolean | null
          dues_paid?: boolean | null
          ecommerce_enabled?: boolean | null
          email?: string | null
          exec_board_role?: string | null
          first_name?: string | null
          full_name?: string | null
          id?: string
          is_admin?: boolean | null
          is_exec_board?: boolean | null
          is_section_leader?: boolean | null
          is_super_admin?: boolean | null
          join_date?: string | null
          last_name?: string | null
          last_sign_in_at?: string | null
          music_role?: string | null
          notes?: string | null
          org?: string | null
          phone?: string | null
          role?: string | null
          role_tags?: string[] | null
          special_roles?: string[] | null
          status?: string | null
          title?: string | null
          updated_at?: string | null
          user_id?: string | null
          voice_part?: string | null
        }
        Update: {
          account_balance?: number | null
          address?: string | null
          avatar_url?: string | null
          bio?: string | null
          class_year?: number | null
          created_at?: string | null
          current_cart_id?: string | null
          default_shipping_address?: Json | null
          design_history_ids?: string[] | null
          disabled?: boolean | null
          dues_paid?: boolean | null
          ecommerce_enabled?: boolean | null
          email?: string | null
          exec_board_role?: string | null
          first_name?: string | null
          full_name?: string | null
          id?: string
          is_admin?: boolean | null
          is_exec_board?: boolean | null
          is_section_leader?: boolean | null
          is_super_admin?: boolean | null
          join_date?: string | null
          last_name?: string | null
          last_sign_in_at?: string | null
          music_role?: string | null
          notes?: string | null
          org?: string | null
          phone?: string | null
          role?: string | null
          role_tags?: string[] | null
          special_roles?: string[] | null
          status?: string | null
          title?: string | null
          updated_at?: string | null
          user_id?: string | null
          voice_part?: string | null
        }
        Relationships: []
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
      gw_sheet_music: {
        Row: {
          arranger: string | null
          audio_preview_url: string | null
          composer: string | null
          created_at: string | null
          created_by: string | null
          difficulty_level: string | null
          id: string
          is_public: boolean | null
          key_signature: string | null
          language: string | null
          pdf_url: string | null
          tags: string[] | null
          tempo_marking: string | null
          thumbnail_url: string | null
          time_signature: string | null
          title: string
          voice_parts: string[] | null
        }
        Insert: {
          arranger?: string | null
          audio_preview_url?: string | null
          composer?: string | null
          created_at?: string | null
          created_by?: string | null
          difficulty_level?: string | null
          id?: string
          is_public?: boolean | null
          key_signature?: string | null
          language?: string | null
          pdf_url?: string | null
          tags?: string[] | null
          tempo_marking?: string | null
          thumbnail_url?: string | null
          time_signature?: string | null
          title: string
          voice_parts?: string[] | null
        }
        Update: {
          arranger?: string | null
          audio_preview_url?: string | null
          composer?: string | null
          created_at?: string | null
          created_by?: string | null
          difficulty_level?: string | null
          id?: string
          is_public?: boolean | null
          key_signature?: string | null
          language?: string | null
          pdf_url?: string | null
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
      gw_user_orders: {
        Row: {
          billing_address: Json | null
          created_at: string | null
          currency: string | null
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
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          can_dance: boolean | null
          created_at: string | null
          email: string | null
          full_name: string | null
          home_address: string | null
          id: string
          instruments_played: string[] | null
          phone_number: string | null
          preferred_payment_method:
            | Database["public"]["Enums"]["payment_method_enum"]
            | null
          role: string | null
          school_address: string | null
          social_media_links: Json | null
          student_number: string | null
          updated_at: string | null
          voice_part: Database["public"]["Enums"]["voice_part_enum"] | null
          website_url: string | null
          workplace: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          can_dance?: boolean | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          home_address?: string | null
          id: string
          instruments_played?: string[] | null
          phone_number?: string | null
          preferred_payment_method?:
            | Database["public"]["Enums"]["payment_method_enum"]
            | null
          role?: string | null
          school_address?: string | null
          social_media_links?: Json | null
          student_number?: string | null
          updated_at?: string | null
          voice_part?: Database["public"]["Enums"]["voice_part_enum"] | null
          website_url?: string | null
          workplace?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          can_dance?: boolean | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          home_address?: string | null
          id?: string
          instruments_played?: string[] | null
          phone_number?: string | null
          preferred_payment_method?:
            | Database["public"]["Enums"]["payment_method_enum"]
            | null
          role?: string | null
          school_address?: string | null
          social_media_links?: Json | null
          student_number?: string | null
          updated_at?: string | null
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
            foreignKeyName: "receipts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_dashboard_data"
            referencedColumns: ["user_id"]
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
      sheet_music: {
        Row: {
          arranger: string | null
          audio_reference_url: string | null
          composer: string | null
          created_at: string
          difficulty_level: string | null
          duration_minutes: number | null
          ensemble_type: string | null
          event_context: string | null
          file_path: string
          file_size: number | null
          genre: string | null
          id: string
          is_public: boolean | null
          key_signature: string | null
          language: string | null
          page_count: number | null
          tags: string[] | null
          tempo_marking: string | null
          thumbnail_url: string | null
          time_signature: string | null
          title: string
          updated_at: string
          uploaded_by: string | null
          voice_parts: string[] | null
        }
        Insert: {
          arranger?: string | null
          audio_reference_url?: string | null
          composer?: string | null
          created_at?: string
          difficulty_level?: string | null
          duration_minutes?: number | null
          ensemble_type?: string | null
          event_context?: string | null
          file_path: string
          file_size?: number | null
          genre?: string | null
          id?: string
          is_public?: boolean | null
          key_signature?: string | null
          language?: string | null
          page_count?: number | null
          tags?: string[] | null
          tempo_marking?: string | null
          thumbnail_url?: string | null
          time_signature?: string | null
          title: string
          updated_at?: string
          uploaded_by?: string | null
          voice_parts?: string[] | null
        }
        Update: {
          arranger?: string | null
          audio_reference_url?: string | null
          composer?: string | null
          created_at?: string
          difficulty_level?: string | null
          duration_minutes?: number | null
          ensemble_type?: string | null
          event_context?: string | null
          file_path?: string
          file_size?: number | null
          genre?: string | null
          id?: string
          is_public?: boolean | null
          key_signature?: string | null
          language?: string | null
          page_count?: number | null
          tags?: string[] | null
          tempo_marking?: string | null
          thumbnail_url?: string | null
          time_signature?: string | null
          title?: string
          updated_at?: string
          uploaded_by?: string | null
          voice_parts?: string[] | null
        }
        Relationships: []
      }
      sheet_music_analytics: {
        Row: {
          action_type: string
          created_at: string
          device_type: string | null
          id: string
          page_number: number | null
          session_duration: number | null
          sheet_music_id: string
          user_id: string | null
        }
        Insert: {
          action_type: string
          created_at?: string
          device_type?: string | null
          id?: string
          page_number?: number | null
          session_duration?: number | null
          sheet_music_id: string
          user_id?: string | null
        }
        Update: {
          action_type?: string
          created_at?: string
          device_type?: string | null
          id?: string
          page_number?: number | null
          session_duration?: number | null
          sheet_music_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sheet_music_analytics_sheet_music_id_fkey"
            columns: ["sheet_music_id"]
            isOneToOne: false
            referencedRelation: "sheet_music"
            referencedColumns: ["id"]
          },
        ]
      }
      sheet_music_annotations: {
        Row: {
          annotation_data: Json
          annotation_type: string
          color: string | null
          created_at: string
          id: string
          page_number: number
          position_data: Json | null
          sheet_music_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          annotation_data: Json
          annotation_type: string
          color?: string | null
          created_at?: string
          id?: string
          page_number: number
          position_data?: Json | null
          sheet_music_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          annotation_data?: Json
          annotation_type?: string
          color?: string | null
          created_at?: string
          id?: string
          page_number?: number
          position_data?: Json | null
          sheet_music_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sheet_music_annotations_sheet_music_id_fkey"
            columns: ["sheet_music_id"]
            isOneToOne: false
            referencedRelation: "sheet_music"
            referencedColumns: ["id"]
          },
        ]
      }
      sheet_music_permissions: {
        Row: {
          expires_at: string | null
          granted_at: string
          granted_by: string | null
          id: string
          is_active: boolean | null
          permission_type: string
          role_required: string | null
          sheet_music_id: string
          user_id: string | null
        }
        Insert: {
          expires_at?: string | null
          granted_at?: string
          granted_by?: string | null
          id?: string
          is_active?: boolean | null
          permission_type: string
          role_required?: string | null
          sheet_music_id: string
          user_id?: string | null
        }
        Update: {
          expires_at?: string | null
          granted_at?: string
          granted_by?: string | null
          id?: string
          is_active?: boolean | null
          permission_type?: string
          role_required?: string | null
          sheet_music_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sheet_music_permissions_sheet_music_id_fkey"
            columns: ["sheet_music_id"]
            isOneToOne: false
            referencedRelation: "sheet_music"
            referencedColumns: ["id"]
          },
        ]
      }
      sheet_music_setlist_items: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          order_position: number
          setlist_id: string
          sheet_music_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          order_position: number
          setlist_id: string
          sheet_music_id: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          order_position?: number
          setlist_id?: string
          sheet_music_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sheet_music_setlist_items_setlist_id_fkey"
            columns: ["setlist_id"]
            isOneToOne: false
            referencedRelation: "sheet_music_setlists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sheet_music_setlist_items_sheet_music_id_fkey"
            columns: ["sheet_music_id"]
            isOneToOne: false
            referencedRelation: "sheet_music"
            referencedColumns: ["id"]
          },
        ]
      }
      sheet_music_setlists: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          event_context: string | null
          id: string
          is_public: boolean | null
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          event_context?: string | null
          id?: string
          is_public?: boolean | null
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          event_context?: string | null
          id?: string
          is_public?: boolean | null
          name?: string
          updated_at?: string
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
          {
            foreignKeyName: "singer_contract_assignments_singer_id_fkey"
            columns: ["singer_id"]
            isOneToOne: false
            referencedRelation: "user_dashboard_data"
            referencedColumns: ["user_id"]
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
          created_at: string
          id: string
          tooltip_delay: number
          tooltips_enabled: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          tooltip_delay?: number
          tooltips_enabled?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
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
        Insert: {
          email?: string | null
          full_name?: string | null
          payments_received?: never
          signed_contracts?: never
          total_amount_received?: never
          total_contracts?: never
          unread_notifications?: never
          user_id?: string | null
          w9_forms_count?: never
        }
        Update: {
          email?: string | null
          full_name?: string | null
          payments_received?: never
          signed_contracts?: never
          total_amount_received?: never
          total_contracts?: never
          unread_notifications?: never
          user_id?: string | null
          w9_forms_count?: never
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
      delete_user_and_data: {
        Args: { target_user_id: string }
        Returns: boolean
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
      get_current_user_role: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_track_like_count: {
        Args: { track_uuid: string }
        Returns: number
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
      increment_play_count: {
        Args: { track_uuid: string }
        Returns: undefined
      }
      is_admin: {
        Args: { _user_id: string }
        Returns: boolean
      }
      is_super_admin: {
        Args: { _user_id: string }
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
    }
    Enums: {
      app_role: "admin" | "user" | "super-admin"
      payment_method_enum: "zelle" | "cashapp" | "venmo" | "apple_pay" | "check"
      performer_status: "draft" | "submitted" | "approved"
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
      payment_method_enum: ["zelle", "cashapp", "venmo", "apple_pay", "check"],
      performer_status: ["draft", "submitted", "approved"],
      voice_part_enum: ["S1", "S2", "A1", "A2", "T1", "T2", "B1", "B2"],
    },
  },
} as const
