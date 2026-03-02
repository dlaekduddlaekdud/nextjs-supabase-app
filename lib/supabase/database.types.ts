export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '14.1'
  }
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string | null
          full_name: string | null
          avatar_url: string | null
          updated_at: string
        }
        Insert: {
          id: string
          email?: string | null
          full_name?: string | null
          avatar_url?: string | null
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string | null
          full_name?: string | null
          avatar_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      events: {
        Row: {
          id: string
          title: string
          description: string | null
          location: string | null
          starts_at: string
          ends_at: string | null
          status: 'active' | 'cancelled' | 'completed'
          host_id: string
          has_expense: boolean
          has_carpool: boolean
          rsvp_due_at: string | null
          invite_code: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          location?: string | null
          starts_at: string
          ends_at?: string | null
          status?: 'active' | 'cancelled' | 'completed'
          host_id: string
          has_expense?: boolean
          has_carpool?: boolean
          rsvp_due_at?: string | null
          invite_code?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          location?: string | null
          starts_at?: string
          ends_at?: string | null
          status?: 'active' | 'cancelled' | 'completed'
          host_id?: string
          has_expense?: boolean
          has_carpool?: boolean
          rsvp_due_at?: string | null
          invite_code?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      event_members: {
        Row: {
          id: string
          event_id: string
          user_id: string
          role: 'host' | 'co_host' | 'member'
          rsvp: 'pending' | 'attending' | 'declined'
          joined_at: string
        }
        Insert: {
          id?: string
          event_id: string
          user_id: string
          role?: 'host' | 'co_host' | 'member'
          rsvp?: 'pending' | 'attending' | 'declined'
          joined_at?: string
        }
        Update: {
          id?: string
          event_id?: string
          user_id?: string
          role?: 'host' | 'co_host' | 'member'
          rsvp?: 'pending' | 'attending' | 'declined'
          joined_at?: string
        }
        Relationships: []
      }
      invitations: {
        Row: {
          id: string
          event_id: string
          invited_by: string
          email: string
          token: string
          status: 'pending' | 'accepted' | 'declined' | 'expired'
          expires_at: string
          created_at: string
        }
        Insert: {
          id?: string
          event_id: string
          invited_by: string
          email: string
          token?: string
          status?: 'pending' | 'accepted' | 'declined' | 'expired'
          expires_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          event_id?: string
          invited_by?: string
          email?: string
          token?: string
          status?: 'pending' | 'accepted' | 'declined' | 'expired'
          expires_at?: string
          created_at?: string
        }
        Relationships: []
      }
      announcements: {
        Row: {
          id: string
          event_id: string
          author_id: string
          title: string
          body: string
          created_at: string
        }
        Insert: {
          id?: string
          event_id: string
          author_id: string
          title: string
          body: string
          created_at?: string
        }
        Update: {
          id?: string
          event_id?: string
          author_id?: string
          title?: string
          body?: string
          created_at?: string
        }
        Relationships: []
      }
      expenses: {
        Row: {
          id: string
          event_id: string
          paid_by: string
          title: string
          amount: number
          created_at: string
        }
        Insert: {
          id?: string
          event_id: string
          paid_by: string
          title: string
          amount: number
          created_at?: string
        }
        Update: {
          id?: string
          event_id?: string
          paid_by?: string
          title?: string
          amount?: number
          created_at?: string
        }
        Relationships: []
      }
      expense_splits: {
        Row: {
          id: string
          expense_id: string
          user_id: string
          amount: number
          is_settled: boolean
        }
        Insert: {
          id?: string
          expense_id: string
          user_id: string
          amount: number
          is_settled?: boolean
        }
        Update: {
          id?: string
          expense_id?: string
          user_id?: string
          amount?: number
          is_settled?: boolean
        }
        Relationships: []
      }
      carpool_offers: {
        Row: {
          id: string
          event_id: string
          driver_id: string
          departure: string
          seats: number
          note: string | null
          created_at: string
        }
        Insert: {
          id?: string
          event_id: string
          driver_id: string
          departure: string
          seats: number
          note?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          event_id?: string
          driver_id?: string
          departure?: string
          seats?: number
          note?: string | null
          created_at?: string
        }
        Relationships: []
      }
      carpool_passengers: {
        Row: {
          id: string
          offer_id: string
          user_id: string
          status: 'pending' | 'confirmed' | 'rejected'
        }
        Insert: {
          id?: string
          offer_id: string
          user_id: string
          status?: 'pending' | 'confirmed' | 'rejected'
        }
        Update: {
          id?: string
          offer_id?: string
          user_id?: string
          status?: 'pending' | 'confirmed' | 'rejected'
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_event_by_invite_code: {
        Args: { p_code: string }
        Returns: { id: string; status: string }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema['Enums']
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
