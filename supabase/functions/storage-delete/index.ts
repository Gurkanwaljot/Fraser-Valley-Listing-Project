import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { AwsClient } from "npm:aws4fetch@1.0.20";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface DeleteRequest {
  key?: string;
  keys?: string[];
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const body: DeleteRequest = await req.json();
    const keysToDelete: string[] = [];

    if (body.keys && Array.isArray(body.keys)) {
      keysToDelete.push(...body.keys.filter((k) => typeof k === "string" && k.length > 0));
    } else if (body.key && typeof body.key === "string") {
      keysToDelete.push(body.key);
    }

    if (keysToDelete.length === 0) {
      return new Response(
        JSON.stringify({ error: "Missing required field: key or keys" }),
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
    const aws = new AwsClient({
      accessKeyId,
      secretAccessKey,
      region: "auto",
      service: "s3",
    });

    const results: { key: string; success: boolean; error?: string }[] = [];

    for (const key of keysToDelete) {
      try {
        const objectUrl = `${endpoint}/${bucketName}/${key}`;
        const response = await aws.fetch(objectUrl, { method: "DELETE" });
        if (!response.ok && response.status !== 204 && response.status !== 404) {
          const errorText = await response.text();
          results.push({ key, success: false, error: `${response.status}: ${errorText}` });
        } else {
          results.push({ key, success: true });
        }
      } catch (err) {
        results.push({ key, success: false, error: err instanceof Error ? err.message : String(err) });
      }
    }

    const allSuccess = results.every((r) => r.success);
    return new Response(
      JSON.stringify({
        success: allSuccess,
        deleted: results.filter((r) => r.success).length,
        failed: results.filter((r) => !r.success).length,
        results,
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
