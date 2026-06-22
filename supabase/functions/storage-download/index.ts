import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { AwsClient } from "npm:aws4fetch@1.0.20";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface DownloadRequest {
  key: string;
  expiresIn?: number;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { key, expiresIn = 3600 }: DownloadRequest = await req.json();

    if (!key) {
      return new Response(
        JSON.stringify({ error: "Missing required field: key" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const accountId = Deno.env.get("CLOUDFLARE_ACCOUNT_ID");
    const accessKeyId = Deno.env.get("R2_ACCESS_KEY_ID");
    const secretAccessKey = Deno.env.get("R2_SECRET_ACCESS_KEY");
    const bucketName = Deno.env.get("R2_BUCKET_NAME") || "lumen-listings-media";

    if (!accountId || !accessKeyId || !secretAccessKey) {
      return new Response(
        JSON.stringify({ error: "Storage not configured" }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const endpoint = `https://${accountId}.r2.cloudflarestorage.com`;
    const objectUrl = `${endpoint}/${bucketName}/${key}`;

    const aws = new AwsClient({
      accessKeyId,
      secretAccessKey,
      region: "auto",
      service: "s3",
    });

    const signedRequest = await aws.sign(
      new Request(objectUrl, { method: "GET" }),
      { aws: { signQuery: true }, expiresIn }
    );

    return new Response(
      JSON.stringify({ url: signedRequest.url }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: "Internal server error", details: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
