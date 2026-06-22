import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface DeleteRequest {
  userId: string;
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

    const body: DeleteRequest = await req.json();
    if (!body.userId) {
      return new Response(
        JSON.stringify({ error: "Missing required field: userId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const targetUserId = body.userId;

    // Cannot delete yourself
    if (targetUserId === caller.id) {
      return new Response(
        JSON.stringify({ error: "You cannot delete your own account" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if target is the last remaining admin
    const { data: targetAdminRole } = await supabase
      .from("user_roles")
      .select("id")
      .eq("user_id", targetUserId)
      .eq("role", "admin")
      .maybeSingle();

    if (targetAdminRole) {
      const { count } = await supabase
        .from("user_roles")
        .select("id", { count: "exact", head: true })
        .eq("role", "admin");

      if (count !== null && count <= 1) {
        return new Response(
          JSON.stringify({ error: "Cannot delete the last remaining admin" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Reassign listings to the acting admin
    const { data: reassignedListings } = await supabase
      .from("listings")
      .update({ photographer_id: caller.id })
      .eq("photographer_id", targetUserId)
      .select("id");

    const listingCount = reassignedListings?.length || 0;

    // Reassign media_assets uploaded_by
    await supabase
      .from("media_assets")
      .update({ uploaded_by: caller.id })
      .eq("uploaded_by", targetUserId);

    // Reassign listing_realtors assigned_by
    await supabase
      .from("listing_realtors")
      .update({ assigned_by: caller.id })
      .eq("assigned_by", targetUserId);

    // Reassign listing_shares shared_by
    await supabase
      .from("listing_shares")
      .update({ shared_by: caller.id })
      .eq("shared_by", targetUserId);

    // Reassign realtors created_by
    await supabase
      .from("realtors")
      .update({ created_by: caller.id })
      .eq("created_by", targetUserId);

    // Delete user_roles for target
    await supabase
      .from("user_roles")
      .delete()
      .eq("user_id", targetUserId);

    // Delete profile (will cascade from auth.users deletion, but clean explicitly)
    await supabase
      .from("profiles")
      .delete()
      .eq("id", targetUserId);

    // Delete any pending invitations for this user's email
    const { data: targetUser } = await supabase.auth.admin.getUserById(targetUserId);
    if (targetUser?.user?.email) {
      await supabase
        .from("user_invitations")
        .update({ status: "revoked" })
        .eq("email", targetUser.user.email)
        .eq("status", "pending");
    }

    // Delete the auth user
    const { error: deleteErr } = await supabase.auth.admin.deleteUser(targetUserId);
    if (deleteErr) {
      return new Response(
        JSON.stringify({ error: `Failed to delete auth user: ${deleteErr.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Audit log
    await supabase.from("audit_logs").insert({
      actor_user_id: caller.id,
      actor_label: caller.email,
      action: "user_deleted",
      entity_type: "user",
      entity_id: targetUserId,
      entity_label: targetUser?.user?.email || targetUserId,
      metadata: {
        reassigned_to: caller.id,
        listing_count: listingCount,
        target_email: targetUser?.user?.email,
      },
    });

    return new Response(
      JSON.stringify({ success: true, listingsReassigned: listingCount }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: "Internal server error", details: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
