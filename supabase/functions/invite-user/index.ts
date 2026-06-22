import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import nodemailer from "npm:nodemailer@6.9.16";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface InviteRequest {
  email: string;
  full_name: string;
  role: "photographer" | "realtor" | "admin";
}

function generateMessageId(domain: string): string {
  const id = crypto.randomUUID();
  return `<${id}@${domain}>`;
}

function generateTempPassword(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%&*";
  const array = new Uint8Array(20);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => chars[b % chars.length]).join("");
}

function buildInviteHtml(data: {
  name: string;
  role: string;
  inviterName: string;
  tempPassword: string;
  setPasswordUrl: string;
  loginUrl: string;
}): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0; padding:0; background-color:#050505; font-family: 'Helvetica Neue', Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#050505; padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#111111; border-radius:8px; border:1px solid rgba(255,255,255,0.06); overflow:hidden;">
          <!-- Header -->
          <tr>
            <td style="padding:32px 40px 24px; border-bottom:1px solid rgba(255,255,255,0.06);">
              <p style="margin:0; font-size:11px; font-weight:600; letter-spacing:2px; text-transform:uppercase; color:#C8A45D;">
                Fraser Valley Real Estate Photography
              </p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding:40px;">
              <h1 style="margin:0 0 8px; font-size:24px; font-weight:300; color:#F7F3EA; line-height:1.3;">
                You've Been Invited
              </h1>
              <p style="margin:0 0 24px; font-size:14px; color:#A8A29E; line-height:1.6;">
                Hi ${data.name}, ${data.inviterName} has invited you to join Fraser Valley Real Estate Photography as a <strong style="color:#F7F3EA;">${data.role}</strong>.
              </p>

              <!-- Temporary Password Card -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#171717; border-radius:8px; border:1px solid rgba(255,255,255,0.08); margin-bottom:24px;">
                <tr>
                  <td style="padding:20px 24px;">
                    <p style="margin:0 0 12px; font-size:12px; font-weight:600; letter-spacing:1px; text-transform:uppercase; color:#C8A45D;">
                      Your Temporary Password
                    </p>
                    <p style="margin:0 0 12px; font-size:18px; font-family:monospace; color:#F7F3EA; background-color:#0a0a0a; padding:12px 16px; border-radius:4px; border:1px solid rgba(255,255,255,0.1); word-break:break-all;">
                      ${data.tempPassword}
                    </p>
                    <p style="margin:0; font-size:13px; color:#A8A29E;">
                      You can use this password to sign in immediately, or click the button below to choose your own password.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Primary CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
                <tr>
                  <td align="center">
                    <a href="${data.setPasswordUrl}" style="display:inline-block; padding:14px 40px; background-color:#C8A45D; color:#0B0B0B; font-size:14px; font-weight:600; text-decoration:none; border-radius:6px; letter-spacing:0.5px;">
                      Set Your Own Password
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Secondary link -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
                <tr>
                  <td align="center">
                    <a href="${data.loginUrl}" style="font-size:13px; color:#C8A45D; text-decoration:underline;">
                      Or go directly to login
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Note -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:rgba(200,164,93,0.08); border-radius:6px; border:1px solid rgba(200,164,93,0.15);">
                <tr>
                  <td style="padding:16px 20px;">
                    <p style="margin:0; font-size:13px; color:#D4B87A; line-height:1.5;">
                      This invitation expires in 7 days. If you need help, contact your administrator.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px; border-top:1px solid rgba(255,255,255,0.06);">
              <p style="margin:0; font-size:12px; color:#78716C; line-height:1.6;">
                This email was sent by Fraser Valley Real Estate Photography. If you did not expect this email, please disregard it.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function buildInvitePlaintext(data: {
  name: string;
  role: string;
  inviterName: string;
  tempPassword: string;
  setPasswordUrl: string;
  loginUrl: string;
}): string {
  return `Hi ${data.name},

${data.inviterName} has invited you to join Fraser Valley Real Estate Photography as a ${data.role}.

YOUR TEMPORARY PASSWORD:
${data.tempPassword}

You can sign in immediately with this password, or set your own password here:
${data.setPasswordUrl}

Go to login: ${data.loginUrl}

This invitation expires in 7 days.

---
Fraser Valley Real Estate Photography`;
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

    const body: InviteRequest = await req.json();
    if (!body.email || !body.full_name) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: email, full_name" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const role = body.role || "photographer";

    // Check for existing pending invitation
    const { data: existingInvite } = await supabase
      .from("user_invitations")
      .select("id")
      .eq("email", body.email)
      .eq("status", "pending")
      .maybeSingle();

    if (existingInvite) {
      return new Response(
        JSON.stringify({ error: "A pending invitation already exists for this email" }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check for existing auth user
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(u => u.email === body.email);
    if (existingUser) {
      return new Response(
        JSON.stringify({ error: "A user with this email already exists" }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate a temporary password
    const tempPassword = generateTempPassword();

    // Create the auth user with temp password (email_confirm: false so they must verify)
    const { data: createData, error: createError } = await supabase.auth.admin.createUser({
      email: body.email,
      password: tempPassword,
      email_confirm: false,
      user_metadata: { full_name: body.full_name },
    });

    if (createError || !createData.user) {
      return new Response(
        JSON.stringify({ error: `Failed to create user: ${createError?.message || "Unknown error"}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const newUserId = createData.user.id;

    // From here on, if anything fails we must clean up the auth user
    try {
      // Create profile
      const { error: profileErr } = await supabase.from("profiles").upsert({
        id: newUserId,
        email: body.email,
        full_name: body.full_name,
      }, { onConflict: "id" });

      if (profileErr) throw new Error(`Profile creation failed: ${profileErr.message}`);

      // Assign role
      const { error: roleErr } = await supabase.from("user_roles").insert({
        user_id: newUserId,
        role,
      });

      if (roleErr) throw new Error(`Role assignment failed: ${roleErr.message}`);

      // Get inviter name
      const { data: inviterProfile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", caller.id)
        .maybeSingle();

      const inviterName = inviterProfile?.full_name || "An administrator";

      // Record the invitation
      const { error: invErr } = await supabase.from("user_invitations").insert({
        email: body.email,
        full_name: body.full_name,
        role,
        invited_by: caller.id,
        status: "pending",
      });

      if (invErr) throw new Error(`Invitation record failed: ${invErr.message}`);

      // Log audit
      await supabase.from("audit_logs").insert({
        actor_user_id: caller.id,
        actor_label: caller.email,
        action: "user_invited",
        entity_type: "user",
        entity_id: newUserId,
        entity_label: body.email || body.full_name,
        metadata: { email: body.email, role, full_name: body.full_name },
      });

      // Generate a recovery link for "Set Your Own Password"
      const origin = req.headers.get("origin") || "https://listing.fraservalleyphotography.pro";
      let setPasswordUrl = `${origin}/auth/update-password`;

      const { data: linkData } = await supabase.auth.admin.generateLink({
        type: "recovery",
        email: body.email,
        options: { redirectTo: `${origin}/auth/update-password` },
      });

      if (linkData?.properties?.action_link) {
        setPasswordUrl = linkData.properties.action_link;
      }

      const loginUrl = `${origin}/login`;

      // Send single branded email via SMTP
      const smtpHost = Deno.env.get("SMTP_HOST");
      const smtpPort = parseInt(Deno.env.get("SMTP_PORT") || "465");
      const smtpUser = Deno.env.get("SMTP_USER");
      const smtpPassword = Deno.env.get("SMTP_PASSWORD");
      const smtpFrom = Deno.env.get("SMTP_FROM") || '"Fraser Valley Real Estate Photography" <contact@fraservalleyphotography.pro>';

      if (smtpHost && smtpUser && smtpPassword) {
        const transporter = nodemailer.createTransport({
          host: smtpHost,
          port: smtpPort,
          secure: smtpPort === 465,
          auth: { user: smtpUser, pass: smtpPassword },
        });

        const fromDomain = smtpFrom.match(/@([^>]+)/)?.[1] || "fraservalleyphotography.pro";
        const emailData = { name: body.full_name, role, inviterName, tempPassword, setPasswordUrl, loginUrl };

        await transporter.sendMail({
          from: smtpFrom,
          to: body.email,
          replyTo: `"Fraser Valley Real Estate Photography" <contact@${fromDomain}>`,
          subject: `You've been invited to Fraser Valley Real Estate Photography`,
          messageId: generateMessageId(fromDomain),
          headers: {
            "X-Entity-Ref-ID": crypto.randomUUID(),
            "X-Auto-Response-Suppress": "OOF, AutoReply",
            "X-Mailer": "Fraser Valley Real Estate Photography Mailer",
          },
          text: buildInvitePlaintext(emailData),
          html: buildInviteHtml(emailData),
        });
      }

      return new Response(
        JSON.stringify({ success: true, userId: newUserId }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } catch (innerError) {
      // Rollback: delete the auth user we just created
      await supabase.auth.admin.deleteUser(newUserId);
      return new Response(
        JSON.stringify({ error: `Invitation failed: ${String(innerError)}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (error) {
    return new Response(
      JSON.stringify({ error: "Internal server error", details: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
