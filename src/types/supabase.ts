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
      budget_line_items: {
        Row: {
          amount: number
          budget_id: string
          created_at: string | null
          fund_code: string | null
          fund_type: number | null
          id: string
          project_code: string | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          budget_id: string
          created_at?: string | null
          fund_code?: string | null
          fund_type?: number | null
          id?: string
          project_code?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          budget_id?: string
          created_at?: string | null
          fund_code?: string | null
          fund_type?: number | null
          id?: string
          project_code?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "budget_line_items_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "budgets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_line_items_fund_code_fkey"
            columns: ["fund_code"]
            isOneToOne: false
            referencedRelation: "funds"
            referencedColumns: ["fund_code"]
          },
          {
            foreignKeyName: "budget_line_items_program_code_fkey"
            columns: ["project_code"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["project_code"]
          },
          {
            foreignKeyName: "budget_line_items_project_code_fkey"
            columns: ["project_code"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["project_code"]
          },
        ]
      }
      budgets: {
        Row: {
          created_at: string | null
          department_code: string
          fiscal_year: number
          id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          department_code: string
          fiscal_year: number
          id?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          department_code?: string
          fiscal_year?: number
          id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "budgets_department_code_fkey"
            columns: ["department_code"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["organizational_code"]
          },
        ]
      }
      department_distributions: {
        Row: {
          created_at: string | null
          department_id: string
          distribution_data: Json
          distribution_type: string
          fiscal_year: number
          id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          department_id: string
          distribution_data: Json
          distribution_type: string
          fiscal_year: number
          id?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          department_id?: string
          distribution_data?: Json
          distribution_type?: string
          fiscal_year?: number
          id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "department_distributions_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      // DEPRECATED: department_spending type is no longer used as of 2024-06-23.
      // export interface DepartmentSpending { ... }
      // (rest of department_spending type commented out below)
      department_workforce: {
        Row: {
          created_at: string | null
          department_id: string
          fiscal_year: number
          head_count: number
          id: string
          total_wages: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          department_id: string
          fiscal_year: number
          head_count: number
          id?: string
          total_wages?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          department_id?: string
          fiscal_year?: number
          head_count?: number
          id?: string
          total_wages?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "department_workforce_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          abbreviation: string | null
          aliases: string[] | null
          budget_status: string | null
          canonical_name: string | null
          created_at: string | null
          description: string | null
          entity_code: number | null
          id: string
          key_functions: string | null
          name: string
          note: string | null
          org_level: number | null
          organizational_code: string | null
          parent_agency: string | null
          updated_at: string | null
        }
        Insert: {
          abbreviation?: string | null
          aliases?: string[] | null
          budget_status?: string | null
          canonical_name?: string | null
          created_at?: string | null
          description?: string | null
          entity_code?: number | null
          id?: string
          key_functions?: string | null
          name: string
          note?: string | null
          org_level?: number | null
          organizational_code?: string | null
          parent_agency?: string | null
          updated_at?: string | null
        }
        Update: {
          abbreviation?: string | null
          aliases?: string[] | null
          budget_status?: string | null
          canonical_name?: string | null
          created_at?: string | null
          description?: string | null
          entity_code?: number | null
          id?: string
          key_functions?: string | null
          name?: string
          note?: string | null
          org_level?: number | null
          organizational_code?: string | null
          parent_agency?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      funds: {
        Row: {
          created_at: string | null
          description: string | null
          fund_code: string
          fund_group: string
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          fund_code: string
          fund_group: string
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          fund_code?: string
          fund_group?: string
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      mailing_list: {
        Row: {
          email: string
          id: string
          subscribed_at: string
        }
        Insert: {
          email: string
          id?: string
          subscribed_at?: string
        }
        Update: {
          email?: string
          id?: string
          subscribed_at?: string
        }
        Relationships: []
      }
      programs: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          project_code: string
          sources: string[] | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          project_code: string
          sources?: string[] | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          project_code?: string
          sources?: string[] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      search_index: {
        Row: {
          additional_data: Json | null
          created_at: string | null
          fiscal_year: number | null
          fts: unknown | null
          id: string
          source_id: string
          term: string
          type: string
          updated_at: string | null
        }
        Insert: {
          additional_data?: Json | null
          created_at?: string | null
          fiscal_year?: number | null
          fts?: unknown | null
          id?: string
          source_id: string
          term: string
          type: string
          updated_at?: string | null
        }
        Update: {
          additional_data?: Json | null
          created_at?: string | null
          fiscal_year?: number | null
          fts?: unknown | null
          id?: string
          source_id?: string
          term?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      vendor_transactions: {
        Row: {
          amount: number
          category: string | null
          created_at: string | null
          department_code: string | null
          description: string | null
          fiscal_year: number
          fund_code: string | null
          id: string
          program_code: string | null
          transaction_count: number | null
          transaction_date: string | null
          updated_at: string | null
          vendor_id: string
        }
        Insert: {
          amount: number
          category?: string | null
          created_at?: string | null
          department_code?: string | null
          description?: string | null
          fiscal_year: number
          fund_code?: string | null
          id?: string
          program_code?: string | null
          transaction_count?: number | null
          transaction_date?: string | null
          updated_at?: string | null
          vendor_id: string
        }
        Update: {
          amount?: number
          category?: string | null
          created_at?: string | null
          department_code?: string | null
          description?: string | null
          fiscal_year?: number
          fund_code?: string | null
          id?: string
          program_code?: string | null
          transaction_count?: number | null
          transaction_date?: string | null
          updated_at?: string | null
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_transactions_department_code_fkey"
            columns: ["department_code"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["organizational_code"]
          },
          {
            foreignKeyName: "vendor_transactions_fund_code_fkey"
            columns: ["fund_code"]
            isOneToOne: false
            referencedRelation: "funds"
            referencedColumns: ["fund_code"]
          },
          {
            foreignKeyName: "vendor_transactions_program_code_fkey"
            columns: ["program_code"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["project_code"]
          },
          {
            foreignKeyName: "vendor_transactions_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendors: {
        Row: {
          created_at: string | null
          ein: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          ein?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          ein?: string | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      departments_with_workforce: {
        Row: {
          id: string
          organizational_code: string | null
          name: string
          canonical_name: string | null
          aliases: string[] | null
          description: string | null
          entity_code: number | null
          org_level: number | null
          budget_status: string | null
          key_functions: string | null
          abbreviation: string | null
          parent_agency: string | null
          note: string | null
          created_at: string | null
          updated_at: string | null
          workforce_yearly: Json
          distributions_yearly: Json
        }
        Insert: {
          id?: string
          organizational_code?: string | null
          name: string
          canonical_name?: string | null
          aliases?: string[] | null
          description?: string | null
          entity_code?: number | null
          org_level?: number | null
          budget_status?: string | null
          key_functions?: string | null
          abbreviation?: string | null
          parent_agency?: string | null
          note?: string | null
          created_at?: string | null
          updated_at?: string | null
          workforce_yearly?: Json
          distributions_yearly?: Json
        }
        Update: {
          id?: string
          organizational_code?: string | null
          name?: string
          canonical_name?: string | null
          aliases?: string[] | null
          description?: string | null
          entity_code?: number | null
          org_level?: number | null
          budget_status?: string | null
          key_functions?: string | null
          abbreviation?: string | null
          parent_agency?: string | null
          note?: string | null
          created_at?: string | null
          updated_at?: string | null
          workforce_yearly?: Json
          distributions_yearly?: Json
        }
        Relationships: []
      }
    }
    Functions: {
      ensure_search_index_fts: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      get_departments_with_workforce: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: string
          organizational_code: string | null
          name: string
          canonical_name: string | null
          aliases: string[] | null
          description: string | null
          entity_code: number | null
          org_level: number | null
          budget_status: string | null
          key_functions: string | null
          abbreviation: string | null
          parent_agency: string | null
          note: string | null
          created_at: string | null
          updated_at: string | null
          workforce_yearly: Json
          distributions_yearly: Json
        }[]
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
    Enums: {},
  },
} as const
