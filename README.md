# GPerf-EFO

**Système de Gestion de la Performance de l'École de Formation en Aéronautique (EFO) — Cameroon Civil Aviation Authority (CCAA)**

Sous-programme 3 · Action 302

---

## Stack technique

| Couche | Technologie |
|--------|-------------|
| Frontend | React 18 · TypeScript · Vite |
| UI | Tailwind CSS · shadcn/ui · Recharts |
| Backend | Lovable Cloud (PostgreSQL, Auth, Storage, Edge Functions) |
| Rapports | jsPDF + jspdf-autotable (PDF) · SheetJS (Excel) |

## Variables d'environnement

Le fichier `.env` est généré automatiquement par Lovable Cloud :

```
VITE_SUPABASE_URL=<auto>
VITE_SUPABASE_PUBLISHABLE_KEY=<auto>
```

## Données initiales (seeding)

1. Créer un exercice budgétaire (année 2026, statut « actif »)
2. Insérer les 7 activités avec leurs codes (ex. 30201 … 30207)
3. Insérer les tâches rattachées à chaque activité
4. Insérer les 69 sous-tâches avec budgets prévisionnels et trimestres programmés
5. Insérer les indicateurs KPI du cadre logique

Les données peuvent être saisies via l'interface (PTA → Arborescence) ou importées en SQL.

## Rôles utilisateurs et permissions

| Rôle | Accès |
|------|-------|
| `super_admin` | Accès complet (utilisateurs, paramètres, toutes les données) |
| `admin_pta` | Gestion complète du PTA, exécutions, rapports |
| `responsable_activite` | Lecture globale, modification des exécutions de ses activités |
| `agent_saisie` | Saisie des exécutions, sous-tâches et livrables |
| `consultant` | Lecture seule sur l'ensemble des données |

Les rôles sont stockés dans la table `user_roles` avec des politiques RLS sur chaque table.

## Génération de rapports

Depuis la page **Rapports** :

- **Rapport mensuel** (PDF) — exécution détaillée par sous-tâche, alertes retards
- **Rapport trimestriel** (PDF) — comparatif prévu/réalisé, KPI, analyse des écarts
- **Export PTA complet** (Excel) — arborescence activités → tâches → sous-tâches
- **Récapitulatif budgétaire** (Excel) — budget prévu vs réalisé par activité
- **Calendrier d'exécution** (Excel) — programmation trimestrielle

Tous les rapports PDF incluent l'en-tête officiel EFO/CCAA avec logo et pieds de page numérotés.

## Développement local

```bash
npm install
npm run dev
```

## Déploiement

Le projet est déployé via **Lovable** (publication intégrée). Cliquer sur « Publier » dans l'éditeur.

---

© 2026 EFO / CCAA — Tous droits réservés
