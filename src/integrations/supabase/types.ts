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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      activite_assignments: {
        Row: {
          activite_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          activite_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          activite_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      activites: {
        Row: {
          budget_total: number | null
          code: string
          created_at: string
          exercice_id: string
          id: string
          libelle: string
          objectif_operationnel: string | null
          ordre: number | null
        }
        Insert: {
          budget_total?: number | null
          code: string
          created_at?: string
          exercice_id: string
          id?: string
          libelle: string
          objectif_operationnel?: string | null
          ordre?: number | null
        }
        Update: {
          budget_total?: number | null
          code?: string
          created_at?: string
          exercice_id?: string
          id?: string
          libelle?: string
          objectif_operationnel?: string | null
          ordre?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "activites_exercice_id_fkey"
            columns: ["exercice_id"]
            isOneToOne: false
            referencedRelation: "exercices"
            referencedColumns: ["id"]
          },
        ]
      }
      app_settings: {
        Row: {
          admin_email: string | null
          app_name: string | null
          exercice_actif_id: string | null
          id: number
          logo_url: string | null
          rapport_footer: string | null
          session_duration_min: number | null
          updated_at: string | null
        }
        Insert: {
          admin_email?: string | null
          app_name?: string | null
          exercice_actif_id?: string | null
          id?: number
          logo_url?: string | null
          rapport_footer?: string | null
          session_duration_min?: number | null
          updated_at?: string | null
        }
        Update: {
          admin_email?: string | null
          app_name?: string | null
          exercice_actif_id?: string | null
          id?: number
          logo_url?: string | null
          rapport_footer?: string | null
          session_duration_min?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      executions: {
        Row: {
          avancement_pct: number | null
          date_maj: string | null
          exercice_id: string
          id: string
          montant_realise: number | null
          observations: string | null
          sous_tache_id: string
          statut: string | null
          updated_by: string | null
        }
        Insert: {
          avancement_pct?: number | null
          date_maj?: string | null
          exercice_id: string
          id?: string
          montant_realise?: number | null
          observations?: string | null
          sous_tache_id: string
          statut?: string | null
          updated_by?: string | null
        }
        Update: {
          avancement_pct?: number | null
          date_maj?: string | null
          exercice_id?: string
          id?: string
          montant_realise?: number | null
          observations?: string | null
          sous_tache_id?: string
          statut?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "executions_exercice_id_fkey"
            columns: ["exercice_id"]
            isOneToOne: false
            referencedRelation: "exercices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "executions_sous_tache_id_fkey"
            columns: ["sous_tache_id"]
            isOneToOne: false
            referencedRelation: "sous_taches"
            referencedColumns: ["id"]
          },
        ]
      }
      exercices: {
        Row: {
          annee: number
          budget_total: number | null
          created_at: string
          date_debut: string | null
          date_fin: string | null
          id: string
          statut: string | null
        }
        Insert: {
          annee: number
          budget_total?: number | null
          created_at?: string
          date_debut?: string | null
          date_fin?: string | null
          id?: string
          statut?: string | null
        }
        Update: {
          annee?: number
          budget_total?: number | null
          created_at?: string
          date_debut?: string | null
          date_fin?: string | null
          id?: string
          statut?: string | null
        }
        Relationships: []
      }
      indicateurs_kpi: {
        Row: {
          baseline_annee: number | null
          baseline_valeur: string | null
          categorie: string | null
          cible_2025: string | null
          cible_2026: string | null
          cible_2027: string | null
          code: string
          created_at: string
          id: string
          libelle: string
          mode_calcul: string | null
          objectif_specifique: string | null
          updated_at: string | null
          valeur_realisee: string | null
        }
        Insert: {
          baseline_annee?: number | null
          baseline_valeur?: string | null
          categorie?: string | null
          cible_2025?: string | null
          cible_2026?: string | null
          cible_2027?: string | null
          code: string
          created_at?: string
          id?: string
          libelle: string
          mode_calcul?: string | null
          objectif_specifique?: string | null
          updated_at?: string | null
          valeur_realisee?: string | null
        }
        Update: {
          baseline_annee?: number | null
          baseline_valeur?: string | null
          categorie?: string | null
          cible_2025?: string | null
          cible_2026?: string | null
          cible_2027?: string | null
          code?: string
          created_at?: string
          id?: string
          libelle?: string
          mode_calcul?: string | null
          objectif_specifique?: string | null
          updated_at?: string | null
          valeur_realisee?: string | null
        }
        Relationships: []
      }
      journal_audit: {
        Row: {
          action: string | null
          ancienne_valeur: Json | null
          created_at: string
          entite: string | null
          id: string
          nouvelle_valeur: Json | null
          user_id: string | null
        }
        Insert: {
          action?: string | null
          ancienne_valeur?: Json | null
          created_at?: string
          entite?: string | null
          id?: string
          nouvelle_valeur?: Json | null
          user_id?: string | null
        }
        Update: {
          action?: string | null
          ancienne_valeur?: Json | null
          created_at?: string
          entite?: string | null
          id?: string
          nouvelle_valeur?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
      livrables: {
        Row: {
          created_at: string
          date_production: string | null
          fichier_url: string | null
          id: string
          libelle: string
          observations: string | null
          produit: boolean | null
          tache_id: string
        }
        Insert: {
          created_at?: string
          date_production?: string | null
          fichier_url?: string | null
          id?: string
          libelle: string
          observations?: string | null
          produit?: boolean | null
          tache_id: string
        }
        Update: {
          created_at?: string
          date_production?: string | null
          fichier_url?: string | null
          id?: string
          libelle?: string
          observations?: string | null
          produit?: boolean | null
          tache_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "livrables_tache_id_fkey"
            columns: ["tache_id"]
            isOneToOne: false
            referencedRelation: "taches"
            referencedColumns: ["id"]
          },
        ]
      }
      sous_taches: {
        Row: {
          budget_prevu: number | null
          code: string
          created_at: string
          id: string
          libelle: string
          lignes_budgetaires: string | null
          mesures_attenuation: string | null
          mode_execution: string | null
          ordre: number | null
          responsable: string | null
          ressources_humaines: string | null
          risques: string | null
          sources_financement: string | null
          tache_id: string
          trimestre_t1: boolean | null
          trimestre_t2: boolean | null
          trimestre_t3: boolean | null
          trimestre_t4: boolean | null
        }
        Insert: {
          budget_prevu?: number | null
          code: string
          created_at?: string
          id?: string
          libelle: string
          lignes_budgetaires?: string | null
          mesures_attenuation?: string | null
          mode_execution?: string | null
          ordre?: number | null
          responsable?: string | null
          ressources_humaines?: string | null
          risques?: string | null
          sources_financement?: string | null
          tache_id: string
          trimestre_t1?: boolean | null
          trimestre_t2?: boolean | null
          trimestre_t3?: boolean | null
          trimestre_t4?: boolean | null
        }
        Update: {
          budget_prevu?: number | null
          code?: string
          created_at?: string
          id?: string
          libelle?: string
          lignes_budgetaires?: string | null
          mesures_attenuation?: string | null
          mode_execution?: string | null
          ordre?: number | null
          responsable?: string | null
          ressources_humaines?: string | null
          risques?: string | null
          sources_financement?: string | null
          tache_id?: string
          trimestre_t1?: boolean | null
          trimestre_t2?: boolean | null
          trimestre_t3?: boolean | null
          trimestre_t4?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "sous_taches_tache_id_fkey"
            columns: ["tache_id"]
            isOneToOne: false
            referencedRelation: "taches"
            referencedColumns: ["id"]
          },
        ]
      }
      taches: {
        Row: {
          activite_id: string
          budget_total: number | null
          code: string
          created_at: string
          id: string
          libelle: string
          livrables: string | null
          ordre: number | null
        }
        Insert: {
          activite_id: string
          budget_total?: number | null
          code: string
          created_at?: string
          id?: string
          libelle: string
          livrables?: string | null
          ordre?: number | null
        }
        Update: {
          activite_id?: string
          budget_total?: number | null
          code?: string
          created_at?: string
          id?: string
          libelle?: string
          livrables?: string | null
          ordre?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "taches_activite_id_fkey"
            columns: ["activite_id"]
            isOneToOne: false
            referencedRelation: "activites"
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
      users_profiles: {
        Row: {
          actif: boolean | null
          centre: string | null
          created_at: string
          email: string | null
          id: string
          nom: string | null
          prenom: string | null
        }
        Insert: {
          actif?: boolean | null
          centre?: string | null
          created_at?: string
          email?: string | null
          id: string
          nom?: string | null
          prenom?: string | null
        }
        Update: {
          actif?: boolean | null
          centre?: string | null
          created_at?: string
          email?: string | null
          id?: string
          nom?: string | null
          prenom?: string | null
        }
        Relationships: []
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
    }
    Enums: {
      app_role:
        | "super_admin"
        | "admin_pta"
        | "responsable_activite"
        | "agent_saisie"
        | "consultant"
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
        "super_admin",
        "admin_pta",
        "responsable_activite",
        "agent_saisie",
        "consultant",
      ],
    },
  },
} as const
