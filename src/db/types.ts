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
      businesses: {
        Row: {
          address: string | null
          category: string | null
          city: string | null
          created_at: string
          dedupe_key: string
          email: string | null
          first_seen_at: string
          id: string
          last_seen_at: string
          maps_url: string | null
          name: string
          phone: string | null
          place_id: string | null
          rating: number | null
          review_count: number | null
          source: Database["public"]["Enums"]["business_source"]
          updated_at: string
          website: string | null
          website_host: string | null
        }
        Insert: {
          address?: string | null
          category?: string | null
          city?: string | null
          created_at?: string
          dedupe_key: string
          email?: string | null
          first_seen_at?: string
          id?: string
          last_seen_at?: string
          maps_url?: string | null
          name: string
          phone?: string | null
          place_id?: string | null
          rating?: number | null
          review_count?: number | null
          source: Database["public"]["Enums"]["business_source"]
          updated_at?: string
          website?: string | null
          website_host?: string | null
        }
        Update: {
          address?: string | null
          category?: string | null
          city?: string | null
          created_at?: string
          dedupe_key?: string
          email?: string | null
          first_seen_at?: string
          id?: string
          last_seen_at?: string
          maps_url?: string | null
          name?: string
          phone?: string | null
          place_id?: string | null
          rating?: number | null
          review_count?: number | null
          source?: Database["public"]["Enums"]["business_source"]
          updated_at?: string
          website?: string | null
          website_host?: string | null
        }
        Relationships: []
      }
      lead_notes: {
        Row: {
          author_id: string | null
          body: string
          created_at: string
          id: string
          lead_id: string
        }
        Insert: {
          author_id?: string | null
          body: string
          created_at?: string
          id?: string
          lead_id: string
        }
        Update: {
          author_id?: string | null
          body?: string
          created_at?: string
          id?: string
          lead_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_notes_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_notes_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "v_current_leads"
            referencedColumns: ["lead_id"]
          },
        ]
      }
      leads: {
        Row: {
          business_id: string
          created_at: string
          disqualified_reason: string | null
          id: string
          next_action_at: string | null
          owner_id: string | null
          priority: number | null
          status: Database["public"]["Enums"]["lead_status"]
          updated_at: string
        }
        Insert: {
          business_id: string
          created_at?: string
          disqualified_reason?: string | null
          id?: string
          next_action_at?: string | null
          owner_id?: string | null
          priority?: number | null
          status?: Database["public"]["Enums"]["lead_status"]
          updated_at?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          disqualified_reason?: string | null
          id?: string
          next_action_at?: string | null
          owner_id?: string | null
          priority?: number | null
          status?: Database["public"]["Enums"]["lead_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: true
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: true
            referencedRelation: "v_current_leads"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "leads_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: true
            referencedRelation: "v_score_history"
            referencedColumns: ["business_id"]
          },
        ]
      }
      outreach: {
        Row: {
          author_id: string | null
          body: string | null
          channel: Database["public"]["Enums"]["outreach_channel"]
          created_at: string
          direction: Database["public"]["Enums"]["outreach_direction"]
          id: string
          lead_id: string
          occurred_at: string
          outcome: string | null
          subject: string | null
        }
        Insert: {
          author_id?: string | null
          body?: string | null
          channel: Database["public"]["Enums"]["outreach_channel"]
          created_at?: string
          direction?: Database["public"]["Enums"]["outreach_direction"]
          id?: string
          lead_id: string
          occurred_at?: string
          outcome?: string | null
          subject?: string | null
        }
        Update: {
          author_id?: string | null
          body?: string | null
          channel?: Database["public"]["Enums"]["outreach_channel"]
          created_at?: string
          direction?: Database["public"]["Enums"]["outreach_direction"]
          id?: string
          lead_id?: string
          occurred_at?: string
          outcome?: string | null
          subject?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "outreach_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outreach_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "v_current_leads"
            referencedColumns: ["lead_id"]
          },
        ]
      }
      scan_runs: {
        Row: {
          business_count: number
          categories: string[]
          city: string | null
          created_at: string
          created_by: string | null
          finished_at: string | null
          id: string
          limit_per_category: number | null
          options: Json
          scoring_version: string
          source: Database["public"]["Enums"]["business_source"]
          started_at: string
        }
        Insert: {
          business_count?: number
          categories?: string[]
          city?: string | null
          created_at?: string
          created_by?: string | null
          finished_at?: string | null
          id?: string
          limit_per_category?: number | null
          options?: Json
          scoring_version?: string
          source: Database["public"]["Enums"]["business_source"]
          started_at?: string
        }
        Update: {
          business_count?: number
          categories?: string[]
          city?: string | null
          created_at?: string
          created_by?: string | null
          finished_at?: string | null
          id?: string
          limit_per_category?: number | null
          options?: Json
          scoring_version?: string
          source?: Database["public"]["Enums"]["business_source"]
          started_at?: string
        }
        Relationships: []
      }
      scan_signals: {
        Row: {
          detail: string | null
          fired: boolean
          key: string
          label: string | null
          scan_id: string
          weight: number
        }
        Insert: {
          detail?: string | null
          fired: boolean
          key: string
          label?: string | null
          scan_id: string
          weight?: number
        }
        Update: {
          detail?: string | null
          fired?: boolean
          key?: string
          label?: string | null
          scan_id?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "scan_signals_scan_id_fkey"
            columns: ["scan_id"]
            isOneToOne: false
            referencedRelation: "scans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scan_signals_scan_id_fkey"
            columns: ["scan_id"]
            isOneToOne: false
            referencedRelation: "v_current_leads"
            referencedColumns: ["scan_id"]
          },
        ]
      }
      scans: {
        Row: {
          builder: string | null
          business_id: string
          copyright_year: number | null
          created_at: string
          error: string | null
          final_url: string | null
          id: string
          load_ms: number | null
          page_bytes: number | null
          reasons: string[]
          run_id: string
          scanned_at: string
          score: number
          scoring_version: string
          screenshot_path: string | null
          status: Database["public"]["Enums"]["scan_status"]
          title: string | null
        }
        Insert: {
          builder?: string | null
          business_id: string
          copyright_year?: number | null
          created_at?: string
          error?: string | null
          final_url?: string | null
          id?: string
          load_ms?: number | null
          page_bytes?: number | null
          reasons?: string[]
          run_id: string
          scanned_at?: string
          score: number
          scoring_version?: string
          screenshot_path?: string | null
          status: Database["public"]["Enums"]["scan_status"]
          title?: string | null
        }
        Update: {
          builder?: string | null
          business_id?: string
          copyright_year?: number | null
          created_at?: string
          error?: string | null
          final_url?: string | null
          id?: string
          load_ms?: number | null
          page_bytes?: number | null
          reasons?: string[]
          run_id?: string
          scanned_at?: string
          score?: number
          scoring_version?: string
          screenshot_path?: string | null
          status?: Database["public"]["Enums"]["scan_status"]
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scans_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scans_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_current_leads"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "scans_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_score_history"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "scans_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "scan_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      signal_catalog: {
        Row: {
          active: boolean
          category: string | null
          created_at: string
          key: string
          label: string
          outreach_snippet: string | null
          updated_at: string
          weight: number
        }
        Insert: {
          active?: boolean
          category?: string | null
          created_at?: string
          key: string
          label: string
          outreach_snippet?: string | null
          updated_at?: string
          weight: number
        }
        Update: {
          active?: boolean
          category?: string | null
          created_at?: string
          key?: string
          label?: string
          outreach_snippet?: string | null
          updated_at?: string
          weight?: number
        }
        Relationships: []
      }
    }
    Views: {
      v_current_leads: {
        Row: {
          address: string | null
          builder: string | null
          business_id: string | null
          category: string | null
          city: string | null
          copyright_year: number | null
          lead_id: string | null
          lead_status: Database["public"]["Enums"]["lead_status"] | null
          maps_url: string | null
          name: string | null
          next_action_at: string | null
          owner_id: string | null
          phone: string | null
          priority: number | null
          rating: number | null
          reasons: string[] | null
          review_count: number | null
          scan_id: string | null
          scan_status: Database["public"]["Enums"]["scan_status"] | null
          scanned_at: string | null
          score: number | null
          screenshot_path: string | null
          source: Database["public"]["Enums"]["business_source"] | null
          website: string | null
          website_host: string | null
        }
        Relationships: []
      }
      v_score_history: {
        Row: {
          builder: string | null
          business_id: string | null
          name: string | null
          scanned_at: string | null
          score: number | null
          scoring_version: string | null
          status: Database["public"]["Enums"]["scan_status"] | null
          website_host: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      business_source: "places" | "csv"
      lead_status:
        | "new"
        | "qualified"
        | "contacted"
        | "replied"
        | "meeting"
        | "won"
        | "lost"
        | "disqualified"
      outreach_channel:
        | "email"
        | "phone"
        | "form"
        | "linkedin"
        | "in_person"
        | "other"
      outreach_direction: "outbound" | "inbound"
      scan_status: "scanned" | "no-website" | "unreachable" | "timeout"
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
      business_source: ["places", "csv"],
      lead_status: [
        "new",
        "qualified",
        "contacted",
        "replied",
        "meeting",
        "won",
        "lost",
        "disqualified",
      ],
      outreach_channel: [
        "email",
        "phone",
        "form",
        "linkedin",
        "in_person",
        "other",
      ],
      outreach_direction: ["outbound", "inbound"],
      scan_status: ["scanned", "no-website", "unreachable", "timeout"],
    },
  },
} as const
