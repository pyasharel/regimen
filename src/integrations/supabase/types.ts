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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      compounds: {
        Row: {
          bac_water_volume: number | null
          calculated_iu: number | null
          calculated_ml: number | null
          concentration: number | null
          created_at: string | null
          cycle_reminders_enabled: boolean | null
          cycle_weeks_off: number | null
          cycle_weeks_on: number | null
          dose_unit: string
          end_date: string | null
          has_cycles: boolean | null
          has_titration: boolean | null
          id: string
          intended_dose: number
          is_active: boolean | null
          name: string
          notes: string | null
          schedule_days: string[] | null
          schedule_type: string
          start_date: string
          time_of_day: string[]
          titration_config: Json | null
          user_id: string | null
          vial_size: number | null
          vial_unit: string | null
        }
        Insert: {
          bac_water_volume?: number | null
          calculated_iu?: number | null
          calculated_ml?: number | null
          concentration?: number | null
          created_at?: string | null
          cycle_reminders_enabled?: boolean | null
          cycle_weeks_off?: number | null
          cycle_weeks_on?: number | null
          dose_unit: string
          end_date?: string | null
          has_cycles?: boolean | null
          has_titration?: boolean | null
          id?: string
          intended_dose: number
          is_active?: boolean | null
          name: string
          notes?: string | null
          schedule_days?: string[] | null
          schedule_type: string
          start_date?: string
          time_of_day: string[]
          titration_config?: Json | null
          user_id?: string | null
          vial_size?: number | null
          vial_unit?: string | null
        }
        Update: {
          bac_water_volume?: number | null
          calculated_iu?: number | null
          calculated_ml?: number | null
          concentration?: number | null
          created_at?: string | null
          cycle_reminders_enabled?: boolean | null
          cycle_weeks_off?: number | null
          cycle_weeks_on?: number | null
          dose_unit?: string
          end_date?: string | null
          has_cycles?: boolean | null
          has_titration?: boolean | null
          id?: string
          intended_dose?: number
          is_active?: boolean | null
          name?: string
          notes?: string | null
          schedule_days?: string[] | null
          schedule_type?: string
          start_date?: string
          time_of_day?: string[]
          titration_config?: Json | null
          user_id?: string | null
          vial_size?: number | null
          vial_unit?: string | null
        }
        Relationships: []
      }
      doses: {
        Row: {
          calculated_iu: number | null
          calculated_ml: number | null
          compound_id: string | null
          concentration: number | null
          created_at: string | null
          dose_amount: number
          dose_unit: string
          id: string
          scheduled_date: string
          scheduled_time: string
          skipped: boolean | null
          taken: boolean | null
          taken_at: string | null
          user_id: string | null
        }
        Insert: {
          calculated_iu?: number | null
          calculated_ml?: number | null
          compound_id?: string | null
          concentration?: number | null
          created_at?: string | null
          dose_amount: number
          dose_unit: string
          id?: string
          scheduled_date: string
          scheduled_time: string
          skipped?: boolean | null
          taken?: boolean | null
          taken_at?: string | null
          user_id?: string | null
        }
        Update: {
          calculated_iu?: number | null
          calculated_ml?: number | null
          compound_id?: string | null
          concentration?: number | null
          created_at?: string | null
          dose_amount?: number
          dose_unit?: string
          id?: string
          scheduled_date?: string
          scheduled_time?: string
          skipped?: boolean | null
          taken?: boolean | null
          taken_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "doses_compound_id_fkey"
            columns: ["compound_id"]
            isOneToOne: false
            referencedRelation: "compounds"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          challenges: string[] | null
          created_at: string | null
          full_name: string | null
          goals: string[] | null
          id: string
          onboarding_completed: boolean | null
          preview_mode_compound_added: boolean | null
          stripe_customer_id: string | null
          subscription_end_date: string | null
          subscription_start_date: string | null
          subscription_status: string | null
          subscription_type: string | null
          terms_accepted_at: string | null
          trial_end_date: string | null
          trial_start_date: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          challenges?: string[] | null
          created_at?: string | null
          full_name?: string | null
          goals?: string[] | null
          id?: string
          onboarding_completed?: boolean | null
          preview_mode_compound_added?: boolean | null
          stripe_customer_id?: string | null
          subscription_end_date?: string | null
          subscription_start_date?: string | null
          subscription_status?: string | null
          subscription_type?: string | null
          terms_accepted_at?: string | null
          trial_end_date?: string | null
          trial_start_date?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          challenges?: string[] | null
          created_at?: string | null
          full_name?: string | null
          goals?: string[] | null
          id?: string
          onboarding_completed?: boolean | null
          preview_mode_compound_added?: boolean | null
          stripe_customer_id?: string | null
          subscription_end_date?: string | null
          subscription_start_date?: string | null
          subscription_status?: string | null
          subscription_type?: string | null
          terms_accepted_at?: string | null
          trial_end_date?: string | null
          trial_start_date?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      progress_entries: {
        Row: {
          ai_analysis: Json | null
          category: string
          created_at: string | null
          entry_date: string
          id: string
          metrics: Json | null
          notes: string | null
          photo_url: string | null
          user_id: string | null
        }
        Insert: {
          ai_analysis?: Json | null
          category: string
          created_at?: string | null
          entry_date?: string
          id?: string
          metrics?: Json | null
          notes?: string | null
          photo_url?: string | null
          user_id?: string | null
        }
        Update: {
          ai_analysis?: Json | null
          category?: string
          created_at?: string | null
          entry_date?: string
          id?: string
          metrics?: Json | null
          notes?: string | null
          photo_url?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_stats: {
        Row: {
          created_at: string | null
          current_streak: number | null
          id: string
          last_check_in_date: string | null
          longest_streak: number | null
          total_doses_logged: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          current_streak?: number | null
          id?: string
          last_check_in_date?: string | null
          longest_streak?: number | null
          total_doses_logged?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          current_streak?: number | null
          id?: string
          last_check_in_date?: string | null
          longest_streak?: number | null
          total_doses_logged?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cleanup_duplicate_doses: { Args: never; Returns: number }
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
