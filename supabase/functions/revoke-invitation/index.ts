import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface RevokeRequest {
  invitationId: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Verify the caller is an admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller } } = await callerClient.auth.getUser();
    if (!caller) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check admin role
    const { data: adminRole } = await supabase
      .from("user_roles")
      .select("id")
      .eq("user_id", caller.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!adminRole) {
      return new Response(
        JSON.stringify({ error: "Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: RevokeRequest = await req.json();
    if (!body.invitationId) {
      return new Response(
        JSON.stringify({ error: "Missing required field: invitationId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch the invitation
    const { data: invitation, error: invErr } = await supabase
      .from("user_invitations")
      .select("*")
      .eq("id", body.invitationId)
      .eq("status", "pending")
      .maybeSingle();

    if (invErr || !invitation) {
      return new Response(
        JSON.stringify({ error: "Pending invitation not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Mark invitation as revoked
    await supabase
      .from("user_invitations")
      .update({ status: "revoked" })
      .eq("id", invitation.id);

    // Find and delete the auth user created during invite
    const { data: userList } = await supabase.auth.admin.listUsers();
    const authUser = userList?.users?.find(u => u.email === invitation.email);

    if (authUser) {
      // Clean up profile and roles first
      await supabase.from("user_roles").delete().eq("user_id", authUser.id);
      await supabase.from("profiles").delete().eq("id", authUser.id);
      // Delete the auth user so the invite link dies
      await supabase.auth.admin.deleteUser(authUser.id);
    }

    // Audit log
    await supabase.from("audit_logs").insert({
      actor_user_id: caller.id,
      actor_label: caller.email,
      action: "invitation_revoked",
      entity_type: "invitation",
      entity_id: invitation.id,
      entity_label: invitation.email,
      metadata: { email: invitation.email, auth_user_deleted: !!authUser },
    });

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: "Internal server error", details: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
