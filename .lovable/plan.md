## Plan: GAR/RBM Extrants Integration

### Phase 1 — Database Schema & Data
1. **Migration**: Create 3 tables (`extrants`, `extrants_criteres`, `criteres_sous_taches`) with indexes, RLS policies, and the `recalculate_extrant_statut()` + `cascade_extrant_update()` trigger functions
2. **Data insert**: Insert the 32 official extrants across 5 activités

### Phase 2 — UI: Extrants Page & Components
3. **Rename sidebar**: "Livrables" → "Extrants" with updated route `/extrants`
4. **New Extrants page**: Collapsible sections per activité, status badges, filter tabs
5. **Extrant detail panel**: 3-tab side panel (Informations, Critères, Sous-tâches liées)
6. **3-step wizard modal**: Create new extrant with criteria and sous-tâche links
7. **Remove Livrables tab** from sous-tâche detail panel

### Phase 3 — Auto-calculation & Integration
8. **Hook `useExtrantsData`**: Fetch extrants with criteria and links
9. **Auto-status recalculation**: RPC call after execution updates, React Query invalidation
10. **Manual validation/rejection** UI in detail panel

### Phase 4 — PDF Report Update
11. **Rename report card** to "Rapport d'activité de l'EFO"
12. **Add Volet B** (extrants table) after budget section per activité
13. **Add final summary page** with both budget and extrant KPIs

### Phase 5 — Dashboard & Cadre Logique
14. **Dashboard**: Add extrants KPI card + extrants column in activity matrix
15. **Cadre Logique**: Add extrant production badge on activity cards

### Notes
- Migration runs first, then code changes after types are regenerated
- The `livrables` table stays in DB (historical data) but UI stops using it
- RLS uses `has_role()` function (not profile table lookups as suggested in prompt)
- E28 reference conflict between 30204/30205 will be handled (E28_infra for 30204)
