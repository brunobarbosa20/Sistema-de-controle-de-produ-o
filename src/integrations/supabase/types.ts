export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18";
  };
  public: {
    Tables: {
      movements: {
        Row: {
          created_at: string;
          created_by: string;
          created_by_email: string;
          id: string;
          note: string | null;
          product_id: string;
          quantity: number;
          type: string;
          unit_price: number;
        };
        Insert: {
          created_at?: string;
          created_by?: string;
          created_by_email?: string;
          id?: string;
          note?: string | null;
          product_id: string;
          quantity: number;
          type: string;
          unit_price?: number;
        };
        Update: {
          created_at?: string;
          created_by?: string;
          created_by_email?: string;
          id?: string;
          note?: string | null;
          product_id?: string;
          quantity?: number;
          type?: string;
          unit_price?: number;
        };
        Relationships: [
          {
            foreignKeyName: "movements_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      products: {
        Row: {
          active: boolean;
          cancelled: boolean;
          created_at: string;
          created_by: string;
          created_by_email: string;
          code: string;
          grams_per_unit: number | null;
          id: string;
          name: string;
          notes: string;
          pending_registration: boolean;
          quantity: number;
          unit: string;
        };
        Insert: {
          active?: boolean;
          cancelled?: boolean;
          created_at?: string;
          created_by?: string;
          created_by_email?: string;
          code?: string;
          grams_per_unit?: number | null;
          id?: string;
          name: string;
          notes?: string;
          pending_registration?: boolean;
          quantity?: number;
          unit?: string;
        };
        Update: {
          active?: boolean;
          cancelled?: boolean;
          created_at?: string;
          created_by?: string;
          created_by_email?: string;
          code?: string;
          grams_per_unit?: number | null;
          id?: string;
          name?: string;
          notes?: string;
          pending_registration?: boolean;
          quantity?: number;
          unit?: string;
        };
        Relationships: [];
      };
      inventory_members: {
        Row: {
          created_at: string;
          email: string;
          role: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          email: string;
          role: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          email?: string;
          role?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      recipes: {
        Row: {
          created_at: string;
          created_by: string;
          created_by_email: string;
          id: string;
          name: string;
          portions: number;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string;
          created_by_email?: string;
          id?: string;
          name: string;
          portions: number;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          created_by?: string;
          created_by_email?: string;
          id?: string;
          name?: string;
          portions?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      recipe_ingredients: {
        Row: {
          id: string;
          name: string;
          position: number;
          product_id: string | null;
          quantity: number;
          recipe_id: string;
          unit: string;
        };
        Insert: {
          id?: string;
          name: string;
          position?: number;
          product_id?: string | null;
          quantity: number;
          recipe_id: string;
          unit: string;
        };
        Update: {
          id?: string;
          name?: string;
          position?: number;
          product_id?: string | null;
          quantity?: number;
          recipe_id?: string;
          unit?: string;
        };
        Relationships: [
          {
            foreignKeyName: "recipe_ingredients_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "recipe_ingredients_recipe_id_fkey";
            columns: ["recipe_id"];
            isOneToOne: false;
            referencedRelation: "recipes";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      has_inventory_role: {
        Args: { required_role: string };
        Returns: boolean;
      };
      create_inventory_product: {
        Args: {
          p_initial_quantity?: number | null;
          p_name: string;
          p_notes?: string | null;
          p_unit: string;
        };
        Returns: string;
      };
      set_inventory_role: {
        Args: { p_role: string; p_user_id: string };
        Returns: undefined;
      };
      set_product_active: {
        Args: { p_active: boolean; p_product_id: string };
        Returns: undefined;
      };
      set_product_cancelled: {
        Args: { p_cancelled: boolean; p_product_id: string };
        Returns: undefined;
      };
      finalize_inventory_product: {
        Args: { p_product_id: string };
        Returns: undefined;
      };
      save_recipe: {
        Args: {
          p_ingredients: Json;
          p_name: string;
          p_portions: number;
          p_recipe_id: string | null;
        };
        Returns: string;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
