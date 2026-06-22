import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import nodemailer from "npm:nodemailer@6.9.16";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface MediaSummary {
  photos: number;
  videos: number;
  floorPlans: number;
  documents: number;
  totalSizeBytes: number;
}

interface ShareEmailRequest {
  realtorName: string;
  realtorEmail: string;
  listingTitle: string;
  listingAddress: string;
  listingHeroUrl: string | null;
  listingSlug: string;
  shareToken: string;
  downloadUrl?: string;
  publicListingUrl?: string;
  marketingKitUrl?: string | null;
  realtorPortalUrl?: string | null;
  photographerName: string;
  expiresAt: string;
  mediaSummary?: MediaSummary | null;
}

function generateMessageId(domain: string): string {
  const id = crypto.randomUUID();
  return `<${id}@${domain}>`;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function buildMediaSummaryText(summary: MediaSummary): string {
  const parts: string[] = [];
  if (summary.photos > 0) parts.push(`${summary.photos} Photo${summary.photos !== 1 ? 's' : ''}`);
  if (summary.videos > 0) parts.push(`${summary.videos} Video${summary.videos !== 1 ? 's' : ''}`);
  if (summary.floorPlans > 0) parts.push(`${summary.floorPlans} Floor Plan${summary.floorPlans !== 1 ? 's' : ''}`);
  if (summary.documents > 0) parts.push(`${summary.documents} Document${summary.documents !== 1 ? 's' : ''}`);
  if (parts.length === 0) return '';
  return `${parts.join(' \u00B7 ')} \u00B7 ${formatBytes(summary.totalSizeBytes)}`;
}

function resolveUrls(data: ShareEmailRequest): { downloadUrl: string; publicListingUrl: string; marketingKitUrl: string; realtorPortalUrl: string } {
  const siteUrl = Deno.env.get("SITE_URL") || "";
  const slug = data.listingSlug || "";
  const token = data.shareToken || "";

  const downloadUrl = data.downloadUrl || (siteUrl && slug && token ? `${siteUrl}/?dl=${slug}&t=${token}` : "");
  const publicListingUrl = data.publicListingUrl || (siteUrl && slug ? `${siteUrl}/listing/${slug}` : "");
  const marketingKitUrl = data.marketingKitUrl || (siteUrl && slug && token ? `${siteUrl}/realtor/marketing/${slug}?t=${token}` : "");
  const realtorPortalUrl = data.realtorPortalUrl || (siteUrl ? `${siteUrl}/realtor/listings` : "");

  return { downloadUrl, publicListingUrl, marketingKitUrl, realtorPortalUrl };
}

function buildEmailPlaintext(data: ShareEmailRequest): string {
  const expiryDate = new Date(data.expiresAt).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const urls = resolveUrls(data);
  const mediaPart = data.mediaSummary ? `\nYour Media Package: ${buildMediaSummaryText(data.mediaSummary)}\n` : '';
  const portalPart = urls.realtorPortalUrl ? `\nRealtor Portal -- view all your listings and downloads:\n${urls.realtorPortalUrl}\n` : '';

  return `Hi ${data.realtorName},

Your listing media for ${data.listingTitle} is ready.

${data.listingAddress}
${mediaPart}
=== STEP 1: DOWNLOAD YOUR PHOTOS & VIDEOS ===

Your high-resolution photos, videos, and floor plans are ready:
${urls.downloadUrl}

View the public listing page:
${urls.publicListingUrl}

=== STEP 2: CREATE YOUR FEATURE SHEET ===

Your feature sheet is now created through the Marketing Kit.
Instead of a static PDF, you have access to a professional
Marketing Kit where you can instantly create:

- Feature Sheet / Brochure (8 premium templates in letter and booklet formats)
- Social Media Posts (branded Instagram-ready graphics)
- Video Reels (animated photo slideshows)

No design skills needed -- pick a template and download your PDF.
${urls.marketingKitUrl ? `\nCreate your feature sheet here:\n${urls.marketingKitUrl}\n` : ''}
${portalPart}
---
This download link expires on ${expiryDate}. After that date, you will need to request a new link from the photographer.

---
Fraser Valley Real Estate Photography
This email was sent by Fraser Valley Real Estate Photography. If you did not expect this email, please disregard it.`;
}

function buildEmailHtml(data: ShareEmailRequest): string {
  const expiryDate = new Date(data.expiresAt).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const urls = resolveUrls(data);

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

          ${data.listingHeroUrl ? `
          <!-- Hero Image -->
          <tr>
            <td style="padding:0;">
              <img src="${data.listingHeroUrl}" alt="${data.listingTitle}" style="width:100%; height:240px; object-fit:cover; display:block;" />
            </td>
          </tr>
          ` : ""}

          <!-- BLOCK 1: Photos & Videos -->
          <tr>
            <td style="padding:40px 40px 32px;">
              <p style="margin:0 0 6px; font-size:11px; font-weight:600; letter-spacing:1.5px; text-transform:uppercase; color:#C8A45D;">
                Step 1
              </p>
              <h1 style="margin:0 0 8px; font-size:24px; font-weight:300; color:#F7F3EA; line-height:1.3;">
                Your Photos &amp; Videos are Ready
              </h1>
              <p style="margin:0 0 24px; font-size:14px; color:#A8A29E; line-height:1.6;">
                Hi ${data.realtorName}, your high-resolution photos, videos, and floor plans for the following listing are ready to download:
              </p>

              <!-- Listing Card -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#171717; border-radius:8px; border:1px solid rgba(255,255,255,0.08); margin-bottom:24px;">
                <tr>
                  <td style="padding:20px 24px;">
                    <p style="margin:0 0 4px; font-size:18px; font-weight:400; color:#F7F3EA;">${data.listingTitle}</p>
                    <p style="margin:0; font-size:14px; color:#A8A29E;">${data.listingAddress}</p>
                  </td>
                </tr>
              </table>

              ${data.mediaSummary ? `
              <!-- Media Package Summary -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                <tr>
                  <td>
                    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#171717; border-radius:8px; border:1px solid rgba(200,164,93,0.2);">
                      <tr>
                        <td style="padding:16px 24px;">
                          <p style="margin:0; font-size:15px; color:#F7F3EA; line-height:1.6;">
                            ${buildMediaSummaryText(data.mediaSummary)}
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              ` : ""}

              <!-- Download Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:12px;">
                <tr>
                  <td align="center">
                    <a href="${urls.downloadUrl}" style="display:inline-block; padding:14px 40px; background-color:#C8A45D; color:#0B0B0B; font-size:14px; font-weight:600; text-decoration:none; border-radius:6px; letter-spacing:0.5px;">
                      Download Media Files
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Public Listing link -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${urls.publicListingUrl}" style="font-size:13px; color:#C8A45D; text-decoration:underline;">
                      View Public Listing Page
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding:0 40px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="border-top:1px solid rgba(200,164,93,0.25);"></td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- BLOCK 2: Feature Sheet / Marketing Kit -->
          <tr>
            <td style="padding:32px 40px 40px;">
              <p style="margin:0 0 6px; font-size:11px; font-weight:600; letter-spacing:1.5px; text-transform:uppercase; color:#C8A45D;">
                Step 2
              </p>
              <h2 style="margin:0 0 12px; font-size:22px; font-weight:300; color:#F7F3EA; line-height:1.3;">
                Create Your Feature Sheet
              </h2>
              <p style="margin:0 0 20px; font-size:14px; color:#A8A29E; line-height:1.7;">
                Your feature sheet is now created through the Marketing Kit. Choose from 8 professional templates and download a print-ready PDF in seconds -- no design skills required.
              </p>

              <!-- What's Included List -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#131313; border-radius:8px; border:1px solid rgba(200,164,93,0.15); margin-bottom:24px;">
                <tr>
                  <td style="padding:20px 24px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding:0 0 12px;">
                          <p style="margin:0; font-size:14px; color:#F7F3EA; line-height:1.5;">
                            <span style="color:#C8A45D; font-weight:600;">&#10003;</span>&nbsp;&nbsp;Feature Sheet / Brochure
                            <span style="color:#78716C;"> -- letter &amp; booklet formats</span>
                          </p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:0 0 12px;">
                          <p style="margin:0; font-size:14px; color:#F7F3EA; line-height:1.5;">
                            <span style="color:#C8A45D; font-weight:600;">&#10003;</span>&nbsp;&nbsp;Social Media Posts
                            <span style="color:#78716C;"> -- branded Instagram-ready graphics</span>
                          </p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:0;">
                          <p style="margin:0; font-size:14px; color:#F7F3EA; line-height:1.5;">
                            <span style="color:#C8A45D; font-weight:600;">&#10003;</span>&nbsp;&nbsp;Video Reels
                            <span style="color:#78716C;"> -- animated photo slideshows</span>
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Template Preview Cards -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                <tr>
                  <td>
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td width="48%" valign="top" style="padding-right:8px;">
                          <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#171717; border-radius:8px; border:1px solid rgba(200,164,93,0.2);">
                            <tr>
                              <td style="padding:20px 16px; text-align:center;">
                                <p style="margin:0 0 4px; font-size:20px; color:#C8A45D;">&#9776;</p>
                                <p style="margin:0 0 6px; font-size:14px; font-weight:500; color:#F7F3EA;">Letter Format</p>
                                <p style="margin:0; font-size:11px; color:#78716C; line-height:1.4;">2-page cover + photo gallery</p>
                              </td>
                            </tr>
                          </table>
                        </td>
                        <td width="48%" valign="top" style="padding-left:8px;">
                          <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#171717; border-radius:8px; border:1px solid rgba(200,164,93,0.2);">
                            <tr>
                              <td style="padding:20px 16px; text-align:center;">
                                <p style="margin:0 0 4px; font-size:20px; color:#C8A45D;">&#9998;</p>
                                <p style="margin:0 0 6px; font-size:14px; font-weight:500; color:#F7F3EA;">Booklet Format</p>
                                <p style="margin:0; font-size:11px; color:#78716C; line-height:1.4;">4-page bi-fold brochure</p>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Marketing Kit CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:12px;">
                <tr>
                  <td align="center">
                    <a href="${urls.marketingKitUrl || urls.downloadUrl}" style="display:inline-block; padding:14px 40px; background-color:#C8A45D; color:#0B0B0B; font-size:14px; font-weight:600; text-decoration:none; border-radius:6px; letter-spacing:0.5px;">
                      Create Your Feature Sheet
                    </a>
                  </td>
                </tr>
              </table>

              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <p style="margin:0; font-size:12px; color:#78716C; line-height:1.5;">
                      Takes less than 60 seconds. Pick a template, confirm your photos, and download your PDF.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          ${urls.realtorPortalUrl ? `
          <!-- Realtor Portal -->
          <tr>
            <td style="padding:0 40px 32px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${urls.realtorPortalUrl}" style="display:inline-block; padding:10px 28px; background-color:transparent; color:#C8A45D; font-size:13px; font-weight:500; text-decoration:none; border-radius:6px; border:1px solid rgba(200,164,93,0.3);">
                      Visit Realtor Portal
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          ` : ""}

          <!-- Expiry Notice -->
          <tr>
            <td style="padding:0 40px 32px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:rgba(200,164,93,0.08); border-radius:6px; border:1px solid rgba(200,164,93,0.15);">
                <tr>
                  <td style="padding:16px 20px;">
                    <p style="margin:0; font-size:13px; color:#D4B87A; line-height:1.5;">
                      This download link expires on <strong>${expiryDate}</strong>. After that date, you will need to request a new link from the photographer.
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

    const data: ShareEmailRequest = await req.json();

    if (!data.realtorEmail || !data.listingSlug || !data.shareToken) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: realtorEmail, listingSlug, shareToken" }),
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
      subject: `Your listing media is ready \u2014 ${data.listingTitle}`,
      messageId: generateMessageId(fromDomain),
      headers: {
        "X-Entity-Ref-ID": crypto.randomUUID(),
        "X-Auto-Response-Suppress": "OOF, AutoReply",
        "X-Mailer": "Fraser Valley Real Estate Photography Mailer",
      },
      list: {
        unsubscribe: `mailto:unsubscribe@${fromDomain}?subject=Unsubscribe`,
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
