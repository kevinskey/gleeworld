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
      contract_templates: {
        Row: {
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
      events: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          end_date: string | null
          event_type: string
          id: string
          location: string | null
          send_contracts: boolean
          start_date: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          end_date?: string | null
          event_type?: string
          id?: string
          location?: string | null
          send_contracts?: boolean
          start_date: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          end_date?: string | null
          event_type?: string
          id?: string
          location?: string | null
          send_contracts?: boolean
          start_date?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
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
      profiles: {
        Row: {
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          role: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          role?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          role?: string | null
          updated_at?: string | null
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
    }
    Views: {
      [_ in never]: never
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
      has_role: {
        Args: {
          _user_id: string
          _role: Database["public"]["Enums"]["app_role"]
        }
        Returns: boolean
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
      update_user_role: {
        Args: { user_id: string; new_role: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user" | "super-admin"
      performer_status: "draft" | "submitted" | "approved"
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
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
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
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
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
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
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
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user", "super-admin"],
      performer_status: ["draft", "submitted", "approved"],
    },
  },
} as const
