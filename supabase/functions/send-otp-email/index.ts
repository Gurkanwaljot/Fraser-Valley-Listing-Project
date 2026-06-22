import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import nodemailer from "npm:nodemailer@6.9.16";
import { createClient } from "npm:@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface OtpRequest {
  email: string;
  realtorName?: string;
  shareToken?: string;
}

function generateOtp(): string {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return String(array[0] % 1000000).padStart(6, "0");
}

function generateMessageId(domain: string): string {
  const id = crypto.randomUUID();
  return `<${id}@${domain}>`;
}

function buildOtpEmailHtml(code: string, realtorName?: string): string {
  const greeting = realtorName ? `Hi ${realtorName},` : "Hi,";

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
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
                Your Verification Code
              </h1>
              <p style="margin:0 0 32px; font-size:14px; color:#A8A29E; line-height:1.6;">
                ${greeting} Use the code below to verify your identity and access your listing downloads.
              </p>

              <!-- Code Block -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
                <tr>
                  <td align="center">
                    <table cellpadding="0" cellspacing="0" style="background-color:#171717; border-radius:8px; border:1px solid rgba(200,164,93,0.25);">
                      <tr>
                        <td style="padding:24px 48px;">
                          <p style="margin:0; font-size:36px; font-weight:600; font-family:'Courier New', monospace; color:#F7F3EA; letter-spacing:8px; text-align:center;">
                            ${code}
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Expiry Notice -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:rgba(200,164,93,0.08); border-radius:6px; border:1px solid rgba(200,164,93,0.15);">
                <tr>
                  <td style="padding:16px 20px;">
                    <p style="margin:0; font-size:13px; color:#D4B87A; line-height:1.5;">
                      This code expires in <strong>10 minutes</strong>. If you did not request this code, please ignore this email.
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
                This is an automated message from Fraser Valley Real Estate Photography. Please do not reply to this email.
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

function buildOtpPlaintext(code: string, realtorName?: string): string {
  const greeting = realtorName ? `Hi ${realtorName},` : "Hi,";
  return `${greeting}

Your verification code is: ${code}

Use this code to verify your identity and access your listing downloads.

This code expires in 10 minutes. If you did not request this code, please ignore this email.

---
Fraser Valley Real Estate Photography`;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const smtpHost = Deno.env.get("SMTP_HOST");
    const smtpPort = parseInt(Deno.env.get("SMTP_PORT") || "465");
    const smtpUser = Deno.env.get("SMTP_USER");
    const smtpPassword = Deno.env.get("SMTP_PASSWORD");
    const smtpFrom =
      Deno.env.get("SMTP_FROM") ||
      '"Fraser Valley Real Estate Photography" <contact@fraservalleyphotography.pro>';
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!smtpHost || !smtpUser || !smtpPassword) {
      return new Response(
        JSON.stringify({ error: "SMTP not configured" }),
        {
          status: 503,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const data: OtpRequest = await req.json();

    if (!data.email) {
      return new Response(
        JSON.stringify({ error: "Missing required field: email" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Validate that the email belongs to a known, non-archived realtor
    const { data: realtor } = await supabase
      .from("realtors")
      .select("id, full_name")
      .eq("email", data.email.toLowerCase())
      .eq("is_archived", false)
      .maybeSingle();

    if (!realtor) {
      return new Response(
        JSON.stringify({
          error: "This email is not registered in our system.",
          code: "REALTOR_NOT_FOUND",
        }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Rate limiting: max 5 OTP codes per email per hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count: recentAttempts } = await supabase
      .from("otp_codes")
      .select("id", { count: "exact", head: true })
      .eq("email", data.email.toLowerCase())
      .gte("created_at", oneHourAgo);

    if (recentAttempts !== null && recentAttempts >= 5) {
      return new Response(
        JSON.stringify({
          error: "Too many attempts. Please wait before trying again.",
          code: "RATE_LIMITED",
        }),
        {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (data.shareToken) {
      const { data: share } = await supabase
        .from("listing_shares")
        .select("realtor_id, realtors(email)")
        .eq("share_token", data.shareToken)
        .maybeSingle();

      const realtorEmail = (share?.realtors as { email: string } | null)?.email;
      if (realtorEmail && realtorEmail.toLowerCase() !== data.email.toLowerCase()) {
        return new Response(
          JSON.stringify({ error: "Email does not match the realtor on this share" }),
          {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

    // Use the realtor name from the database for personalization
    const realtorName = data.realtorName || realtor.full_name;

    const code = generateOtp();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    await supabase
      .from("otp_codes")
      .delete()
      .eq("email", data.email.toLowerCase())
      .is("verified_at", null);

    const { error: insertError } = await supabase.from("otp_codes").insert({
      email: data.email.toLowerCase(),
      code,
      expires_at: expiresAt,
    });

    if (insertError) {
      return new Response(
        JSON.stringify({ error: "Failed to generate code" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const fromDomain = smtpFrom.match(/@([^>]+)/)?.[1] || "fraservalleyphotography.pro";

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: {
        user: smtpUser,
        pass: smtpPassword,
      },
    });

    await transporter.sendMail({
      from: smtpFrom,
      to: data.email,
      replyTo: `"Fraser Valley Real Estate Photography" <contact@${fromDomain}>`,
      subject: "Your Verification Code - Fraser Valley Real Estate Photography",
      messageId: generateMessageId(fromDomain),
      priority: "high",
      headers: {
        "X-Entity-Ref-ID": crypto.randomUUID(),
        "X-Auto-Response-Suppress": "OOF, AutoReply",
        "X-Mailer": "Fraser Valley Real Estate Photography Mailer",
      },
      text: buildOtpPlaintext(code, realtorName),
      html: buildOtpEmailHtml(code, realtorName),
    });

    return new Response(JSON.stringify({ success: true, realtorName: realtor.full_name }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: "Failed to send verification email",
        details: String(error),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
