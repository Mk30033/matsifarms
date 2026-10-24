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
          created_at: string
          entity: string
          id: string
          summary: string
          user_id: string
        }
        Insert: {
          created_at?: string
          entity: string
          id?: string
          summary: string
          user_id: string
        }
        Update: {
          created_at?: string
          entity?: string
          id?: string
          summary?: string
          user_id?: string
        }
        Relationships: []
      }
      cages: {
        Row: {
          id: string
          label: string
          pen_id: string
          user_id: string
        }
        Insert: {
          id?: string
          label: string
          pen_id: string
          user_id?: string
        }
        Update: {
          id?: string
          label?: string
          pen_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cages_pen_id_fkey"
            columns: ["pen_id"]
            isOneToOne: false
            referencedRelation: "pens"
            referencedColumns: ["id"]
          },
        ]
      }
      egg_collections: {
        Row: {
          cage_id: string
          cracked: number
          date: string
          good: number
          id: string
          pen_id: string
          rejected: number
          session: string
          session_id: string
          tier_id: string
          user_id: string
        }
        Insert: {
          cage_id: string
          cracked?: number
          date: string
          good?: number
          id?: string
          pen_id: string
          rejected?: number
          session: string
          session_id: string
          tier_id: string
          user_id?: string
        }
        Update: {
          cage_id?: string
          cracked?: number
          date?: string
          good?: number
          id?: string
          pen_id?: string
          rejected?: number
          session?: string
          session_id?: string
          tier_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "egg_collections_cage_id_fkey"
            columns: ["cage_id"]
            isOneToOne: false
            referencedRelation: "cages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "egg_collections_pen_id_fkey"
            columns: ["pen_id"]
            isOneToOne: false
            referencedRelation: "pens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "egg_collections_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "egg_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "egg_collections_tier_id_fkey"
            columns: ["tier_id"]
            isOneToOne: false
            referencedRelation: "tiers"
            referencedColumns: ["id"]
          },
        ]
      }
      egg_sessions: {
        Row: {
          crates: number | null
          created_at: string
          date: string
          flock_id: string | null
          id: string
          notes: string | null
          pen_id: string
          session: string
          user_id: string
        }
        Insert: {
          crates?: number | null
          created_at?: string
          date?: string
          flock_id?: string | null
          id?: string
          notes?: string | null
          pen_id: string
          session: string
          user_id?: string
        }
        Update: {
          crates?: number | null
          created_at?: string
          date?: string
          flock_id?: string | null
          id?: string
          notes?: string | null
          pen_id?: string
          session?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "egg_sessions_flock_id_fkey"
            columns: ["flock_id"]
            isOneToOne: false
            referencedRelation: "flocks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "egg_sessions_pen_id_fkey"
            columns: ["pen_id"]
            isOneToOne: false
            referencedRelation: "pens"
            referencedColumns: ["id"]
          },
        ]
      }
      farm_settings: {
        Row: {
          created_at: string
          low_feed_threshold_kg: number
          seeded: boolean
          user_id: string
        }
        Insert: {
          created_at?: string
          low_feed_threshold_kg?: number
          seeded?: boolean
          user_id?: string
        }
        Update: {
          created_at?: string
          low_feed_threshold_kg?: number
          seeded?: boolean
          user_id?: string
        }
        Relationships: []
      }
      feed_stock: {
        Row: {
          bags: number
          cost_per_bag: number
          created_at: string
          date_received: string
          feed_type: string
          id: string
          kg_per_bag: number
          supplier: string | null
          user_id: string
        }
        Insert: {
          bags?: number
          cost_per_bag?: number
          created_at?: string
          date_received?: string
          feed_type: string
          id?: string
          kg_per_bag?: number
          supplier?: string | null
          user_id?: string
        }
        Update: {
          bags?: number
          cost_per_bag?: number
          created_at?: string
          date_received?: string
          feed_type?: string
          id?: string
          kg_per_bag?: number
          supplier?: string | null
          user_id?: string
        }
        Relationships: []
      }
      feed_usage: {
        Row: {
          created_at: string
          date: string
          feed_type: string
          flock_id: string | null
          id: string
          kg: number
          pen_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          date?: string
          feed_type: string
          flock_id?: string | null
          id?: string
          kg: number
          pen_id?: string | null
          user_id?: string
        }
        Update: {
          created_at?: string
          date?: string
          feed_type?: string
          flock_id?: string | null
          id?: string
          kg?: number
          pen_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feed_usage_flock_id_fkey"
            columns: ["flock_id"]
            isOneToOne: false
            referencedRelation: "flocks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feed_usage_pen_id_fkey"
            columns: ["pen_id"]
            isOneToOne: false
            referencedRelation: "pens"
            referencedColumns: ["id"]
          },
        ]
      }
      flocks: {
        Row: {
          age_at_placement_days: number
          breed: string | null
          created_at: string
          current_count: number
          date_placed: string
          hatchery: string | null
          id: string
          is_sample: boolean
          name: string
          pen_id: string | null
          starting_count: number
          tier_ids: string[]
          user_id: string
        }
        Insert: {
          age_at_placement_days?: number
          breed?: string | null
          created_at?: string
          current_count?: number
          date_placed?: string
          hatchery?: string | null
          id?: string
          is_sample?: boolean
          name: string
          pen_id?: string | null
          starting_count?: number
          tier_ids?: string[]
          user_id?: string
        }
        Update: {
          age_at_placement_days?: number
          breed?: string | null
          created_at?: string
          current_count?: number
          date_placed?: string
          hatchery?: string | null
          id?: string
          is_sample?: boolean
          name?: string
          pen_id?: string | null
          starting_count?: number
          tier_ids?: string[]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "flocks_pen_id_fkey"
            columns: ["pen_id"]
            isOneToOne: false
            referencedRelation: "pens"
            referencedColumns: ["id"]
          },
        ]
      }
      mortality_logs: {
        Row: {
          cause: string | null
          count: number
          created_at: string
          date: string
          flock_id: string
          id: string
          kind: string
          pen_id: string | null
          tier_id: string | null
          user_id: string
        }
        Insert: {
          cause?: string | null
          count: number
          created_at?: string
          date?: string
          flock_id: string
          id?: string
          kind?: string
          pen_id?: string | null
          tier_id?: string | null
          user_id?: string
        }
        Update: {
          cause?: string | null
          count?: number
          created_at?: string
          date?: string
          flock_id?: string
          id?: string
          kind?: string
          pen_id?: string | null
          tier_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mortality_logs_flock_id_fkey"
            columns: ["flock_id"]
            isOneToOne: false
            referencedRelation: "flocks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mortality_logs_pen_id_fkey"
            columns: ["pen_id"]
            isOneToOne: false
            referencedRelation: "pens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mortality_logs_tier_id_fkey"
            columns: ["tier_id"]
            isOneToOne: false
            referencedRelation: "tiers"
            referencedColumns: ["id"]
          },
        ]
      }
      pens: {
        Row: {
          created_at: string
          id: string
          is_sample: boolean
          name: string
          sort_order: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_sample?: boolean
          name: string
          sort_order?: number
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_sample?: boolean
          name?: string
          sort_order?: number
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          id: string
          user_id: string
          username: string
        }
        Insert: {
          created_at?: string
          id?: string
          user_id: string
          username: string
        }
        Update: {
          created_at?: string
          id?: string
          user_id?: string
          username?: string
        }
        Relationships: []
      }
      tiers: {
        Row: {
          bird_count: number
          cage_id: string
          id: string
          level: string
          pen_id: string
          user_id: string
        }
        Insert: {
          bird_count?: number
          cage_id: string
          id?: string
          level: string
          pen_id: string
          user_id?: string
        }
        Update: {
          bird_count?: number
          cage_id?: string
          id?: string
          level?: string
          pen_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tiers_cage_id_fkey"
            columns: ["cage_id"]
            isOneToOne: false
            referencedRelation: "cages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tiers_pen_id_fkey"
            columns: ["pen_id"]
            isOneToOne: false
            referencedRelation: "pens"
            referencedColumns: ["id"]
          },
        ]
      }
      treatments: {
        Row: {
          created_at: string
          dosage: string | null
          drug: string
          end_date: string | null
          flock_id: string | null
          id: string
          pen_id: string | null
          reason: string | null
          start_date: string
          user_id: string
          withdrawal_days: number | null
        }
        Insert: {
          created_at?: string
          dosage?: string | null
          drug: string
          end_date?: string | null
          flock_id?: string | null
          id?: string
          pen_id?: string | null
          reason?: string | null
          start_date?: string
          user_id?: string
          withdrawal_days?: number | null
        }
        Update: {
          created_at?: string
          dosage?: string | null
          drug?: string
          end_date?: string | null
          flock_id?: string | null
          id?: string
          pen_id?: string | null
          reason?: string | null
          start_date?: string
          user_id?: string
          withdrawal_days?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "treatments_flock_id_fkey"
            columns: ["flock_id"]
            isOneToOne: false
            referencedRelation: "flocks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatments_pen_id_fkey"
            columns: ["pen_id"]
            isOneToOne: false
            referencedRelation: "pens"
            referencedColumns: ["id"]
          },
        ]
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
      vaccination_records: {
        Row: {
          administered_by: string | null
          batch_number: string | null
          created_at: string
          date_given: string
          dosage: string | null
          flock_id: string
          id: string
          route: string | null
          schedule_id: string | null
          user_id: string
          vaccine_name: string
        }
        Insert: {
          administered_by?: string | null
          batch_number?: string | null
          created_at?: string
          date_given?: string
          dosage?: string | null
          flock_id: string
          id?: string
          route?: string | null
          schedule_id?: string | null
          user_id?: string
          vaccine_name: string
        }
        Update: {
          administered_by?: string | null
          batch_number?: string | null
          created_at?: string
          date_given?: string
          dosage?: string | null
          flock_id?: string
          id?: string
          route?: string | null
          schedule_id?: string | null
          user_id?: string
          vaccine_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "vaccination_records_flock_id_fkey"
            columns: ["flock_id"]
            isOneToOne: false
            referencedRelation: "flocks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vaccination_records_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "vaccination_schedule"
            referencedColumns: ["id"]
          },
        ]
      }
      vaccination_schedule: {
        Row: {
          age_days: number | null
          dosage: string | null
          due_date: string
          flock_id: string
          id: string
          notes: string | null
          route: string | null
          user_id: string
          vaccine_name: string
        }
        Insert: {
          age_days?: number | null
          dosage?: string | null
          due_date: string
          flock_id: string
          id?: string
          notes?: string | null
          route?: string | null
          user_id?: string
          vaccine_name: string
        }
        Update: {
          age_days?: number | null
          dosage?: string | null
          due_date?: string
          flock_id?: string
          id?: string
          notes?: string | null
          route?: string | null
          user_id?: string
          vaccine_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "vaccination_schedule_flock_id_fkey"
            columns: ["flock_id"]
            isOneToOne: false
            referencedRelation: "flocks"
            referencedColumns: ["id"]
          },
        ]
      }
      vet_visits: {
        Row: {
          cost: number | null
          created_at: string
          date: string
          diagnosis: string | null
          flock_id: string | null
          id: string
          notes: string | null
          user_id: string
          vet_name: string | null
        }
        Insert: {
          cost?: number | null
          created_at?: string
          date?: string
          diagnosis?: string | null
          flock_id?: string | null
          id?: string
          notes?: string | null
          user_id?: string
          vet_name?: string | null
        }
        Update: {
          cost?: number | null
          created_at?: string
          date?: string
          diagnosis?: string | null
          flock_id?: string | null
          id?: string
          notes?: string | null
          user_id?: string
          vet_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vet_visits_flock_id_fkey"
            columns: ["flock_id"]
            isOneToOne: false
            referencedRelation: "flocks"
            referencedColumns: ["id"]
          },
        ]
      }
      weight_logs: {
        Row: {
          avg_weight_g: number
          created_at: string
          date: string
          flock_id: string
          id: string
          sample_size: number | null
          user_id: string
        }
        Insert: {
          avg_weight_g: number
          created_at?: string
          date?: string
          flock_id: string
          id?: string
          sample_size?: number | null
          user_id?: string
        }
        Update: {
          avg_weight_g?: number
          created_at?: string
          date?: string
          flock_id?: string
          id?: string
          sample_size?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "weight_logs_flock_id_fkey"
            columns: ["flock_id"]
            isOneToOne: false
            referencedRelation: "flocks"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      seed_sample_data: { Args: never; Returns: undefined }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
