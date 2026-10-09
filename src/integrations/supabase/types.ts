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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      activity_log: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          entity_id: string | null
          household_id: string | null
          id: string
          meta: Json
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          household_id?: string | null
          id?: string
          meta?: Json
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          household_id?: string | null
          id?: string
          meta?: Json
        }
        Relationships: [
          {
            foreignKeyName: "activity_log_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      chore_completions: {
        Row: {
          chore_id: string
          created_at: string
          household_id: string
          id: string
          points: number
          review_note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          started_at: string
          status: string
          submitted_at: string | null
          timer_seconds: number
          user_id: string
        }
        Insert: {
          chore_id: string
          created_at?: string
          household_id: string
          id?: string
          points: number
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          started_at?: string
          status?: string
          submitted_at?: string | null
          timer_seconds: number
          user_id: string
        }
        Update: {
          chore_id?: string
          created_at?: string
          household_id?: string
          id?: string
          points?: number
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          started_at?: string
          status?: string
          submitted_at?: string | null
          timer_seconds?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chore_completions_chore_id_fkey"
            columns: ["chore_id"]
            isOneToOne: false
            referencedRelation: "chores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chore_completions_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      chores: {
        Row: {
          assigned_to: string | null
          category: string | null
          created_at: string
          created_by: string
          description: string
          difficulty: string | null
          due_date: string | null
          household_id: string
          id: string
          points: number
          recurrence: string | null
          status: string
          title: string
          updated_at: string
          verification_method: string
        }
        Insert: {
          assigned_to?: string | null
          category?: string | null
          created_at?: string
          created_by: string
          description?: string
          difficulty?: string | null
          due_date?: string | null
          household_id: string
          id?: string
          points: number
          recurrence?: string | null
          status?: string
          title: string
          updated_at?: string
          verification_method?: string
        }
        Update: {
          assigned_to?: string | null
          category?: string | null
          created_at?: string
          created_by?: string
          description?: string
          difficulty?: string | null
          due_date?: string | null
          household_id?: string
          id?: string
          points?: number
          recurrence?: string | null
          status?: string
          title?: string
          updated_at?: string
          verification_method?: string
        }
        Relationships: [
          {
            foreignKeyName: "chores_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      household_members: {
        Row: {
          household_id: string
          joined_at: string
          user_id: string
        }
        Insert: {
          household_id: string
          joined_at?: string
          user_id: string
        }
        Update: {
          household_id?: string
          joined_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "household_members_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      households: {
        Row: {
          created_at: string
          created_by: string
          id: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          household_id: string | null
          id: string
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string
          created_at?: string
          household_id?: string | null
          id?: string
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          household_id?: string | null
          id?: string
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_invitations: {
        Row: {
          created_at: string
          expires_at: string
          household_id: string
          id: string
          inviter_id: string
          revoked_at: string | null
          token_hash: string
          used_at: string | null
          used_by: string | null
        }
        Insert: {
          created_at?: string
          expires_at: string
          household_id: string
          id?: string
          inviter_id: string
          revoked_at?: string | null
          token_hash: string
          used_at?: string | null
          used_by?: string | null
        }
        Update: {
          created_at?: string
          expires_at?: string
          household_id?: string
          id?: string
          inviter_id?: string
          revoked_at?: string | null
          token_hash?: string
          used_at?: string | null
          used_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partner_invitations_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      point_transactions: {
        Row: {
          amount: number
          created_at: string
          description: string
          household_id: string
          id: string
          kind: string
          reference: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description: string
          household_id: string
          id?: string
          kind: string
          reference: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string
          household_id?: string
          id?: string
          kind?: string
          reference?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "point_transactions_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string
          gender: string
          id: string
          notify_prefs: Json
          updated_at: string
          video_verification_default: boolean
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name: string
          gender?: string
          id: string
          notify_prefs?: Json
          updated_at?: string
          video_verification_default?: boolean
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string
          gender?: string
          id?: string
          notify_prefs?: Json
          updated_at?: string
          video_verification_default?: boolean
        }
        Relationships: []
      }
      reward_redemptions: {
        Row: {
          completed_at: string | null
          cost: number
          created_at: string
          household_id: string
          id: string
          requester_id: string
          responded_at: string | null
          responded_by: string | null
          response_note: string | null
          reward_id: string | null
          reward_title: string
          status: string
        }
        Insert: {
          completed_at?: string | null
          cost: number
          created_at?: string
          household_id: string
          id?: string
          requester_id: string
          responded_at?: string | null
          responded_by?: string | null
          response_note?: string | null
          reward_id?: string | null
          reward_title: string
          status?: string
        }
        Update: {
          completed_at?: string | null
          cost?: number
          created_at?: string
          household_id?: string
          id?: string
          requester_id?: string
          responded_at?: string | null
          responded_by?: string | null
          response_note?: string | null
          reward_id?: string | null
          reward_title?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "reward_redemptions_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reward_redemptions_reward_id_fkey"
            columns: ["reward_id"]
            isOneToOne: false
            referencedRelation: "rewards"
            referencedColumns: ["id"]
          },
        ]
      }
      rewards: {
        Row: {
          active: boolean
          cost: number
          created_at: string
          created_by: string
          description: string
          duration_minutes: number | null
          household_id: string
          icon: string
          id: string
          notes: string | null
          title: string
        }
        Insert: {
          active?: boolean
          cost: number
          created_at?: string
          created_by: string
          description?: string
          duration_minutes?: number | null
          household_id: string
          icon?: string
          id?: string
          notes?: string | null
          title: string
        }
        Update: {
          active?: boolean
          cost?: number
          created_at?: string
          created_by?: string
          description?: string
          duration_minutes?: number | null
          household_id?: string
          icon?: string
          id?: string
          notes?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "rewards_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      terms_acceptance: {
        Row: {
          accepted_at: string
          id: string
          privacy_version: string
          terms_version: string
          user_id: string
        }
        Insert: {
          accepted_at?: string
          id?: string
          privacy_version: string
          terms_version: string
          user_id: string
        }
        Update: {
          accepted_at?: string
          id?: string
          privacy_version?: string
          terms_version?: string
          user_id?: string
        }
        Relationships: []
      }
      verification_media: {
        Row: {
          completion_id: string
          created_at: string
          household_id: string
          id: string
          kind: string
          phase: string
          storage_path: string
          uploaded_by: string
        }
        Insert: {
          completion_id: string
          created_at?: string
          household_id: string
          id?: string
          kind: string
          phase: string
          storage_path: string
          uploaded_by: string
        }
        Update: {
          completion_id?: string
          created_at?: string
          household_id?: string
          id?: string
          kind?: string
          phase?: string
          storage_path?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "verification_media_completion_id_fkey"
            columns: ["completion_id"]
            isOneToOne: false
            referencedRelation: "chore_completions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "verification_media_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      _award_chore: {
        Args: {
          _title: string
          cc: Database["public"]["Tables"]["chore_completions"]["Row"]
        }
        Returns: undefined
      }
      _log: {
        Args: { _action: string; _entity: string; _hid: string; _meta?: Json }
        Returns: undefined
      }
      _name: { Args: { _uid: string }; Returns: string }
      _notify: {
        Args: {
          _body: string
          _hid: string
          _title: string
          _type: string
          _user: string
        }
        Returns: undefined
      }
      _partner_of: { Args: { _uid: string }; Returns: string }
      accept_invitation: { Args: { _token: string }; Returns: string }
      accept_terms: {
        Args: { _privacy: string; _terms: string }
        Returns: undefined
      }
      balance_of: { Args: { _uid: string }; Returns: number }
      cancel_chore: { Args: { _completion: string }; Returns: undefined }
      cancel_redemption: { Args: { _id: string }; Returns: undefined }
      complete_redemption: { Args: { _id: string }; Returns: undefined }
      create_invitation: { Args: never; Returns: Json }
      disconnect_partner: { Args: never; Returns: undefined }
      ensure_household: { Args: never; Returns: string }
      is_household_member: { Args: { _hid: string }; Returns: boolean }
      my_household_id: { Args: never; Returns: string }
      preview_invitation: { Args: { _token: string }; Returns: Json }
      request_reward: { Args: { _reward: string }; Returns: string }
      respond_redemption: {
        Args: { _accept: boolean; _id: string; _note?: string }
        Returns: undefined
      }
      review_chore: {
        Args: { _approve: boolean; _completion: string; _note?: string }
        Returns: undefined
      }
      seed_household: {
        Args: { _hid: string; _uid: string }
        Returns: undefined
      }
      start_chore: {
        Args: { _chore: string; _seconds: number }
        Returns: string
      }
      submit_chore: { Args: { _completion: string }; Returns: string }
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
