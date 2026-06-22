import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import nodemailer from "npm:nodemailer@6.9.16";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface LeadEmailRequest {
  senderName: string;
  senderEmail: string;
  senderPhone: string;
  message: string | null;
  listingTitle: string;
  listingAddress: string;
  publicListingUrl: string;
  realtors: Array<{ name: string; email: string }>;
}

function generateMessageId(domain: string): string {
  const id = crypto.randomUUID();
  return `<${id}@${domain}>`;
}

function buildEmailPlaintext(data: LeadEmailRequest, realtorName: string): string {
  let text = `New Inquiry for Your Listing
---

Hi ${realtorName},

Someone is interested in your listing and submitted an inquiry through the public listing page.

PROPERTY:
${data.listingTitle}
${data.listingAddress}

SENDER DETAILS:
Name: ${data.senderName}
Email: ${data.senderEmail}
Phone: ${data.senderPhone}`;

  if (data.message) {
    text += `

MESSAGE:
"${data.message}"`;
  }

  text += `

View the listing page: ${data.publicListingUrl}

---
This inquiry was submitted through the public listing page for your property.
Fraser Valley Real Estate Photography`;

  return text;
}

function buildEmailHtml(data: LeadEmailRequest, realtorName: string): string {
  const messageSection = data.message
    ? `
              <!-- Message -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
                <tr>
                  <td>
                    <p style="margin:0 0 10px; font-size:11px; font-weight:600; letter-spacing:1.5px; text-transform:uppercase; color:#C8A45D;">
                      Message
                    </p>
                    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#171717; border-radius:8px; border:1px solid rgba(255,255,255,0.08); border-left:3px solid #C8A45D;">
                      <tr>
                        <td style="padding:20px 24px;">
                          <p style="margin:0; font-size:14px; color:#F7F3EA; line-height:1.7; font-style:italic;">
                            "${data.message}"
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>`
    : "";

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
                New Inquiry for Your Listing
              </h1>
              <p style="margin:0 0 32px; font-size:14px; color:#A8A29E; line-height:1.6;">
                Hi ${realtorName}, someone is interested in your listing and submitted an inquiry through the public listing page.
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
                          <p style="margin:0 0 4px; font-size:18px; font-weight:400; color:#F7F3EA;">${data.listingTitle}</p>
                          <p style="margin:0; font-size:14px; color:#A8A29E;">${data.listingAddress}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Sender Details -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
                <tr>
                  <td>
                    <p style="margin:0 0 10px; font-size:11px; font-weight:600; letter-spacing:1.5px; text-transform:uppercase; color:#C8A45D;">
                      Sender Details
                    </p>
                    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#171717; border-radius:8px; border:1px solid rgba(255,255,255,0.08);">
                      <tr>
                        <td style="padding:20px 24px;">
                          <table cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="padding:4px 0; font-size:13px; color:#A8A29E; width:60px; vertical-align:top;">Name</td>
                              <td style="padding:4px 0 4px 12px; font-size:14px; color:#F7F3EA;">${data.senderName}</td>
                            </tr>
                            <tr>
                              <td style="padding:4px 0; font-size:13px; color:#A8A29E; width:60px; vertical-align:top;">Email</td>
                              <td style="padding:4px 0 4px 12px; font-size:14px; color:#F7F3EA;">
                                <a href="mailto:${data.senderEmail}" style="color:#F7F3EA; text-decoration:underline;">${data.senderEmail}</a>
                              </td>
                            </tr>
                            <tr>
                              <td style="padding:4px 0; font-size:13px; color:#A8A29E; width:60px; vertical-align:top;">Phone</td>
                              <td style="padding:4px 0 4px 12px; font-size:14px; color:#F7F3EA;">
                                <a href="tel:${data.senderPhone}" style="color:#F7F3EA; text-decoration:underline;">${data.senderPhone}</a>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
${messageSection}
              <!-- View Listing Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
                <tr>
                  <td align="center">
                    <a href="${data.publicListingUrl}" style="display:inline-block; padding:14px 40px; background-color:#C8A45D; color:#0B0B0B; font-size:14px; font-weight:600; text-decoration:none; border-radius:6px; letter-spacing:0.5px;">
                      View Listing Page
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Reply Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
                <tr>
                  <td align="center">
                    <a href="mailto:${data.senderEmail}?subject=Re: ${encodeURIComponent(data.listingTitle)}" style="display:inline-block; padding:12px 32px; background-color:transparent; color:#C8A45D; font-size:14px; font-weight:500; text-decoration:none; border-radius:6px; border:1px solid rgba(200,164,93,0.4);">
                      Reply to Sender
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Origin Notice -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:rgba(200,164,93,0.08); border-radius:6px; border:1px solid rgba(200,164,93,0.15);">
                <tr>
                  <td style="padding:16px 20px;">
                    <p style="margin:0; font-size:13px; color:#D4B87A; line-height:1.5;">
                      This inquiry was submitted through the public listing page for <strong>${data.listingTitle}</strong>. This is not spam &mdash; someone actively filled in the contact form on your property's page.
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
                This email was sent by Fraser Valley Real Estate Photography on behalf of a potential buyer. Reply directly to the sender using the contact details above or the Reply button.
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
    const smtpFrom =
      Deno.env.get("SMTP_FROM") ||
      '"Fraser Valley Real Estate Photography" <contact@fraservalleyphotography.pro>';

    if (!smtpHost || !smtpUser || !smtpPassword) {
      return new Response(
        JSON.stringify({ error: "SMTP not configured" }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data: LeadEmailRequest = await req.json();

    if (!data.senderName || !data.senderEmail || !data.senderPhone || !data.listingTitle || !data.realtors?.length) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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
    const subject = `New Inquiry: ${data.listingTitle} — ${data.senderName}`;

    const results = await Promise.allSettled(
      data.realtors
        .filter((r) => r.email)
        .map((realtor) =>
          transporter.sendMail({
            from: smtpFrom,
            to: realtor.email,
            replyTo: `"${data.senderName}" <${data.senderEmail}>`,
            subject,
            messageId: generateMessageId(fromDomain),
            headers: {
              "X-Entity-Ref-ID": crypto.randomUUID(),
              "X-Auto-Response-Suppress": "OOF, AutoReply",
              "X-Mailer": "Fraser Valley Real Estate Photography Mailer",
            },
            text: buildEmailPlaintext(data, realtor.name),
            html: buildEmailHtml(data, realtor.name),
          })
        )
    );

    const sent = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;

    return new Response(
      JSON.stringify({ success: true, sent, failed }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: "Failed to send lead emails", details: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
