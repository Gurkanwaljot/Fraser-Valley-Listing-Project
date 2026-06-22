import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import nodemailer from "npm:nodemailer@6.9.16";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface NotifyAccessRequest {
  listingId: string;
  realtorName: string;
  realtorEmail: string;
  accessedAt: string;
}

function generateMessageId(domain: string): string {
  const id = crypto.randomUUID();
  return `<${id}@${domain}>`;
}

function buildEmailPlaintext(
  photographerName: string,
  realtorName: string,
  realtorEmail: string,
  listingTitle: string,
  listingAddress: string,
  accessedAt: string,
  activityUrl: string,
): string {
  const accessDate = new Date(accessedAt).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  return `Hi ${photographerName},

Your media has been accessed! Here are the details:

Property: ${listingTitle}
${listingAddress}

Accessed By: ${realtorName} (${realtorEmail})
Access Time: ${accessDate}

View activity for this listing:
${activityUrl}

---
Fraser Valley Real Estate Photography
This is an automated notification sent when a realtor first accesses your shared media.`;
}

function buildEmailHtml(
  photographerName: string,
  realtorName: string,
  realtorEmail: string,
  listingTitle: string,
  listingAddress: string,
  accessedAt: string,
  activityUrl: string,
): string {
  const accessDate = new Date(accessedAt).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

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
                Your Media Was Accessed
              </h1>
              <p style="margin:0 0 32px; font-size:14px; color:#A8A29E; line-height:1.6;">
                Hi ${photographerName}, a realtor has accessed the download link for one of your listings.
              </p>

              <!-- Property Card -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
                <tr>
                  <td>
                    <p style="margin:0 0 10px; font-size:11px; font-weight:600; letter-spacing:1.5px; text-transform:uppercase; color:#C8A45D;">
                      Property
                    </p>
                    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#171717; border-radius:8px; border:1px solid rgba(255,255,255,0.08);">
                      <tr>
                        <td style="padding:20px 24px;">
                          <p style="margin:0 0 4px; font-size:18px; font-weight:400; color:#F7F3EA;">${listingTitle}</p>
                          <p style="margin:0; font-size:14px; color:#A8A29E;">${listingAddress}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Access Details -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
                <tr>
                  <td>
                    <p style="margin:0 0 10px; font-size:11px; font-weight:600; letter-spacing:1.5px; text-transform:uppercase; color:#C8A45D;">
                      Access Details
                    </p>
                    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#171717; border-radius:8px; border:1px solid rgba(255,255,255,0.08);">
                      <tr>
                        <td style="padding:20px 24px;">
                          <table cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="padding:4px 0; font-size:13px; color:#A8A29E; width:80px; vertical-align:top;">Realtor</td>
                              <td style="padding:4px 0 4px 12px; font-size:14px; color:#F7F3EA;">${realtorName}</td>
                            </tr>
                            <tr>
                              <td style="padding:4px 0; font-size:13px; color:#A8A29E; width:80px; vertical-align:top;">Email</td>
                              <td style="padding:4px 0 4px 12px; font-size:14px; color:#F7F3EA;">
                                <a href="mailto:${realtorEmail}" style="color:#F7F3EA; text-decoration:underline;">${realtorEmail}</a>
                              </td>
                            </tr>
                            <tr>
                              <td style="padding:4px 0; font-size:13px; color:#A8A29E; width:80px; vertical-align:top;">Time</td>
                              <td style="padding:4px 0 4px 12px; font-size:14px; color:#F7F3EA;">${accessDate}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- View Activity Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
                <tr>
                  <td align="center">
                    <a href="${activityUrl}" style="display:inline-block; padding:14px 40px; background-color:#C8A45D; color:#0B0B0B; font-size:14px; font-weight:600; text-decoration:none; border-radius:6px; letter-spacing:0.5px;">
                      View Listing Activity
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px; border-top:1px solid rgba(255,255,255,0.06);">
              <p style="margin:0; font-size:12px; color:#78716C; line-height:1.6;">
                This is an automated notification sent when a realtor first accesses your shared media. No action is required.
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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const smtpHost = Deno.env.get("SMTP_HOST");
    const smtpPort = parseInt(Deno.env.get("SMTP_PORT") || "465");
    const smtpUser = Deno.env.get("SMTP_USER");
    const smtpPassword = Deno.env.get("SMTP_PASSWORD");
    const smtpFrom = Deno.env.get("SMTP_FROM") || '"Fraser Valley Real Estate Photography" <contact@fraservalleyphotography.pro>';

    if (!smtpHost || !smtpUser || !smtpPassword) {
      return new Response(
        JSON.stringify({ error: "SMTP not configured" }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data: NotifyAccessRequest = await req.json();

    if (!data.listingId || !data.realtorName) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data: listing } = await supabase
      .from("listings")
      .select("title, address_line_1, city, province_state, photographer_id")
      .eq("id", data.listingId)
      .single();

    if (!listing) {
      return new Response(
        JSON.stringify({ error: "Listing not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: photographer } = await supabase
      .from("profiles")
      .select("full_name, company_name")
      .eq("id", listing.photographer_id)
      .single();

    if (!photographer) {
      return new Response(
        JSON.stringify({ error: "Photographer not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: authUser } = await supabase.auth.admin.getUserById(listing.photographer_id);
    const photographerEmail = authUser?.user?.email;

    if (!photographerEmail) {
      return new Response(
        JSON.stringify({ error: "Photographer email not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const photographerName = photographer.company_name || photographer.full_name || "Photographer";
    const listingTitle = listing.title;
    const listingAddress = `${listing.address_line_1}, ${listing.city}, ${listing.province_state}`;
    const siteUrl = Deno.env.get("SITE_URL") || "";
    const activityUrl = `${siteUrl}/dashboard/listings/${data.listingId}/activity`;

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: {
        user: smtpUser,
        pass: smtpPassword,
      },
    });

    const fromDomain = smtpFrom.match(/@([^>]+)/)?.[1] || "fraservalleyphotography.pro";

    const html = buildEmailHtml(
      photographerName, data.realtorName, data.realtorEmail,
      listingTitle, listingAddress, data.accessedAt, activityUrl,
    );
    const text = buildEmailPlaintext(
      photographerName, data.realtorName, data.realtorEmail,
      listingTitle, listingAddress, data.accessedAt, activityUrl,
    );

    await transporter.sendMail({
      from: smtpFrom,
      to: photographerEmail,
      replyTo: `"Fraser Valley Real Estate Photography" <contact@${fromDomain}>`,
      subject: `Media accessed \u2014 ${listingTitle} \u2014 ${data.realtorName}`,
      messageId: generateMessageId(fromDomain),
      headers: {
        "X-Entity-Ref-ID": crypto.randomUUID(),
        "X-Auto-Response-Suppress": "OOF, AutoReply",
        "X-Mailer": "Fraser Valley Real Estate Photography Mailer",
      },
      text,
      html,
    });

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: "Failed to send notification", details: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
