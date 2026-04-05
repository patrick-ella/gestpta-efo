import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: { user: caller } } = await supabaseAdmin.auth.getUser(token);
    if (!caller) throw new Error("Non autorisé");

    const { data: roleCheck } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .in("role", ["super_admin", "admin_pta"])
      .limit(1)
      .maybeSingle();

    if (!roleCheck) throw new Error("Accès réservé aux administrateurs");

    const { action, ...payload } = await req.json();

    if (action === "create_user") {
      const { email, password, nom, prenom, role, centre } = payload;
      const { data: newUser, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });
      if (createErr) throw createErr;

      await supabaseAdmin.from("users_profiles").upsert({
        id: newUser.user.id, email, nom, prenom, centre, actif: true,
      });

      if (role && role !== "consultant") {
        await supabaseAdmin.from("user_roles").upsert({
          user_id: newUser.user.id, role,
        });
      }

      return new Response(JSON.stringify({ user: newUser.user }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "bulk_import") {
      const { agents } = payload as {
        agents: {
          prenom: string; nom: string; email: string; matricule: string;
          direction: string; service: string; poste: string;
          emailN1: string; dateRecr: string | null; dateReclas: string | null;
          anciennete: string; importAction: "create" | "update";
        }[];
      };

      const results: { email: string; nom: string; prenom: string; matricule: string; action: string; tempPassword?: string; status: string; error?: string }[] = [];

      // Process all agents
      for (const agent of agents) {
        try {
          if (agent.importAction === "create") {
            const tempPw = `EFO@${Math.floor(1000 + Math.random() * 9000)}`;
            const { data: newUser, error: createErr } = await supabaseAdmin.auth.admin.createUser({
              email: agent.email,
              password: tempPw,
              email_confirm: true,
            });
            if (createErr) throw createErr;

            await supabaseAdmin.from("users_profiles").upsert({
              id: newUser.user.id, email: agent.email, nom: agent.nom, prenom: agent.prenom, actif: true,
            });

            await supabaseAdmin.from("agents_profils").upsert({
              user_id: newUser.user.id,
              matricule: agent.matricule || null,
              direction: agent.direction || null,
              service: agent.service || null,
              poste_travail: agent.poste || null,
              date_recrutement: agent.dateRecr || null,
              date_reclassement: agent.dateReclas || null,
              anciennete_poste: agent.anciennete || null,
            }, { onConflict: "user_id" });

            results.push({ email: agent.email, nom: agent.nom, prenom: agent.prenom, matricule: agent.matricule, action: "created", tempPassword: tempPw, status: "ok" });
          } else {
            // Update existing
            const { data: existing } = await supabaseAdmin.from("users_profiles").select("id").eq("email", agent.email).single();
            if (!existing) throw new Error("Agent introuvable");

            await supabaseAdmin.from("users_profiles").update({ nom: agent.nom, prenom: agent.prenom }).eq("id", existing.id);

            await supabaseAdmin.from("agents_profils").upsert({
              user_id: existing.id,
              matricule: agent.matricule || null,
              direction: agent.direction || null,
              service: agent.service || null,
              poste_travail: agent.poste || null,
              date_recrutement: agent.dateRecr || null,
              date_reclassement: agent.dateReclas || null,
              anciennete_poste: agent.anciennete || null,
            }, { onConflict: "user_id" });

            results.push({ email: agent.email, nom: agent.nom, prenom: agent.prenom, matricule: agent.matricule, action: "updated", status: "ok" });
          }
        } catch (err) {
          results.push({ email: agent.email, nom: agent.nom, prenom: agent.prenom, matricule: agent.matricule, action: agent.importAction, status: "error", error: err.message });
        }
      }

      // Resolve N+1 links
      for (const agent of agents) {
        if (!agent.emailN1) continue;
        try {
          const { data: sup } = await supabaseAdmin.from("users_profiles").select("id").eq("email", agent.emailN1.toLowerCase()).single();
          if (!sup) continue;
          const { data: ag } = await supabaseAdmin.from("users_profiles").select("id").eq("email", agent.email).single();
          if (!ag) continue;
          await supabaseAdmin.from("agents_profils").update({ superieur_id: sup.id }).eq("user_id", ag.id);
        } catch { /* skip */ }
      }

      return new Response(JSON.stringify({ results }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "update_role") {
      const { user_id, role } = payload;
      await supabaseAdmin.from("user_roles").delete().eq("user_id", user_id);
      await supabaseAdmin.from("user_roles").insert({ user_id, role });
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "toggle_active") {
      const { user_id, actif } = payload;
      await supabaseAdmin.from("users_profiles").update({ actif }).eq("id", user_id);
      if (!actif) {
        await supabaseAdmin.auth.admin.updateUserById(user_id, { ban_duration: "876600h" });
      } else {
        await supabaseAdmin.auth.admin.updateUserById(user_id, { ban_duration: "none" });
      }
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "reset_password") {
      const { email } = payload;
      await supabaseAdmin.auth.resetPasswordForEmail(email);
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error("Action inconnue");
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
