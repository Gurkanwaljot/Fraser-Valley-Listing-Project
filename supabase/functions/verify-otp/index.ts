import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface VerifyRequest {
  email: string;
  code: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const data: VerifyRequest = await req.json();

    if (!data.email || !data.code) {
      return new Response(
        JSON.stringify({ valid: false, error: "Missing required fields: email, code" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data: otpRow, error: lookupError } = await supabase
      .from("otp_codes")
      .select("id, expires_at")
      .eq("email", data.email.toLowerCase())
      .eq("code", data.code)
      .is("verified_at", null)
      .gte("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (lookupError || !otpRow) {
      return new Response(
        JSON.stringify({ valid: false, error: "Invalid or expired code" }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    await supabase
      .from("otp_codes")
      .update({ verified_at: new Date().toISOString() })
      .eq("id", otpRow.id);

    const { data: linkData, error: linkError } =
      await supabase.auth.admin.generateLink({
        type: "magiclink",
        email: data.email.toLowerCase(),
      });

    if (linkError || !linkData) {
      return new Response(
        JSON.stringify({ valid: false, error: "Failed to generate session link" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const tokenHash = linkData.properties.hashed_token;

    if (!tokenHash) {
      return new Response(
        JSON.stringify({ valid: false, error: "Failed to generate auth token" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Link realtor record to auth user (service_role bypasses RLS)
    const userId = linkData.user.id;
    if (userId) {
      const { data: realtor } = await supabase
        .from("realtors")
        .select("id")
        .eq("email", data.email.toLowerCase())
        .is("auth_user_id", null)
        .maybeSingle();

      if (realtor) {
        await supabase
          .from("realtors")
          .update({ auth_user_id: userId })
          .eq("id", realtor.id);
      }

      // Ensure user_roles entry exists
      const { data: existingRole } = await supabase
        .from("user_roles")
        .select("id")
        .eq("user_id", userId)
        .eq("role", "realtor")
        .maybeSingle();

      if (!existingRole) {
        await supabase
          .from("user_roles")
          .insert({ user_id: userId, role: "realtor" });
      }
    }

    return new Response(
      JSON.stringify({
        valid: true,
        token_hash: tokenHash,
        type: "magiclink",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ valid: false, error: "Verification failed", details: String(error) }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
