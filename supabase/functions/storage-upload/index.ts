import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { AwsClient } from "npm:aws4fetch@1.0.20";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const accountId = Deno.env.get("CLOUDFLARE_ACCOUNT_ID");
    const accessKeyId = Deno.env.get("R2_ACCESS_KEY_ID");
    const secretAccessKey = Deno.env.get("R2_SECRET_ACCESS_KEY");
    const bucketName = Deno.env.get("R2_BUCKET_NAME") || "lumen-listings-media";
    const publicBaseUrl = Deno.env.get("R2_PUBLIC_BASE_URL");

    if (!accountId || !accessKeyId || !secretAccessKey) {
      return new Response(
        JSON.stringify({
          error: "Storage not configured",
          message: "Cloudflare R2 credentials are not set.",
          setupGuide: "/setup/r2",
        }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { filename, contentType, listingId } = await req.json();

    if (!filename || !contentType || !listingId) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: filename, contentType, listingId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const timestamp = Date.now();
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
    const key = `listings/${listingId}/${timestamp}-${sanitizedFilename}`;

    const endpoint = `https://${accountId}.r2.cloudflarestorage.com`;
    const objectUrl = `${endpoint}/${bucketName}/${key}`;

    const aws = new AwsClient({
      accessKeyId,
      secretAccessKey,
      region: "auto",
      service: "s3",
    });

    // Generate a presigned URL valid for 15 minutes — browser PUTs directly to R2
    const presigned = await aws.sign(objectUrl, {
      method: "PUT",
      headers: { "Content-Type": contentType },
      aws: { signQuery: true, expiresIn: 900 },
    });

    const publicUrl = publicBaseUrl ? `${publicBaseUrl}/${key}` : null;

    return new Response(
      JSON.stringify({
        uploadUrl: presigned.url,
        key,
        publicUrl,
        bucket: bucketName,
        contentType,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: "Internal server error", details: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
