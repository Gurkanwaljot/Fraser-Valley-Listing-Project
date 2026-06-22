import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import nodemailer from "npm:nodemailer@6.9.16";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface DownloadConfirmationRequest {
  realtorName: string;
  realtorEmail: string;
  listingTitle: string;
  listingAddress: string;
  downloadCategory: string;
  fileCount: number;
  totalSizeFormatted: string;
  redownloadUrl: string;
  expiresAt: string;
}

function generateMessageId(domain: string): string {
  const id = crypto.randomUUID();
  return `<${id}@${domain}>`;
}

function buildEmailPlaintext(data: DownloadConfirmationRequest): string {
  const expiryDate = new Date(data.expiresAt).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return `Hi ${data.realtorName},

Your download is complete! Here's a summary:

Property: ${data.listingTitle}
${data.listingAddress}

Downloaded: ${data.downloadCategory}
Files: ${data.fileCount}
Total Size: ${data.totalSizeFormatted}

Need to download again? Use this link:
${data.redownloadUrl}

This link expires on ${expiryDate}.

---
Fraser Valley Real Estate Photography
This email was sent as a download confirmation. If you did not expect this email, please disregard it.`;
}

function buildEmailHtml(data: DownloadConfirmationRequest): string {
  const expiryDate = new Date(data.expiresAt).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
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
                Download Complete
              </h1>
              <p style="margin:0 0 32px; font-size:14px; color:#A8A29E; line-height:1.6;">
                Hi ${data.realtorName}, your media download has been completed successfully.
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

              <!-- Download Summary -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
                <tr>
                  <td>
                    <p style="margin:0 0 10px; font-size:11px; font-weight:600; letter-spacing:1.5px; text-transform:uppercase; color:#C8A45D;">
                      Download Summary
                    </p>
                    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#171717; border-radius:8px; border:1px solid rgba(255,255,255,0.08);">
                      <tr>
                        <td style="padding:20px 24px;">
                          <table cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="padding:4px 0; font-size:13px; color:#A8A29E; width:80px; vertical-align:top;">Category</td>
                              <td style="padding:4px 0 4px 12px; font-size:14px; color:#F7F3EA;">${data.downloadCategory}</td>
                            </tr>
                            <tr>
                              <td style="padding:4px 0; font-size:13px; color:#A8A29E; width:80px; vertical-align:top;">Files</td>
                              <td style="padding:4px 0 4px 12px; font-size:14px; color:#F7F3EA;">${data.fileCount} file${data.fileCount !== 1 ? 's' : ''}</td>
                            </tr>
                            <tr>
                              <td style="padding:4px 0; font-size:13px; color:#A8A29E; width:80px; vertical-align:top;">Size</td>
                              <td style="padding:4px 0 4px 12px; font-size:14px; color:#F7F3EA;">${data.totalSizeFormatted}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Re-Download Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
                <tr>
                  <td align="center">
                    <a href="${data.redownloadUrl}" style="display:inline-block; padding:14px 40px; background-color:#C8A45D; color:#0B0B0B; font-size:14px; font-weight:600; text-decoration:none; border-radius:6px; letter-spacing:0.5px;">
                      Re-Download Media
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Expiry Notice -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:rgba(200,164,93,0.08); border-radius:6px; border:1px solid rgba(200,164,93,0.15);">
                <tr>
                  <td style="padding:16px 20px;">
                    <p style="margin:0; font-size:13px; color:#D4B87A; line-height:1.5;">
                      Need to download again? Use the button above before your link expires on <strong>${expiryDate}</strong>.
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
                This email was sent by Fraser Valley Real Estate Photography as a download confirmation. If you did not expect this email, please disregard it.
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

    const data: DownloadConfirmationRequest = await req.json();

    if (!data.realtorEmail || !data.redownloadUrl) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: realtorEmail, redownloadUrl" }),
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

    const html = buildEmailHtml(data);
    const text = buildEmailPlaintext(data);
    const fromDomain = smtpFrom.match(/@([^>]+)/)?.[1] || "fraservalleyphotography.pro";

    await transporter.sendMail({
      from: smtpFrom,
      to: data.realtorEmail,
      replyTo: `"Fraser Valley Real Estate Photography" <contact@${fromDomain}>`,
      subject: `Download complete \u2014 ${data.listingTitle}`,
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
      JSON.stringify({ error: "Failed to send email", details: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
