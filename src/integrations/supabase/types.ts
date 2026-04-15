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
          updated_at: string | null
          updated_by: string | null
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
          updated_at?: string | null
          updated_by?: string | null
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
          updated_at?: string | null
          updated_by?: string | null
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
      agents_profils: {
        Row: {
          actif: boolean
          anciennete_poste: string | null
          created_at: string | null
          date_reclassement: string | null
          date_recrutement: string | null
          direction: string | null
          email: string | null
          id: string
          matricule: string | null
          nom: string
          poste_travail: string | null
          prenom: string
          service: string | null
          superieur_id: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          actif?: boolean
          anciennete_poste?: string | null
          created_at?: string | null
          date_reclassement?: string | null
          date_recrutement?: string | null
          direction?: string | null
          email?: string | null
          id?: string
          matricule?: string | null
          nom?: string
          poste_travail?: string | null
          prenom?: string
          service?: string | null
          superieur_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          actif?: boolean
          anciennete_poste?: string | null
          created_at?: string | null
          date_reclassement?: string | null
          date_recrutement?: string | null
          direction?: string | null
          email?: string | null
          id?: string
          matricule?: string | null
          nom?: string
          poste_travail?: string | null
          prenom?: string
          service?: string | null
          superieur_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agents_profils_superieur_id_fkey"
            columns: ["superieur_id"]
            isOneToOne: false
            referencedRelation: "agents_profils"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agents_profils_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_profiles"
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
      assignations_sous_taches: {
        Row: {
          agent_id: string
          created_at: string | null
          created_by: string | null
          date_limite: string | null
          exercice_id: string
          id: string
          observations: string | null
          poids_objectif: number
          role_agent: string
          sous_tache_id: string
          updated_at: string | null
        }
        Insert: {
          agent_id: string
          created_at?: string | null
          created_by?: string | null
          date_limite?: string | null
          exercice_id: string
          id?: string
          observations?: string | null
          poids_objectif?: number
          role_agent?: string
          sous_tache_id: string
          updated_at?: string | null
        }
        Update: {
          agent_id?: string
          created_at?: string | null
          created_by?: string | null
          date_limite?: string | null
          exercice_id?: string
          id?: string
          observations?: string | null
          poids_objectif?: number
          role_agent?: string
          sous_tache_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assignations_sous_taches_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents_profils"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignations_sous_taches_exercice_id_fkey"
            columns: ["exercice_id"]
            isOneToOne: false
            referencedRelation: "exercices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignations_sous_taches_sous_tache_id_fkey"
            columns: ["sous_tache_id"]
            isOneToOne: false
            referencedRelation: "sous_taches"
            referencedColumns: ["id"]
          },
        ]
      }
      criteres_sous_taches: {
        Row: {
          condition_seuil: number | null
          condition_type: string
          critere_id: string
          id: string
          sous_tache_id: string
        }
        Insert: {
          condition_seuil?: number | null
          condition_type: string
          critere_id: string
          id?: string
          sous_tache_id: string
        }
        Update: {
          condition_seuil?: number | null
          condition_type?: string
          critere_id?: string
          id?: string
          sous_tache_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "criteres_sous_taches_critere_id_fkey"
            columns: ["critere_id"]
            isOneToOne: false
            referencedRelation: "extrants_criteres"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "criteres_sous_taches_sous_tache_id_fkey"
            columns: ["sous_tache_id"]
            isOneToOne: false
            referencedRelation: "sous_taches"
            referencedColumns: ["id"]
          },
        ]
      }
      evaluations_agents: {
        Row: {
          actions_comp: Json | null
          agent_id: string
          appreciation_globale: string | null
          besoins_formation: Json | null
          commentaire_agent: string | null
          commentaire_evaluateur: string | null
          comp_actualisation: number | null
          comp_assiduite: number | null
          comp_communication: number | null
          comp_discretion: number | null
          comp_esprit_critique: number | null
          comp_habiletes: number | null
          comp_initiative: number | null
          comp_organisation: number | null
          comp_qualite_travail: number | null
          comp_quantite_travail: number | null
          comp_responsabilite: number | null
          created_at: string | null
          date_evaluation: string | null
          elements_defavorables: string | null
          elements_favorables: string | null
          evaluateur_id: string | null
          exercice_id: string
          id: string
          modifications_taches: string | null
          note_comp_comportement: number | null
          note_comp_performance: number | null
          note_comp_pro: number | null
          note_globale: number | null
          note_realisation: number | null
          points_ameliorer: string | null
          points_forts: string | null
          responsabilite_r1: string | null
          responsabilite_r2: string | null
          responsabilite_r3: string | null
          responsabilite_r4: string | null
          responsabilite_r5: string | null
          statut: string | null
          updated_at: string | null
        }
        Insert: {
          actions_comp?: Json | null
          agent_id: string
          appreciation_globale?: string | null
          besoins_formation?: Json | null
          commentaire_agent?: string | null
          commentaire_evaluateur?: string | null
          comp_actualisation?: number | null
          comp_assiduite?: number | null
          comp_communication?: number | null
          comp_discretion?: number | null
          comp_esprit_critique?: number | null
          comp_habiletes?: number | null
          comp_initiative?: number | null
          comp_organisation?: number | null
          comp_qualite_travail?: number | null
          comp_quantite_travail?: number | null
          comp_responsabilite?: number | null
          created_at?: string | null
          date_evaluation?: string | null
          elements_defavorables?: string | null
          elements_favorables?: string | null
          evaluateur_id?: string | null
          exercice_id: string
          id?: string
          modifications_taches?: string | null
          note_comp_comportement?: number | null
          note_comp_performance?: number | null
          note_comp_pro?: number | null
          note_globale?: number | null
          note_realisation?: number | null
          points_ameliorer?: string | null
          points_forts?: string | null
          responsabilite_r1?: string | null
          responsabilite_r2?: string | null
          responsabilite_r3?: string | null
          responsabilite_r4?: string | null
          responsabilite_r5?: string | null
          statut?: string | null
          updated_at?: string | null
        }
        Update: {
          actions_comp?: Json | null
          agent_id?: string
          appreciation_globale?: string | null
          besoins_formation?: Json | null
          commentaire_agent?: string | null
          commentaire_evaluateur?: string | null
          comp_actualisation?: number | null
          comp_assiduite?: number | null
          comp_communication?: number | null
          comp_discretion?: number | null
          comp_esprit_critique?: number | null
          comp_habiletes?: number | null
          comp_initiative?: number | null
          comp_organisation?: number | null
          comp_qualite_travail?: number | null
          comp_quantite_travail?: number | null
          comp_responsabilite?: number | null
          created_at?: string | null
          date_evaluation?: string | null
          elements_defavorables?: string | null
          elements_favorables?: string | null
          evaluateur_id?: string | null
          exercice_id?: string
          id?: string
          modifications_taches?: string | null
          note_comp_comportement?: number | null
          note_comp_performance?: number | null
          note_comp_pro?: number | null
          note_globale?: number | null
          note_realisation?: number | null
          points_ameliorer?: string | null
          points_forts?: string | null
          responsabilite_r1?: string | null
          responsabilite_r2?: string | null
          responsabilite_r3?: string | null
          responsabilite_r4?: string | null
          responsabilite_r5?: string | null
          statut?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "evaluations_agents_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents_profils"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluations_agents_evaluateur_id_fkey"
            columns: ["evaluateur_id"]
            isOneToOne: false
            referencedRelation: "users_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluations_agents_exercice_id_fkey"
            columns: ["exercice_id"]
            isOneToOne: false
            referencedRelation: "exercices"
            referencedColumns: ["id"]
          },
        ]
      }
      executions: {
        Row: {
          avancement_pct: number | null
          date_maj: string | null
          exercice_id: string
          id: string
          montant_engage: number | null
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
          montant_engage?: number | null
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
          montant_engage?: number | null
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
      extrants: {
        Row: {
          activite_id: string
          created_at: string | null
          date_production: string | null
          date_validation: string | null
          id: string
          indicateur_mesure: string
          libelle: string
          ordre: number | null
          reference: string
          rejete_motif: string | null
          statut: string
          statut_mode: string
          updated_at: string | null
          updated_by: string | null
          valide_par: string | null
        }
        Insert: {
          activite_id: string
          created_at?: string | null
          date_production?: string | null
          date_validation?: string | null
          id?: string
          indicateur_mesure: string
          libelle: string
          ordre?: number | null
          reference: string
          rejete_motif?: string | null
          statut?: string
          statut_mode?: string
          updated_at?: string | null
          updated_by?: string | null
          valide_par?: string | null
        }
        Update: {
          activite_id?: string
          created_at?: string | null
          date_production?: string | null
          date_validation?: string | null
          id?: string
          indicateur_mesure?: string
          libelle?: string
          ordre?: number | null
          reference?: string
          rejete_motif?: string | null
          statut?: string
          statut_mode?: string
          updated_at?: string | null
          updated_by?: string | null
          valide_par?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "extrants_activite_id_fkey"
            columns: ["activite_id"]
            isOneToOne: false
            referencedRelation: "activites"
            referencedColumns: ["id"]
          },
        ]
      }
      extrants_criteres: {
        Row: {
          created_at: string | null
          date_echeance: string | null
          date_production_effective: string | null
          extrant_id: string
          id: string
          libelle: string
          observation_ecart: string | null
          ordre: number | null
          produit_avec_ecart: boolean | null
          seuil_unite: string | null
          seuil_valeur: number | null
          statut_critere: string
          type_critere: string
          valeur_realisee: number | null
          valide_auto: boolean | null
          valide_final: boolean | null
          valide_manuellement: boolean | null
        }
        Insert: {
          created_at?: string | null
          date_echeance?: string | null
          date_production_effective?: string | null
          extrant_id: string
          id?: string
          libelle: string
          observation_ecart?: string | null
          ordre?: number | null
          produit_avec_ecart?: boolean | null
          seuil_unite?: string | null
          seuil_valeur?: number | null
          statut_critere?: string
          type_critere: string
          valeur_realisee?: number | null
          valide_auto?: boolean | null
          valide_final?: boolean | null
          valide_manuellement?: boolean | null
        }
        Update: {
          created_at?: string | null
          date_echeance?: string | null
          date_production_effective?: string | null
          extrant_id?: string
          id?: string
          libelle?: string
          observation_ecart?: string | null
          ordre?: number | null
          produit_avec_ecart?: boolean | null
          seuil_unite?: string | null
          seuil_valeur?: number | null
          statut_critere?: string
          type_critere?: string
          valeur_realisee?: number | null
          valide_auto?: boolean | null
          valide_final?: boolean | null
          valide_manuellement?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "extrants_criteres_extrant_id_fkey"
            columns: ["extrant_id"]
            isOneToOne: false
            referencedRelation: "extrants"
            referencedColumns: ["id"]
          },
        ]
      }
      extrants_preuves: {
        Row: {
          created_at: string
          depose_le: string
          depose_par: string
          extrant_id: string
          fichier_nom: string | null
          fichier_taille: number | null
          fichier_type: string | null
          fichier_url: string | null
          id: string
          libelle: string
          observations: string | null
          plateforme: string | null
          type_preuve: string
          url_lien: string | null
        }
        Insert: {
          created_at?: string
          depose_le?: string
          depose_par: string
          extrant_id: string
          fichier_nom?: string | null
          fichier_taille?: number | null
          fichier_type?: string | null
          fichier_url?: string | null
          id?: string
          libelle: string
          observations?: string | null
          plateforme?: string | null
          type_preuve?: string
          url_lien?: string | null
        }
        Update: {
          created_at?: string
          depose_le?: string
          depose_par?: string
          extrant_id?: string
          fichier_nom?: string | null
          fichier_taille?: number | null
          fichier_type?: string | null
          fichier_url?: string | null
          id?: string
          libelle?: string
          observations?: string | null
          plateforme?: string | null
          type_preuve?: string
          url_lien?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "extrants_preuves_extrant_id_fkey"
            columns: ["extrant_id"]
            isOneToOne: false
            referencedRelation: "extrants"
            referencedColumns: ["id"]
          },
        ]
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
          commentaire: string | null
          created_at: string
          date_echeance: string | null
          date_production: string | null
          fichier_nom: string | null
          fichier_taille: number | null
          fichier_url: string | null
          id: string
          libelle: string
          observations: string | null
          produit: boolean | null
          produit_par: string | null
          sous_tache_id: string | null
          statut: string | null
          tache_id: string
          type_livrable: string | null
          updated_at: string | null
        }
        Insert: {
          commentaire?: string | null
          created_at?: string
          date_echeance?: string | null
          date_production?: string | null
          fichier_nom?: string | null
          fichier_taille?: number | null
          fichier_url?: string | null
          id?: string
          libelle: string
          observations?: string | null
          produit?: boolean | null
          produit_par?: string | null
          sous_tache_id?: string | null
          statut?: string | null
          tache_id: string
          type_livrable?: string | null
          updated_at?: string | null
        }
        Update: {
          commentaire?: string | null
          created_at?: string
          date_echeance?: string | null
          date_production?: string | null
          fichier_nom?: string | null
          fichier_taille?: number | null
          fichier_url?: string | null
          id?: string
          libelle?: string
          observations?: string | null
          produit?: boolean | null
          produit_par?: string | null
          sous_tache_id?: string | null
          statut?: string | null
          tache_id?: string
          type_livrable?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "livrables_sous_tache_id_fkey"
            columns: ["sous_tache_id"]
            isOneToOne: false
            referencedRelation: "sous_taches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "livrables_tache_id_fkey"
            columns: ["tache_id"]
            isOneToOne: false
            referencedRelation: "taches"
            referencedColumns: ["id"]
          },
        ]
      }
      nomenclature_budgetaire: {
        Row: {
          actif: boolean | null
          code: string
          famille: string | null
          id: string
          libelle: string
        }
        Insert: {
          actif?: boolean | null
          code: string
          famille?: string | null
          id?: string
          libelle: string
        }
        Update: {
          actif?: boolean | null
          code?: string
          famille?: string | null
          id?: string
          libelle?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          lien: string | null
          lue: boolean
          message: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          lien?: string | null
          lue?: boolean
          message: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          lien?: string | null
          lue?: boolean
          message?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      roles: {
        Row: {
          code: string
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean
          is_system: boolean
          libelle: string
          updated_at: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          is_system?: boolean
          libelle: string
          updated_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          is_system?: boolean
          libelle?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      roles_permissions: {
        Row: {
          can_create: boolean
          can_delete: boolean
          can_read: boolean
          can_update: boolean
          created_at: string | null
          id: string
          module: string
          role_code: string
          updated_at: string | null
        }
        Insert: {
          can_create?: boolean
          can_delete?: boolean
          can_read?: boolean
          can_update?: boolean
          created_at?: string | null
          id?: string
          module: string
          role_code: string
          updated_at?: string | null
        }
        Update: {
          can_create?: boolean
          can_delete?: boolean
          can_read?: boolean
          can_update?: boolean
          created_at?: string | null
          id?: string
          module?: string
          role_code?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "roles_permissions_role_code_fkey"
            columns: ["role_code"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["code"]
          },
        ]
      }
      sous_tache_lignes_budgetaires: {
        Row: {
          code_ligne: string
          created_at: string | null
          exercice_id: string
          id: string
          libelle_ligne: string
          montant_engage: number
          montant_execute: number
          montant_prevu: number
          nomenclature_id: string
          observations: string | null
          sous_tache_id: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          code_ligne: string
          created_at?: string | null
          exercice_id: string
          id?: string
          libelle_ligne: string
          montant_engage?: number
          montant_execute?: number
          montant_prevu?: number
          nomenclature_id: string
          observations?: string | null
          sous_tache_id: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          code_ligne?: string
          created_at?: string | null
          exercice_id?: string
          id?: string
          libelle_ligne?: string
          montant_engage?: number
          montant_execute?: number
          montant_prevu?: number
          nomenclature_id?: string
          observations?: string | null
          sous_tache_id?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sous_tache_lignes_budgetaires_exercice_id_fkey"
            columns: ["exercice_id"]
            isOneToOne: false
            referencedRelation: "exercices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sous_tache_lignes_budgetaires_nomenclature_id_fkey"
            columns: ["nomenclature_id"]
            isOneToOne: false
            referencedRelation: "nomenclature_budgetaire"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sous_tache_lignes_budgetaires_sous_tache_id_fkey"
            columns: ["sous_tache_id"]
            isOneToOne: false
            referencedRelation: "sous_taches"
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
          objectifs_resultats: string | null
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
          updated_at: string | null
          updated_by: string | null
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
          objectifs_resultats?: string | null
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
          updated_at?: string | null
          updated_by?: string | null
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
          objectifs_resultats?: string | null
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
          updated_at?: string | null
          updated_by?: string | null
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
          updated_at: string | null
          updated_by: string | null
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
          updated_at?: string | null
          updated_by?: string | null
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
          updated_at?: string | null
          updated_by?: string | null
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
          must_change_password: boolean
          nom: string | null
          prenom: string | null
        }
        Insert: {
          actif?: boolean | null
          centre?: string | null
          created_at?: string
          email?: string | null
          id: string
          must_change_password?: boolean
          nom?: string | null
          prenom?: string | null
        }
        Update: {
          actif?: boolean | null
          centre?: string | null
          created_at?: string
          email?: string | null
          id?: string
          must_change_password?: boolean
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
      generate_sous_tache_code: {
        Args: { p_tache_id: string }
        Returns: string
      }
      generate_tache_code: { Args: { p_activite_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      recalculate_extrant_statut: {
        Args: { p_extrant_id: string }
        Returns: undefined
      }
      renumber_extrants: { Args: never; Returns: undefined }
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
