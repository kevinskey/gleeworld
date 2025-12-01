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
          ip_address: unknown
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
          ip_address?: unknown
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
          ip_address?: unknown
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
      alumnae_content: {
        Row: {
          content: string
          content_type: string
          created_at: string
          created_by: string
          display_order: number | null
          id: string
          image_url: string | null
          is_active: boolean
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          content: string
          content_type: string
          created_at?: string
          created_by: string
          display_order?: number | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          content?: string
          content_type?: string
          created_at?: string
          created_by?: string
          display_order?: number | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      alumnae_form_submissions: {
        Row: {
          form_id: string
          id: string
          submission_data: Json
          submitted_at: string
          submitted_by: string | null
        }
        Insert: {
          form_id: string
          id?: string
          submission_data: Json
          submitted_at?: string
          submitted_by?: string | null
        }
        Update: {
          form_id?: string
          id?: string
          submission_data?: Json
          submitted_at?: string
          submitted_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "alumnae_form_submissions_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "alumnae_forms"
            referencedColumns: ["id"]
          },
        ]
      }
      alumnae_forms: {
        Row: {
          created_at: string
          created_by: string | null
          form_description: string | null
          form_name: string
          form_schema: Json
          id: string
          is_active: boolean
          submission_email: string | null
          success_message: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          form_description?: string | null
          form_name: string
          form_schema?: Json
          id?: string
          is_active?: boolean
          submission_email?: string | null
          success_message?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          form_description?: string | null
          form_name?: string
          form_schema?: Json
          id?: string
          is_active?: boolean
          submission_email?: string | null
          success_message?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      alumnae_global_settings: {
        Row: {
          created_at: string
          id: string
          setting_key: string
          setting_value: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          setting_key: string
          setting_value: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          setting_key?: string
          setting_value?: Json
          updated_at?: string
        }
        Relationships: []
      }
      alumnae_interviews: {
        Row: {
          audio_url: string | null
          created_at: string | null
          duration_minutes: number | null
          excerpt: string | null
          id: string
          interview_type: string | null
          interviewee_class_year: number | null
          interviewee_name: string
          interviewee_user_id: string | null
          is_featured: boolean | null
          is_published: boolean | null
          published_at: string | null
          published_by: string | null
          tags: string[] | null
          thumbnail_url: string | null
          title: string
          transcript: string | null
          updated_at: string | null
          video_url: string | null
        }
        Insert: {
          audio_url?: string | null
          created_at?: string | null
          duration_minutes?: number | null
          excerpt?: string | null
          id?: string
          interview_type?: string | null
          interviewee_class_year?: number | null
          interviewee_name: string
          interviewee_user_id?: string | null
          is_featured?: boolean | null
          is_published?: boolean | null
          published_at?: string | null
          published_by?: string | null
          tags?: string[] | null
          thumbnail_url?: string | null
          title: string
          transcript?: string | null
          updated_at?: string | null
          video_url?: string | null
        }
        Update: {
          audio_url?: string | null
          created_at?: string | null
          duration_minutes?: number | null
          excerpt?: string | null
          id?: string
          interview_type?: string | null
          interviewee_class_year?: number | null
          interviewee_name?: string
          interviewee_user_id?: string | null
          is_featured?: boolean | null
          is_published?: boolean | null
          published_at?: string | null
          published_by?: string | null
          tags?: string[] | null
          thumbnail_url?: string | null
          title?: string
          transcript?: string | null
          updated_at?: string | null
          video_url?: string | null
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
      alumnae_newsletter_announcements: {
        Row: {
          content: string
          created_at: string | null
          display_order: number | null
          id: string
          newsletter_id: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          display_order?: number | null
          id?: string
          newsletter_id?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          display_order?: number | null
          id?: string
          newsletter_id?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "alumnae_newsletter_announcements_newsletter_id_fkey"
            columns: ["newsletter_id"]
            isOneToOne: false
            referencedRelation: "alumnae_newsletters"
            referencedColumns: ["id"]
          },
        ]
      }
      alumnae_newsletter_hero_slides: {
        Row: {
          created_at: string | null
          description: string | null
          display_order: number | null
          id: string
          image_url: string
          newsletter_id: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          image_url: string
          newsletter_id?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          image_url?: string
          newsletter_id?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "alumnae_newsletter_hero_slides_newsletter_id_fkey"
            columns: ["newsletter_id"]
            isOneToOne: false
            referencedRelation: "alumnae_newsletters"
            referencedColumns: ["id"]
          },
        ]
      }
      alumnae_newsletter_spotlights: {
        Row: {
          created_at: string | null
          description: string | null
          display_order: number | null
          id: string
          name: string
          newsletter_id: string | null
          photo_url: string | null
          spotlight_type: string
          title: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          name: string
          newsletter_id?: string | null
          photo_url?: string | null
          spotlight_type: string
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          name?: string
          newsletter_id?: string | null
          photo_url?: string | null
          spotlight_type?: string
          title?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "alumnae_newsletter_spotlights_newsletter_id_fkey"
            columns: ["newsletter_id"]
            isOneToOne: false
            referencedRelation: "alumnae_newsletters"
            referencedColumns: ["id"]
          },
        ]
      }
      alumnae_newsletters: {
        Row: {
          content: string
          cover_image_url: string | null
          created_at: string | null
          id: string
          is_published: boolean | null
          month: number
          pdf_url: string | null
          published_at: string | null
          published_by: string | null
          title: string
          updated_at: string | null
          volume: number | null
          year: number
        }
        Insert: {
          content: string
          cover_image_url?: string | null
          created_at?: string | null
          id?: string
          is_published?: boolean | null
          month: number
          pdf_url?: string | null
          published_at?: string | null
          published_by?: string | null
          title: string
          updated_at?: string | null
          volume?: number | null
          year: number
        }
        Update: {
          content?: string
          cover_image_url?: string | null
          created_at?: string | null
          id?: string
          is_published?: boolean | null
          month?: number
          pdf_url?: string | null
          published_at?: string | null
          published_by?: string | null
          title?: string
          updated_at?: string | null
          volume?: number | null
          year?: number
        }
        Relationships: []
      }
      alumnae_page_sections: {
        Row: {
          background_color: string | null
          background_image: string | null
          created_at: string
          id: string
          is_active: boolean
          layout_type: string
          row_height: string | null
          section_type: string
          settings: Json | null
          sort_order: number
          title: string | null
          updated_at: string
        }
        Insert: {
          background_color?: string | null
          background_image?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          layout_type?: string
          row_height?: string | null
          section_type: string
          settings?: Json | null
          sort_order?: number
          title?: string | null
          updated_at?: string
        }
        Update: {
          background_color?: string | null
          background_image?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          layout_type?: string
          row_height?: string | null
          section_type?: string
          settings?: Json | null
          sort_order?: number
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      alumnae_section_items: {
        Row: {
          column_position: number | null
          content: string | null
          created_at: string
          id: string
          is_active: boolean
          item_type: string
          link_target: string | null
          link_url: string | null
          media_id: string | null
          media_url: string | null
          section_id: string
          settings: Json | null
          sort_order: number
          title: string | null
          updated_at: string
          width_percentage: number | null
        }
        Insert: {
          column_position?: number | null
          content?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          item_type: string
          link_target?: string | null
          link_url?: string | null
          media_id?: string | null
          media_url?: string | null
          section_id: string
          settings?: Json | null
          sort_order?: number
          title?: string | null
          updated_at?: string
          width_percentage?: number | null
        }
        Update: {
          column_position?: number | null
          content?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          item_type?: string
          link_target?: string | null
          link_url?: string | null
          media_id?: string | null
          media_url?: string | null
          section_id?: string
          settings?: Json | null
          sort_order?: number
          title?: string | null
          updated_at?: string
          width_percentage?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "alumnae_section_items_media_id_fkey"
            columns: ["media_id"]
            isOneToOne: false
            referencedRelation: "gw_media_library"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alumnae_section_items_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "alumnae_page_sections"
            referencedColumns: ["id"]
          },
        ]
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
      alumnae_users: {
        Row: {
          bio: string | null
          created_at: string
          current_location: string | null
          current_occupation: string | null
          graduation_year: number | null
          id: string
          is_featured: boolean | null
          is_mentor: boolean | null
          major: string | null
          mentor_areas: Json | null
          profile_image_url: string | null
          social_links: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          bio?: string | null
          created_at?: string
          current_location?: string | null
          current_occupation?: string | null
          graduation_year?: number | null
          id?: string
          is_featured?: boolean | null
          is_mentor?: boolean | null
          major?: string | null
          mentor_areas?: Json | null
          profile_image_url?: string | null
          social_links?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          bio?: string | null
          created_at?: string
          current_location?: string | null
          current_occupation?: string | null
          graduation_year?: number | null
          id?: string
          is_featured?: boolean | null
          is_mentor?: boolean | null
          major?: string | null
          mentor_areas?: Json | null
          profile_image_url?: string | null
          social_links?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      app_roles: {
        Row: {
          granted_at: string | null
          granted_by: string | null
          id: string
          is_active: boolean | null
          role: string
          user_id: string
        }
        Insert: {
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          is_active?: boolean | null
          role: string
          user_id: string
        }
        Update: {
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          is_active?: boolean | null
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      approval_requests: {
        Row: {
          amount: number
          approved_at: string | null
          approved_by: string | null
          budget_category: string | null
          created_at: string
          description: string | null
          id: string
          notes: string | null
          receipt_urls: string[] | null
          rejected_at: string | null
          rejected_by: string | null
          rejection_reason: string | null
          request_type: string
          requestor_id: string
          requestor_name: string
          status: string
          supporting_documents: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          amount: number
          approved_at?: string | null
          approved_by?: string | null
          budget_category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          notes?: string | null
          receipt_urls?: string[] | null
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          request_type: string
          requestor_id: string
          requestor_name: string
          status?: string
          supporting_documents?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          budget_category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          notes?: string | null
          receipt_urls?: string[] | null
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          request_type?: string
          requestor_id?: string
          requestor_name?: string
          status?: string
          supporting_documents?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      approval_workflow_history: {
        Row: {
          action_type: string
          approval_request_id: string
          created_at: string
          id: string
          new_status: string | null
          notes: string | null
          old_status: string | null
          performed_by: string
          performer_name: string
        }
        Insert: {
          action_type: string
          approval_request_id: string
          created_at?: string
          id?: string
          new_status?: string | null
          notes?: string | null
          old_status?: string | null
          performed_by: string
          performer_name: string
        }
        Update: {
          action_type?: string
          approval_request_id?: string
          created_at?: string
          id?: string
          new_status?: string | null
          notes?: string | null
          old_status?: string | null
          performed_by?: string
          performer_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "approval_workflow_history_approval_request_id_fkey"
            columns: ["approval_request_id"]
            isOneToOne: false
            referencedRelation: "approval_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      assignment_submissions: {
        Row: {
          assignment_id: string
          created_at: string
          feedback: string | null
          file_name: string | null
          file_size: number | null
          file_url: string | null
          grade: number | null
          graded_at: string | null
          graded_by: string | null
          id: string
          status: string
          student_id: string
          submission_date: string
          submitted_at: string
          updated_at: string
        }
        Insert: {
          assignment_id: string
          created_at?: string
          feedback?: string | null
          file_name?: string | null
          file_size?: number | null
          file_url?: string | null
          grade?: number | null
          graded_at?: string | null
          graded_by?: string | null
          id?: string
          status?: string
          student_id: string
          submission_date?: string
          submitted_at?: string
          updated_at?: string
        }
        Update: {
          assignment_id?: string
          created_at?: string
          feedback?: string | null
          file_name?: string | null
          file_size?: number | null
          file_url?: string | null
          grade?: number | null
          graded_at?: string | null
          graded_by?: string | null
          id?: string
          status?: string
          student_id?: string
          submission_date?: string
          submitted_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_assignment_submissions_student_id"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "gw_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "fk_assignment_submissions_student_id"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "user_dashboard_data"
            referencedColumns: ["user_id"]
          },
        ]
      }
      attendance: {
        Row: {
          event_id: string
          id: string
          notes: string | null
          recorded_at: string | null
          status: string
          user_id: string
        }
        Insert: {
          event_id: string
          id?: string
          notes?: string | null
          recorded_at?: string | null
          status: string
          user_id: string
        }
        Update: {
          event_id?: string
          id?: string
          notes?: string | null
          recorded_at?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "gw_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "attendance_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_dashboard_data"
            referencedColumns: ["user_id"]
          },
        ]
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
      audition_applications: {
        Row: {
          academic_year: string | null
          application_date: string
          audition_time_slot: string | null
          availability_conflicts: string | null
          cancel_token: string | null
          created_at: string
          date_of_birth: string | null
          email: string
          full_name: string
          gpa: number | null
          id: string
          instruments_played: string[] | null
          major: string | null
          minor: string | null
          music_theory_background: string | null
          notes: string | null
          phone_number: string | null
          prepared_pieces: string | null
          previous_choir_experience: string | null
          profile_image_url: string | null
          session_id: string
          sight_reading_level: string | null
          status: string
          student_id: string | null
          updated_at: string
          user_id: string
          vocal_goals: string | null
          voice_part_preference: string | null
          why_glee_club: string | null
          years_of_vocal_training: number | null
        }
        Insert: {
          academic_year?: string | null
          application_date?: string
          audition_time_slot?: string | null
          availability_conflicts?: string | null
          cancel_token?: string | null
          created_at?: string
          date_of_birth?: string | null
          email: string
          full_name: string
          gpa?: number | null
          id?: string
          instruments_played?: string[] | null
          major?: string | null
          minor?: string | null
          music_theory_background?: string | null
          notes?: string | null
          phone_number?: string | null
          prepared_pieces?: string | null
          previous_choir_experience?: string | null
          profile_image_url?: string | null
          session_id: string
          sight_reading_level?: string | null
          status?: string
          student_id?: string | null
          updated_at?: string
          user_id: string
          vocal_goals?: string | null
          voice_part_preference?: string | null
          why_glee_club?: string | null
          years_of_vocal_training?: number | null
        }
        Update: {
          academic_year?: string | null
          application_date?: string
          audition_time_slot?: string | null
          availability_conflicts?: string | null
          cancel_token?: string | null
          created_at?: string
          date_of_birth?: string | null
          email?: string
          full_name?: string
          gpa?: number | null
          id?: string
          instruments_played?: string[] | null
          major?: string | null
          minor?: string | null
          music_theory_background?: string | null
          notes?: string | null
          phone_number?: string | null
          prepared_pieces?: string | null
          previous_choir_experience?: string | null
          profile_image_url?: string | null
          session_id?: string
          sight_reading_level?: string | null
          status?: string
          student_id?: string | null
          updated_at?: string
          user_id?: string
          vocal_goals?: string | null
          voice_part_preference?: string | null
          why_glee_club?: string | null
          years_of_vocal_training?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "audition_applications_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "audition_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      audition_evaluations: {
        Row: {
          application_id: string
          areas_for_improvement: string | null
          artistic_score: number | null
          confidence: number | null
          created_at: string
          evaluation_date: string
          evaluator_id: string
          evaluator_notes: string | null
          id: string
          intonation: number | null
          is_final: boolean
          musicality: number | null
          overall_score: number | null
          preparation_level: number | null
          recommendation: string | null
          rhythm: number | null
          sight_reading: number | null
          stage_presence: number | null
          strengths: string | null
          technical_score: number | null
          tone_quality: number | null
          updated_at: string
          voice_part_suitability: string | null
        }
        Insert: {
          application_id: string
          areas_for_improvement?: string | null
          artistic_score?: number | null
          confidence?: number | null
          created_at?: string
          evaluation_date?: string
          evaluator_id: string
          evaluator_notes?: string | null
          id?: string
          intonation?: number | null
          is_final?: boolean
          musicality?: number | null
          overall_score?: number | null
          preparation_level?: number | null
          recommendation?: string | null
          rhythm?: number | null
          sight_reading?: number | null
          stage_presence?: number | null
          strengths?: string | null
          technical_score?: number | null
          tone_quality?: number | null
          updated_at?: string
          voice_part_suitability?: string | null
        }
        Update: {
          application_id?: string
          areas_for_improvement?: string | null
          artistic_score?: number | null
          confidence?: number | null
          created_at?: string
          evaluation_date?: string
          evaluator_id?: string
          evaluator_notes?: string | null
          id?: string
          intonation?: number | null
          is_final?: boolean
          musicality?: number | null
          overall_score?: number | null
          preparation_level?: number | null
          recommendation?: string | null
          rhythm?: number | null
          sight_reading?: number | null
          stage_presence?: number | null
          strengths?: string | null
          technical_score?: number | null
          tone_quality?: number | null
          updated_at?: string
          voice_part_suitability?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audition_evaluations_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "audition_analytics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audition_evaluations_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "audition_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      audition_sessions: {
        Row: {
          application_deadline: string
          audition_dates: string[] | null
          created_at: string
          created_by: string | null
          description: string | null
          end_date: string
          id: string
          is_active: boolean
          max_applicants: number | null
          name: string
          requirements: string | null
          start_date: string
          updated_at: string
        }
        Insert: {
          application_deadline: string
          audition_dates?: string[] | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date: string
          id?: string
          is_active?: boolean
          max_applicants?: number | null
          name: string
          requirements?: string | null
          start_date: string
          updated_at?: string
        }
        Update: {
          application_deadline?: string
          audition_dates?: string[] | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string
          id?: string
          is_active?: boolean
          max_applicants?: number | null
          name?: string
          requirements?: string | null
          start_date?: string
          updated_at?: string
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
      booking_requests: {
        Row: {
          assigned_to: string | null
          budget_range: string | null
          contact_email: string
          contact_name: string
          contact_phone: string | null
          created_at: string
          estimated_audience: number | null
          event_date: string
          event_description: string
          event_location: string
          event_time: string | null
          event_type: string
          id: string
          notes: string | null
          organization_name: string
          special_requests: string | null
          status: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          budget_range?: string | null
          contact_email: string
          contact_name: string
          contact_phone?: string | null
          created_at?: string
          estimated_audience?: number | null
          event_date: string
          event_description: string
          event_location: string
          event_time?: string | null
          event_type: string
          id?: string
          notes?: string | null
          organization_name: string
          special_requests?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          budget_range?: string | null
          contact_email?: string
          contact_name?: string
          contact_phone?: string | null
          created_at?: string
          estimated_audience?: number | null
          event_date?: string
          event_description?: string
          event_location?: string
          event_time?: string | null
          event_type?: string
          id?: string
          notes?: string | null
          organization_name?: string
          special_requests?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      bowman_scholars: {
        Row: {
          bio: string | null
          created_at: string | null
          full_name: string | null
          grad_year: number | null
          headshot_url: string | null
          hometown: string | null
          major: string | null
          ministry_statement: string | null
          resume_url: string | null
          user_id: string
        }
        Insert: {
          bio?: string | null
          created_at?: string | null
          full_name?: string | null
          grad_year?: number | null
          headshot_url?: string | null
          hometown?: string | null
          major?: string | null
          ministry_statement?: string | null
          resume_url?: string | null
          user_id: string
        }
        Update: {
          bio?: string | null
          created_at?: string | null
          full_name?: string | null
          grad_year?: number | null
          headshot_url?: string | null
          hometown?: string | null
          major?: string | null
          ministry_statement?: string | null
          resume_url?: string | null
          user_id?: string
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
          approval_status: string | null
          budget_type: string
          contract_id: string | null
          created_at: string
          created_by: string
          description: string | null
          end_date: string | null
          event_id: string | null
          id: string
          rejected_at: string | null
          rejected_by: string | null
          rejection_reason: string | null
          remaining_amount: number | null
          spent_amount: number
          start_date: string
          status: string
          superadmin_approved_at: string | null
          superadmin_approved_by: string | null
          title: string
          total_amount: number
          treasurer_approved_at: string | null
          treasurer_approved_by: string | null
          updated_at: string
        }
        Insert: {
          allocated_amount?: number
          approval_status?: string | null
          budget_type?: string
          contract_id?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          end_date?: string | null
          event_id?: string | null
          id?: string
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          remaining_amount?: number | null
          spent_amount?: number
          start_date: string
          status?: string
          superadmin_approved_at?: string | null
          superadmin_approved_by?: string | null
          title: string
          total_amount?: number
          treasurer_approved_at?: string | null
          treasurer_approved_by?: string | null
          updated_at?: string
        }
        Update: {
          allocated_amount?: number
          approval_status?: string | null
          budget_type?: string
          contract_id?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          end_date?: string | null
          event_id?: string | null
          id?: string
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          remaining_amount?: number | null
          spent_amount?: number
          start_date?: string
          status?: string
          superadmin_approved_at?: string | null
          superadmin_approved_by?: string | null
          title?: string
          total_amount?: number
          treasurer_approved_at?: string | null
          treasurer_approved_by?: string | null
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
      children_go_auditions: {
        Row: {
          approved: boolean | null
          email: string
          id: string
          notes: string | null
          student_name: string
          submitted_at: string
          video_path: string
          video_url: string
        }
        Insert: {
          approved?: boolean | null
          email: string
          id?: string
          notes?: string | null
          student_name: string
          submitted_at?: string
          video_path: string
          video_url: string
        }
        Update: {
          approved?: boolean | null
          email?: string
          id?: string
          notes?: string | null
          student_name?: string
          submitted_at?: string
          video_path?: string
          video_url?: string
        }
        Relationships: []
      }
      cohort_members: {
        Row: {
          cohort_id: string
          id: string
          joined_at: string | null
          status: string | null
          updated_at: string | null
          user_id: string
          voice_part: string | null
        }
        Insert: {
          cohort_id: string
          id?: string
          joined_at?: string | null
          status?: string | null
          updated_at?: string | null
          user_id: string
          voice_part?: string | null
        }
        Update: {
          cohort_id?: string
          id?: string
          joined_at?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string
          voice_part?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cohort_members_cohort_id_fkey"
            columns: ["cohort_id"]
            isOneToOne: false
            referencedRelation: "cohorts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cohort_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      cohorts: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
          year: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
          year: number
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
          year?: number
        }
        Relationships: []
      }
      concert_ticket_requests: {
        Row: {
          assigned_to: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          notes: string | null
          num_tickets: number
          phone: string
          special_requests: string | null
          status: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          email: string
          full_name: string
          id?: string
          notes?: string | null
          num_tickets: number
          phone: string
          special_requests?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          notes?: string | null
          num_tickets?: number
          phone?: string
          special_requests?: string | null
          status?: string
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
      contract_members: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          contract_id: string
          id: string
          role: string | null
          user_id: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          contract_id: string
          id?: string
          role?: string | null
          user_id: string
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          contract_id?: string
          id?: string
          role?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contract_members_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
        ]
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
            foreignKeyName: "contract_signatures_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts_v2"
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
          signer_ip: unknown
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
          signer_ip?: unknown
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
          signer_ip?: unknown
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
          amount: number | null
          archived: boolean | null
          assigned_to: string[] | null
          content: string
          contract_type: string | null
          created_at: string
          created_by: string
          description: string | null
          due_date: string | null
          event_id: string | null
          file_url: string | null
          id: string
          notes: string | null
          priority: string | null
          status: string
          tags: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          amount?: number | null
          archived?: boolean | null
          assigned_to?: string[] | null
          content: string
          contract_type?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          due_date?: string | null
          event_id?: string | null
          file_url?: string | null
          id?: string
          notes?: string | null
          priority?: string | null
          status?: string
          tags?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          amount?: number | null
          archived?: boolean | null
          assigned_to?: string[] | null
          content?: string
          contract_type?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          due_date?: string | null
          event_id?: string | null
          file_url?: string | null
          id?: string
          notes?: string | null
          priority?: string | null
          status?: string
          tags?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: []
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
      coordinator_cohorts: {
        Row: {
          assigned_at: string | null
          cohort_id: string
          user_id: string
        }
        Insert: {
          assigned_at?: string | null
          cohort_id: string
          user_id: string
        }
        Update: {
          assigned_at?: string | null
          cohort_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coordinator_cohorts_cohort_id_fkey"
            columns: ["cohort_id"]
            isOneToOne: false
            referencedRelation: "cohorts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coordinator_cohorts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      course_announcements: {
        Row: {
          content: string
          course_id: string
          created_at: string | null
          created_by: string | null
          id: string
          is_pinned: boolean | null
          title: string
          updated_at: string | null
        }
        Insert: {
          content: string
          course_id: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_pinned?: boolean | null
          title: string
          updated_at?: string | null
        }
        Update: {
          content?: string
          course_id?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_pinned?: boolean | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      course_audio_resources: {
        Row: {
          audio_path: string
          course_id: string
          created_at: string | null
          created_by: string | null
          description: string | null
          display_order: number | null
          duration_seconds: number | null
          id: string
          is_published: boolean | null
          title: string
          updated_at: string | null
        }
        Insert: {
          audio_path: string
          course_id: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          display_order?: number | null
          duration_seconds?: number | null
          id?: string
          is_published?: boolean | null
          title: string
          updated_at?: string | null
        }
        Update: {
          audio_path?: string
          course_id?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          display_order?: number | null
          duration_seconds?: number | null
          id?: string
          is_published?: boolean | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      course_discussions: {
        Row: {
          content: string
          course_id: string
          created_at: string | null
          created_by: string | null
          id: string
          is_locked: boolean | null
          reply_count: number | null
          title: string
          updated_at: string | null
        }
        Insert: {
          content: string
          course_id: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_locked?: boolean | null
          reply_count?: number | null
          title: string
          updated_at?: string | null
        }
        Update: {
          content?: string
          course_id?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_locked?: boolean | null
          reply_count?: number | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      course_documents: {
        Row: {
          category: string | null
          course_id: string
          created_at: string | null
          created_by: string | null
          description: string | null
          display_order: number | null
          document_path: string
          file_size: number | null
          file_type: string | null
          id: string
          is_published: boolean | null
          title: string
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          course_id: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          display_order?: number | null
          document_path: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          is_published?: boolean | null
          title: string
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          course_id?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          display_order?: number | null
          document_path?: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          is_published?: boolean | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      course_messages: {
        Row: {
          content: string
          course_id: string
          created_at: string | null
          id: string
          is_read: boolean | null
          recipient_id: string | null
          sender_id: string | null
          subject: string
        }
        Insert: {
          content: string
          course_id: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          recipient_id?: string | null
          sender_id?: string | null
          subject: string
        }
        Update: {
          content?: string
          course_id?: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          recipient_id?: string | null
          sender_id?: string | null
          subject?: string
        }
        Relationships: []
      }
      course_modules: {
        Row: {
          course_id: string
          created_at: string | null
          description: string | null
          display_order: number
          id: string
          is_published: boolean | null
          title: string
          updated_at: string | null
        }
        Insert: {
          course_id: string
          created_at?: string | null
          description?: string | null
          display_order: number
          id?: string
          is_published?: boolean | null
          title: string
          updated_at?: string | null
        }
        Update: {
          course_id?: string
          created_at?: string | null
          description?: string | null
          display_order?: number
          id?: string
          is_published?: boolean | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      course_notes: {
        Row: {
          content: string
          course_id: string
          created_at: string | null
          id: string
          title: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          content: string
          course_id: string
          created_at?: string | null
          id?: string
          title: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          content?: string
          course_id?: string
          created_at?: string | null
          id?: string
          title?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      course_teaching_assistants: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          course_code: string
          created_at: string | null
          id: string
          is_active: boolean | null
          notes: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          course_code: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          notes?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          course_code?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          notes?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      course_video_resources: {
        Row: {
          course_id: string
          created_at: string | null
          created_by: string | null
          description: string | null
          display_order: number | null
          id: string
          is_published: boolean | null
          title: string
          updated_at: string | null
          video_path: string | null
          video_type: string
          youtube_url: string | null
        }
        Insert: {
          course_id: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_published?: boolean | null
          title: string
          updated_at?: string | null
          video_path?: string | null
          video_type: string
          youtube_url?: string | null
        }
        Update: {
          course_id?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_published?: boolean | null
          title?: string
          updated_at?: string | null
          video_path?: string | null
          video_type?: string
          youtube_url?: string | null
        }
        Relationships: []
      }
      dashboard_hero_settings: {
        Row: {
          auto_scroll_enabled: boolean | null
          created_at: string | null
          id: string
          scroll_speed_seconds: number | null
          updated_at: string | null
        }
        Insert: {
          auto_scroll_enabled?: boolean | null
          created_at?: string | null
          id?: string
          scroll_speed_seconds?: number | null
          updated_at?: string | null
        }
        Update: {
          auto_scroll_enabled?: boolean | null
          created_at?: string | null
          id?: string
          scroll_speed_seconds?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      dashboard_hero_slides: {
        Row: {
          created_at: string | null
          description: string | null
          display_order: number | null
          id: string
          image_url: string
          ipad_image_url: string | null
          is_active: boolean | null
          link_target: string | null
          link_url: string | null
          mobile_image_url: string | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          image_url: string
          ipad_image_url?: string | null
          is_active?: boolean | null
          link_target?: string | null
          link_url?: string | null
          mobile_image_url?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          image_url?: string
          ipad_image_url?: string | null
          is_active?: boolean | null
          link_target?: string | null
          link_url?: string | null
          mobile_image_url?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: []
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
      direct_messages: {
        Row: {
          created_at: string | null
          id: string
          is_read: boolean | null
          message_body: string
          read_at: string | null
          recipient_id: string
          sender_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message_body: string
          read_at?: string | null
          recipient_id: string
          sender_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message_body?: string
          read_at?: string | null
          recipient_id?: string
          sender_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      discussion_replies: {
        Row: {
          content: string
          created_at: string | null
          created_by: string | null
          discussion_id: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          created_by?: string | null
          discussion_id?: string | null
          id?: string
          updated_at?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          created_by?: string | null
          discussion_id?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "discussion_replies_discussion_id_fkey"
            columns: ["discussion_id"]
            isOneToOne: false
            referencedRelation: "course_discussions"
            referencedColumns: ["id"]
          },
        ]
      }
      dm_conversations: {
        Row: {
          created_at: string
          id: string
          last_message_at: string | null
          participant_1: string
          participant_2: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_message_at?: string | null
          participant_1: string
          participant_2: string
        }
        Update: {
          created_at?: string
          id?: string
          last_message_at?: string | null
          participant_1?: string
          participant_2?: string
        }
        Relationships: []
      }
      dm_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          read: boolean | null
          sender_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          read?: boolean | null
          sender_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          read?: boolean | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dm_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "dm_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      email_campaigns: {
        Row: {
          content: string
          created_at: string
          created_by: string
          id: string
          name: string
          recipient_user_ids: string[] | null
          recipients_count: number | null
          scheduled_for: string | null
          sent_at: string | null
          status: string
          subject: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by: string
          id?: string
          name: string
          recipient_user_ids?: string[] | null
          recipients_count?: number | null
          scheduled_for?: string | null
          sent_at?: string | null
          status?: string
          subject: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string
          id?: string
          name?: string
          recipient_user_ids?: string[] | null
          recipients_count?: number | null
          scheduled_for?: string | null
          sent_at?: string | null
          status?: string
          subject?: string
          updated_at?: string
        }
        Relationships: []
      }
      email_templates: {
        Row: {
          category: string
          content: Json
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          name: string
          subject: string
          updated_at: string
        }
        Insert: {
          category?: string
          content: Json
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name: string
          subject: string
          updated_at?: string
        }
        Update: {
          category?: string
          content?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name?: string
          subject?: string
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
            foreignKeyName: "event_class_list_members_class_list_id_fkey"
            columns: ["class_list_id"]
            isOneToOne: false
            referencedRelation: "event_class_lists"
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
          cohort_id: string | null
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
          is_recurring: boolean | null
          is_travel_involved: boolean | null
          location: string | null
          misc_supplies: number | null
          net_total: number | null
          no_sing_rest_date_end: string | null
          no_sing_rest_date_start: string | null
          no_sing_rest_required: boolean | null
          purpose: string | null
          recurring_days: string[] | null
          recurring_end_date: string | null
          recurring_frequency: string | null
          recurring_interval: number | null
          recurring_occurrence_date: string | null
          recurring_parent_id: string | null
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
          cohort_id?: string | null
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
          is_recurring?: boolean | null
          is_travel_involved?: boolean | null
          location?: string | null
          misc_supplies?: number | null
          net_total?: number | null
          no_sing_rest_date_end?: string | null
          no_sing_rest_date_start?: string | null
          no_sing_rest_required?: boolean | null
          purpose?: string | null
          recurring_days?: string[] | null
          recurring_end_date?: string | null
          recurring_frequency?: string | null
          recurring_interval?: number | null
          recurring_occurrence_date?: string | null
          recurring_parent_id?: string | null
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
          cohort_id?: string | null
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
          is_recurring?: boolean | null
          is_travel_involved?: boolean | null
          location?: string | null
          misc_supplies?: number | null
          net_total?: number | null
          no_sing_rest_date_end?: string | null
          no_sing_rest_date_start?: string | null
          no_sing_rest_required?: boolean | null
          purpose?: string | null
          recurring_days?: string[] | null
          recurring_end_date?: string | null
          recurring_frequency?: string | null
          recurring_interval?: number | null
          recurring_occurrence_date?: string | null
          recurring_parent_id?: string | null
          send_contracts?: boolean
          start_date?: string
          ticket_sales?: number | null
          title?: string
          total_expenses?: number | null
          total_income?: number | null
          updated_at?: string
          volunteers?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "events_cohort_id_fkey"
            columns: ["cohort_id"]
            isOneToOne: false
            referencedRelation: "cohorts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_recurring_parent_id_fkey"
            columns: ["recurring_parent_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
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
      exercises: {
        Row: {
          created_at: string | null
          id: string
          json_score: Json
          musicxml_url: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          json_score: Json
          musicxml_url: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          json_score?: Json
          musicxml_url?: string
          user_id?: string | null
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
      fy_checkins: {
        Row: {
          academic_progress: string | null
          challenges: string | null
          coordinator_notes: string | null
          goals: string | null
          id: string
          mentor_feedback: string | null
          mood_rating: number | null
          student_id: string
          submitted_at: string
          updated_at: string
          vocal_progress: string | null
          week_number: number
        }
        Insert: {
          academic_progress?: string | null
          challenges?: string | null
          coordinator_notes?: string | null
          goals?: string | null
          id?: string
          mentor_feedback?: string | null
          mood_rating?: number | null
          student_id: string
          submitted_at?: string
          updated_at?: string
          vocal_progress?: string | null
          week_number: number
        }
        Update: {
          academic_progress?: string | null
          challenges?: string | null
          coordinator_notes?: string | null
          goals?: string | null
          id?: string
          mentor_feedback?: string | null
          mood_rating?: number | null
          student_id?: string
          submitted_at?: string
          updated_at?: string
          vocal_progress?: string | null
          week_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "fy_checkins_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "fy_students"
            referencedColumns: ["id"]
          },
        ]
      }
      fy_cohorts: {
        Row: {
          academic_year: string
          coordinator_id: string | null
          created_at: string
          description: string | null
          end_date: string | null
          id: string
          is_active: boolean
          name: string
          start_date: string
          updated_at: string
        }
        Insert: {
          academic_year: string
          coordinator_id?: string | null
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean
          name: string
          start_date: string
          updated_at?: string
        }
        Update: {
          academic_year?: string
          coordinator_id?: string | null
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean
          name?: string
          start_date?: string
          updated_at?: string
        }
        Relationships: []
      }
      fy_practice_logs: {
        Row: {
          created_at: string
          duration_minutes: number
          focus_areas: string[] | null
          id: string
          notes: string | null
          pieces_practiced: string[] | null
          practice_date: string
          quality_rating: number | null
          student_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          duration_minutes: number
          focus_areas?: string[] | null
          id?: string
          notes?: string | null
          pieces_practiced?: string[] | null
          practice_date: string
          quality_rating?: number | null
          student_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          duration_minutes?: number
          focus_areas?: string[] | null
          id?: string
          notes?: string | null
          pieces_practiced?: string[] | null
          practice_date?: string
          quality_rating?: number | null
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fy_practice_logs_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "fy_students"
            referencedColumns: ["id"]
          },
        ]
      }
      fy_students: {
        Row: {
          academic_status: string | null
          cohort_id: string
          created_at: string
          id: string
          mentor_id: string | null
          student_id: string | null
          updated_at: string
          user_id: string
          voice_part: string | null
        }
        Insert: {
          academic_status?: string | null
          cohort_id: string
          created_at?: string
          id?: string
          mentor_id?: string | null
          student_id?: string | null
          updated_at?: string
          user_id: string
          voice_part?: string | null
        }
        Update: {
          academic_status?: string | null
          cohort_id?: string
          created_at?: string
          id?: string
          mentor_id?: string | null
          student_id?: string | null
          updated_at?: string
          user_id?: string
          voice_part?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fy_students_cohort_id_fkey"
            columns: ["cohort_id"]
            isOneToOne: false
            referencedRelation: "fy_cohorts"
            referencedColumns: ["id"]
          },
        ]
      }
      fy_task_submissions: {
        Row: {
          created_at: string
          description: string | null
          due_date: string | null
          feedback: string | null
          grade: string | null
          id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          student_id: string
          submission_text: string | null
          submission_url: string | null
          submitted_at: string | null
          task_type: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          due_date?: string | null
          feedback?: string | null
          grade?: string | null
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          student_id: string
          submission_text?: string | null
          submission_url?: string | null
          submitted_at?: string | null
          task_type: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          due_date?: string | null
          feedback?: string | null
          grade?: string | null
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          student_id?: string
          submission_text?: string | null
          submission_url?: string | null
          submitted_at?: string | null
          task_type?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fy_task_submissions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "fy_students"
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
      glee_academy_courses: {
        Row: {
          course_code: string
          created_at: string | null
          credits: number | null
          description: string | null
          id: string
          instructor_email: string | null
          instructor_name: string | null
          instructor_office: string | null
          instructor_office_hours: string | null
          is_active: boolean | null
          location: string | null
          max_students: number | null
          meeting_times: string | null
          semester: string | null
          syllabus_data: Json | null
          title: string
          updated_at: string | null
        }
        Insert: {
          course_code: string
          created_at?: string | null
          credits?: number | null
          description?: string | null
          id?: string
          instructor_email?: string | null
          instructor_name?: string | null
          instructor_office?: string | null
          instructor_office_hours?: string | null
          is_active?: boolean | null
          location?: string | null
          max_students?: number | null
          meeting_times?: string | null
          semester?: string | null
          syllabus_data?: Json | null
          title: string
          updated_at?: string | null
        }
        Update: {
          course_code?: string
          created_at?: string | null
          credits?: number | null
          description?: string | null
          id?: string
          instructor_email?: string | null
          instructor_name?: string | null
          instructor_office?: string | null
          instructor_office_hours?: string | null
          is_active?: boolean | null
          location?: string | null
          max_students?: number | null
          meeting_times?: string | null
          semester?: string | null
          syllabus_data?: Json | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      glee_academy_enrollments: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          course_id: string
          created_at: string | null
          enrollment_date: string | null
          enrollment_status: string | null
          grade: string | null
          id: string
          notes: string | null
          student_id: string
          updated_at: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          course_id: string
          created_at?: string | null
          enrollment_date?: string | null
          enrollment_status?: string | null
          grade?: string | null
          id?: string
          notes?: string | null
          student_id: string
          updated_at?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          course_id?: string
          created_at?: string | null
          enrollment_date?: string | null
          enrollment_status?: string | null
          grade?: string | null
          id?: string
          notes?: string | null
          student_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "glee_academy_enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "glee_academy_courses"
            referencedColumns: ["id"]
          },
        ]
      }
      glee_academy_tests: {
        Row: {
          allow_retakes: boolean | null
          course_id: string
          created_at: string | null
          created_by: string | null
          description: string | null
          duration_minutes: number | null
          id: string
          instructions: string | null
          is_practice: boolean | null
          is_published: boolean | null
          passing_score: number | null
          randomize_questions: boolean | null
          show_correct_answers: boolean | null
          title: string
          total_points: number | null
          updated_at: string | null
        }
        Insert: {
          allow_retakes?: boolean | null
          course_id: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          duration_minutes?: number | null
          id?: string
          instructions?: string | null
          is_practice?: boolean | null
          is_published?: boolean | null
          passing_score?: number | null
          randomize_questions?: boolean | null
          show_correct_answers?: boolean | null
          title: string
          total_points?: number | null
          updated_at?: string | null
        }
        Update: {
          allow_retakes?: boolean | null
          course_id?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          duration_minutes?: number | null
          id?: string
          instructions?: string | null
          is_practice?: boolean | null
          is_published?: boolean | null
          passing_score?: number | null
          randomize_questions?: boolean | null
          show_correct_answers?: boolean | null
          title?: string
          total_points?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      glee_club_contacts: {
        Row: {
          address: string | null
          city: string | null
          class: string | null
          ConsentDate: string | null
          ConsentIP: string | null
          ConsentTracking: boolean | null
          created_at: string
          CreatedFromIP: string | null
          DateAdded: string | null
          DateUpdated: string | null
          display_name: string | null
          Email: string
          ErrorCode: string | null
          FirstName: string | null
          FriendlyErrorMessage: string | null
          id: string
          last_update: string | null
          LastClicked: string | null
          LastFailed: string | null
          LastName: string | null
          LastOpened: string | null
          LastSent: string | null
          phone: string | null
          Source: string | null
          state: string | null
          Status: string
          StatusChangeDate: string | null
          TotalClicked: number
          TotalFailed: number
          TotalOpened: number
          TotalSent: number
          UnsubscribeReason: string | null
          UnsubscribeReasonNotes: string | null
          updated_at: string
          zip: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          class?: string | null
          ConsentDate?: string | null
          ConsentIP?: string | null
          ConsentTracking?: boolean | null
          created_at?: string
          CreatedFromIP?: string | null
          DateAdded?: string | null
          DateUpdated?: string | null
          display_name?: string | null
          Email: string
          ErrorCode?: string | null
          FirstName?: string | null
          FriendlyErrorMessage?: string | null
          id?: string
          last_update?: string | null
          LastClicked?: string | null
          LastFailed?: string | null
          LastName?: string | null
          LastOpened?: string | null
          LastSent?: string | null
          phone?: string | null
          Source?: string | null
          state?: string | null
          Status?: string
          StatusChangeDate?: string | null
          TotalClicked?: number
          TotalFailed?: number
          TotalOpened?: number
          TotalSent?: number
          UnsubscribeReason?: string | null
          UnsubscribeReasonNotes?: string | null
          updated_at?: string
          zip?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          class?: string | null
          ConsentDate?: string | null
          ConsentIP?: string | null
          ConsentTracking?: boolean | null
          created_at?: string
          CreatedFromIP?: string | null
          DateAdded?: string | null
          DateUpdated?: string | null
          display_name?: string | null
          Email?: string
          ErrorCode?: string | null
          FirstName?: string | null
          FriendlyErrorMessage?: string | null
          id?: string
          last_update?: string | null
          LastClicked?: string | null
          LastFailed?: string | null
          LastName?: string | null
          LastOpened?: string | null
          LastSent?: string | null
          phone?: string | null
          Source?: string | null
          state?: string | null
          Status?: string
          StatusChangeDate?: string | null
          TotalClicked?: number
          TotalFailed?: number
          TotalOpened?: number
          TotalSent?: number
          UnsubscribeReason?: string | null
          UnsubscribeReasonNotes?: string | null
          updated_at?: string
          zip?: string | null
        }
        Relationships: []
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
      glee_ledger_sheets: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          google_sheet_id: string | null
          google_sheet_url: string | null
          id: string
          is_active: boolean
          last_synced_at: string | null
          name: string
          permissions: Json | null
          sheet_config: Json | null
          sheet_type: string
          sync_enabled: boolean
          template_type: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          google_sheet_id?: string | null
          google_sheet_url?: string | null
          id?: string
          is_active?: boolean
          last_synced_at?: string | null
          name: string
          permissions?: Json | null
          sheet_config?: Json | null
          sheet_type?: string
          sync_enabled?: boolean
          template_type?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          google_sheet_id?: string | null
          google_sheet_url?: string | null
          id?: string
          is_active?: boolean
          last_synced_at?: string | null
          name?: string
          permissions?: Json | null
          sheet_config?: Json | null
          sheet_type?: string
          sync_enabled?: boolean
          template_type?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      glee_ledger_sync_logs: {
        Row: {
          completed_at: string | null
          error_message: string | null
          id: string
          sheet_id: string
          started_at: string
          sync_data: Json | null
          sync_status: string
          sync_type: string
          triggered_by: string | null
        }
        Insert: {
          completed_at?: string | null
          error_message?: string | null
          id?: string
          sheet_id: string
          started_at?: string
          sync_data?: Json | null
          sync_status?: string
          sync_type: string
          triggered_by?: string | null
        }
        Update: {
          completed_at?: string | null
          error_message?: string | null
          id?: string
          sheet_id?: string
          started_at?: string
          sync_data?: Json | null
          sync_status?: string
          sync_type?: string
          triggered_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "glee_ledger_sync_logs_sheet_id_fkey"
            columns: ["sheet_id"]
            isOneToOne: false
            referencedRelation: "glee_ledger_sheets"
            referencedColumns: ["id"]
          },
        ]
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
      group_update_member_contributions: {
        Row: {
          contribution: string
          created_at: string
          group_update_id: string | null
          id: string
          member_id: string | null
          member_name: string
          updated_at: string
        }
        Insert: {
          contribution: string
          created_at?: string
          group_update_id?: string | null
          id?: string
          member_id?: string | null
          member_name: string
          updated_at?: string
        }
        Update: {
          contribution?: string
          created_at?: string
          group_update_id?: string | null
          id?: string
          member_id?: string | null
          member_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_update_member_contributions_group_update_id_fkey"
            columns: ["group_update_id"]
            isOneToOne: false
            referencedRelation: "group_updates_mus240"
            referencedColumns: ["id"]
          },
        ]
      }
      group_updates_mus240: {
        Row: {
          challenges_faced: string | null
          completion_plan: string
          created_at: string
          final_product_description: string
          final_product_link: string | null
          group_id: string | null
          group_moderator: string
          group_name: string
          id: string
          individual_contributions: string
          project_progress: string
          source_links: string | null
          submitter_id: string | null
          submitter_name: string
          team_members: string
          thesis_statement: string
          updated_at: string
        }
        Insert: {
          challenges_faced?: string | null
          completion_plan: string
          created_at?: string
          final_product_description: string
          final_product_link?: string | null
          group_id?: string | null
          group_moderator: string
          group_name: string
          id?: string
          individual_contributions: string
          project_progress: string
          source_links?: string | null
          submitter_id?: string | null
          submitter_name: string
          team_members: string
          thesis_statement: string
          updated_at?: string
        }
        Update: {
          challenges_faced?: string | null
          completion_plan?: string
          created_at?: string
          final_product_description?: string
          final_product_link?: string | null
          group_id?: string | null
          group_moderator?: string
          group_name?: string
          id?: string
          individual_contributions?: string
          project_progress?: string
          source_links?: string | null
          submitter_id?: string | null
          submitter_name?: string
          team_members?: string
          thesis_statement?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_updates_mus240_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "mus240_project_groups"
            referencedColumns: ["id"]
          },
        ]
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
      gw_app_functions: {
        Row: {
          category: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          module: string
          name: string
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          module?: string
          name: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          module?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
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
      gw_appointment_services: {
        Row: {
          advance_booking_days: number | null
          badge_color: string | null
          badge_text: string | null
          booking_buffer_minutes: number | null
          capacity_max: number | null
          capacity_min: number | null
          category: string | null
          color: string | null
          created_at: string
          default_duration_minutes: number
          description: string | null
          id: string
          image_url: string | null
          instructor: string | null
          is_active: boolean
          location: string | null
          name: string
          price_amount: number | null
          price_display: string | null
          requires_approval: boolean | null
          updated_at: string
        }
        Insert: {
          advance_booking_days?: number | null
          badge_color?: string | null
          badge_text?: string | null
          booking_buffer_minutes?: number | null
          capacity_max?: number | null
          capacity_min?: number | null
          category?: string | null
          color?: string | null
          created_at?: string
          default_duration_minutes?: number
          description?: string | null
          id?: string
          image_url?: string | null
          instructor?: string | null
          is_active?: boolean
          location?: string | null
          name: string
          price_amount?: number | null
          price_display?: string | null
          requires_approval?: boolean | null
          updated_at?: string
        }
        Update: {
          advance_booking_days?: number | null
          badge_color?: string | null
          badge_text?: string | null
          booking_buffer_minutes?: number | null
          capacity_max?: number | null
          capacity_min?: number | null
          category?: string | null
          color?: string | null
          created_at?: string
          default_duration_minutes?: number
          description?: string | null
          id?: string
          image_url?: string | null
          instructor?: string | null
          is_active?: boolean
          location?: string | null
          name?: string
          price_amount?: number | null
          price_display?: string | null
          requires_approval?: boolean | null
          updated_at?: string
        }
        Relationships: []
      }
      gw_appointments: {
        Row: {
          appointment_date: string
          appointment_type: string
          approved_at: string | null
          approved_by: string | null
          assigned_to: string | null
          client_email: string | null
          client_name: string
          client_phone: string | null
          created_at: string
          created_by: string | null
          description: string | null
          duration_minutes: number
          id: string
          is_recurring: boolean | null
          max_occurrences: number | null
          notes: string | null
          parent_appointment_id: string | null
          payment_amount: number | null
          payment_status: string | null
          provider_id: string | null
          recurrence_days_of_week: number[] | null
          recurrence_end_date: string | null
          recurrence_interval: number | null
          recurrence_type: string | null
          status: string
          stripe_session_id: string | null
          stripe_subscription_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          appointment_date: string
          appointment_type?: string
          approved_at?: string | null
          approved_by?: string | null
          assigned_to?: string | null
          client_email?: string | null
          client_name: string
          client_phone?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          duration_minutes?: number
          id?: string
          is_recurring?: boolean | null
          max_occurrences?: number | null
          notes?: string | null
          parent_appointment_id?: string | null
          payment_amount?: number | null
          payment_status?: string | null
          provider_id?: string | null
          recurrence_days_of_week?: number[] | null
          recurrence_end_date?: string | null
          recurrence_interval?: number | null
          recurrence_type?: string | null
          status?: string
          stripe_session_id?: string | null
          stripe_subscription_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          appointment_date?: string
          appointment_type?: string
          approved_at?: string | null
          approved_by?: string | null
          assigned_to?: string | null
          client_email?: string | null
          client_name?: string
          client_phone?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          duration_minutes?: number
          id?: string
          is_recurring?: boolean | null
          max_occurrences?: number | null
          notes?: string | null
          parent_appointment_id?: string | null
          payment_amount?: number | null
          payment_status?: string | null
          provider_id?: string | null
          recurrence_days_of_week?: number[] | null
          recurrence_end_date?: string | null
          recurrence_interval?: number | null
          recurrence_type?: string | null
          status?: string
          stripe_session_id?: string | null
          stripe_subscription_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gw_appointments_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "gw_service_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      gw_assignment_rubrics: {
        Row: {
          assignment_id: string
          id: string
          rubric_id: string
        }
        Insert: {
          assignment_id: string
          id?: string
          rubric_id: string
        }
        Update: {
          assignment_id?: string
          id?: string
          rubric_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gw_assignment_rubrics_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "gw_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gw_assignment_rubrics_rubric_id_fkey"
            columns: ["rubric_id"]
            isOneToOne: false
            referencedRelation: "gw_rubrics"
            referencedColumns: ["id"]
          },
        ]
      }
      gw_assignment_submissions: {
        Row: {
          assignment_id: string
          created_at: string
          feedback: string | null
          graded_at: string | null
          graded_by: string | null
          id: string
          notes: string | null
          overall_performance: Json | null
          pitch_accuracy: number | null
          recording_id: string | null
          recording_url: string | null
          rhythm_accuracy: number | null
          score_value: number | null
          status: Database["public"]["Enums"]["assignment_status"]
          submitted_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          assignment_id: string
          created_at?: string
          feedback?: string | null
          graded_at?: string | null
          graded_by?: string | null
          id?: string
          notes?: string | null
          overall_performance?: Json | null
          pitch_accuracy?: number | null
          recording_id?: string | null
          recording_url?: string | null
          rhythm_accuracy?: number | null
          score_value?: number | null
          status?: Database["public"]["Enums"]["assignment_status"]
          submitted_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          assignment_id?: string
          created_at?: string
          feedback?: string | null
          graded_at?: string | null
          graded_by?: string | null
          id?: string
          notes?: string | null
          overall_performance?: Json | null
          pitch_accuracy?: number | null
          recording_id?: string | null
          recording_url?: string | null
          rhythm_accuracy?: number | null
          score_value?: number | null
          status?: Database["public"]["Enums"]["assignment_status"]
          submitted_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gw_assignment_submissions_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "gw_sight_reading_assignments"
            referencedColumns: ["id"]
          },
        ]
      }
      gw_assignments: {
        Row: {
          assignment_type: string | null
          category: string | null
          course_id: string
          created_at: string | null
          created_by: string | null
          description: string | null
          due_at: string | null
          id: string
          is_active: boolean | null
          legacy_id: string | null
          legacy_source: string | null
          points: number | null
          title: string
          updated_at: string | null
        }
        Insert: {
          assignment_type?: string | null
          category?: string | null
          course_id: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_at?: string | null
          id?: string
          is_active?: boolean | null
          legacy_id?: string | null
          legacy_source?: string | null
          points?: number | null
          title: string
          updated_at?: string | null
        }
        Update: {
          assignment_type?: string | null
          category?: string | null
          course_id?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_at?: string | null
          id?: string
          is_active?: boolean | null
          legacy_id?: string | null
          legacy_source?: string | null
          points?: number | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gw_assignments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "gw_courses"
            referencedColumns: ["id"]
          },
        ]
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
          assignment_id: string | null
          context_type: string | null
          course_code: string | null
          created_at: string
          custom_data: Json | null
          event_id: string
          expires_at: string
          generated_at: string
          generated_by: string
          id: string
          is_active: boolean
          location_data: Json | null
          max_scans: number | null
          qr_token: string
          redirect_url: string | null
          scan_count: number
          updated_at: string
        }
        Insert: {
          assignment_id?: string | null
          context_type?: string | null
          course_code?: string | null
          created_at?: string
          custom_data?: Json | null
          event_id: string
          expires_at: string
          generated_at?: string
          generated_by: string
          id?: string
          is_active?: boolean
          location_data?: Json | null
          max_scans?: number | null
          qr_token: string
          redirect_url?: string | null
          scan_count?: number
          updated_at?: string
        }
        Update: {
          assignment_id?: string | null
          context_type?: string | null
          course_code?: string | null
          created_at?: string
          custom_data?: Json | null
          event_id?: string
          expires_at?: string
          generated_at?: string
          generated_by?: string
          id?: string
          is_active?: boolean
          location_data?: Json | null
          max_scans?: number | null
          qr_token?: string
          redirect_url?: string | null
          scan_count?: number
          updated_at?: string
        }
        Relationships: []
      }
      gw_attendance_qr_scans: {
        Row: {
          created_at: string
          id: string
          ip_address: unknown
          qr_code_id: string
          scan_location: Json | null
          scanned_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          ip_address?: unknown
          qr_code_id: string
          scan_location?: Json | null
          scanned_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          ip_address?: unknown
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
      gw_attendance_qr_tokens: {
        Row: {
          created_at: string | null
          created_by: string | null
          event_id: string | null
          expires_at: string
          id: string
          is_active: boolean | null
          token: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          event_id?: string | null
          expires_at: string
          id?: string
          is_active?: boolean | null
          token: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          event_id?: string | null
          expires_at?: string
          id?: string
          is_active?: boolean | null
          token?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gw_attendance_qr_tokens_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "gw_events"
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
      gw_blocked_dates: {
        Row: {
          blocked_date: string
          created_at: string
          created_by: string | null
          id: string
          reason: string | null
        }
        Insert: {
          blocked_date: string
          created_at?: string
          created_by?: string | null
          id?: string
          reason?: string | null
        }
        Update: {
          blocked_date?: string
          created_at?: string
          created_by?: string | null
          id?: string
          reason?: string | null
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
          audio_duration: number | null
          audio_url: string | null
          created_at: string
          decorations: string | null
          id: string
          is_anonymous: boolean
          is_karaoke_recording: boolean | null
          likes: number | null
          message: string
          note_color: string
          recipient_user_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          audio_duration?: number | null
          audio_url?: string | null
          created_at?: string
          decorations?: string | null
          id?: string
          is_anonymous?: boolean
          is_karaoke_recording?: boolean | null
          likes?: number | null
          message: string
          note_color?: string
          recipient_user_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          audio_duration?: number | null
          audio_url?: string | null
          created_at?: string
          decorations?: string | null
          id?: string
          is_anonymous?: boolean
          is_karaoke_recording?: boolean | null
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
      gw_communication_delivery: {
        Row: {
          communication_id: string | null
          created_at: string | null
          delivered_at: string | null
          delivery_method: string
          error_message: string | null
          external_id: string | null
          id: string
          metadata: Json | null
          read_at: string | null
          recipient_id: string | null
          status: string
        }
        Insert: {
          communication_id?: string | null
          created_at?: string | null
          delivered_at?: string | null
          delivery_method: string
          error_message?: string | null
          external_id?: string | null
          id?: string
          metadata?: Json | null
          read_at?: string | null
          recipient_id?: string | null
          status?: string
        }
        Update: {
          communication_id?: string | null
          created_at?: string | null
          delivered_at?: string | null
          delivery_method?: string
          error_message?: string | null
          external_id?: string | null
          id?: string
          metadata?: Json | null
          read_at?: string | null
          recipient_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "gw_communication_delivery_communication_id_fkey"
            columns: ["communication_id"]
            isOneToOne: false
            referencedRelation: "gw_communication_system"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gw_communication_delivery_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "gw_communication_recipients"
            referencedColumns: ["id"]
          },
        ]
      }
      gw_communication_recipients: {
        Row: {
          communication_id: string | null
          created_at: string | null
          id: string
          recipient_email: string | null
          recipient_identifier: string | null
          recipient_name: string | null
          recipient_phone: string | null
          recipient_type: string
        }
        Insert: {
          communication_id?: string | null
          created_at?: string | null
          id?: string
          recipient_email?: string | null
          recipient_identifier?: string | null
          recipient_name?: string | null
          recipient_phone?: string | null
          recipient_type: string
        }
        Update: {
          communication_id?: string | null
          created_at?: string | null
          id?: string
          recipient_email?: string | null
          recipient_identifier?: string | null
          recipient_name?: string | null
          recipient_phone?: string | null
          recipient_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "gw_communication_recipients_communication_id_fkey"
            columns: ["communication_id"]
            isOneToOne: false
            referencedRelation: "gw_communication_system"
            referencedColumns: ["id"]
          },
        ]
      }
      gw_communication_system: {
        Row: {
          content: string
          created_at: string | null
          expires_at: string | null
          id: string
          metadata: Json | null
          priority: string
          scheduled_for: string | null
          sender_id: string | null
          sender_name: string
          status: string
          title: string
          type: string
          updated_at: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          metadata?: Json | null
          priority?: string
          scheduled_for?: string | null
          sender_id?: string | null
          sender_name: string
          status?: string
          title: string
          type?: string
          updated_at?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          metadata?: Json | null
          priority?: string
          scheduled_for?: string | null
          sender_id?: string | null
          sender_name?: string
          status?: string
          title?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      gw_communication_templates: {
        Row: {
          category: string
          content: string
          created_at: string | null
          created_by: string | null
          id: string
          is_active: boolean | null
          name: string
          subject: string
          updated_at: string | null
          variables: Json | null
        }
        Insert: {
          category?: string
          content: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          subject: string
          updated_at?: string | null
          variables?: Json | null
        }
        Update: {
          category?: string
          content?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          subject?: string
          updated_at?: string | null
          variables?: Json | null
        }
        Relationships: []
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
      gw_courses: {
        Row: {
          code: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          term: string | null
          title: string
        }
        Insert: {
          code?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          term?: string | null
          title: string
        }
        Update: {
          code?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          term?: string | null
          title?: string
        }
        Relationships: []
      }
      gw_dashboard_card_order: {
        Row: {
          card_order: string[]
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          card_order: string[]
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          card_order?: string[]
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      gw_document_shares: {
        Row: {
          document_id: string | null
          expires_at: string | null
          granted_at: string | null
          granted_by: string | null
          id: string
          is_active: boolean | null
          permission_type: string
          user_id: string | null
        }
        Insert: {
          document_id?: string | null
          expires_at?: string | null
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          is_active?: boolean | null
          permission_type?: string
          user_id?: string | null
        }
        Update: {
          document_id?: string | null
          expires_at?: string | null
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          is_active?: boolean | null
          permission_type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gw_document_shares_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "gw_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      gw_documents: {
        Row: {
          content_preview: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          document_type: string | null
          google_doc_id: string | null
          google_doc_url: string | null
          id: string
          last_synced_at: string | null
          owner_id: string | null
          permissions: Json | null
          shared_with: string[] | null
          status: string | null
          tags: string[] | null
          title: string
          updated_at: string | null
        }
        Insert: {
          content_preview?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          document_type?: string | null
          google_doc_id?: string | null
          google_doc_url?: string | null
          id?: string
          last_synced_at?: string | null
          owner_id?: string | null
          permissions?: Json | null
          shared_with?: string[] | null
          status?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string | null
        }
        Update: {
          content_preview?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          document_type?: string | null
          google_doc_id?: string | null
          google_doc_url?: string | null
          id?: string
          last_synced_at?: string | null
          owner_id?: string | null
          permissions?: Json | null
          shared_with?: string[] | null
          status?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string | null
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
        Relationships: [
          {
            foreignKeyName: "fk_gw_dues_records_user_id"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "gw_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "fk_gw_dues_records_user_id"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_dashboard_data"
            referencedColumns: ["user_id"]
          },
        ]
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
      gw_email_drafts: {
        Row: {
          created_at: string
          id: string
          message: string
          recipients: Json
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message?: string
          recipients?: Json
          subject?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          recipients?: Json
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      gw_enrollments: {
        Row: {
          course_id: string
          created_at: string | null
          id: string
          role: string | null
          student_id: string
        }
        Insert: {
          course_id: string
          created_at?: string | null
          id?: string
          role?: string | null
          student_id: string
        }
        Update: {
          course_id?: string
          created_at?: string | null
          id?: string
          role?: string | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gw_enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "gw_courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gw_enrollments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "gw_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "gw_enrollments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "user_dashboard_data"
            referencedColumns: ["user_id"]
          },
        ]
      }
      gw_error_logs: {
        Row: {
          additional_context: Json | null
          component: string | null
          created_at: string
          error_message: string
          error_type: string
          id: string
          session_id: string | null
          stack_trace: string | null
          timestamp_occurred: string
          url: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          additional_context?: Json | null
          component?: string | null
          created_at?: string
          error_message: string
          error_type: string
          id?: string
          session_id?: string | null
          stack_trace?: string | null
          timestamp_occurred?: string
          url?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          additional_context?: Json | null
          component?: string | null
          created_at?: string
          error_message?: string
          error_type?: string
          id?: string
          session_id?: string | null
          stack_trace?: string | null
          timestamp_occurred?: string
          url?: string | null
          user_agent?: string | null
          user_id?: string | null
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
          is_recurring: boolean | null
          late_arrival_allowed: boolean | null
          location: string | null
          max_attendees: number | null
          max_occurrences: number | null
          parent_event_id: string | null
          recurrence_days_of_week: number[] | null
          recurrence_end_date: string | null
          recurrence_interval: number | null
          recurrence_rule: string | null
          recurrence_type: string | null
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
          is_recurring?: boolean | null
          late_arrival_allowed?: boolean | null
          location?: string | null
          max_attendees?: number | null
          max_occurrences?: number | null
          parent_event_id?: string | null
          recurrence_days_of_week?: number[] | null
          recurrence_end_date?: string | null
          recurrence_interval?: number | null
          recurrence_rule?: string | null
          recurrence_type?: string | null
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
          is_recurring?: boolean | null
          late_arrival_allowed?: boolean | null
          location?: string | null
          max_attendees?: number | null
          max_occurrences?: number | null
          parent_event_id?: string | null
          recurrence_days_of_week?: number[] | null
          recurrence_end_date?: string | null
          recurrence_interval?: number | null
          recurrence_rule?: string | null
          recurrence_type?: string | null
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
          {
            foreignKeyName: "gw_events_parent_event_id_fkey"
            columns: ["parent_event_id"]
            isOneToOne: false
            referencedRelation: "gw_events"
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
      gw_executive_module_preferences: {
        Row: {
          created_at: string
          id: string
          is_enabled: boolean
          module_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_enabled?: boolean
          module_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_enabled?: boolean
          module_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      gw_executive_position_functions: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          can_access: boolean
          can_manage: boolean
          function_id: string
          id: string
          position: Database["public"]["Enums"]["executive_position"]
          updated_at: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          can_access?: boolean
          can_manage?: boolean
          function_id: string
          id?: string
          position: Database["public"]["Enums"]["executive_position"]
          updated_at?: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          can_access?: boolean
          can_manage?: boolean
          function_id?: string
          id?: string
          position?: Database["public"]["Enums"]["executive_position"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gw_executive_position_functions_function_id_fkey"
            columns: ["function_id"]
            isOneToOne: false
            referencedRelation: "gw_app_functions"
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
      gw_feedback: {
        Row: {
          author_id: string | null
          body: string
          created_at: string | null
          id: string
          is_ai_generated: boolean | null
          submission_id: string
        }
        Insert: {
          author_id?: string | null
          body: string
          created_at?: string | null
          id?: string
          is_ai_generated?: boolean | null
          submission_id: string
        }
        Update: {
          author_id?: string | null
          body?: string
          created_at?: string | null
          id?: string
          is_ai_generated?: boolean | null
          submission_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gw_feedback_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "gw_submissions"
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
      gw_grades: {
        Row: {
          assignment_id: string
          graded_at: string | null
          graded_by: string | null
          id: string
          legacy_id: string | null
          legacy_source: string | null
          letter_grade: string | null
          max_points: number
          percentage: number | null
          student_id: string
          total_score: number
        }
        Insert: {
          assignment_id: string
          graded_at?: string | null
          graded_by?: string | null
          id?: string
          legacy_id?: string | null
          legacy_source?: string | null
          letter_grade?: string | null
          max_points: number
          percentage?: number | null
          student_id: string
          total_score: number
        }
        Update: {
          assignment_id?: string
          graded_at?: string | null
          graded_by?: string | null
          id?: string
          legacy_id?: string | null
          legacy_source?: string | null
          letter_grade?: string | null
          max_points?: number
          percentage?: number | null
          student_id?: string
          total_score?: number
        }
        Relationships: [
          {
            foreignKeyName: "gw_grades_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "gw_assignments"
            referencedColumns: ["id"]
          },
        ]
      }
      gw_group_applications: {
        Row: {
          applicant_id: string
          application_message: string | null
          created_at: string | null
          full_name: string
          group_id: string
          id: string
          status: string
          updated_at: string | null
        }
        Insert: {
          applicant_id: string
          application_message?: string | null
          created_at?: string | null
          full_name: string
          group_id: string
          id?: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          applicant_id?: string
          application_message?: string | null
          created_at?: string | null
          full_name?: string
          group_id?: string
          id?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gw_group_applications_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "gw_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      gw_group_members: {
        Row: {
          group_id: string
          id: string
          is_muted: boolean
          joined_at: string
          last_read_at: string | null
          role: string
          user_id: string
        }
        Insert: {
          group_id: string
          id?: string
          is_muted?: boolean
          joined_at?: string
          last_read_at?: string | null
          role?: string
          user_id: string
        }
        Update: {
          group_id?: string
          id?: string
          is_muted?: boolean
          joined_at?: string
          last_read_at?: string | null
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_gw_group_members_user_profile"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "gw_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "fk_gw_group_members_user_profile"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_dashboard_data"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "gw_group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "gw_message_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      gw_group_messages: {
        Row: {
          content: string | null
          created_at: string
          edited_at: string | null
          file_name: string | null
          file_size: number | null
          file_url: string | null
          group_id: string
          id: string
          is_edited: boolean
          message_type: string
          reply_to_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string
          edited_at?: string | null
          file_name?: string | null
          file_size?: number | null
          file_url?: string | null
          group_id: string
          id?: string
          is_edited?: boolean
          message_type?: string
          reply_to_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string
          edited_at?: string | null
          file_name?: string | null
          file_size?: number | null
          file_url?: string | null
          group_id?: string
          id?: string
          is_edited?: boolean
          message_type?: string
          reply_to_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_gw_group_messages_user_profile"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "gw_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "fk_gw_group_messages_user_profile"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_dashboard_data"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "gw_group_messages_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "gw_message_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gw_group_messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "gw_group_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      gw_groups: {
        Row: {
          course_id: string
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          is_official: boolean | null
          leader_id: string
          legacy_id: string | null
          legacy_source: string | null
          max_members: number | null
          member_count: number | null
          name: string
          semester: string | null
          updated_at: string | null
        }
        Insert: {
          course_id: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_official?: boolean | null
          leader_id: string
          legacy_id?: string | null
          legacy_source?: string | null
          max_members?: number | null
          member_count?: number | null
          name: string
          semester?: string | null
          updated_at?: string | null
        }
        Update: {
          course_id?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_official?: boolean | null
          leader_id?: string
          legacy_id?: string | null
          legacy_source?: string | null
          max_members?: number | null
          member_count?: number | null
          name?: string
          semester?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gw_groups_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "gw_courses"
            referencedColumns: ["id"]
          },
        ]
      }
      gw_hair_nail_submissions: {
        Row: {
          created_at: string
          event_date: string | null
          event_name: string | null
          id: string
          image_path: string
          image_url: string
          notes: string | null
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          submission_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_date?: string | null
          event_name?: string | null
          id?: string
          image_path: string
          image_url: string
          notes?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submission_type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_date?: string | null
          event_name?: string | null
          id?: string
          image_path?: string
          image_url?: string
          notes?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submission_type?: string
          updated_at?: string
          user_id?: string
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
      gw_internal_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          tags: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          tags?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          tags?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      gw_karaoke_recordings: {
        Row: {
          created_at: string
          duration_seconds: number | null
          file_path: string
          file_url: string
          id: string
          is_shared_to_social: boolean | null
          social_platforms: Json | null
          song_title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          duration_seconds?: number | null
          file_path: string
          file_url: string
          id?: string
          is_shared_to_social?: boolean | null
          social_platforms?: Json | null
          song_title: string
          user_id: string
        }
        Update: {
          created_at?: string
          duration_seconds?: number | null
          file_path?: string
          file_url?: string
          id?: string
          is_shared_to_social?: boolean | null
          social_platforms?: Json | null
          song_title?: string
          user_id?: string
        }
        Relationships: []
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
      gw_media_library: {
        Row: {
          bucket_id: string | null
          category: string
          context: string | null
          created_at: string
          description: string | null
          download_count: number
          file_path: string
          file_size: number
          file_type: string
          file_url: string
          id: string
          is_featured: boolean
          is_public: boolean
          tags: string[] | null
          title: string
          updated_at: string
          uploaded_by: string | null
          view_count: number
        }
        Insert: {
          bucket_id?: string | null
          category?: string
          context?: string | null
          created_at?: string
          description?: string | null
          download_count?: number
          file_path: string
          file_size: number
          file_type: string
          file_url: string
          id?: string
          is_featured?: boolean
          is_public?: boolean
          tags?: string[] | null
          title: string
          updated_at?: string
          uploaded_by?: string | null
          view_count?: number
        }
        Update: {
          bucket_id?: string | null
          category?: string
          context?: string | null
          created_at?: string
          description?: string | null
          download_count?: number
          file_path?: string
          file_size?: number
          file_type?: string
          file_url?: string
          id?: string
          is_featured?: boolean
          is_public?: boolean
          tags?: string[] | null
          title?: string
          updated_at?: string
          uploaded_by?: string | null
          view_count?: number
        }
        Relationships: []
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
      gw_member_quick_actions: {
        Row: {
          created_at: string
          display_order: number
          id: string
          is_visible: boolean
          module_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          is_visible?: boolean
          module_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          is_visible?: boolean
          module_id?: string
          updated_at?: string
          user_id?: string
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
      gw_message_groups: {
        Row: {
          avatar_url: string | null
          created_at: string
          created_by: string | null
          description: string | null
          group_type: string
          id: string
          is_active: boolean | null
          is_archived: boolean
          is_private: boolean
          name: string
          query_criteria: Json | null
          type: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          group_type?: string
          id?: string
          is_active?: boolean | null
          is_archived?: boolean
          is_private?: boolean
          name: string
          query_criteria?: Json | null
          type?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          group_type?: string
          id?: string
          is_active?: boolean | null
          is_archived?: boolean
          is_private?: boolean
          name?: string
          query_criteria?: Json | null
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      gw_message_reactions: {
        Row: {
          created_at: string
          emoji: string
          id: string
          message_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emoji: string
          id?: string
          message_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          message_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_gw_message_reactions_user_profile"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "gw_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "fk_gw_message_reactions_user_profile"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_dashboard_data"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "gw_message_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "gw_group_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      gw_message_reads: {
        Row: {
          id: string
          message_id: string
          read_at: string
          user_id: string
        }
        Insert: {
          id?: string
          message_id: string
          read_at?: string
          user_id: string
        }
        Update: {
          id?: string
          message_id?: string
          read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gw_message_reads_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "gw_messages"
            referencedColumns: ["id"]
          },
        ]
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
      gw_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          message_type: string
          recipient_ids: string[] | null
          recipient_type: string
          sender_id: string
          sent_at: string
          status: string
          subject: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          message_type: string
          recipient_ids?: string[] | null
          recipient_type: string
          sender_id: string
          sent_at?: string
          status?: string
          subject: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          message_type?: string
          recipient_ids?: string[] | null
          recipient_type?: string
          sender_id?: string
          sent_at?: string
          status?: string
          subject?: string
          updated_at?: string
        }
        Relationships: []
      }
      gw_module_assignments: {
        Row: {
          assigned_by: string | null
          assigned_to_group: string | null
          assigned_to_user_id: string | null
          assignment_type: string
          created_at: string
          expires_at: string | null
          id: string
          is_active: boolean
          module_id: string
          notes: string | null
          permissions: string[]
          updated_at: string
        }
        Insert: {
          assigned_by?: string | null
          assigned_to_group?: string | null
          assigned_to_user_id?: string | null
          assignment_type: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          module_id: string
          notes?: string | null
          permissions?: string[]
          updated_at?: string
        }
        Update: {
          assigned_by?: string | null
          assigned_to_group?: string | null
          assigned_to_user_id?: string | null
          assignment_type?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          module_id?: string
          notes?: string | null
          permissions?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gw_module_assignments_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "gw_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      gw_module_favorites: {
        Row: {
          created_at: string
          id: string
          module_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          module_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          module_id?: string
          user_id?: string
        }
        Relationships: []
      }
      gw_module_ordering: {
        Row: {
          category: string
          created_at: string | null
          id: string
          is_pinned: boolean | null
          module_key: string
          sort_order: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          category: string
          created_at?: string | null
          id?: string
          is_pinned?: boolean | null
          module_key: string
          sort_order?: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string | null
          id?: string
          is_pinned?: boolean | null
          module_key?: string
          sort_order?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      gw_module_permissions: {
        Row: {
          expires_at: string | null
          granted_at: string | null
          granted_by: string | null
          id: string
          is_active: boolean | null
          module_id: string
          permission_type: string
          user_id: string
        }
        Insert: {
          expires_at?: string | null
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          is_active?: boolean | null
          module_id: string
          permission_type: string
          user_id: string
        }
        Update: {
          expires_at?: string | null
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          is_active?: boolean | null
          module_id?: string
          permission_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gw_module_permissions_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "gw_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      gw_modules: {
        Row: {
          category: string | null
          created_at: string | null
          default_permissions: Json | null
          description: string | null
          id: string
          is_active: boolean | null
          key: string
          name: string
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          default_permissions?: Json | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          key: string
          name: string
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          default_permissions?: Json | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          key?: string
          name?: string
          updated_at?: string | null
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
      gw_music_collection_items: {
        Row: {
          collection_id: string
          created_at: string
          id: string
          position: number
          sheet_music_id: string
          updated_at: string
        }
        Insert: {
          collection_id: string
          created_at?: string
          id?: string
          position?: number
          sheet_music_id: string
          updated_at?: string
        }
        Update: {
          collection_id?: string
          created_at?: string
          id?: string
          position?: number
          sheet_music_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gw_music_collection_items_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "gw_music_collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gw_music_collection_items_sheet_music_id_fkey"
            columns: ["sheet_music_id"]
            isOneToOne: false
            referencedRelation: "gw_sheet_music"
            referencedColumns: ["id"]
          },
        ]
      }
      gw_music_collections: {
        Row: {
          category: string | null
          created_at: string
          id: string
          is_public: boolean
          is_system: boolean
          owner_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          id?: string
          is_public?: boolean
          is_system?: boolean
          owner_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          id?: string
          is_public?: boolean
          is_system?: boolean
          owner_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
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
      gw_pearl_checkouts: {
        Row: {
          checked_out_at: string
          checked_out_by: string
          condition_on_return: string | null
          created_at: string
          due_date: string | null
          id: string
          member_id: string
          notes: string | null
          pearl_id: string
          returned_at: string | null
          returned_to: string | null
          updated_at: string
        }
        Insert: {
          checked_out_at?: string
          checked_out_by: string
          condition_on_return?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          member_id: string
          notes?: string | null
          pearl_id: string
          returned_at?: string | null
          returned_to?: string | null
          updated_at?: string
        }
        Update: {
          checked_out_at?: string
          checked_out_by?: string
          condition_on_return?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          member_id?: string
          notes?: string | null
          pearl_id?: string
          returned_at?: string | null
          returned_to?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gw_pearl_checkouts_pearl_id_fkey"
            columns: ["pearl_id"]
            isOneToOne: false
            referencedRelation: "gw_pearl_inventory"
            referencedColumns: ["id"]
          },
        ]
      }
      gw_pearl_inventory: {
        Row: {
          condition: string
          created_at: string
          created_by: string | null
          id: string
          is_available: boolean
          notes: string | null
          pearl_set_number: string
          updated_at: string
        }
        Insert: {
          condition?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_available?: boolean
          notes?: string | null
          pearl_set_number: string
          updated_at?: string
        }
        Update: {
          condition?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_available?: boolean
          notes?: string | null
          pearl_set_number?: string
          updated_at?: string
        }
        Relationships: []
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
      gw_poll_options: {
        Row: {
          created_at: string
          display_order: number
          id: string
          option_text: string
          poll_id: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          option_text: string
          poll_id: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          option_text?: string
          poll_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gw_poll_options_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "gw_polls"
            referencedColumns: ["id"]
          },
        ]
      }
      gw_poll_votes: {
        Row: {
          created_at: string
          id: string
          option_id: string
          poll_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          option_id: string
          poll_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          option_id?: string
          poll_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gw_poll_votes_option_id_fkey"
            columns: ["option_id"]
            isOneToOne: false
            referencedRelation: "gw_poll_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gw_poll_votes_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "gw_polls"
            referencedColumns: ["id"]
          },
        ]
      }
      gw_polls: {
        Row: {
          allow_multiple_selections: boolean
          created_at: string
          created_by: string
          expires_at: string | null
          id: string
          is_anonymous: boolean
          is_closed: boolean
          message_id: string
          question: string
          updated_at: string
        }
        Insert: {
          allow_multiple_selections?: boolean
          created_at?: string
          created_by: string
          expires_at?: string | null
          id?: string
          is_anonymous?: boolean
          is_closed?: boolean
          message_id: string
          question: string
          updated_at?: string
        }
        Update: {
          allow_multiple_selections?: boolean
          created_at?: string
          created_by?: string
          expires_at?: string | null
          id?: string
          is_anonymous?: boolean
          is_closed?: boolean
          message_id?: string
          question?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gw_polls_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "gw_group_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      gw_practice_links: {
        Row: {
          created_at: string
          id: string
          music_id: string
          notes: string | null
          owner_id: string
          target_section: string | null
          title: string
          updated_at: string
          url: string
          visibility: string
          voice_part: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          music_id: string
          notes?: string | null
          owner_id: string
          target_section?: string | null
          title: string
          updated_at?: string
          url: string
          visibility?: string
          voice_part?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          music_id?: string
          notes?: string | null
          owner_id?: string
          target_section?: string | null
          title?: string
          updated_at?: string
          url?: string
          visibility?: string
          voice_part?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gw_practice_links_music_id_fkey"
            columns: ["music_id"]
            isOneToOne: false
            referencedRelation: "gw_sheet_music"
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
          academic_year: string | null
          account_balance: number | null
          address: string | null
          allergies: string | null
          avatar_url: string | null
          bio: string | null
          bust_measurement: number | null
          calendar_feed_token: string | null
          can_dance: boolean | null
          chest_measurement: number | null
          class_year: number | null
          created_at: string | null
          current_cart_id: string | null
          dashboard_background_url: string | null
          data_consent: boolean | null
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
          formal_dress_size: string | null
          full_name: string | null
          gpa: number | null
          graduation_year: number | null
          hair_color: string | null
          has_tattoos: boolean | null
          headshot_url: string | null
          height_measurement: number | null
          hips_measurement: number | null
          home_address: string | null
          id: string
          inseam_measurement: number | null
          instruments_played: string[] | null
          is_admin: boolean | null
          is_exec_board: boolean | null
          is_featured: boolean | null
          is_mentor: boolean | null
          is_section_leader: boolean | null
          is_super_admin: boolean | null
          join_date: string | null
          last_name: string | null
          last_sign_in_at: string | null
          lipstick_shade: string | null
          major: string | null
          measurements: Json | null
          measurements_taken_by: string | null
          measurements_taken_date: string | null
          media_consent: boolean | null
          media_release_signed_at: string | null
          mentor_opt_in: boolean | null
          middle_name: string | null
          minor: string | null
          music_role: string | null
          notes: string | null
          org: string | null
          parent_guardian_contact: string | null
          pearl_status: string | null
          phone: string | null
          phone_number: string | null
          photo_consent: boolean | null
          polo_size: string | null
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
          student_id: string | null
          student_number: string | null
          title: string | null
          tshirt_size: string | null
          updated_at: string | null
          user_id: string | null
          verified: boolean | null
          visible_piercings: boolean | null
          voice_part: string | null
          voice_part_preference: string | null
          waist_measurement: number | null
          wardrobe_assignments: Json | null
          website_url: string | null
          workplace: string | null
        }
        Insert: {
          academic_major?: string | null
          academic_year?: string | null
          account_balance?: number | null
          address?: string | null
          allergies?: string | null
          avatar_url?: string | null
          bio?: string | null
          bust_measurement?: number | null
          calendar_feed_token?: string | null
          can_dance?: boolean | null
          chest_measurement?: number | null
          class_year?: number | null
          created_at?: string | null
          current_cart_id?: string | null
          dashboard_background_url?: string | null
          data_consent?: boolean | null
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
          formal_dress_size?: string | null
          full_name?: string | null
          gpa?: number | null
          graduation_year?: number | null
          hair_color?: string | null
          has_tattoos?: boolean | null
          headshot_url?: string | null
          height_measurement?: number | null
          hips_measurement?: number | null
          home_address?: string | null
          id?: string
          inseam_measurement?: number | null
          instruments_played?: string[] | null
          is_admin?: boolean | null
          is_exec_board?: boolean | null
          is_featured?: boolean | null
          is_mentor?: boolean | null
          is_section_leader?: boolean | null
          is_super_admin?: boolean | null
          join_date?: string | null
          last_name?: string | null
          last_sign_in_at?: string | null
          lipstick_shade?: string | null
          major?: string | null
          measurements?: Json | null
          measurements_taken_by?: string | null
          measurements_taken_date?: string | null
          media_consent?: boolean | null
          media_release_signed_at?: string | null
          mentor_opt_in?: boolean | null
          middle_name?: string | null
          minor?: string | null
          music_role?: string | null
          notes?: string | null
          org?: string | null
          parent_guardian_contact?: string | null
          pearl_status?: string | null
          phone?: string | null
          phone_number?: string | null
          photo_consent?: boolean | null
          polo_size?: string | null
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
          student_id?: string | null
          student_number?: string | null
          title?: string | null
          tshirt_size?: string | null
          updated_at?: string | null
          user_id?: string | null
          verified?: boolean | null
          visible_piercings?: boolean | null
          voice_part?: string | null
          voice_part_preference?: string | null
          waist_measurement?: number | null
          wardrobe_assignments?: Json | null
          website_url?: string | null
          workplace?: string | null
        }
        Update: {
          academic_major?: string | null
          academic_year?: string | null
          account_balance?: number | null
          address?: string | null
          allergies?: string | null
          avatar_url?: string | null
          bio?: string | null
          bust_measurement?: number | null
          calendar_feed_token?: string | null
          can_dance?: boolean | null
          chest_measurement?: number | null
          class_year?: number | null
          created_at?: string | null
          current_cart_id?: string | null
          dashboard_background_url?: string | null
          data_consent?: boolean | null
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
          formal_dress_size?: string | null
          full_name?: string | null
          gpa?: number | null
          graduation_year?: number | null
          hair_color?: string | null
          has_tattoos?: boolean | null
          headshot_url?: string | null
          height_measurement?: number | null
          hips_measurement?: number | null
          home_address?: string | null
          id?: string
          inseam_measurement?: number | null
          instruments_played?: string[] | null
          is_admin?: boolean | null
          is_exec_board?: boolean | null
          is_featured?: boolean | null
          is_mentor?: boolean | null
          is_section_leader?: boolean | null
          is_super_admin?: boolean | null
          join_date?: string | null
          last_name?: string | null
          last_sign_in_at?: string | null
          lipstick_shade?: string | null
          major?: string | null
          measurements?: Json | null
          measurements_taken_by?: string | null
          measurements_taken_date?: string | null
          media_consent?: boolean | null
          media_release_signed_at?: string | null
          mentor_opt_in?: boolean | null
          middle_name?: string | null
          minor?: string | null
          music_role?: string | null
          notes?: string | null
          org?: string | null
          parent_guardian_contact?: string | null
          pearl_status?: string | null
          phone?: string | null
          phone_number?: string | null
          photo_consent?: boolean | null
          polo_size?: string | null
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
          student_id?: string | null
          student_number?: string | null
          title?: string | null
          tshirt_size?: string | null
          updated_at?: string | null
          user_id?: string | null
          verified?: boolean | null
          visible_piercings?: boolean | null
          voice_part?: string | null
          voice_part_preference?: string | null
          waist_measurement?: number | null
          wardrobe_assignments?: Json | null
          website_url?: string | null
          workplace?: string | null
        }
        Relationships: []
      }
      gw_provider_availability: {
        Row: {
          break_between_slots_minutes: number
          created_at: string
          day_of_week: number
          end_time: string
          id: string
          is_available: boolean
          provider_id: string
          slot_duration_minutes: number
          start_time: string
          updated_at: string
        }
        Insert: {
          break_between_slots_minutes?: number
          created_at?: string
          day_of_week: number
          end_time: string
          id?: string
          is_available?: boolean
          provider_id: string
          slot_duration_minutes?: number
          start_time: string
          updated_at?: string
        }
        Update: {
          break_between_slots_minutes?: number
          created_at?: string
          day_of_week?: number
          end_time?: string
          id?: string
          is_available?: boolean
          provider_id?: string
          slot_duration_minutes?: number
          start_time?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gw_provider_availability_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "gw_service_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      gw_provider_services: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          provider_id: string
          service_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          provider_id: string
          service_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          provider_id?: string
          service_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gw_provider_services_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "gw_service_providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gw_provider_services_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "gw_services"
            referencedColumns: ["id"]
          },
        ]
      }
      gw_provider_time_off: {
        Row: {
          created_at: string
          end_date: string
          end_time: string | null
          id: string
          is_recurring: boolean
          provider_id: string
          reason: string | null
          recurrence_type: string | null
          start_date: string
          start_time: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          end_date: string
          end_time?: string | null
          id?: string
          is_recurring?: boolean
          provider_id: string
          reason?: string | null
          recurrence_type?: string | null
          start_date: string
          start_time?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          end_date?: string
          end_time?: string | null
          id?: string
          is_recurring?: boolean
          provider_id?: string
          reason?: string | null
          recurrence_type?: string | null
          start_date?: string
          start_time?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gw_provider_time_off_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "gw_service_providers"
            referencedColumns: ["id"]
          },
        ]
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
      gw_qr_codes: {
        Row: {
          assignment_id: string | null
          content: string
          context_type: string | null
          course_code: string | null
          course_name: string | null
          created_at: string | null
          created_by: string
          custom_data: Json | null
          description: string | null
          expires_at: string | null
          generated_at: string | null
          id: string
          is_active: boolean | null
          max_scans: number | null
          qr_token: string
          qr_type: string
          scan_count: number | null
          title: string
          updated_at: string | null
        }
        Insert: {
          assignment_id?: string | null
          content: string
          context_type?: string | null
          course_code?: string | null
          course_name?: string | null
          created_at?: string | null
          created_by: string
          custom_data?: Json | null
          description?: string | null
          expires_at?: string | null
          generated_at?: string | null
          id?: string
          is_active?: boolean | null
          max_scans?: number | null
          qr_token: string
          qr_type: string
          scan_count?: number | null
          title: string
          updated_at?: string | null
        }
        Update: {
          assignment_id?: string | null
          content?: string
          context_type?: string | null
          course_code?: string | null
          course_name?: string | null
          created_at?: string | null
          created_by?: string
          custom_data?: Json | null
          description?: string | null
          expires_at?: string | null
          generated_at?: string | null
          id?: string
          is_active?: boolean | null
          max_scans?: number | null
          qr_token?: string
          qr_type?: string
          scan_count?: number | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      gw_qr_scans: {
        Row: {
          additional_data: Json | null
          created_at: string | null
          id: string
          ip_address: unknown
          qr_code_id: string
          scan_location: Json | null
          scanned_at: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          additional_data?: Json | null
          created_at?: string | null
          id?: string
          ip_address?: unknown
          qr_code_id: string
          scan_location?: Json | null
          scanned_at?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          additional_data?: Json | null
          created_at?: string | null
          id?: string
          ip_address?: unknown
          qr_code_id?: string
          scan_location?: Json | null
          scanned_at?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gw_qr_scans_qr_code_id_fkey"
            columns: ["qr_code_id"]
            isOneToOne: false
            referencedRelation: "gw_qr_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      gw_radio_episodes: {
        Row: {
          audio_url: string
          category: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          duration_seconds: number | null
          episode_number: number | null
          id: string
          is_published: boolean | null
          published_date: string | null
          season: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          audio_url: string
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          duration_seconds?: number | null
          episode_number?: number | null
          id?: string
          is_published?: boolean | null
          published_date?: string | null
          season?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          audio_url?: string
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          duration_seconds?: number | null
          episode_number?: number | null
          id?: string
          is_published?: boolean | null
          published_date?: string | null
          season?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      gw_radio_now_playing: {
        Row: {
          album: string | null
          artist: string | null
          artwork_url: string | null
          created_at: string
          duration_seconds: number | null
          fetched_at: string
          id: string
          source_payload: Json | null
          started_at: string | null
          station_id: string
          title: string | null
          updated_at: string
        }
        Insert: {
          album?: string | null
          artist?: string | null
          artwork_url?: string | null
          created_at?: string
          duration_seconds?: number | null
          fetched_at?: string
          id?: string
          source_payload?: Json | null
          started_at?: string | null
          station_id: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          album?: string | null
          artist?: string | null
          artwork_url?: string | null
          created_at?: string
          duration_seconds?: number | null
          fetched_at?: string
          id?: string
          source_payload?: Json | null
          started_at?: string | null
          station_id?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gw_radio_now_playing_station_id_fkey"
            columns: ["station_id"]
            isOneToOne: false
            referencedRelation: "gw_radio_stations"
            referencedColumns: ["id"]
          },
        ]
      }
      gw_radio_playlist_items: {
        Row: {
          audio_archive_id: string | null
          created_at: string | null
          episode_id: string | null
          id: string
          playlist_id: string | null
          position: number
          scheduled_time: string | null
        }
        Insert: {
          audio_archive_id?: string | null
          created_at?: string | null
          episode_id?: string | null
          id?: string
          playlist_id?: string | null
          position: number
          scheduled_time?: string | null
        }
        Update: {
          audio_archive_id?: string | null
          created_at?: string | null
          episode_id?: string | null
          id?: string
          playlist_id?: string | null
          position?: number
          scheduled_time?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gw_radio_playlist_items_audio_archive_id_fkey"
            columns: ["audio_archive_id"]
            isOneToOne: false
            referencedRelation: "audio_archive"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gw_radio_playlist_items_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "gw_radio_episodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gw_radio_playlist_items_playlist_id_fkey"
            columns: ["playlist_id"]
            isOneToOne: false
            referencedRelation: "gw_radio_playlists"
            referencedColumns: ["id"]
          },
        ]
      }
      gw_radio_playlists: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          end_time: string | null
          id: string
          is_active: boolean | null
          name: string
          start_time: string | null
          updated_at: string | null
          weekday: number | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_time?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          start_time?: string | null
          updated_at?: string | null
          weekday?: number | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_time?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          start_time?: string | null
          updated_at?: string | null
          weekday?: number | null
        }
        Relationships: []
      }
      gw_radio_station_state: {
        Row: {
          created_at: string
          current_song_album: string | null
          current_song_art: string | null
          current_song_artist: string | null
          current_song_title: string | null
          id: string
          is_live: boolean | null
          is_online: boolean | null
          last_event_type: string | null
          last_updated: string
          listener_count: number | null
          song_started_at: string | null
          station_id: string
          station_name: string | null
          streamer_name: string | null
        }
        Insert: {
          created_at?: string
          current_song_album?: string | null
          current_song_art?: string | null
          current_song_artist?: string | null
          current_song_title?: string | null
          id?: string
          is_live?: boolean | null
          is_online?: boolean | null
          last_event_type?: string | null
          last_updated?: string
          listener_count?: number | null
          song_started_at?: string | null
          station_id: string
          station_name?: string | null
          streamer_name?: string | null
        }
        Update: {
          created_at?: string
          current_song_album?: string | null
          current_song_art?: string | null
          current_song_artist?: string | null
          current_song_title?: string | null
          id?: string
          is_live?: boolean | null
          is_online?: boolean | null
          last_event_type?: string | null
          last_updated?: string
          listener_count?: number | null
          song_started_at?: string | null
          station_id?: string
          station_name?: string | null
          streamer_name?: string | null
        }
        Relationships: []
      }
      gw_radio_stations: {
        Row: {
          api_endpoint: string | null
          api_provider: string | null
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          is_public: boolean
          name: string
          slug: string | null
          stream_url: string
          updated_at: string
        }
        Insert: {
          api_endpoint?: string | null
          api_provider?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          is_public?: boolean
          name: string
          slug?: string | null
          stream_url: string
          updated_at?: string
        }
        Update: {
          api_endpoint?: string | null
          api_provider?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          is_public?: boolean
          name?: string
          slug?: string | null
          stream_url?: string
          updated_at?: string
        }
        Relationships: []
      }
      gw_radio_stats: {
        Row: {
          created_at: string | null
          date: string | null
          episode_id: string | null
          id: string
          play_count: number | null
          total_listen_time: number | null
          unique_listeners: number | null
        }
        Insert: {
          created_at?: string | null
          date?: string | null
          episode_id?: string | null
          id?: string
          play_count?: number | null
          total_listen_time?: number | null
          unique_listeners?: number | null
        }
        Update: {
          created_at?: string | null
          date?: string | null
          episode_id?: string | null
          id?: string
          play_count?: number | null
          total_listen_time?: number | null
          unique_listeners?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "gw_radio_stats_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "gw_radio_episodes"
            referencedColumns: ["id"]
          },
        ]
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
      gw_recording_shares: {
        Row: {
          created_at: string
          id: string
          permission: string
          recording_id: string
          shared_by: string
          shared_with: string
        }
        Insert: {
          created_at?: string
          id?: string
          permission?: string
          recording_id: string
          shared_by: string
          shared_with: string
        }
        Update: {
          created_at?: string
          id?: string
          permission?: string
          recording_id?: string
          shared_by?: string
          shared_with?: string
        }
        Relationships: [
          {
            foreignKeyName: "gw_recording_shares_recording_id_fkey"
            columns: ["recording_id"]
            isOneToOne: false
            referencedRelation: "gw_recordings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gw_recording_shares_shared_by_fkey"
            columns: ["shared_by"]
            isOneToOne: false
            referencedRelation: "gw_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "gw_recording_shares_shared_by_fkey"
            columns: ["shared_by"]
            isOneToOne: false
            referencedRelation: "user_dashboard_data"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "gw_recording_shares_shared_with_fkey"
            columns: ["shared_with"]
            isOneToOne: false
            referencedRelation: "gw_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "gw_recording_shares_shared_with_fkey"
            columns: ["shared_with"]
            isOneToOne: false
            referencedRelation: "user_dashboard_data"
            referencedColumns: ["user_id"]
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
          grading_results: Json | null
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
          grading_results?: Json | null
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
          grading_results?: Json | null
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
      gw_reimbursement_approvals: {
        Row: {
          action: string
          approver_id: string
          created_at: string
          id: string
          notes: string | null
          reimbursement_id: string
        }
        Insert: {
          action: string
          approver_id: string
          created_at?: string
          id?: string
          notes?: string | null
          reimbursement_id: string
        }
        Update: {
          action?: string
          approver_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          reimbursement_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gw_reimbursement_approvals_reimbursement_id_fkey"
            columns: ["reimbursement_id"]
            isOneToOne: false
            referencedRelation: "gw_reimbursement_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      gw_reimbursement_requests: {
        Row: {
          amount: number
          business_purpose: string
          category: string
          check_number: string | null
          created_at: string
          description: string
          id: string
          paid_by: string | null
          payment_date: string | null
          payment_method: string | null
          payment_notes: string | null
          purchase_date: string
          receipt_filename: string | null
          receipt_url: string | null
          requester_email: string
          requester_name: string
          status: string
          super_admin_approved_at: string | null
          super_admin_id: string | null
          super_admin_notes: string | null
          treasurer_approved_at: string | null
          treasurer_id: string | null
          treasurer_notes: string | null
          updated_at: string
          user_id: string
          vendor_name: string
        }
        Insert: {
          amount: number
          business_purpose: string
          category?: string
          check_number?: string | null
          created_at?: string
          description: string
          id?: string
          paid_by?: string | null
          payment_date?: string | null
          payment_method?: string | null
          payment_notes?: string | null
          purchase_date: string
          receipt_filename?: string | null
          receipt_url?: string | null
          requester_email: string
          requester_name: string
          status?: string
          super_admin_approved_at?: string | null
          super_admin_id?: string | null
          super_admin_notes?: string | null
          treasurer_approved_at?: string | null
          treasurer_id?: string | null
          treasurer_notes?: string | null
          updated_at?: string
          user_id: string
          vendor_name: string
        }
        Update: {
          amount?: number
          business_purpose?: string
          category?: string
          check_number?: string | null
          created_at?: string
          description?: string
          id?: string
          paid_by?: string | null
          payment_date?: string | null
          payment_method?: string | null
          payment_notes?: string | null
          purchase_date?: string
          receipt_filename?: string | null
          receipt_url?: string | null
          requester_email?: string
          requester_name?: string
          status?: string
          super_admin_approved_at?: string | null
          super_admin_id?: string | null
          super_admin_notes?: string | null
          treasurer_approved_at?: string | null
          treasurer_id?: string | null
          treasurer_notes?: string | null
          updated_at?: string
          user_id?: string
          vendor_name?: string
        }
        Relationships: []
      }
      gw_role_module_permissions: {
        Row: {
          expires_at: string | null
          granted_at: string
          granted_by: string
          id: string
          is_active: boolean
          module_name: string
          permission_type: string
          role: string
          updated_at: string
        }
        Insert: {
          expires_at?: string | null
          granted_at?: string
          granted_by?: string
          id?: string
          is_active?: boolean
          module_name: string
          permission_type: string
          role: string
          updated_at?: string
        }
        Update: {
          expires_at?: string | null
          granted_at?: string
          granted_by?: string
          id?: string
          is_active?: boolean
          module_name?: string
          permission_type?: string
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
      gw_roles: {
        Row: {
          created_at: string
          id: string
          key: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          name?: string
        }
        Relationships: []
      }
      gw_rubric_items: {
        Row: {
          description: string | null
          id: string
          label: string
          max_points: number
          position: number | null
          rubric_id: string
          weight_percentage: number | null
        }
        Insert: {
          description?: string | null
          id?: string
          label: string
          max_points?: number
          position?: number | null
          rubric_id: string
          weight_percentage?: number | null
        }
        Update: {
          description?: string | null
          id?: string
          label?: string
          max_points?: number
          position?: number | null
          rubric_id?: string
          weight_percentage?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "gw_rubric_items_rubric_id_fkey"
            columns: ["rubric_id"]
            isOneToOne: false
            referencedRelation: "gw_rubrics"
            referencedColumns: ["id"]
          },
        ]
      }
      gw_rubric_scores: {
        Row: {
          created_at: string | null
          created_by: string | null
          explanation: string | null
          id: string
          legacy_id: string | null
          legacy_source: string | null
          max_points: number
          rubric_item_id: string
          score: number
          submission_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          explanation?: string | null
          id?: string
          legacy_id?: string | null
          legacy_source?: string | null
          max_points: number
          rubric_item_id: string
          score: number
          submission_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          explanation?: string | null
          id?: string
          legacy_id?: string | null
          legacy_source?: string | null
          max_points?: number
          rubric_item_id?: string
          score?: number
          submission_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gw_rubric_scores_rubric_item_id_fkey"
            columns: ["rubric_item_id"]
            isOneToOne: false
            referencedRelation: "gw_rubric_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gw_rubric_scores_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "gw_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      gw_rubrics: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          legacy_id: string | null
          legacy_source: string | null
          name: string
          scope: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          legacy_id?: string | null
          legacy_source?: string | null
          name: string
          scope?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          legacy_id?: string | null
          legacy_source?: string | null
          name?: string
          scope?: string | null
        }
        Relationships: []
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
          ip_address: unknown
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
          ip_address?: unknown
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
          ip_address?: unknown
          resource_id?: string | null
          resource_type?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      gw_semester_grades: {
        Row: {
          created_at: string
          current_grade: number | null
          id: string
          letter_grade: string | null
          semester_name: string
          total_points_earned: number | null
          total_points_possible: number | null
          updated_at: string
          user_id: string
          week_1_points: number | null
          week_10_points: number | null
          week_11_points: number | null
          week_12_points: number | null
          week_13_points: number | null
          week_2_points: number | null
          week_3_points: number | null
          week_4_points: number | null
          week_5_points: number | null
          week_6_points: number | null
          week_7_points: number | null
          week_8_points: number | null
          week_9_points: number | null
        }
        Insert: {
          created_at?: string
          current_grade?: number | null
          id?: string
          letter_grade?: string | null
          semester_name?: string
          total_points_earned?: number | null
          total_points_possible?: number | null
          updated_at?: string
          user_id: string
          week_1_points?: number | null
          week_10_points?: number | null
          week_11_points?: number | null
          week_12_points?: number | null
          week_13_points?: number | null
          week_2_points?: number | null
          week_3_points?: number | null
          week_4_points?: number | null
          week_5_points?: number | null
          week_6_points?: number | null
          week_7_points?: number | null
          week_8_points?: number | null
          week_9_points?: number | null
        }
        Update: {
          created_at?: string
          current_grade?: number | null
          id?: string
          letter_grade?: string | null
          semester_name?: string
          total_points_earned?: number | null
          total_points_possible?: number | null
          updated_at?: string
          user_id?: string
          week_1_points?: number | null
          week_10_points?: number | null
          week_11_points?: number | null
          week_12_points?: number | null
          week_13_points?: number | null
          week_2_points?: number | null
          week_3_points?: number | null
          week_4_points?: number | null
          week_5_points?: number | null
          week_6_points?: number | null
          week_7_points?: number | null
          week_8_points?: number | null
          week_9_points?: number | null
        }
        Relationships: []
      }
      gw_service_availability: {
        Row: {
          created_at: string
          day_of_week: number
          end_time: string
          id: string
          is_active: boolean
          service_id: string
          start_time: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          day_of_week: number
          end_time: string
          id?: string
          is_active?: boolean
          service_id: string
          start_time: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          day_of_week?: number
          end_time?: string
          id?: string
          is_active?: boolean
          service_id?: string
          start_time?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gw_service_availability_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "gw_services"
            referencedColumns: ["id"]
          },
        ]
      }
      gw_service_providers: {
        Row: {
          bio: string | null
          created_at: string
          default_calendar_id: string | null
          department: string | null
          email: string
          id: string
          is_active: boolean
          phone: string | null
          profile_image_url: string | null
          provider_name: string
          services_offered: string[] | null
          title: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          bio?: string | null
          created_at?: string
          default_calendar_id?: string | null
          department?: string | null
          email: string
          id?: string
          is_active?: boolean
          phone?: string | null
          profile_image_url?: string | null
          provider_name: string
          services_offered?: string[] | null
          title?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          bio?: string | null
          created_at?: string
          default_calendar_id?: string | null
          department?: string | null
          email?: string
          id?: string
          is_active?: boolean
          phone?: string | null
          profile_image_url?: string | null
          provider_name?: string
          services_offered?: string[] | null
          title?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gw_service_providers_default_calendar_id_fkey"
            columns: ["default_calendar_id"]
            isOneToOne: false
            referencedRelation: "gw_calendars"
            referencedColumns: ["id"]
          },
        ]
      }
      gw_services: {
        Row: {
          advance_booking_days: number | null
          badge_color: string | null
          badge_text: string | null
          booking_buffer_minutes: number | null
          capacity_max: number | null
          capacity_min: number | null
          category: string | null
          created_at: string
          created_by: string | null
          description: string | null
          duration_minutes: number
          id: string
          image_url: string | null
          instructor: string | null
          is_active: boolean
          location: string | null
          name: string
          price_amount: number | null
          price_display: string | null
          provider_id: string | null
          requires_approval: boolean | null
          updated_at: string
        }
        Insert: {
          advance_booking_days?: number | null
          badge_color?: string | null
          badge_text?: string | null
          booking_buffer_minutes?: number | null
          capacity_max?: number | null
          capacity_min?: number | null
          category?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          duration_minutes?: number
          id?: string
          image_url?: string | null
          instructor?: string | null
          is_active?: boolean
          location?: string | null
          name: string
          price_amount?: number | null
          price_display?: string | null
          provider_id?: string | null
          requires_approval?: boolean | null
          updated_at?: string
        }
        Update: {
          advance_booking_days?: number | null
          badge_color?: string | null
          badge_text?: string | null
          booking_buffer_minutes?: number | null
          capacity_max?: number | null
          capacity_min?: number | null
          category?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          duration_minutes?: number
          id?: string
          image_url?: string | null
          instructor?: string | null
          is_active?: boolean
          location?: string | null
          name?: string
          price_amount?: number | null
          price_display?: string | null
          provider_id?: string | null
          requires_approval?: boolean | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gw_services_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "gw_service_providers"
            referencedColumns: ["id"]
          },
        ]
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
      gw_setup_crew_members: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          crew_id: string
          id: string
          role: string | null
          user_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          crew_id: string
          id?: string
          role?: string | null
          user_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          crew_id?: string
          id?: string
          role?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gw_setup_crew_members_crew_id_fkey"
            columns: ["crew_id"]
            isOneToOne: false
            referencedRelation: "gw_setup_crews"
            referencedColumns: ["id"]
          },
        ]
      }
      gw_setup_crews: {
        Row: {
          coordinator_id: string | null
          created_at: string
          crew_name: string
          event_id: string
          id: string
          max_members: number | null
          notes: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          coordinator_id?: string | null
          created_at?: string
          crew_name: string
          event_id: string
          id?: string
          max_members?: number | null
          notes?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          coordinator_id?: string | null
          created_at?: string
          crew_name?: string
          event_id?: string
          id?: string
          max_members?: number | null
          notes?: string | null
          status?: string | null
          updated_at?: string
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
          updated_at: string | null
          voice_parts: string[] | null
          voicing: string | null
          xml_content: string | null
          xml_url: string | null
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
          updated_at?: string | null
          voice_parts?: string[] | null
          voicing?: string | null
          xml_content?: string | null
          xml_url?: string | null
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
          updated_at?: string | null
          voice_parts?: string[] | null
          voicing?: string | null
          xml_content?: string | null
          xml_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gw_sheet_music_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "gw_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "gw_sheet_music_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_dashboard_data"
            referencedColumns: ["user_id"]
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
      gw_sheet_music_annotation_shares: {
        Row: {
          annotation_id: string
          created_at: string
          expires_at: string | null
          id: string
          shared_by: string
          shared_with: string
        }
        Insert: {
          annotation_id: string
          created_at?: string
          expires_at?: string | null
          id?: string
          shared_by: string
          shared_with: string
        }
        Update: {
          annotation_id?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          shared_by?: string
          shared_with?: string
        }
        Relationships: [
          {
            foreignKeyName: "gw_sheet_music_annotation_shares_annotation_id_fkey"
            columns: ["annotation_id"]
            isOneToOne: false
            referencedRelation: "gw_sheet_music_annotations"
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
      gw_sheet_music_favorites: {
        Row: {
          created_at: string | null
          id: string
          sheet_music_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          sheet_music_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          sheet_music_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gw_sheet_music_favorites_sheet_music_id_fkey"
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
      gw_shoutcast_playlist_tracks: {
        Row: {
          created_at: string | null
          duration_seconds: number | null
          file_path: string
          id: string
          is_enabled: boolean | null
          play_order: number | null
          playlist_id: string | null
          track_album: string | null
          track_artist: string | null
          track_title: string
        }
        Insert: {
          created_at?: string | null
          duration_seconds?: number | null
          file_path: string
          id?: string
          is_enabled?: boolean | null
          play_order?: number | null
          playlist_id?: string | null
          track_album?: string | null
          track_artist?: string | null
          track_title: string
        }
        Update: {
          created_at?: string | null
          duration_seconds?: number | null
          file_path?: string
          id?: string
          is_enabled?: boolean | null
          play_order?: number | null
          playlist_id?: string | null
          track_album?: string | null
          track_artist?: string | null
          track_title?: string
        }
        Relationships: [
          {
            foreignKeyName: "gw_shoutcast_playlist_tracks_playlist_id_fkey"
            columns: ["playlist_id"]
            isOneToOne: false
            referencedRelation: "gw_shoutcast_playlists"
            referencedColumns: ["id"]
          },
        ]
      }
      gw_shoutcast_playlists: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          repeat_enabled: boolean | null
          shuffle_enabled: boolean | null
          stream_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          repeat_enabled?: boolean | null
          shuffle_enabled?: boolean | null
          stream_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          repeat_enabled?: boolean | null
          shuffle_enabled?: boolean | null
          stream_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gw_shoutcast_playlists_stream_id_fkey"
            columns: ["stream_id"]
            isOneToOne: false
            referencedRelation: "gw_shoutcast_streams"
            referencedColumns: ["id"]
          },
        ]
      }
      gw_shoutcast_stats: {
        Row: {
          bitrate: number | null
          current_listeners: number | null
          current_song: string | null
          id: string
          peak_listeners: number | null
          recorded_at: string | null
          sample_rate: number | null
          stream_id: string | null
          stream_start_time: string | null
          stream_status: string | null
          total_listeners: number | null
        }
        Insert: {
          bitrate?: number | null
          current_listeners?: number | null
          current_song?: string | null
          id?: string
          peak_listeners?: number | null
          recorded_at?: string | null
          sample_rate?: number | null
          stream_id?: string | null
          stream_start_time?: string | null
          stream_status?: string | null
          total_listeners?: number | null
        }
        Update: {
          bitrate?: number | null
          current_listeners?: number | null
          current_song?: string | null
          id?: string
          peak_listeners?: number | null
          recorded_at?: string | null
          sample_rate?: number | null
          stream_id?: string | null
          stream_start_time?: string | null
          stream_status?: string | null
          total_listeners?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "gw_shoutcast_stats_stream_id_fkey"
            columns: ["stream_id"]
            isOneToOne: false
            referencedRelation: "gw_shoutcast_streams"
            referencedColumns: ["id"]
          },
        ]
      }
      gw_shoutcast_streams: {
        Row: {
          admin_password: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          dj_password: string | null
          genre: string | null
          id: string
          is_active: boolean | null
          is_public: boolean | null
          max_listeners: number | null
          mount_point: string
          name: string
          port: number | null
          source_password: string | null
          stream_url: string
          updated_at: string | null
        }
        Insert: {
          admin_password?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          dj_password?: string | null
          genre?: string | null
          id?: string
          is_active?: boolean | null
          is_public?: boolean | null
          max_listeners?: number | null
          mount_point: string
          name: string
          port?: number | null
          source_password?: string | null
          stream_url: string
          updated_at?: string | null
        }
        Update: {
          admin_password?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          dj_password?: string | null
          genre?: string | null
          id?: string
          is_active?: boolean | null
          is_public?: boolean | null
          max_listeners?: number | null
          mount_point?: string
          name?: string
          port?: number | null
          source_password?: string | null
          stream_url?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      gw_sight_reading_assignments: {
        Row: {
          assigned_by: string
          assignment_type: Database["public"]["Enums"]["assignment_type"]
          audio_url: string | null
          created_at: string
          description: string | null
          due_date: string
          grading_period: Database["public"]["Enums"]["grading_period"]
          id: string
          is_active: boolean
          notes: string | null
          pdf_url: string | null
          points_possible: number | null
          sheet_music_id: string | null
          target_type: string
          target_value: string | null
          title: string
          updated_at: string
        }
        Insert: {
          assigned_by: string
          assignment_type?: Database["public"]["Enums"]["assignment_type"]
          audio_url?: string | null
          created_at?: string
          description?: string | null
          due_date: string
          grading_period: Database["public"]["Enums"]["grading_period"]
          id?: string
          is_active?: boolean
          notes?: string | null
          pdf_url?: string | null
          points_possible?: number | null
          sheet_music_id?: string | null
          target_type?: string
          target_value?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          assigned_by?: string
          assignment_type?: Database["public"]["Enums"]["assignment_type"]
          audio_url?: string | null
          created_at?: string
          description?: string | null
          due_date?: string
          grading_period?: Database["public"]["Enums"]["grading_period"]
          id?: string
          is_active?: boolean
          notes?: string | null
          pdf_url?: string | null
          points_possible?: number | null
          sheet_music_id?: string | null
          target_type?: string
          target_value?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gw_sight_reading_assignments_sheet_music_id_fkey"
            columns: ["sheet_music_id"]
            isOneToOne: false
            referencedRelation: "gw_sheet_music"
            referencedColumns: ["id"]
          },
        ]
      }
      gw_sight_reading_exercises: {
        Row: {
          created_at: string
          id: string
          musicxml: string
          params: Json
          pdf_url: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          musicxml: string
          params: Json
          pdf_url?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          musicxml?: string
          params?: Json
          pdf_url?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      gw_size_verification_log: {
        Row: {
          created_at: string | null
          id: string
          intake_id: string | null
          original_measurements: Json | null
          verification_notes: string | null
          verification_status: string
          verified_measurements: Json | null
          verifier_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          intake_id?: string | null
          original_measurements?: Json | null
          verification_notes?: string | null
          verification_status: string
          verified_measurements?: Json | null
          verifier_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          intake_id?: string | null
          original_measurements?: Json | null
          verification_notes?: string | null
          verification_status?: string
          verified_measurements?: Json | null
          verifier_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gw_size_verification_log_intake_id_fkey"
            columns: ["intake_id"]
            isOneToOne: false
            referencedRelation: "gw_student_intake"
            referencedColumns: ["id"]
          },
        ]
      }
      gw_sms_conversations: {
        Row: {
          created_at: string
          group_id: string
          id: string
          is_active: boolean
          twilio_phone_number: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          group_id: string
          id?: string
          is_active?: boolean
          twilio_phone_number: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          group_id?: string
          id?: string
          is_active?: boolean
          twilio_phone_number?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gw_sms_conversations_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "gw_message_groups"
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
      gw_sms_messages: {
        Row: {
          conversation_id: string
          created_at: string
          direction: string
          id: string
          message_body: string
          sender_phone: string
          sender_user_id: string | null
          status: string
          twilio_message_sid: string | null
        }
        Insert: {
          conversation_id: string
          created_at?: string
          direction: string
          id?: string
          message_body: string
          sender_phone: string
          sender_user_id?: string | null
          status?: string
          twilio_message_sid?: string | null
        }
        Update: {
          conversation_id?: string
          created_at?: string
          direction?: string
          id?: string
          message_body?: string
          sender_phone?: string
          sender_user_id?: string | null
          status?: string
          twilio_message_sid?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gw_sms_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "gw_sms_conversations"
            referencedColumns: ["id"]
          },
        ]
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
          approved_by: string | null
          caption_facebook: string | null
          caption_instagram: string | null
          caption_linkedin: string | null
          caption_twitter: string | null
          created_at: string | null
          created_by: string | null
          error_message: string | null
          event_url: string | null
          hashtags: string[] | null
          id: string
          image_urls: string[] | null
          platform_flags: Json | null
          posted_at: string | null
          raw_content: string
          scheduled_time: string | null
          status: string | null
          tone: string | null
          updated_at: string | null
        }
        Insert: {
          approved_by?: string | null
          caption_facebook?: string | null
          caption_instagram?: string | null
          caption_linkedin?: string | null
          caption_twitter?: string | null
          created_at?: string | null
          created_by?: string | null
          error_message?: string | null
          event_url?: string | null
          hashtags?: string[] | null
          id?: string
          image_urls?: string[] | null
          platform_flags?: Json | null
          posted_at?: string | null
          raw_content: string
          scheduled_time?: string | null
          status?: string | null
          tone?: string | null
          updated_at?: string | null
        }
        Update: {
          approved_by?: string | null
          caption_facebook?: string | null
          caption_instagram?: string | null
          caption_linkedin?: string | null
          caption_twitter?: string | null
          created_at?: string | null
          created_by?: string | null
          error_message?: string | null
          event_url?: string | null
          hashtags?: string[] | null
          id?: string
          image_urls?: string[] | null
          platform_flags?: Json | null
          posted_at?: string | null
          raw_content?: string
          scheduled_time?: string | null
          status?: string | null
          tone?: string | null
          updated_at?: string | null
        }
        Relationships: []
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
          ip_address: unknown
          referrer: string | null
          spotlight_id: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action_type: string
          created_at?: string
          id?: string
          ip_address?: unknown
          referrer?: string | null
          spotlight_id: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action_type?: string
          created_at?: string
          id?: string
          ip_address?: unknown
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
      gw_student_intake: {
        Row: {
          academic_year: string
          assigned_accessories: string[] | null
          assigned_dress_id: string | null
          assigned_shoes_id: string | null
          bust_measurement: number | null
          created_at: string | null
          dress_size: string | null
          email: string
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          full_name: string
          glove_size: string | null
          height_feet: number | null
          height_inches: number | null
          hip_measurement: number | null
          id: string
          intake_status: string | null
          major: string | null
          notes: string | null
          phone_number: string | null
          processed_at: string | null
          processed_by: string | null
          shoe_size: string | null
          size_verified: boolean | null
          size_verified_at: string | null
          size_verified_by: string | null
          student_id: string | null
          updated_at: string | null
          user_id: string | null
          waist_measurement: number | null
        }
        Insert: {
          academic_year: string
          assigned_accessories?: string[] | null
          assigned_dress_id?: string | null
          assigned_shoes_id?: string | null
          bust_measurement?: number | null
          created_at?: string | null
          dress_size?: string | null
          email: string
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          full_name: string
          glove_size?: string | null
          height_feet?: number | null
          height_inches?: number | null
          hip_measurement?: number | null
          id?: string
          intake_status?: string | null
          major?: string | null
          notes?: string | null
          phone_number?: string | null
          processed_at?: string | null
          processed_by?: string | null
          shoe_size?: string | null
          size_verified?: boolean | null
          size_verified_at?: string | null
          size_verified_by?: string | null
          student_id?: string | null
          updated_at?: string | null
          user_id?: string | null
          waist_measurement?: number | null
        }
        Update: {
          academic_year?: string
          assigned_accessories?: string[] | null
          assigned_dress_id?: string | null
          assigned_shoes_id?: string | null
          bust_measurement?: number | null
          created_at?: string | null
          dress_size?: string | null
          email?: string
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          full_name?: string
          glove_size?: string | null
          height_feet?: number | null
          height_inches?: number | null
          hip_measurement?: number | null
          id?: string
          intake_status?: string | null
          major?: string | null
          notes?: string | null
          phone_number?: string | null
          processed_at?: string | null
          processed_by?: string | null
          shoe_size?: string | null
          size_verified?: boolean | null
          size_verified_at?: string | null
          size_verified_by?: string | null
          student_id?: string | null
          updated_at?: string | null
          user_id?: string | null
          waist_measurement?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "gw_student_intake_assigned_dress_id_fkey"
            columns: ["assigned_dress_id"]
            isOneToOne: false
            referencedRelation: "gw_wardrobe_inventory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gw_student_intake_assigned_shoes_id_fkey"
            columns: ["assigned_shoes_id"]
            isOneToOne: false
            referencedRelation: "gw_wardrobe_inventory"
            referencedColumns: ["id"]
          },
        ]
      }
      gw_study_score_collaborators: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          role: string
          study_score_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          role?: string
          study_score_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          role?: string
          study_score_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gw_study_score_collaborators_study_score_id_fkey"
            columns: ["study_score_id"]
            isOneToOne: false
            referencedRelation: "gw_study_scores"
            referencedColumns: ["id"]
          },
        ]
      }
      gw_study_scores: {
        Row: {
          created_at: string
          derived_sheet_music_id: string
          id: string
          is_active: boolean
          owner_id: string
          pdf_url: string
          source_sheet_music_id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          derived_sheet_music_id: string
          id?: string
          is_active?: boolean
          owner_id: string
          pdf_url: string
          source_sheet_music_id: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          derived_sheet_music_id?: string
          id?: string
          is_active?: boolean
          owner_id?: string
          pdf_url?: string
          source_sheet_music_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      gw_submissions: {
        Row: {
          assignment_id: string
          content_text: string | null
          content_url: string | null
          id: string
          legacy_id: string | null
          legacy_source: string | null
          raw_payload: Json | null
          status: string | null
          student_id: string
          submitted_at: string | null
        }
        Insert: {
          assignment_id: string
          content_text?: string | null
          content_url?: string | null
          id?: string
          legacy_id?: string | null
          legacy_source?: string | null
          raw_payload?: Json | null
          status?: string | null
          student_id: string
          submitted_at?: string | null
        }
        Update: {
          assignment_id?: string
          content_text?: string | null
          content_url?: string | null
          id?: string
          legacy_id?: string | null
          legacy_source?: string | null
          raw_payload?: Json | null
          status?: string | null
          student_id?: string
          submitted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gw_submissions_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "gw_assignments"
            referencedColumns: ["id"]
          },
        ]
      }
      gw_time_entries: {
        Row: {
          break_duration_minutes: number | null
          check_in_time: string
          check_out_time: string | null
          created_at: string
          id: string
          notes: string | null
          timesheet_id: string
          total_hours: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          break_duration_minutes?: number | null
          check_in_time: string
          check_out_time?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          timesheet_id: string
          total_hours?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          break_duration_minutes?: number | null
          check_in_time?: string
          check_out_time?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          timesheet_id?: string
          total_hours?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gw_time_entries_timesheet_id_fkey"
            columns: ["timesheet_id"]
            isOneToOne: false
            referencedRelation: "gw_timesheets"
            referencedColumns: ["id"]
          },
        ]
      }
      gw_timesheets: {
        Row: {
          created_at: string
          goal_evaluation: string | null
          goal_met: boolean | null
          id: string
          status: string | null
          total_hours_worked: number | null
          updated_at: string
          user_id: string
          week_end_date: string
          week_start_date: string
          weekly_goal: string | null
        }
        Insert: {
          created_at?: string
          goal_evaluation?: string | null
          goal_met?: boolean | null
          id?: string
          status?: string | null
          total_hours_worked?: number | null
          updated_at?: string
          user_id: string
          week_end_date: string
          week_start_date: string
          weekly_goal?: string | null
        }
        Update: {
          created_at?: string
          goal_evaluation?: string | null
          goal_met?: boolean | null
          id?: string
          status?: string | null
          total_hours_worked?: number | null
          updated_at?: string
          user_id?: string
          week_end_date?: string
          week_start_date?: string
          weekly_goal?: string | null
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
      gw_typing_indicators: {
        Row: {
          expires_at: string
          group_id: string
          id: string
          user_id: string
        }
        Insert: {
          expires_at?: string
          group_id: string
          id?: string
          user_id: string
        }
        Update: {
          expires_at?: string
          group_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gw_typing_indicators_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "gw_message_groups"
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
            referencedRelation: "gw_appointment_services"
            referencedColumns: ["id"]
          },
        ]
      }
      gw_user_documents: {
        Row: {
          content_html: string | null
          content_md: string | null
          created_at: string
          id: string
          tags: string[] | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content_html?: string | null
          content_md?: string | null
          created_at?: string
          id?: string
          tags?: string[] | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content_html?: string | null
          content_md?: string | null
          created_at?: string
          id?: string
          tags?: string[] | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      gw_user_module_orders: {
        Row: {
          created_at: string
          module_order: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          module_order?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          module_order?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      gw_user_module_permissions: {
        Row: {
          created_at: string
          granted_at: string
          granted_by: string
          id: string
          is_active: boolean
          module_id: string
          notes: string | null
          revoked_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          granted_at?: string
          granted_by: string
          id?: string
          is_active?: boolean
          module_id: string
          notes?: string | null
          revoked_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          granted_at?: string
          granted_by?: string
          id?: string
          is_active?: boolean
          module_id?: string
          notes?: string | null
          revoked_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      gw_wardrobe_measurements: {
        Row: {
          bust_measurement: string | null
          classification: string | null
          created_at: string
          created_by: string | null
          dress_size: string | null
          height_measurement: string | null
          hips_measurement: string | null
          id: string
          name: string
          pants_size: string | null
          shirt_size: string | null
          updated_at: string
          waist_measurement: string | null
        }
        Insert: {
          bust_measurement?: string | null
          classification?: string | null
          created_at?: string
          created_by?: string | null
          dress_size?: string | null
          height_measurement?: string | null
          hips_measurement?: string | null
          id?: string
          name: string
          pants_size?: string | null
          shirt_size?: string | null
          updated_at?: string
          waist_measurement?: string | null
        }
        Update: {
          bust_measurement?: string | null
          classification?: string | null
          created_at?: string
          created_by?: string | null
          dress_size?: string | null
          height_measurement?: string | null
          hips_measurement?: string | null
          id?: string
          name?: string
          pants_size?: string | null
          shirt_size?: string | null
          updated_at?: string
          waist_measurement?: string | null
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
      host_interactions: {
        Row: {
          attachments: Json | null
          created_at: string
          created_by: string | null
          description: string | null
          host_id: string
          id: string
          interaction_date: string
          interaction_type: string
          next_follow_up_date: string | null
          outcome: string | null
          subject: string | null
        }
        Insert: {
          attachments?: Json | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          host_id: string
          id?: string
          interaction_date?: string
          interaction_type: string
          next_follow_up_date?: string | null
          outcome?: string | null
          subject?: string | null
        }
        Update: {
          attachments?: Json | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          host_id?: string
          id?: string
          interaction_date?: string
          interaction_type?: string
          next_follow_up_date?: string | null
          outcome?: string | null
          subject?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "host_interactions_host_id_fkey"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "hosts"
            referencedColumns: ["id"]
          },
        ]
      }
      host_performances: {
        Row: {
          audience_size: number | null
          contract_id: string | null
          created_at: string
          event_id: string | null
          event_title: string | null
          expenses: number | null
          host_feedback: string | null
          host_id: string
          id: string
          net_income: number | null
          performance_date: string
          performer_feedback: string | null
          rating: number | null
          repertoire: string[] | null
          revenue: number | null
          special_requirements: string | null
          technical_notes: string | null
          updated_at: string
          venue_name: string | null
        }
        Insert: {
          audience_size?: number | null
          contract_id?: string | null
          created_at?: string
          event_id?: string | null
          event_title?: string | null
          expenses?: number | null
          host_feedback?: string | null
          host_id: string
          id?: string
          net_income?: number | null
          performance_date: string
          performer_feedback?: string | null
          rating?: number | null
          repertoire?: string[] | null
          revenue?: number | null
          special_requirements?: string | null
          technical_notes?: string | null
          updated_at?: string
          venue_name?: string | null
        }
        Update: {
          audience_size?: number | null
          contract_id?: string | null
          created_at?: string
          event_id?: string | null
          event_title?: string | null
          expenses?: number | null
          host_feedback?: string | null
          host_id?: string
          id?: string
          net_income?: number | null
          performance_date?: string
          performer_feedback?: string | null
          rating?: number | null
          repertoire?: string[] | null
          revenue?: number | null
          special_requirements?: string | null
          technical_notes?: string | null
          updated_at?: string
          venue_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "host_performances_host_id_fkey"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "hosts"
            referencedColumns: ["id"]
          },
        ]
      }
      hosts: {
        Row: {
          accessibility_features: string | null
          booking_lead_time_months: number | null
          booking_request_id: string | null
          budget_range_max: number | null
          budget_range_min: number | null
          city: string | null
          contact_email: string | null
          contact_name: string
          contact_phone: string | null
          contract_id: string | null
          country: string | null
          created_at: string
          created_by: string | null
          first_contact_date: string | null
          has_piano: boolean | null
          has_sound_system: boolean | null
          id: string
          internal_notes: string | null
          last_contact_date: string | null
          last_performance_date: string | null
          notes: string | null
          organization_name: string | null
          organization_type: string | null
          preferred_event_types: string[] | null
          preferred_seasons: string[] | null
          priority_level: number | null
          secondary_contact_email: string | null
          secondary_contact_name: string | null
          secondary_contact_phone: string | null
          source: Database["public"]["Enums"]["host_source"]
          state: string | null
          status: Database["public"]["Enums"]["host_status"]
          street_address: string | null
          total_performances: number | null
          typical_audience_size: number | null
          updated_at: string
          updated_by: string | null
          venue_capacity: number | null
          venue_name: string | null
          venue_type: string | null
          website_url: string | null
          zip_code: string | null
        }
        Insert: {
          accessibility_features?: string | null
          booking_lead_time_months?: number | null
          booking_request_id?: string | null
          budget_range_max?: number | null
          budget_range_min?: number | null
          city?: string | null
          contact_email?: string | null
          contact_name: string
          contact_phone?: string | null
          contract_id?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          first_contact_date?: string | null
          has_piano?: boolean | null
          has_sound_system?: boolean | null
          id?: string
          internal_notes?: string | null
          last_contact_date?: string | null
          last_performance_date?: string | null
          notes?: string | null
          organization_name?: string | null
          organization_type?: string | null
          preferred_event_types?: string[] | null
          preferred_seasons?: string[] | null
          priority_level?: number | null
          secondary_contact_email?: string | null
          secondary_contact_name?: string | null
          secondary_contact_phone?: string | null
          source: Database["public"]["Enums"]["host_source"]
          state?: string | null
          status?: Database["public"]["Enums"]["host_status"]
          street_address?: string | null
          total_performances?: number | null
          typical_audience_size?: number | null
          updated_at?: string
          updated_by?: string | null
          venue_capacity?: number | null
          venue_name?: string | null
          venue_type?: string | null
          website_url?: string | null
          zip_code?: string | null
        }
        Update: {
          accessibility_features?: string | null
          booking_lead_time_months?: number | null
          booking_request_id?: string | null
          budget_range_max?: number | null
          budget_range_min?: number | null
          city?: string | null
          contact_email?: string | null
          contact_name?: string
          contact_phone?: string | null
          contract_id?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          first_contact_date?: string | null
          has_piano?: boolean | null
          has_sound_system?: boolean | null
          id?: string
          internal_notes?: string | null
          last_contact_date?: string | null
          last_performance_date?: string | null
          notes?: string | null
          organization_name?: string | null
          organization_type?: string | null
          preferred_event_types?: string[] | null
          preferred_seasons?: string[] | null
          priority_level?: number | null
          secondary_contact_email?: string | null
          secondary_contact_name?: string | null
          secondary_contact_phone?: string | null
          source?: Database["public"]["Enums"]["host_source"]
          state?: string | null
          status?: Database["public"]["Enums"]["host_status"]
          street_address?: string | null
          total_performances?: number | null
          typical_audience_size?: number | null
          updated_at?: string
          updated_by?: string | null
          venue_capacity?: number | null
          venue_name?: string | null
          venue_type?: string | null
          website_url?: string | null
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hosts_booking_request_id_fkey"
            columns: ["booking_request_id"]
            isOneToOne: false
            referencedRelation: "booking_requests"
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
      karaoke_recordings: {
        Row: {
          audio_duration: number | null
          audio_url: string
          created_at: string
          file_path: string
          id: string
          is_public: boolean | null
          likes: number | null
          song_name: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          audio_duration?: number | null
          audio_url: string
          created_at?: string
          file_path: string
          id?: string
          is_public?: boolean | null
          likes?: number | null
          song_name?: string | null
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          audio_duration?: number | null
          audio_url?: string
          created_at?: string
          file_path?: string
          id?: string
          is_public?: boolean | null
          likes?: number | null
          song_name?: string | null
          title?: string
          updated_at?: string
          user_id?: string
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
      liturgical_psalms: {
        Row: {
          created_at: string
          created_by: string | null
          cycle: string
          id: string
          lectionary_id: string
          psalm_reference: string
          psalm_text: string | null
          refrain_reference: string | null
          refrain_text: string | null
          scraped_at: string | null
          season: string
          source_url: string | null
          title: string
          updated_at: string
          verses: Json | null
          week: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          cycle: string
          id?: string
          lectionary_id: string
          psalm_reference: string
          psalm_text?: string | null
          refrain_reference?: string | null
          refrain_text?: string | null
          scraped_at?: string | null
          season: string
          source_url?: string | null
          title: string
          updated_at?: string
          verses?: Json | null
          week: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          cycle?: string
          id?: string
          lectionary_id?: string
          psalm_reference?: string
          psalm_text?: string | null
          refrain_reference?: string | null
          refrain_text?: string | null
          scraped_at?: string | null
          season?: string
          source_url?: string | null
          title?: string
          updated_at?: string
          verses?: Json | null
          week?: string
        }
        Relationships: []
      }
      liturgical_weeks: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          lectionary_cycle: string | null
          notes: string | null
          title: string
          week_of: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          lectionary_cycle?: string | null
          notes?: string | null
          title: string
          week_of: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          lectionary_cycle?: string | null
          notes?: string | null
          title?: string
          week_of?: string
        }
        Relationships: []
      }
      liturgical_worksheets: {
        Row: {
          created_at: string | null
          id: string
          liturgical_date: string
          liturgical_season: string
          music_selections: Json | null
          notes: string | null
          readings: Json | null
          responsorial_psalm_musicxml: string | null
          special_instructions: string | null
          status: string | null
          theme: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          liturgical_date: string
          liturgical_season: string
          music_selections?: Json | null
          notes?: string | null
          readings?: Json | null
          responsorial_psalm_musicxml?: string | null
          special_instructions?: string | null
          status?: string | null
          theme?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          liturgical_date?: string
          liturgical_season?: string
          music_selections?: Json | null
          notes?: string | null
          readings?: Json | null
          responsorial_psalm_musicxml?: string | null
          special_instructions?: string | null
          status?: string | null
          theme?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      liturgy_assets: {
        Row: {
          created_at: string | null
          created_by: string | null
          external_url: string | null
          id: string
          kind: string | null
          liturgical_week_id: string | null
          storage_path: string | null
          title: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          external_url?: string | null
          id?: string
          kind?: string | null
          liturgical_week_id?: string | null
          storage_path?: string | null
          title?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          external_url?: string | null
          id?: string
          kind?: string | null
          liturgical_week_id?: string | null
          storage_path?: string | null
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "liturgy_assets_liturgical_week_id_fkey"
            columns: ["liturgical_week_id"]
            isOneToOne: false
            referencedRelation: "liturgical_weeks"
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
      member_check_ins: {
        Row: {
          check_in_time: string
          check_out_time: string | null
          created_at: string
          event_type: string | null
          id: string
          location: string | null
          notes: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          check_in_time?: string
          check_out_time?: string | null
          created_at?: string
          event_type?: string | null
          id?: string
          location?: string | null
          notes?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          check_in_time?: string
          check_out_time?: string | null
          created_at?: string
          event_type?: string | null
          id?: string
          location?: string | null
          notes?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      module_items: {
        Row: {
          content_text: string | null
          content_url: string | null
          created_at: string | null
          display_order: number
          due_date: string | null
          id: string
          item_type: string
          module_id: string | null
          points: number | null
          title: string
          updated_at: string | null
        }
        Insert: {
          content_text?: string | null
          content_url?: string | null
          created_at?: string | null
          display_order: number
          due_date?: string | null
          id?: string
          item_type: string
          module_id?: string | null
          points?: number | null
          title: string
          updated_at?: string | null
        }
        Update: {
          content_text?: string | null
          content_url?: string | null
          created_at?: string | null
          display_order?: number
          due_date?: string | null
          id?: string
          item_type?: string
          module_id?: string | null
          points?: number | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "module_items_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "course_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      mus240_ai_detection_patterns: {
        Row: {
          created_at: string
          detection_rules: Json
          id: string
          is_active: boolean
          pattern_description: string | null
          pattern_name: string
          weight: number
        }
        Insert: {
          created_at?: string
          detection_rules: Json
          id?: string
          is_active?: boolean
          pattern_description?: string | null
          pattern_name: string
          weight?: number
        }
        Update: {
          created_at?: string
          detection_rules?: Json
          id?: string
          is_active?: boolean
          pattern_description?: string | null
          pattern_name?: string
          weight?: number
        }
        Relationships: []
      }
      mus240_assignment_codes: {
        Row: {
          assignment_id: string | null
          code: string
          created_at: string | null
        }
        Insert: {
          assignment_id?: string | null
          code: string
          created_at?: string | null
        }
        Update: {
          assignment_id?: string | null
          code?: string
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mus240_assignment_codes_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "mus240_assignments"
            referencedColumns: ["id"]
          },
        ]
      }
      mus240_assignment_types: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          percentage: number | null
          total_points: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          percentage?: number | null
          total_points: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          percentage?: number | null
          total_points?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      mus240_assignments: {
        Row: {
          assignment_code: string | null
          assignment_type: string
          created_at: string
          created_by: string | null
          description: string | null
          due_date: string | null
          id: string
          instructions: string | null
          is_active: boolean
          points: number
          prompt: string
          resources: string[] | null
          rubric: Json | null
          title: string
          updated_at: string
        }
        Insert: {
          assignment_code?: string | null
          assignment_type?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          instructions?: string | null
          is_active?: boolean
          points?: number
          prompt: string
          resources?: string[] | null
          rubric?: Json | null
          title: string
          updated_at?: string
        }
        Update: {
          assignment_code?: string | null
          assignment_type?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          instructions?: string | null
          is_active?: boolean
          points?: number
          prompt?: string
          resources?: string[] | null
          rubric?: Json | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      mus240_audio_resources: {
        Row: {
          category: string
          created_at: string
          description: string | null
          duration: number | null
          file_path: string
          file_size: number | null
          id: string
          title: string
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          duration?: number | null
          file_path: string
          file_size?: number | null
          id?: string
          title: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          duration?: number | null
          file_path?: string
          file_size?: number | null
          id?: string
          title?: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: []
      }
      mus240_course_analytics: {
        Row: {
          ai_usage_percentage: number | null
          average_completion_time_minutes: number | null
          class_performance_trends: Json | null
          common_strength_areas: string[] | null
          common_struggle_areas: string[] | null
          generated_at: string
          id: string
          semester: string
          total_students: number
        }
        Insert: {
          ai_usage_percentage?: number | null
          average_completion_time_minutes?: number | null
          class_performance_trends?: Json | null
          common_strength_areas?: string[] | null
          common_struggle_areas?: string[] | null
          generated_at?: string
          id?: string
          semester?: string
          total_students?: number
        }
        Update: {
          ai_usage_percentage?: number | null
          average_completion_time_minutes?: number | null
          class_performance_trends?: Json | null
          common_strength_areas?: string[] | null
          common_struggle_areas?: string[] | null
          generated_at?: string
          id?: string
          semester?: string
          total_students?: number
        }
        Relationships: []
      }
      mus240_enrollments: {
        Row: {
          created_at: string
          enrolled_at: string
          enrollment_status: string
          final_grade: string | null
          id: string
          instructor_notes: string | null
          semester: string
          student_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          enrolled_at?: string
          enrollment_status?: string
          final_grade?: string | null
          id?: string
          instructor_notes?: string | null
          semester?: string
          student_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          enrolled_at?: string
          enrollment_status?: string
          final_grade?: string | null
          id?: string
          instructor_notes?: string | null
          semester?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_mus240_enrollments_student_profile"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "gw_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "fk_mus240_enrollments_student_profile"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "user_dashboard_data"
            referencedColumns: ["user_id"]
          },
        ]
      }
      mus240_grade_summaries: {
        Row: {
          assignment_points: number
          assignment_possible: number
          calculated_at: string
          id: string
          letter_grade: string | null
          overall_percentage: number | null
          overall_points: number | null
          overall_possible: number
          participation_points: number | null
          participation_possible: number
          semester: string
          student_id: string
          updated_at: string | null
        }
        Insert: {
          assignment_points?: number
          assignment_possible?: number
          calculated_at?: string
          id?: string
          letter_grade?: string | null
          overall_percentage?: number | null
          overall_points?: number | null
          overall_possible?: number
          participation_points?: number | null
          participation_possible?: number
          semester?: string
          student_id: string
          updated_at?: string | null
        }
        Update: {
          assignment_points?: number
          assignment_possible?: number
          calculated_at?: string
          id?: string
          letter_grade?: string | null
          overall_percentage?: number | null
          overall_points?: number | null
          overall_possible?: number
          participation_points?: number | null
          participation_possible?: number
          semester?: string
          student_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      mus240_grading_rubrics: {
        Row: {
          created_at: string
          created_by: string | null
          criteria: Json
          id: string
          question_id: string
          question_type: string
          total_points: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          criteria: Json
          id?: string
          question_id: string
          question_type: string
          total_points?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          criteria?: Json
          id?: string
          question_id?: string
          question_type?: string
          total_points?: number
          updated_at?: string
        }
        Relationships: []
      }
      mus240_group_applications: {
        Row: {
          applicant_id: string
          applied_at: string
          email: string
          full_name: string
          group_id: string
          id: string
          main_skill_set: string
          motivation: string | null
          other_skills: string | null
          phone_number: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
        }
        Insert: {
          applicant_id: string
          applied_at?: string
          email: string
          full_name: string
          group_id: string
          id?: string
          main_skill_set: string
          motivation?: string | null
          other_skills?: string | null
          phone_number?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Update: {
          applicant_id?: string
          applied_at?: string
          email?: string
          full_name?: string
          group_id?: string
          id?: string
          main_skill_set?: string
          motivation?: string | null
          other_skills?: string | null
          phone_number?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "mus240_group_applications_applicant_id_fkey"
            columns: ["applicant_id"]
            isOneToOne: false
            referencedRelation: "gw_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "mus240_group_applications_applicant_id_fkey"
            columns: ["applicant_id"]
            isOneToOne: false
            referencedRelation: "user_dashboard_data"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "mus240_group_applications_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "mus240_project_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      mus240_group_links: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          group_id: string
          id: string
          title: string
          updated_at: string
          url: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          group_id: string
          id?: string
          title: string
          updated_at?: string
          url: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          group_id?: string
          id?: string
          title?: string
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      mus240_group_memberships: {
        Row: {
          group_id: string
          id: string
          joined_at: string
          member_id: string
          project_role:
            | Database["public"]["Enums"]["mus240_project_role"]
            | null
          role: string
        }
        Insert: {
          group_id: string
          id?: string
          joined_at?: string
          member_id: string
          project_role?:
            | Database["public"]["Enums"]["mus240_project_role"]
            | null
          role?: string
        }
        Update: {
          group_id?: string
          id?: string
          joined_at?: string
          member_id?: string
          project_role?:
            | Database["public"]["Enums"]["mus240_project_role"]
            | null
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "mus240_group_memberships_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "mus240_project_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mus240_group_memberships_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "gw_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "mus240_group_memberships_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "user_dashboard_data"
            referencedColumns: ["user_id"]
          },
        ]
      }
      mus240_group_notes: {
        Row: {
          content: string
          created_at: string
          created_by: string
          group_id: string
          id: string
          title: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by: string
          group_id: string
          id?: string
          title: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string
          group_id?: string
          id?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      mus240_group_sandboxes: {
        Row: {
          created_at: string
          created_by: string
          description: string
          group_id: string
          id: string
          sandbox_url: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description: string
          group_id: string
          id?: string
          sandbox_url: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string
          group_id?: string
          id?: string
          sandbox_url?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      mus240_journal_comments: {
        Row: {
          commenter_id: string
          content: string
          created_at: string
          id: string
          journal_id: string
          updated_at: string
        }
        Insert: {
          commenter_id: string
          content: string
          created_at?: string
          id?: string
          journal_id: string
          updated_at?: string
        }
        Update: {
          commenter_id?: string
          content?: string
          created_at?: string
          id?: string
          journal_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mus240_journal_comments_journal_id_fkey"
            columns: ["journal_id"]
            isOneToOne: false
            referencedRelation: "mus240_journal_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      mus240_journal_entries: {
        Row: {
          assignment_db_id: string | null
          assignment_id: string
          content: string
          created_at: string
          feedback: Json | null
          grade: number | null
          graded_at: string | null
          graded_by: string | null
          id: string
          is_published: boolean
          is_resubmission: boolean | null
          original_submission_id: string | null
          published_at: string | null
          resubmission_count: number | null
          student_id: string
          submitted_at: string | null
          updated_at: string
          word_count: number
        }
        Insert: {
          assignment_db_id?: string | null
          assignment_id: string
          content: string
          created_at?: string
          feedback?: Json | null
          grade?: number | null
          graded_at?: string | null
          graded_by?: string | null
          id?: string
          is_published?: boolean
          is_resubmission?: boolean | null
          original_submission_id?: string | null
          published_at?: string | null
          resubmission_count?: number | null
          student_id: string
          submitted_at?: string | null
          updated_at?: string
          word_count?: number
        }
        Update: {
          assignment_db_id?: string | null
          assignment_id?: string
          content?: string
          created_at?: string
          feedback?: Json | null
          grade?: number | null
          graded_at?: string | null
          graded_by?: string | null
          id?: string
          is_published?: boolean
          is_resubmission?: boolean | null
          original_submission_id?: string | null
          published_at?: string | null
          resubmission_count?: number | null
          student_id?: string
          submitted_at?: string | null
          updated_at?: string
          word_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "mus240_journal_entries_assignment_db_id_fkey"
            columns: ["assignment_db_id"]
            isOneToOne: false
            referencedRelation: "mus240_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mus240_journal_entries_original_submission_id_fkey"
            columns: ["original_submission_id"]
            isOneToOne: false
            referencedRelation: "mus240_journal_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      mus240_journal_grades: {
        Row: {
          ai_detection_confidence: number | null
          ai_detection_notes: string | null
          ai_feedback: string | null
          ai_model: string | null
          ai_writing_detected: boolean | null
          assignment_db_id: string | null
          assignment_id: string
          created_at: string
          graded_at: string
          graded_by: string | null
          id: string
          instructor_feedback: string | null
          instructor_graded_at: string | null
          instructor_id: string | null
          instructor_letter_grade: string | null
          instructor_score: number | null
          journal_id: string | null
          letter_grade: string | null
          overall_score: number
          rubric: Json
          student_id: string
          updated_at: string | null
        }
        Insert: {
          ai_detection_confidence?: number | null
          ai_detection_notes?: string | null
          ai_feedback?: string | null
          ai_model?: string | null
          ai_writing_detected?: boolean | null
          assignment_db_id?: string | null
          assignment_id: string
          created_at?: string
          graded_at?: string
          graded_by?: string | null
          id?: string
          instructor_feedback?: string | null
          instructor_graded_at?: string | null
          instructor_id?: string | null
          instructor_letter_grade?: string | null
          instructor_score?: number | null
          journal_id?: string | null
          letter_grade?: string | null
          overall_score: number
          rubric?: Json
          student_id: string
          updated_at?: string | null
        }
        Update: {
          ai_detection_confidence?: number | null
          ai_detection_notes?: string | null
          ai_feedback?: string | null
          ai_model?: string | null
          ai_writing_detected?: boolean | null
          assignment_db_id?: string | null
          assignment_id?: string
          created_at?: string
          graded_at?: string
          graded_by?: string | null
          id?: string
          instructor_feedback?: string | null
          instructor_graded_at?: string | null
          instructor_id?: string | null
          instructor_letter_grade?: string | null
          instructor_score?: number | null
          journal_id?: string | null
          letter_grade?: string | null
          overall_score?: number
          rubric?: Json
          student_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mus240_journal_grades_assignment_db_id_fkey"
            columns: ["assignment_db_id"]
            isOneToOne: false
            referencedRelation: "mus240_assignments"
            referencedColumns: ["id"]
          },
        ]
      }
      mus240_journal_reads: {
        Row: {
          id: string
          journal_id: string
          read_at: string
          reader_id: string
        }
        Insert: {
          id?: string
          journal_id: string
          read_at?: string
          reader_id: string
        }
        Update: {
          id?: string
          journal_id?: string
          read_at?: string
          reader_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mus240_journal_reads_journal_id_fkey"
            columns: ["journal_id"]
            isOneToOne: false
            referencedRelation: "mus240_journal_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      mus240_midterm_config: {
        Row: {
          created_at: string | null
          excerpt_1_url: string | null
          excerpt_2_url: string | null
          excerpt_3_url: string | null
          id: string
          is_active: boolean | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          excerpt_1_url?: string | null
          excerpt_2_url?: string | null
          excerpt_3_url?: string | null
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          excerpt_1_url?: string | null
          excerpt_2_url?: string | null
          excerpt_3_url?: string | null
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
      mus240_midterm_submissions: {
        Row: {
          blues_answer: string | null
          comprehensive_feedback: string | null
          created_at: string
          essay_answer: string | null
          excerpt_1_context: string | null
          excerpt_1_features: string | null
          excerpt_1_genre: string | null
          excerpt_2_context: string | null
          excerpt_2_features: string | null
          excerpt_2_genre: string | null
          excerpt_3_context: string | null
          excerpt_3_features: string | null
          excerpt_3_genre: string | null
          feedback: string | null
          feedback_generated_at: string | null
          field_holler_answer: string | null
          grade: number | null
          graded_at: string | null
          graded_by: string | null
          id: string
          is_submitted: boolean
          negro_spiritual_answer: string | null
          ragtime_answer: string | null
          ring_shout_answer: string | null
          selected_essay_question: number | null
          selected_terms: string[]
          submitted_at: string | null
          swing_answer: string | null
          time_started: string
          total_time_minutes: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          blues_answer?: string | null
          comprehensive_feedback?: string | null
          created_at?: string
          essay_answer?: string | null
          excerpt_1_context?: string | null
          excerpt_1_features?: string | null
          excerpt_1_genre?: string | null
          excerpt_2_context?: string | null
          excerpt_2_features?: string | null
          excerpt_2_genre?: string | null
          excerpt_3_context?: string | null
          excerpt_3_features?: string | null
          excerpt_3_genre?: string | null
          feedback?: string | null
          feedback_generated_at?: string | null
          field_holler_answer?: string | null
          grade?: number | null
          graded_at?: string | null
          graded_by?: string | null
          id?: string
          is_submitted?: boolean
          negro_spiritual_answer?: string | null
          ragtime_answer?: string | null
          ring_shout_answer?: string | null
          selected_essay_question?: number | null
          selected_terms?: string[]
          submitted_at?: string | null
          swing_answer?: string | null
          time_started?: string
          total_time_minutes?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          blues_answer?: string | null
          comprehensive_feedback?: string | null
          created_at?: string
          essay_answer?: string | null
          excerpt_1_context?: string | null
          excerpt_1_features?: string | null
          excerpt_1_genre?: string | null
          excerpt_2_context?: string | null
          excerpt_2_features?: string | null
          excerpt_2_genre?: string | null
          excerpt_3_context?: string | null
          excerpt_3_features?: string | null
          excerpt_3_genre?: string | null
          feedback?: string | null
          feedback_generated_at?: string | null
          field_holler_answer?: string | null
          grade?: number | null
          graded_at?: string | null
          graded_by?: string | null
          id?: string
          is_submitted?: boolean
          negro_spiritual_answer?: string | null
          ragtime_answer?: string | null
          ring_shout_answer?: string | null
          selected_essay_question?: number | null
          selected_terms?: string[]
          submitted_at?: string | null
          swing_answer?: string | null
          time_started?: string
          total_time_minutes?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      mus240_participation_grades: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          points_earned: number
          points_possible: number
          semester: string
          student_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          points_earned?: number
          points_possible?: number
          semester?: string
          student_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          points_earned?: number
          points_possible?: number
          semester?: string
          student_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      mus240_peer_reviews: {
        Row: {
          created_at: string
          feedback: string
          id: string
          journal_id: string
          reviewer_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          feedback: string
          id?: string
          journal_id: string
          reviewer_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          feedback?: string
          id?: string
          journal_id?: string
          reviewer_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mus240_peer_reviews_journal_id_fkey"
            columns: ["journal_id"]
            isOneToOne: false
            referencedRelation: "mus240_journal_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      mus240_performance_levels: {
        Row: {
          created_at: string | null
          criterion_id: string | null
          description: string
          id: string
          level_name: string
          level_value: number
          points: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          criterion_id?: string | null
          description: string
          id?: string
          level_name: string
          level_value: number
          points: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          criterion_id?: string | null
          description?: string
          id?: string
          level_name?: string
          level_value?: number
          points?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mus240_performance_levels_criterion_id_fkey"
            columns: ["criterion_id"]
            isOneToOne: false
            referencedRelation: "mus240_rubric_criteria"
            referencedColumns: ["id"]
          },
        ]
      }
      mus240_poll_responses: {
        Row: {
          id: string
          poll_id: string
          question_index: number
          response_time: string
          selected_option: number
          student_id: string
          updated_at: string | null
        }
        Insert: {
          id?: string
          poll_id: string
          question_index: number
          response_time?: string
          selected_option: number
          student_id: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          poll_id?: string
          question_index?: number
          response_time?: string
          selected_option?: number
          student_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mus240_poll_responses_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "mus240_polls"
            referencedColumns: ["id"]
          },
        ]
      }
      mus240_polls: {
        Row: {
          created_at: string
          created_by: string | null
          current_question_index: number | null
          description: string | null
          expires_at: string | null
          id: string
          is_active: boolean
          is_live_session: boolean | null
          questions: Json
          show_results: boolean | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          current_question_index?: number | null
          description?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          is_live_session?: boolean | null
          questions?: Json
          show_results?: boolean | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          current_question_index?: number | null
          description?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          is_live_session?: boolean | null
          questions?: Json
          show_results?: boolean | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      mus240_project_groups: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_official: boolean
          leader_id: string | null
          max_members: number
          member_count: number
          name: string
          semester: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_official?: boolean
          leader_id?: string | null
          max_members?: number
          member_count?: number
          name: string
          semester?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_official?: boolean
          leader_id?: string | null
          max_members?: number
          member_count?: number
          name?: string
          semester?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mus240_project_groups_leader_id_fkey"
            columns: ["leader_id"]
            isOneToOne: false
            referencedRelation: "gw_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "mus240_project_groups_leader_id_fkey"
            columns: ["leader_id"]
            isOneToOne: false
            referencedRelation: "user_dashboard_data"
            referencedColumns: ["user_id"]
          },
        ]
      }
      mus240_reading_requirements: {
        Row: {
          assignment_id: string
          completed_at: string | null
          created_at: string
          id: string
          journals_read: number
          required_reads: number
          student_id: string
          updated_at: string
        }
        Insert: {
          assignment_id: string
          completed_at?: string | null
          created_at?: string
          id?: string
          journals_read?: number
          required_reads?: number
          student_id: string
          updated_at?: string
        }
        Update: {
          assignment_id?: string
          completed_at?: string | null
          created_at?: string
          id?: string
          journals_read?: number
          required_reads?: number
          student_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      mus240_resources: {
        Row: {
          category: string
          created_at: string
          created_by: string | null
          description: string
          display_order: number | null
          file_name: string | null
          file_path: string | null
          file_size: number | null
          id: string
          is_active: boolean
          is_file_upload: boolean | null
          mime_type: string | null
          title: string
          updated_at: string
          url: string
        }
        Insert: {
          category: string
          created_at?: string
          created_by?: string | null
          description: string
          display_order?: number | null
          file_name?: string | null
          file_path?: string | null
          file_size?: number | null
          id?: string
          is_active?: boolean
          is_file_upload?: boolean | null
          mime_type?: string | null
          title: string
          updated_at?: string
          url: string
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string
          display_order?: number | null
          file_name?: string | null
          file_path?: string | null
          file_size?: number | null
          id?: string
          is_active?: boolean
          is_file_upload?: boolean | null
          mime_type?: string | null
          title?: string
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      mus240_rubric_criteria: {
        Row: {
          assignment_type_id: string | null
          created_at: string | null
          criterion_name: string
          description: string | null
          display_order: number | null
          id: string
          max_points: number
          updated_at: string | null
          weight_percentage: number
        }
        Insert: {
          assignment_type_id?: string | null
          created_at?: string | null
          criterion_name: string
          description?: string | null
          display_order?: number | null
          id?: string
          max_points: number
          updated_at?: string | null
          weight_percentage: number
        }
        Update: {
          assignment_type_id?: string | null
          created_at?: string | null
          criterion_name?: string
          description?: string | null
          display_order?: number | null
          id?: string
          max_points?: number
          updated_at?: string | null
          weight_percentage?: number
        }
        Relationships: [
          {
            foreignKeyName: "mus240_rubric_criteria_assignment_type_id_fkey"
            columns: ["assignment_type_id"]
            isOneToOne: false
            referencedRelation: "mus240_assignment_types"
            referencedColumns: ["id"]
          },
        ]
      }
      mus240_rubric_scores: {
        Row: {
          created_at: string | null
          criterion_id: string | null
          graded_by: string | null
          id: string
          instructor_comments: string | null
          performance_level_id: string | null
          points_earned: number
          submission_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          criterion_id?: string | null
          graded_by?: string | null
          id?: string
          instructor_comments?: string | null
          performance_level_id?: string | null
          points_earned: number
          submission_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          criterion_id?: string | null
          graded_by?: string | null
          id?: string
          instructor_comments?: string | null
          performance_level_id?: string | null
          points_earned?: number
          submission_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mus240_rubric_scores_criterion_id_fkey"
            columns: ["criterion_id"]
            isOneToOne: false
            referencedRelation: "mus240_rubric_criteria"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mus240_rubric_scores_graded_by_fkey"
            columns: ["graded_by"]
            isOneToOne: false
            referencedRelation: "gw_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "mus240_rubric_scores_graded_by_fkey"
            columns: ["graded_by"]
            isOneToOne: false
            referencedRelation: "user_dashboard_data"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "mus240_rubric_scores_performance_level_id_fkey"
            columns: ["performance_level_id"]
            isOneToOne: false
            referencedRelation: "mus240_performance_levels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mus240_rubric_scores_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "assignment_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      mus240_session_analytics: {
        Row: {
          ai_likelihood_score: number | null
          average_typing_speed: number | null
          browser_info: Json | null
          consistency_score: number | null
          created_at: string
          id: string
          response_patterns: Json | null
          revision_frequency: number | null
          section_completion_order: string[] | null
          strength_areas: string[] | null
          struggle_areas: string[] | null
          student_id: string
          submission_id: string
          total_active_time_seconds: number
          total_pause_time_seconds: number
          updated_at: string
        }
        Insert: {
          ai_likelihood_score?: number | null
          average_typing_speed?: number | null
          browser_info?: Json | null
          consistency_score?: number | null
          created_at?: string
          id?: string
          response_patterns?: Json | null
          revision_frequency?: number | null
          section_completion_order?: string[] | null
          strength_areas?: string[] | null
          struggle_areas?: string[] | null
          student_id: string
          submission_id: string
          total_active_time_seconds?: number
          total_pause_time_seconds?: number
          updated_at?: string
        }
        Update: {
          ai_likelihood_score?: number | null
          average_typing_speed?: number | null
          browser_info?: Json | null
          consistency_score?: number | null
          created_at?: string
          id?: string
          response_patterns?: Json | null
          revision_frequency?: number | null
          section_completion_order?: string[] | null
          strength_areas?: string[] | null
          struggle_areas?: string[] | null
          student_id?: string
          submission_id?: string
          total_active_time_seconds?: number
          total_pause_time_seconds?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mus240_session_analytics_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "mus240_midterm_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      mus240_submission_grades: {
        Row: {
          ai_feedback: string | null
          ai_graded_at: string | null
          ai_score: number | null
          created_at: string
          graded_at: string | null
          graded_by: string | null
          id: string
          instructor_feedback: string | null
          instructor_score: number | null
          needs_review: boolean | null
          question_id: string
          question_type: string
          rubric_breakdown: Json | null
          student_answer: string | null
          submission_id: string
          updated_at: string
        }
        Insert: {
          ai_feedback?: string | null
          ai_graded_at?: string | null
          ai_score?: number | null
          created_at?: string
          graded_at?: string | null
          graded_by?: string | null
          id?: string
          instructor_feedback?: string | null
          instructor_score?: number | null
          needs_review?: boolean | null
          question_id: string
          question_type: string
          rubric_breakdown?: Json | null
          student_answer?: string | null
          submission_id: string
          updated_at?: string
        }
        Update: {
          ai_feedback?: string | null
          ai_graded_at?: string | null
          ai_score?: number | null
          created_at?: string
          graded_at?: string | null
          graded_by?: string | null
          id?: string
          instructor_feedback?: string | null
          instructor_score?: number | null
          needs_review?: boolean | null
          question_id?: string
          question_type?: string
          rubric_breakdown?: Json | null
          student_answer?: string | null
          submission_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mus240_submission_grades_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "mus240_midterm_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      mus240_test_analytics: {
        Row: {
          ai_indicators: Json | null
          content_length: number | null
          created_at: string
          edit_count: number | null
          event_type: string
          id: string
          keystroke_patterns: Json | null
          question_id: string | null
          section_name: string | null
          student_id: string
          submission_id: string
          time_spent_seconds: number | null
          timestamp_recorded: string
        }
        Insert: {
          ai_indicators?: Json | null
          content_length?: number | null
          created_at?: string
          edit_count?: number | null
          event_type: string
          id?: string
          keystroke_patterns?: Json | null
          question_id?: string | null
          section_name?: string | null
          student_id: string
          submission_id: string
          time_spent_seconds?: number | null
          timestamp_recorded?: string
        }
        Update: {
          ai_indicators?: Json | null
          content_length?: number | null
          created_at?: string
          edit_count?: number | null
          event_type?: string
          id?: string
          keystroke_patterns?: Json | null
          question_id?: string | null
          section_name?: string | null
          student_id?: string
          submission_id?: string
          time_spent_seconds?: number | null
          timestamp_recorded?: string
        }
        Relationships: [
          {
            foreignKeyName: "mus240_test_analytics_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "mus240_midterm_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      mus240_video_edits: {
        Row: {
          created_at: string | null
          edited_by: string | null
          id: string
          tracks: Json
          updated_at: string | null
          week_number: number
        }
        Insert: {
          created_at?: string | null
          edited_by?: string | null
          id?: string
          tracks: Json
          updated_at?: string | null
          week_number: number
        }
        Update: {
          created_at?: string | null
          edited_by?: string | null
          id?: string
          tracks?: Json
          updated_at?: string | null
          week_number?: number
        }
        Relationships: []
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
      music_fundamentals_assignments: {
        Row: {
          assignment_type: string
          created_at: string
          created_by: string
          description: string | null
          due_date: string | null
          id: string
          is_active: boolean
          max_score: number | null
          title: string
          updated_at: string
        }
        Insert: {
          assignment_type: string
          created_at?: string
          created_by: string
          description?: string | null
          due_date?: string | null
          id?: string
          is_active?: boolean
          max_score?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          assignment_type?: string
          created_at?: string
          created_by?: string
          description?: string | null
          due_date?: string | null
          id?: string
          is_active?: boolean
          max_score?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      music_fundamentals_submissions: {
        Row: {
          assignment_id: string
          content: string | null
          created_at: string
          feedback: string | null
          file_name: string | null
          file_url: string | null
          graded_at: string | null
          graded_by: string | null
          id: string
          score: number | null
          status: string
          student_id: string
          submission_type: string
          submitted_at: string
          updated_at: string
        }
        Insert: {
          assignment_id: string
          content?: string | null
          created_at?: string
          feedback?: string | null
          file_name?: string | null
          file_url?: string | null
          graded_at?: string | null
          graded_by?: string | null
          id?: string
          score?: number | null
          status?: string
          student_id: string
          submission_type: string
          submitted_at?: string
          updated_at?: string
        }
        Update: {
          assignment_id?: string
          content?: string | null
          created_at?: string
          feedback?: string | null
          file_name?: string | null
          file_url?: string | null
          graded_at?: string | null
          graded_by?: string | null
          id?: string
          score?: number | null
          status?: string
          student_id?: string
          submission_type?: string
          submitted_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "music_fundamentals_submissions_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "music_fundamentals_assignments"
            referencedColumns: ["id"]
          },
        ]
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
      onboarding_signatures: {
        Row: {
          agreement_version: string | null
          created_at: string
          date_signed: string
          full_name: string
          id: string
          ip_address: unknown
          is_valid: boolean
          onboarding_step: string
          signature_data: string
          signature_type: string
          updated_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          agreement_version?: string | null
          created_at?: string
          date_signed?: string
          full_name: string
          id?: string
          ip_address?: unknown
          is_valid?: boolean
          onboarding_step?: string
          signature_data: string
          signature_type?: string
          updated_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          agreement_version?: string | null
          created_at?: string
          date_signed?: string
          full_name?: string
          id?: string
          ip_address?: unknown
          is_valid?: boolean
          onboarding_step?: string
          signature_data?: string
          signature_type?: string
          updated_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
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
      permission_group_permissions: {
        Row: {
          created_at: string | null
          group_id: string
          id: string
          permission_id: string
          permission_level: string
          permission_scope: string | null
        }
        Insert: {
          created_at?: string | null
          group_id: string
          id?: string
          permission_id: string
          permission_level?: string
          permission_scope?: string | null
        }
        Update: {
          created_at?: string | null
          group_id?: string
          id?: string
          permission_id?: string
          permission_level?: string
          permission_scope?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "permission_group_permissions_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "permission_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      permission_groups: {
        Row: {
          color: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          is_default: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      pitch_results: {
        Row: {
          created_at: string
          id: string
          results: Json
          score: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          results?: Json
          score: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          results?: Json
          score?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      playlist_items: {
        Row: {
          created_at: string | null
          external_url: string | null
          id: string
          library_track_id: string | null
          notes: string | null
          playlist_id: string | null
          position: number
          source: string | null
          title: string
        }
        Insert: {
          created_at?: string | null
          external_url?: string | null
          id?: string
          library_track_id?: string | null
          notes?: string | null
          playlist_id?: string | null
          position?: number
          source?: string | null
          title: string
        }
        Update: {
          created_at?: string | null
          external_url?: string | null
          id?: string
          library_track_id?: string | null
          notes?: string | null
          playlist_id?: string | null
          position?: number
          source?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "playlist_items_playlist_id_fkey"
            columns: ["playlist_id"]
            isOneToOne: false
            referencedRelation: "playlists"
            referencedColumns: ["id"]
          },
        ]
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
          thumbnail_url: string | null
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
          thumbnail_url?: string | null
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
          thumbnail_url?: string | null
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
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string | null
          endpoint: string
          id: string
          p256dh: string
          updated_at: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string | null
          endpoint: string
          id?: string
          p256dh: string
          updated_at?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string | null
          endpoint?: string
          id?: string
          p256dh?: string
          updated_at?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      qr_attendance_tokens: {
        Row: {
          created_at: string
          created_by: string
          event_id: string
          expires_at: string
          id: string
          is_active: boolean
          max_scans: number | null
          scan_count: number
          token: string
        }
        Insert: {
          created_at?: string
          created_by: string
          event_id: string
          expires_at: string
          id?: string
          is_active?: boolean
          max_scans?: number | null
          scan_count?: number
          token: string
        }
        Update: {
          created_at?: string
          created_by?: string
          event_id?: string
          expires_at?: string
          id?: string
          is_active?: boolean
          max_scans?: number | null
          scan_count?: number
          token?: string
        }
        Relationships: []
      }
      qr_scan_logs: {
        Row: {
          created_at: string | null
          event_id: string | null
          id: string
          ip_address: unknown
          qr_token: string
          scan_location: string | null
          scan_result: Json | null
          scan_status: string | null
          scanned_at: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          event_id?: string | null
          id?: string
          ip_address?: unknown
          qr_token: string
          scan_location?: string | null
          scan_result?: Json | null
          scan_status?: string | null
          scanned_at?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          event_id?: string | null
          id?: string
          ip_address?: unknown
          qr_token?: string
          scan_location?: string | null
          scan_result?: Json | null
          scan_status?: string | null
          scanned_at?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      radio_playlist_tracks: {
        Row: {
          added_at: string | null
          added_by: string | null
          id: string
          playlist_id: string | null
          position: number
          track_id: string
          track_source: string
        }
        Insert: {
          added_at?: string | null
          added_by?: string | null
          id?: string
          playlist_id?: string | null
          position?: number
          track_id: string
          track_source?: string
        }
        Update: {
          added_at?: string | null
          added_by?: string | null
          id?: string
          playlist_id?: string | null
          position?: number
          track_id?: string
          track_source?: string
        }
        Relationships: [
          {
            foreignKeyName: "radio_playlist_tracks_playlist_id_fkey"
            columns: ["playlist_id"]
            isOneToOne: false
            referencedRelation: "radio_playlists"
            referencedColumns: ["id"]
          },
        ]
      }
      radio_playlists: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_public: boolean | null
          name: string
          tags: string[] | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          name: string
          tags?: string[] | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          name?: string
          tags?: string[] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      radio_schedule: {
        Row: {
          artist_info: string | null
          audio_url: string
          category: string | null
          created_at: string
          created_by: string
          duration_seconds: number | null
          id: string
          scheduled_date: string
          scheduled_time: string
          title: string
          track_id: string
          updated_at: string
        }
        Insert: {
          artist_info?: string | null
          audio_url: string
          category?: string | null
          created_at?: string
          created_by: string
          duration_seconds?: number | null
          id?: string
          scheduled_date: string
          scheduled_time: string
          title: string
          track_id: string
          updated_at?: string
        }
        Update: {
          artist_info?: string | null
          audio_url?: string
          category?: string | null
          created_at?: string
          created_by?: string
          duration_seconds?: number | null
          id?: string
          scheduled_date?: string
          scheduled_time?: string
          title?: string
          track_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      radio_state: {
        Row: {
          current_track_artist: string | null
          current_track_id: string | null
          current_track_title: string | null
          id: string
          is_playing: boolean | null
          playback_position_seconds: number | null
          started_at: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          current_track_artist?: string | null
          current_track_id?: string | null
          current_track_title?: string | null
          id?: string
          is_playing?: boolean | null
          playback_position_seconds?: number | null
          started_at?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          current_track_artist?: string | null
          current_track_id?: string | null
          current_track_title?: string | null
          id?: string
          is_playing?: boolean | null
          playback_position_seconds?: number | null
          started_at?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "radio_state_current_track_id_fkey"
            columns: ["current_track_id"]
            isOneToOne: false
            referencedRelation: "audio_archive"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_limits: {
        Row: {
          action_type: string
          created_at: string | null
          id: string
          request_count: number | null
          user_id: string
          window_start: string | null
        }
        Insert: {
          action_type: string
          created_at?: string | null
          id?: string
          request_count?: number | null
          user_id: string
          window_start?: string | null
        }
        Update: {
          action_type?: string
          created_at?: string | null
          id?: string
          request_count?: number | null
          user_id?: string
          window_start?: string | null
        }
        Relationships: []
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
          ip_address: unknown
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
          ip_address?: unknown
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
          ip_address?: unknown
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
      sight_singing_assessments: {
        Row: {
          audio_duration_seconds: number | null
          created_at: string | null
          exercise_metadata: Json | null
          feedback: string | null
          id: string
          intonation_score: number | null
          overall_musicality: number | null
          pitch_accuracy: number | null
          rhythm_accuracy: number | null
          score_value: number
          tempo_consistency: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          audio_duration_seconds?: number | null
          created_at?: string | null
          exercise_metadata?: Json | null
          feedback?: string | null
          id?: string
          intonation_score?: number | null
          overall_musicality?: number | null
          pitch_accuracy?: number | null
          rhythm_accuracy?: number | null
          score_value: number
          tempo_consistency?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          audio_duration_seconds?: number | null
          created_at?: string | null
          exercise_metadata?: Json | null
          feedback?: string | null
          id?: string
          intonation_score?: number | null
          overall_musicality?: number | null
          pitch_accuracy?: number | null
          rhythm_accuracy?: number | null
          score_value?: number
          tempo_consistency?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      sight_singing_evaluations: {
        Row: {
          created_at: string
          exercise_id: string | null
          feedback: string | null
          id: string
          per_measure_data: Json
          pitch_accuracy: number
          recording_id: string | null
          rhythm_accuracy: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          exercise_id?: string | null
          feedback?: string | null
          id?: string
          per_measure_data?: Json
          pitch_accuracy?: number
          recording_id?: string | null
          rhythm_accuracy?: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          exercise_id?: string | null
          feedback?: string | null
          id?: string
          per_measure_data?: Json
          pitch_accuracy?: number
          recording_id?: string | null
          rhythm_accuracy?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sight_singing_evaluations_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "sight_singing_exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sight_singing_evaluations_recording_id_fkey"
            columns: ["recording_id"]
            isOneToOne: false
            referencedRelation: "sight_singing_recordings"
            referencedColumns: ["id"]
          },
        ]
      }
      sight_singing_exercises: {
        Row: {
          created_at: string
          difficulty_level: number
          id: string
          key_signature: string
          measures: number
          motion_types: string[]
          musicxml_content: string
          note_lengths: string[]
          pitch_range_max: string
          pitch_range_min: string
          register: string
          tempo: number
          time_signature: string
          title: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          difficulty_level?: number
          id?: string
          key_signature: string
          measures?: number
          motion_types?: string[]
          musicxml_content: string
          note_lengths?: string[]
          pitch_range_max: string
          pitch_range_min: string
          register: string
          tempo?: number
          time_signature: string
          title: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          difficulty_level?: number
          id?: string
          key_signature?: string
          measures?: number
          motion_types?: string[]
          musicxml_content?: string
          note_lengths?: string[]
          pitch_range_max?: string
          pitch_range_min?: string
          register?: string
          tempo?: number
          time_signature?: string
          title?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      sight_singing_recordings: {
        Row: {
          audio_file_path: string
          created_at: string
          duration_seconds: number | null
          exercise_id: string | null
          id: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          audio_file_path: string
          created_at?: string
          duration_seconds?: number | null
          exercise_id?: string | null
          id?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          audio_file_path?: string
          created_at?: string
          duration_seconds?: number | null
          exercise_id?: string | null
          id?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sight_singing_recordings_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "sight_singing_exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      sight_singing_shares: {
        Row: {
          created_at: string
          created_by: string | null
          evaluation_id: string | null
          exercise_id: string | null
          expires_at: string | null
          id: string
          is_active: boolean
          recording_id: string | null
          share_token: string
          view_count: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          evaluation_id?: string | null
          exercise_id?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          recording_id?: string | null
          share_token: string
          view_count?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          evaluation_id?: string | null
          exercise_id?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          recording_id?: string | null
          share_token?: string
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "sight_singing_shares_evaluation_id_fkey"
            columns: ["evaluation_id"]
            isOneToOne: false
            referencedRelation: "sight_singing_evaluations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sight_singing_shares_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "sight_singing_exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sight_singing_shares_recording_id_fkey"
            columns: ["recording_id"]
            isOneToOne: false
            referencedRelation: "sight_singing_recordings"
            referencedColumns: ["id"]
          },
        ]
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
        ]
      }
      slide_approvals: {
        Row: {
          created_at: string
          id: string
          presentation_id: string
          reviewed_at: string | null
          reviewer_comment: string | null
          reviewer_id: string | null
          reviewer_name: string | null
          slide_index: number
          slide_title: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          presentation_id: string
          reviewed_at?: string | null
          reviewer_comment?: string | null
          reviewer_id?: string | null
          reviewer_name?: string | null
          slide_index: number
          slide_title: string
          status: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          presentation_id?: string
          reviewed_at?: string | null
          reviewer_comment?: string | null
          reviewer_id?: string | null
          reviewer_name?: string | null
          slide_index?: number
          slide_title?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "slide_approvals_presentation_id_fkey"
            columns: ["presentation_id"]
            isOneToOne: false
            referencedRelation: "group_updates_mus240"
            referencedColumns: ["id"]
          },
        ]
      }
      smaam_comments: {
        Row: {
          author: string | null
          content: string
          created_at: string
          id: string
          track_index: number | null
          week: number
        }
        Insert: {
          author?: string | null
          content: string
          created_at?: string
          id?: string
          track_index?: number | null
          week: number
        }
        Update: {
          author?: string | null
          content?: string
          created_at?: string
          id?: string
          track_index?: number | null
          week?: number
        }
        Relationships: []
      }
      soundcloud_tokens: {
        Row: {
          access_token: string
          created_at: string | null
          expires_at: string | null
          id: string
          refresh_token: string | null
          scope: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          access_token: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          refresh_token?: string | null
          scope?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          access_token?: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          refresh_token?: string | null
          scope?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
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
      student_registrations: {
        Row: {
          african_american_music_interests: string | null
          cohort_id: string | null
          created_at: string | null
          email: string
          first_name: string
          id: string
          last_name: string
          middle_name: string | null
          music_history: string | null
          phone: string | null
          status: string | null
          student_id: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          african_american_music_interests?: string | null
          cohort_id?: string | null
          created_at?: string | null
          email: string
          first_name: string
          id?: string
          last_name: string
          middle_name?: string | null
          music_history?: string | null
          phone?: string | null
          status?: string | null
          student_id: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          african_american_music_interests?: string | null
          cohort_id?: string | null
          created_at?: string | null
          email?: string
          first_name?: string
          id?: string
          last_name?: string
          middle_name?: string | null
          music_history?: string | null
          phone?: string | null
          status?: string | null
          student_id?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_registrations_cohort_id_fkey"
            columns: ["cohort_id"]
            isOneToOne: false
            referencedRelation: "cohorts"
            referencedColumns: ["id"]
          },
        ]
      }
      submissions: {
        Row: {
          audio_url: string
          bpm: number
          created_at: string | null
          exercise_id: string
          id: string
          letter: string
          metrics: Json
          overall: number
          user_id: string
        }
        Insert: {
          audio_url: string
          bpm: number
          created_at?: string | null
          exercise_id: string
          id?: string
          letter: string
          metrics: Json
          overall: number
          user_id: string
        }
        Update: {
          audio_url?: string
          bpm?: number
          created_at?: string | null
          exercise_id?: string
          id?: string
          letter?: string
          metrics?: Json
          overall?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "submissions_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
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
      test_answer_options: {
        Row: {
          created_at: string | null
          display_order: number
          id: string
          is_correct: boolean | null
          option_text: string
          question_id: string | null
        }
        Insert: {
          created_at?: string | null
          display_order: number
          id?: string
          is_correct?: boolean | null
          option_text: string
          question_id?: string | null
        }
        Update: {
          created_at?: string | null
          display_order?: number
          id?: string
          is_correct?: boolean | null
          option_text?: string
          question_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "test_answer_options_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "test_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      test_answers: {
        Row: {
          created_at: string | null
          feedback: string | null
          file_url: string | null
          graded_at: string | null
          graded_by: string | null
          id: string
          is_correct: boolean | null
          points_earned: number | null
          question_id: string | null
          selected_option_id: string | null
          submission_id: string | null
          text_answer: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          feedback?: string | null
          file_url?: string | null
          graded_at?: string | null
          graded_by?: string | null
          id?: string
          is_correct?: boolean | null
          points_earned?: number | null
          question_id?: string | null
          selected_option_id?: string | null
          submission_id?: string | null
          text_answer?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          feedback?: string | null
          file_url?: string | null
          graded_at?: string | null
          graded_by?: string | null
          id?: string
          is_correct?: boolean | null
          points_earned?: number | null
          question_id?: string | null
          selected_option_id?: string | null
          submission_id?: string | null
          text_answer?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "test_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "test_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_answers_selected_option_id_fkey"
            columns: ["selected_option_id"]
            isOneToOne: false
            referencedRelation: "test_answer_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_answers_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "test_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      test_questions: {
        Row: {
          created_at: string | null
          display_order: number
          end_time: number | null
          id: string
          media_title: string | null
          media_type: Database["public"]["Enums"]["media_type"] | null
          media_url: string | null
          points: number | null
          question_text: string
          question_type: Database["public"]["Enums"]["question_type"]
          required: boolean | null
          start_time: number | null
          test_id: string | null
          updated_at: string | null
          youtube_video_id: string | null
        }
        Insert: {
          created_at?: string | null
          display_order: number
          end_time?: number | null
          id?: string
          media_title?: string | null
          media_type?: Database["public"]["Enums"]["media_type"] | null
          media_url?: string | null
          points?: number | null
          question_text: string
          question_type: Database["public"]["Enums"]["question_type"]
          required?: boolean | null
          start_time?: number | null
          test_id?: string | null
          updated_at?: string | null
          youtube_video_id?: string | null
        }
        Update: {
          created_at?: string | null
          display_order?: number
          end_time?: number | null
          id?: string
          media_title?: string | null
          media_type?: Database["public"]["Enums"]["media_type"] | null
          media_url?: string | null
          points?: number | null
          question_text?: string
          question_type?: Database["public"]["Enums"]["question_type"]
          required?: boolean | null
          start_time?: number | null
          test_id?: string | null
          updated_at?: string | null
          youtube_video_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "test_questions_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "glee_academy_tests"
            referencedColumns: ["id"]
          },
        ]
      }
      test_submissions: {
        Row: {
          attempt_number: number | null
          created_at: string | null
          id: string
          passed: boolean | null
          percentage: number | null
          started_at: string | null
          status: string | null
          student_id: string | null
          submitted_at: string | null
          test_id: string | null
          time_spent_minutes: number | null
          total_score: number | null
          updated_at: string | null
        }
        Insert: {
          attempt_number?: number | null
          created_at?: string | null
          id?: string
          passed?: boolean | null
          percentage?: number | null
          started_at?: string | null
          status?: string | null
          student_id?: string | null
          submitted_at?: string | null
          test_id?: string | null
          time_spent_minutes?: number | null
          total_score?: number | null
          updated_at?: string | null
        }
        Update: {
          attempt_number?: number | null
          created_at?: string | null
          id?: string
          passed?: boolean | null
          percentage?: number | null
          started_at?: string | null
          status?: string | null
          student_id?: string | null
          submitted_at?: string | null
          test_id?: string | null
          time_spent_minutes?: number | null
          total_score?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "test_submissions_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "glee_academy_tests"
            referencedColumns: ["id"]
          },
        ]
      }
      theory_poll_questions: {
        Row: {
          answer_index: number
          choices: Json
          created_at: string | null
          id: string
          is_active: boolean | null
          payload: Json
          session_id: string | null
          type: string
        }
        Insert: {
          answer_index: number
          choices: Json
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          payload: Json
          session_id?: string | null
          type: string
        }
        Update: {
          answer_index?: number
          choices?: Json
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          payload?: Json
          session_id?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "theory_poll_questions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "theory_poll_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      theory_poll_responses: {
        Row: {
          choice_index: number
          created_at: string | null
          id: number
          question_id: string | null
          user_id: string | null
        }
        Insert: {
          choice_index: number
          created_at?: string | null
          id?: number
          question_id?: string | null
          user_id?: string | null
        }
        Update: {
          choice_index?: number
          created_at?: string | null
          id?: number
          question_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "theory_poll_responses_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "theory_poll_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      theory_poll_sessions: {
        Row: {
          code: string
          created_at: string | null
          id: string
          owner_user_id: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          id?: string
          owner_user_id?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          id?: string
          owner_user_id?: string | null
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
      upload_jobs: {
        Row: {
          bucket: string
          created_at: string | null
          error: string | null
          file_name: string
          file_size: number | null
          id: string
          job_id: string
          status: string
          updated_at: string | null
          url: string | null
        }
        Insert: {
          bucket: string
          created_at?: string | null
          error?: string | null
          file_name: string
          file_size?: number | null
          id?: string
          job_id: string
          status: string
          updated_at?: string | null
          url?: string | null
        }
        Update: {
          bucket?: string
          created_at?: string | null
          error?: string | null
          file_name?: string
          file_size?: number | null
          id?: string
          job_id?: string
          status?: string
          updated_at?: string | null
          url?: string | null
        }
        Relationships: []
      }
      user_dashboard_categories: {
        Row: {
          category_id: string
          created_at: string | null
          display_order: number | null
          id: string
          is_collapsed: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          category_id: string
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_collapsed?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          category_id?: string
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_collapsed?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_dashboard_modules: {
        Row: {
          category: string
          created_at: string | null
          display_order: number | null
          id: string
          is_favorite: boolean | null
          is_pinned: boolean | null
          is_visible: boolean | null
          module_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          category: string
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_favorite?: boolean | null
          is_pinned?: boolean | null
          is_visible?: boolean | null
          module_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_favorite?: boolean | null
          is_pinned?: boolean | null
          is_visible?: boolean | null
          module_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_dashboard_preferences: {
        Row: {
          created_at: string | null
          id: string
          layout_config: Json | null
          theme_preferences: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          layout_config?: Json | null
          theme_preferences?: Json | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          layout_config?: Json | null
          theme_preferences?: Json | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_module_permissions: {
        Row: {
          created_at: string
          granted_at: string
          granted_by: string
          id: string
          is_active: boolean
          module_id: string
          notes: string | null
          revoked_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          granted_at?: string
          granted_by: string
          id?: string
          is_active?: boolean
          module_id: string
          notes?: string | null
          revoked_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          granted_at?: string
          granted_by?: string
          id?: string
          is_active?: boolean
          module_id?: string
          notes?: string | null
          revoked_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      user_permission_groups: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          expires_at: string | null
          group_id: string
          id: string
          is_active: boolean | null
          user_id: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          expires_at?: string | null
          group_id: string
          id?: string
          is_active?: boolean | null
          user_id: string
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          expires_at?: string | null
          group_id?: string
          id?: string
          is_active?: boolean | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_permission_groups_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "permission_groups"
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
      user_role_transitions: {
        Row: {
          changed_by: string | null
          created_at: string
          from_role: string | null
          id: string
          notes: string | null
          to_role: string
          transition_reason: string | null
          user_id: string
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          from_role?: string | null
          id?: string
          notes?: string | null
          to_role: string
          transition_reason?: string | null
          user_id: string
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          from_role?: string | null
          id?: string
          notes?: string | null
          to_role?: string
          transition_reason?: string | null
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
      user_roles_multi: {
        Row: {
          created_at: string | null
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          role: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      username_module_permissions: {
        Row: {
          can_manage: boolean
          can_view: boolean
          expires_at: string | null
          granted_at: string
          is_active: boolean
          module_id: string
          notes: string | null
          source: string
          user_id: string
        }
        Insert: {
          can_manage?: boolean
          can_view?: boolean
          expires_at?: string | null
          granted_at?: string
          is_active?: boolean
          module_id: string
          notes?: string | null
          source?: string
          user_id: string
        }
        Update: {
          can_manage?: boolean
          can_view?: boolean
          expires_at?: string | null
          granted_at?: string
          is_active?: boolean
          module_id?: string
          notes?: string | null
          source?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "username_module_permissions_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "gw_modules"
            referencedColumns: ["id"]
          },
        ]
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
      users: {
        Row: {
          created_at: string | null
          email: string
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          name?: string
          updated_at?: string | null
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
      audition_analytics: {
        Row: {
          academic_year: string | null
          application_date: string | null
          audition_time_slot: string | null
          avg_artistic_score: number | null
          avg_overall_score: number | null
          avg_technical_score: number | null
          email: string | null
          evaluation_count: number | null
          full_name: string | null
          gpa: number | null
          id: string | null
          major: string | null
          minor: string | null
          most_common_recommendation: string | null
          previous_choir_experience: string | null
          profile_image_url: string | null
          session_id: string | null
          session_name: string | null
          sight_reading_level: string | null
          status: string | null
          user_id: string | null
          voice_part_preference: string | null
          years_of_vocal_training: number | null
        }
        Relationships: [
          {
            foreignKeyName: "audition_applications_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "audition_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      direct_message_conversations: {
        Row: {
          conversation_id: string | null
          last_message: string | null
          last_message_at: string | null
          last_sender_id: string | null
          user1_id: string | null
          user2_id: string | null
        }
        Relationships: []
      }
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
      v_cohort_attendance: {
        Row: {
          attendance_id: string | null
          cohort_id: string | null
          cohort_name: string | null
          cohort_year: number | null
          event_id: string | null
          event_title: string | null
          recorded_at: string | null
          starts_at: string | null
          status: string | null
          user_id: string | null
          user_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attendance_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "gw_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "attendance_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_dashboard_data"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "cohort_members_cohort_id_fkey"
            columns: ["cohort_id"]
            isOneToOne: false
            referencedRelation: "cohorts"
            referencedColumns: ["id"]
          },
        ]
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
      approve_budget_step: {
        Args: {
          p_action?: string
          p_approver_role: string
          p_budget_id: string
          p_rejection_reason?: string
        }
        Returns: Json
      }
      block_date: {
        Args: { block_reason?: string; date_to_block: string }
        Returns: undefined
      }
      book_appointment: {
        Args: {
          p_appointment_date: string
          p_attendee_count?: number
          p_customer_email: string
          p_customer_name: string
          p_customer_phone?: string
          p_service_id: string
          p_special_requests?: string
          p_start_time: string
        }
        Returns: Json
      }
      bootstrap_initial_admin: {
        Args: { user_email_param: string }
        Returns: boolean
      }
      bulk_update_user_roles_secure: {
        Args: { new_role: string; performer_id: string; user_ids: string[] }
        Returns: Json
      }
      calculate_ai_likelihood_score: {
        Args: { p_submission_id: string }
        Returns: number
      }
      calculate_event_budget_totals: {
        Args: { event_id_param: string }
        Returns: undefined
      }
      calculate_mus240_grade_summary: {
        Args: { semester_param?: string; student_id_param: string }
        Returns: Json
      }
      calculate_semester_grade: {
        Args: { semester_name_param?: string; user_id_param: string }
        Returns: undefined
      }
      can_manage_appointments: { Args: never; Returns: boolean }
      can_view_auditioner_profiles: { Args: never; Returns: boolean }
      check_appointment_availability: {
        Args: {
          p_appointment_date: string
          p_duration_minutes: number
          p_service_id: string
          p_start_time: string
        }
        Returns: Json
      }
      check_executive_board_access: { Args: never; Returns: boolean }
      check_rate_limit:
        | {
            Args: {
              p_action_type: string
              p_max_requests?: number
              p_user_id: string
              p_window_minutes?: number
            }
            Returns: boolean
          }
        | {
            Args: {
              action_type_param: string
              identifier_param: string
              max_attempts?: number
              window_minutes?: number
            }
            Returns: boolean
          }
      check_rate_limit_secure: {
        Args: {
          action_type_param: string
          identifier_param: string
          max_attempts?: number
          window_minutes?: number
        }
        Returns: boolean
      }
      check_user_admin: { Args: never; Returns: boolean }
      check_user_admin_simple: { Args: never; Returns: boolean }
      check_user_exists_simple: { Args: never; Returns: boolean }
      check_vocal_health_alerts: {
        Args: { target_user_id: string }
        Returns: boolean
      }
      clean_admin_bootstrap: { Args: never; Returns: boolean }
      cleanup_expired_notifications: { Args: never; Returns: number }
      cleanup_old_rehearsals: { Args: never; Returns: number }
      cleanup_user_duplicate_buckets: { Args: never; Returns: Json }
      convert_auditioner_images_to_avatars: { Args: never; Returns: number }
      create_notification_with_delivery: {
        Args: {
          p_action_label?: string
          p_action_url?: string
          p_category?: string
          p_expires_at?: string
          p_message: string
          p_metadata?: Json
          p_priority?: number
          p_send_email?: boolean
          p_send_sms?: boolean
          p_title: string
          p_type?: string
          p_user_id: string
        }
        Returns: string
      }
      create_recurring_event_instances: {
        Args: {
          max_occurrences_param?: number
          parent_event_id_param: string
          recurrence_days_of_week_param?: number[]
          recurrence_end_date_param?: string
          recurrence_interval_param?: number
          recurrence_type_param: string
        }
        Returns: number
      }
      create_recurring_events: {
        Args: {
          p_created_by?: string
          p_description?: string
          p_end_date?: string
          p_end_time?: string
          p_event_type?: string
          p_location?: string
          p_max_occurrences?: number
          p_recurring_days?: string[]
          p_recurring_end_date?: string
          p_recurring_frequency?: string
          p_recurring_interval?: number
          p_start_date: string
          p_start_time?: string
          p_title: string
        }
        Returns: Json
      }
      create_recurring_rehearsals: {
        Args: { created_by_id?: string; end_date: string; start_date: string }
        Returns: number
      }
      create_secure_file_access: {
        Args: {
          p_access_type?: string
          p_bucket_id: string
          p_file_path: string
          p_user_id: string
        }
        Returns: boolean
      }
      create_task_notification: {
        Args: {
          message_param: string
          notification_type_param: string
          task_id_param: string
          user_id_param: string
        }
        Returns: string
      }
      current_user_can_access_admin_modules: { Args: never; Returns: boolean }
      current_user_has_executive_function_access: {
        Args: { function_name_param: string; permission_type_param?: string }
        Returns: boolean
      }
      current_user_is_admin: { Args: never; Returns: boolean }
      current_user_is_course_ta: {
        Args: { _course_code: string }
        Returns: boolean
      }
      debug_audition_permissions: { Args: never; Returns: Json }
      decrypt_square_token: {
        Args: { encrypted_token: string }
        Returns: string
      }
      delete_user_and_data: {
        Args: { target_user_id: string }
        Returns: boolean
      }
      emergency_admin_bootstrap: { Args: never; Returns: boolean }
      encrypt_square_token: { Args: { token: string }; Returns: string }
      generate_course_qr_code: {
        Args: {
          p_content: string
          p_course_code?: string
          p_expires_minutes?: number
          p_qr_type?: string
          p_title: string
        }
        Returns: string
      }
      generate_qr_attendance_token: {
        Args: {
          p_created_by: string
          p_event_id: string
          p_expires_in_minutes?: number
        }
        Returns: string
      }
      generate_qr_token: { Args: { event_id_param: string }; Returns: string }
      generate_secure_password: { Args: { length?: number }; Returns: string }
      generate_secure_qr_token: {
        Args: { event_id_param: string }
        Returns: string
      }
      generate_sheet_music_filename: {
        Args: {
          p_composer?: string
          p_title: string
          p_version?: number
          p_voice_part?: string
        }
        Returns: string
      }
      generate_sight_singing_share_token: { Args: never; Returns: string }
      get_accessible_sheet_music: {
        Args: { user_id_param: string }
        Returns: {
          can_access: boolean
          composer: string
          id: string
          is_public: boolean
          pdf_url: string
          title: string
        }[]
      }
      get_all_user_profiles: {
        Args: never
        Returns: {
          created_at: string
          email: string
          full_name: string
          id: string
          role: string
        }[]
      }
      get_assignment_max_points: {
        Args: { assignment_id_param: string }
        Returns: number
      }
      get_audition_application_count: { Args: never; Returns: number }
      get_audition_stats: { Args: never; Returns: Json }
      get_auditioner_images_for_conversion: {
        Args: never
        Returns: {
          email: string
          full_name: string
          source_image_url: string
          suggested_avatar_filename: string
          target_avatar_url: string
          user_id: string
        }[]
      }
      get_available_time_slots: {
        Args: { p_date: string; p_service_id: string }
        Returns: {
          available: boolean
          end_time: string
          start_time: string
        }[]
      }
      get_avatar_url: { Args: { user_id_param: string }; Returns: string }
      get_blocked_dates: {
        Args: never
        Returns: {
          blocked_date: string
          created_at: string
          created_by: string
          id: string
          reason: string
        }[]
      }
      get_booked_audition_slots:
        | {
            Args: { selected_date: string }
            Returns: {
              audition_time_slot: string
              auditioner_name: string
            }[]
          }
        | {
            Args: { p_end: string; p_start: string }
            Returns: {
              audition_time_slot: string
              auditioner_name: string
            }[]
          }
      get_cohort_summary_stats: {
        Args: { cohort_param: string }
        Returns: {
          active_voice_parts: string[]
          avg_attendance_rate: number
          last_event_date: string
          total_events: number
          total_students: number
        }[]
      }
      get_current_user_admin_status: { Args: never; Returns: boolean }
      get_current_user_email: { Args: never; Returns: string }
      get_current_user_profile_role: { Args: never; Returns: string }
      get_current_user_role: { Args: never; Returns: string }
      get_current_week_dates: {
        Args: never
        Returns: {
          week_end: string
          week_start: string
        }[]
      }
      get_graduation_decade: { Args: { grad_year: number }; Returns: string }
      get_legacy_assignment_info: {
        Args: { assignment_uuid: string }
        Returns: {
          legacy_id: string
          legacy_source: string
          original_table: string
        }[]
      }
      get_on_this_day_content: {
        Args: { target_date?: string }
        Returns: {
          category: string
          description: string
          id: string
          image_url: string
          title: string
          year_occurred: number
          years_ago: number
        }[]
      }
      get_poll_participation_stats: {
        Args: { poll_id_param: string }
        Returns: {
          points_awarded: number
          response_count: number
          student_email: string
          student_id: string
          student_name: string
        }[]
      }
      get_scheduled_auditions_count: { Args: never; Returns: number }
      get_track_like_count: { Args: { track_uuid: string }; Returns: number }
      get_upcoming_license_expirations: {
        Args: { days_ahead?: number }
        Returns: {
          days_until_expiry: number
          expires_on: string
          id: string
          license_type: string
          music_title: string
        }[]
      }
      get_user_admin_status:
        | { Args: { user_id_param: string }; Returns: Json }
        | { Args: never; Returns: boolean }
      get_user_executive_position: {
        Args: { user_id_param: string }
        Returns: Database["public"]["Enums"]["executive_position"]
      }
      get_user_fy_student_id: { Args: never; Returns: string }
      get_user_group_permissions: {
        Args: { user_id_param: string }
        Returns: {
          group_name: string
          permission_id: string
          permission_level: string
          permission_scope: string
        }[]
      }
      get_user_modules: {
        Args: { p_user: string }
        Returns: {
          can_edit: boolean
          can_manage: boolean
          can_view: boolean
          module_key: string
          module_name: string
        }[]
      }
      get_user_modules_combined: {
        Args: { user_id_param: string }
        Returns: {
          can_access: boolean
          can_manage: boolean
          module_name: string
          permissions: string[]
          sources: string[]
        }[]
      }
      get_user_role: { Args: never; Returns: string }
      get_user_username_permissions: {
        Args: { user_email_param: string }
        Returns: {
          expires_at: string
          granted_at: string
          module_name: string
          notes: string
        }[]
      }
      grant_exec_board_all_modules: { Args: never; Returns: Json }
      has_group_permission: {
        Args: {
          permission_id_param: string
          required_level?: string
          user_id_param: string
        }
        Returns: boolean
      }
      has_role:
        | { Args: { target: string }; Returns: boolean }
        | {
            Args: {
              _role: Database["public"]["Enums"]["app_role"]
              _user_id: string
            }
            Returns: boolean
          }
      has_username_permission: {
        Args: { module_name_param: string; user_email_param: string }
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
      increment_play_count: { Args: { track_uuid: string }; Returns: undefined }
      insert_performance_score: {
        Args: {
          p_categories: string
          p_comments: string
          p_evaluator_id: string
          p_event_type: string
          p_max_score: number
          p_overall_score: number
          p_percentage: number
          p_performer_id: string
          p_performer_name: string
          p_total_score: number
        }
        Returns: string
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_admin_or_librarian: { Args: { _user_id: string }; Returns: boolean }
      is_admin_user:
        | { Args: never; Returns: boolean }
        | { Args: { user_id: string }; Returns: boolean }
      is_alumnae_liaison: { Args: never; Returns: boolean }
      is_coordinator_for_cohort: {
        Args: { cohort_id_param: string }
        Returns: boolean
      }
      is_course_ta: {
        Args: { _course_code: string; _user_id: string }
        Returns: boolean
      }
      is_current_user_admin: { Args: never; Returns: boolean }
      is_current_user_admin_or_provider: {
        Args: { provider_user_id: string }
        Returns: boolean
      }
      is_current_user_admin_or_super_admin: { Args: never; Returns: boolean }
      is_current_user_admin_safe: { Args: never; Returns: boolean }
      is_current_user_gw_admin: { Args: never; Returns: boolean }
      is_current_user_gw_admin_safe: { Args: never; Returns: boolean }
      is_current_user_provider: {
        Args: { provider_user_id: string }
        Returns: boolean
      }
      is_current_user_super_admin_safe: { Args: never; Returns: boolean }
      is_current_user_tour_manager: { Args: never; Returns: boolean }
      is_current_user_treasurer: { Args: never; Returns: boolean }
      is_enrolled_in_mus240: {
        Args: { user_id_param?: string }
        Returns: boolean
      }
      is_executive_board_member: {
        Args: { user_id_param: string }
        Returns: boolean
      }
      is_executive_board_member_or_admin: { Args: never; Returns: boolean }
      is_executive_board_or_admin: { Args: never; Returns: boolean }
      is_fy_coordinator: { Args: never; Returns: boolean }
      is_fy_staff: { Args: never; Returns: boolean }
      is_gw_admin: { Args: never; Returns: boolean }
      is_gw_admin_safe: { Args: never; Returns: boolean }
      is_instructor_or_admin: { Args: { _uid: string }; Returns: boolean }
      is_mus240_student: { Args: { user_id_param: string }; Returns: boolean }
      is_super_admin:
        | { Args: never; Returns: boolean }
        | { Args: { _user_id: string }; Returns: boolean }
      is_user_admin: { Args: never; Returns: boolean }
      is_user_admin_or_super_admin: {
        Args: { user_id_param: string }
        Returns: boolean
      }
      is_user_executive_board_member: { Args: never; Returns: boolean }
      is_user_tour_manager: {
        Args: { user_id_param: string }
        Returns: boolean
      }
      is_wardrobe_manager: { Args: { user_id_param: string }; Returns: boolean }
      kpi_first_year_vs_overall: {
        Args: {
          cohort_param: string
          range_end_param: string
          range_start_param: string
        }
        Returns: {
          cohort_pct: number
          overall_pct: number
        }[]
      }
      kpi_first_year_weekly: {
        Args: {
          cohort_param: string
          week_end_param: string
          week_start_param: string
        }
        Returns: {
          absent: number
          attendance_pct: number
          excused: number
          late: number
          present: number
          total: number
        }[]
      }
      leave_mus240_group: {
        Args: { p_group_id: string; p_member_id: string }
        Returns: Json
      }
      log_activity: {
        Args: {
          p_action_type: string
          p_details?: Json
          p_ip_address?: unknown
          p_resource_id?: string
          p_resource_type: string
          p_user_agent?: string
          p_user_id: string
        }
        Returns: string
      }
      log_admin_action: {
        Args: {
          p_action_type: string
          p_details?: Json
          p_target_user_id: string
        }
        Returns: string
      }
      log_appointment_action: {
        Args: {
          p_action_type: string
          p_appointment_id: string
          p_new_values?: Json
          p_notes?: string
          p_old_values?: Json
          p_performed_by?: string
        }
        Returns: string
      }
      log_executive_board_action: {
        Args: {
          p_action_description: string
          p_action_type: string
          p_metadata?: Json
          p_related_entity_id?: string
          p_related_entity_type?: string
        }
        Returns: string
      }
      log_security_event: {
        Args: {
          p_action_type: string
          p_details?: Json
          p_ip_address?: unknown
          p_resource_id?: string
          p_resource_type: string
          p_user_agent?: string
        }
        Returns: string
      }
      log_sheet_music_action: {
        Args: {
          p_action_type: string
          p_device_type?: string
          p_page_number?: number
          p_session_duration?: number
          p_sheet_music_id: string
          p_user_id: string
        }
        Returns: string
      }
      log_sheet_music_analytics: {
        Args: {
          action_type_param: string
          device_type_param?: string
          page_number_param?: number
          session_duration_param?: number
          sheet_music_id_param: string
          user_id_param: string
        }
        Returns: string
      }
      mark_notification_read: {
        Args: { p_notification_id: string }
        Returns: boolean
      }
      process_qr_attendance_scan:
        | {
            Args: {
              ip_address_param?: unknown
              qr_token_param: string
              scan_location_param?: Json
              user_agent_param?: string
              user_id_param: string
            }
            Returns: Json
          }
        | {
            Args: {
              ip_address_param?: unknown
              qr_token_param: string
              scan_location_param?: string
              user_agent_param?: string
              user_id_param: string
            }
            Returns: Json
          }
      promote_auditioner_to_member: {
        Args: { audition_application_id: string; auditioner_user_id: string }
        Returns: boolean
      }
      recalc_mus240_group_member_count: {
        Args: { p_group_id: string }
        Returns: undefined
      }
      recalculate_missing_midterm_grades: {
        Args: never
        Returns: {
          calculated_grade: number
          question_count: number
          submission_id: string
        }[]
      }
      refresh_all_user_permissions: { Args: never; Returns: Json }
      require_security_confirmation: {
        Args: {
          operation_type: string
          performer_id: string
          target_resource: string
        }
        Returns: boolean
      }
      resolve_assignment_id: { Args: { identifier: string }; Returns: string }
      save_onboarding_signature: {
        Args: {
          p_full_name: string
          p_ip_address?: unknown
          p_onboarding_step?: string
          p_signature_data: string
          p_signature_type?: string
          p_user_agent?: string
        }
        Returns: string
      }
      search_hosts: {
        Args: {
          filter_source?: Database["public"]["Enums"]["host_source"]
          filter_state?: string
          filter_status?: Database["public"]["Enums"]["host_status"]
          limit_count?: number
          search_term?: string
        }
        Returns: {
          city: string
          contact_email: string
          contact_name: string
          contact_phone: string
          id: string
          last_contact_date: string
          organization_name: string
          priority_level: number
          source: Database["public"]["Enums"]["host_source"]
          state: string
          status: Database["public"]["Enums"]["host_status"]
          total_performances: number
        }[]
      }
      secure_bulk_update_user_roles: {
        Args: { new_role: string; reason?: string; target_user_ids: string[] }
        Returns: Json
      }
      secure_update_user_role: {
        Args: { new_role: string; reason?: string; target_user_id: string }
        Returns: boolean
      }
      send_appointment_notification: {
        Args: {
          p_appointment_id: string
          p_message: string
          p_phone_number: string
        }
        Returns: Json
      }
      share_study_score: {
        Args: {
          p_collaborator_email: string
          p_role?: string
          p_study_score_id: string
        }
        Returns: Json
      }
      simple_admin_bootstrap: { Args: never; Returns: undefined }
      submit_budget_for_approval: {
        Args: { p_budget_id: string }
        Returns: Json
      }
      sync_auditioner_names_from_applications: { Args: never; Returns: number }
      toggle_love_message_like: {
        Args: { message_id_param: string }
        Returns: Json
      }
      transition_auditioner_to_member: {
        Args: { applicant_user_id: string; performed_by?: string }
        Returns: boolean
      }
      transition_user_role: {
        Args: {
          admin_notes?: string
          new_role: string
          reason?: string
          target_user_id: string
        }
        Returns: boolean
      }
      trigger_scholarship_update: { Args: never; Returns: string }
      unblock_date: { Args: { block_id: string }; Returns: undefined }
      update_audition_status_with_logging: {
        Args: {
          p_audition_id: string
          p_new_status: string
          p_notes?: string
          p_updated_by: string
        }
        Returns: Json
      }
      update_google_sheets_scope: { Args: never; Returns: boolean }
      update_mus240_member_role: {
        Args: {
          p_group_id: string
          p_member_id: string
          p_new_role: string
          p_requester_id: string
        }
        Returns: Json
      }
      update_mus240_student_roles: {
        Args: never
        Returns: {
          new_role: string
          old_role: string
          user_id: string
        }[]
      }
      update_user_role: {
        Args: { new_role: string; user_id: string }
        Returns: boolean
      }
      upload_service_image: {
        Args: {
          p_description?: string
          p_file_path: string
          p_file_size: number
          p_filename: string
          p_mime_type: string
          p_original_filename: string
        }
        Returns: Json
      }
      user_can_access_contract: {
        Args: { contract_id_param: string }
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
      user_can_manage_class_list_members: {
        Args: { class_list_id_param: string }
        Returns: boolean
      }
      user_can_view_budget: {
        Args: { budget_id_param: string; created_by_param: string }
        Returns: boolean
      }
      user_can_view_class_list: {
        Args: { class_list_id_param: string }
        Returns: boolean
      }
      user_cohort_match: { Args: { cohort_id_param: string }; Returns: boolean }
      user_has_admin_role: { Args: { user_id_param: string }; Returns: boolean }
      user_has_alumnae_liaison_role: {
        Args: { user_id_param: string }
        Returns: boolean
      }
      user_has_budget_permission: {
        Args: { budget_id_param: string; permission_type_param: string }
        Returns: boolean
      }
      user_has_executive_function_access: {
        Args: {
          function_name_param: string
          permission_type_param?: string
          user_id_param: string
        }
        Returns: boolean
      }
      user_has_function_permission: {
        Args: {
          function_name_param: string
          permission_type?: string
          user_id_param: string
        }
        Returns: boolean
      }
      user_has_librarian_role: {
        Args: { user_id_param: string }
        Returns: boolean
      }
      user_has_module_assignment: {
        Args: { p_module_name: string; p_user_id: string }
        Returns: boolean
      }
      user_has_module_permission: {
        Args: { module_name_param: string; permission_type_param?: string }
        Returns: boolean
      }
      user_has_pr_coordinator_role: {
        Args: { user_id_param: string }
        Returns: boolean
      }
      user_has_secretary_role: {
        Args: { user_id_param: string }
        Returns: boolean
      }
      user_has_super_admin_role: {
        Args: { user_id_param: string }
        Returns: boolean
      }
      user_has_username_permission: {
        Args: { module_name_param: string; user_email_param: string }
        Returns: boolean
      }
      user_is_admin: { Args: never; Returns: boolean }
      user_is_group_member: { Args: { group_id: string }; Returns: boolean }
      user_owns_study_score: {
        Args: { study_score_id: string }
        Returns: boolean
      }
      validate_password_strength: {
        Args: { password_text: string }
        Returns: Json
      }
      validate_secure_file_access: {
        Args: {
          access_type?: string
          bucket_name: string
          file_path_param: string
          user_id_param: string
        }
        Returns: boolean
      }
      validate_signature_data: {
        Args: { signature_data: string }
        Returns: boolean
      }
      verify_admin_access: { Args: { user_id_param: string }; Returns: boolean }
    }
    Enums: {
      app_role:
        | "admin"
        | "user"
        | "super-admin"
        | "auditioner"
        | "student"
        | "librarian"
        | "alumna"
        | "vip"
      assignment_status:
        | "assigned"
        | "in_progress"
        | "submitted"
        | "graded"
        | "overdue"
      assignment_type:
        | "sight_reading"
        | "practice_exercise"
        | "section_notes"
        | "pdf_resource"
        | "audio_resource"
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
        | "pr_manager"
        | "chief_of_staff"
        | "alumnae_liaison"
        | "choreographer"
      feedback_category_enum:
        | "Vocal Blend"
        | "Rhythmic Precision"
        | "Diction"
        | "Posture"
        | "Energy"
      grading_period:
        | "week_1"
        | "week_2"
        | "week_3"
        | "week_4"
        | "week_5"
        | "week_6"
        | "week_7"
        | "week_8"
        | "week_9"
        | "week_10"
        | "week_11"
        | "week_12"
        | "week_13"
      host_source: "booking_request" | "contract" | "manual_entry"
      host_status: "active" | "inactive" | "potential" | "blacklisted"
      hydration_level_enum: "Low" | "Normal" | "High"
      media_type: "audio" | "video" | "image" | "pdf" | "youtube" | "slide"
      mus240_project_role:
        | "research_lead"
        | "content_developer"
        | "technical_lead"
        | "project_manager"
        | "researcher_analyst"
        | "writer_editor"
        | "designer_developer"
        | "coordinator_presenter"
      payment_method_enum: "zelle" | "cashapp" | "venmo" | "apple_pay" | "check"
      performer_status: "draft" | "submitted" | "approved"
      question_type:
        | "multiple_choice"
        | "true_false"
        | "short_answer"
        | "essay"
        | "audio_listening"
        | "video_watching"
        | "file_upload"
      review_type_enum:
        | "Self Assessment"
        | "Section Leader Review"
        | "Admin Review"
        | "Peer Review"
      user_role_enum:
        | "visitor"
        | "fan"
        | "auditioner"
        | "alumna"
        | "member"
        | "admin"
        | "super-admin"
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
      app_role: [
        "admin",
        "user",
        "super-admin",
        "auditioner",
        "student",
        "librarian",
        "alumna",
        "vip",
      ],
      assignment_status: [
        "assigned",
        "in_progress",
        "submitted",
        "graded",
        "overdue",
      ],
      assignment_type: [
        "sight_reading",
        "practice_exercise",
        "section_notes",
        "pdf_resource",
        "audio_resource",
      ],
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
        "pr_manager",
        "chief_of_staff",
        "alumnae_liaison",
        "choreographer",
      ],
      feedback_category_enum: [
        "Vocal Blend",
        "Rhythmic Precision",
        "Diction",
        "Posture",
        "Energy",
      ],
      grading_period: [
        "week_1",
        "week_2",
        "week_3",
        "week_4",
        "week_5",
        "week_6",
        "week_7",
        "week_8",
        "week_9",
        "week_10",
        "week_11",
        "week_12",
        "week_13",
      ],
      host_source: ["booking_request", "contract", "manual_entry"],
      host_status: ["active", "inactive", "potential", "blacklisted"],
      hydration_level_enum: ["Low", "Normal", "High"],
      media_type: ["audio", "video", "image", "pdf", "youtube", "slide"],
      mus240_project_role: [
        "research_lead",
        "content_developer",
        "technical_lead",
        "project_manager",
        "researcher_analyst",
        "writer_editor",
        "designer_developer",
        "coordinator_presenter",
      ],
      payment_method_enum: ["zelle", "cashapp", "venmo", "apple_pay", "check"],
      performer_status: ["draft", "submitted", "approved"],
      question_type: [
        "multiple_choice",
        "true_false",
        "short_answer",
        "essay",
        "audio_listening",
        "video_watching",
        "file_upload",
      ],
      review_type_enum: [
        "Self Assessment",
        "Section Leader Review",
        "Admin Review",
        "Peer Review",
      ],
      user_role_enum: [
        "visitor",
        "fan",
        "auditioner",
        "alumna",
        "member",
        "admin",
        "super-admin",
      ],
      vocal_status_enum: ["Healthy", "Fatigued", "Sore", "Injured"],
      voice_part_enum: ["S1", "S2", "A1", "A2", "T1", "T2", "B1", "B2"],
    },
  },
} as const
