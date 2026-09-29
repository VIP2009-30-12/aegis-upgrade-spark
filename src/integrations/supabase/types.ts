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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      check_ins: {
        Row: {
          at: string
          id: string
          user_id: string
          walk_id: string
        }
        Insert: {
          at?: string
          id: string
          user_id?: string
          walk_id: string
        }
        Update: {
          at?: string
          id?: string
          user_id?: string
          walk_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "check_ins_walk_id_fkey"
            columns: ["walk_id"]
            isOneToOne: false
            referencedRelation: "walks"
            referencedColumns: ["id"]
          },
        ]
      }
      circle_members: {
        Row: {
          accepted_at: string | null
          created_at: string
          expires_at: string
          id: string
          member_id: string | null
          name: string
          owner_id: string
          perm_alerts: boolean
          perm_checkins: boolean
          perm_location: boolean
          perm_walk: boolean
          relationship: string
          status: string
          token_hash: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          member_id?: string | null
          name: string
          owner_id?: string
          perm_alerts?: boolean
          perm_checkins?: boolean
          perm_location?: boolean
          perm_walk?: boolean
          relationship?: string
          status?: string
          token_hash: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          member_id?: string | null
          name?: string
          owner_id?: string
          perm_alerts?: boolean
          perm_checkins?: boolean
          perm_location?: boolean
          perm_walk?: boolean
          relationship?: string
          status?: string
          token_hash?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      walk_alerts: {
        Row: {
          acknowledged_at: string | null
          created_at: string
          due_at: string
          id: string
          kind: string
          member_id: string
          status: string
          user_id: string
          walk_id: string
        }
        Insert: {
          acknowledged_at?: string | null
          created_at?: string
          due_at: string
          id?: string
          kind?: string
          member_id: string
          status?: string
          user_id: string
          walk_id: string
        }
        Update: {
          acknowledged_at?: string | null
          created_at?: string
          due_at?: string
          id?: string
          kind?: string
          member_id?: string
          status?: string
          user_id?: string
          walk_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "walk_alerts_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "circle_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "walk_alerts_walk_id_fkey"
            columns: ["walk_id"]
            isOneToOne: false
            referencedRelation: "walks"
            referencedColumns: ["id"]
          },
        ]
      }
      walks: {
        Row: {
          created_at: string
          destination: string | null
          ended_at: string | null
          escalated_for: string | null
          eta: string | null
          grace_min: number
          id: string
          interval_min: number | null
          last_checkin_at: string | null
          loc_acc: number | null
          loc_at: string | null
          loc_lat: number | null
          loc_lng: number | null
          next_checkin_at: string | null
          share_location: boolean
          started_at: string
          status: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          destination?: string | null
          ended_at?: string | null
          escalated_for?: string | null
          eta?: string | null
          grace_min?: number
          id: string
          interval_min?: number | null
          last_checkin_at?: string | null
          loc_acc?: number | null
          loc_at?: string | null
          loc_lat?: number | null
          loc_lng?: number | null
          next_checkin_at?: string | null
          share_location?: boolean
          started_at?: string
          status?: string
          type: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          destination?: string | null
          ended_at?: string | null
          escalated_for?: string | null
          eta?: string | null
          grace_min?: number
          id?: string
          interval_min?: number | null
          last_checkin_at?: string | null
          loc_acc?: number | null
          loc_at?: string | null
          loc_lat?: number | null
          loc_lng?: number | null
          next_checkin_at?: string | null
          share_location?: boolean
          started_at?: string
          status?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_invite: { Args: { p_token: string }; Returns: Json }
      ack_alert: { Args: { p_id: string }; Returns: boolean }
      escalate_overdue: { Args: never; Returns: number }
      guardian_overview: { Args: never; Returns: Json }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      leave_circle: { Args: { p_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
    Enums: {
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
