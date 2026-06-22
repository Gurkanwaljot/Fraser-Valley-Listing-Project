import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { AwsClient } from "npm:aws4fetch@1.0.20";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

const MAX_AGE_MS = 60 * 60 * 1000; // 1 hour

interface MultipartUpload {
  key: string;
  uploadId: string;
  initiated: string;
}

function parseListMultipartUploadsXml(xml: string): MultipartUpload[] {
  const uploads: MultipartUpload[] = [];
  const uploadRegex =
    /<Upload>([\s\S]*?)<\/Upload>/g;
  let match: RegExpExecArray | null;
  while ((match = uploadRegex.exec(xml)) !== null) {
    const block = match[1];
    const key = /<Key>([^<]+)<\/Key>/.exec(block)?.[1] ?? "";
    const uploadId = /<UploadId>([^<]+)<\/UploadId>/.exec(block)?.[1] ?? "";
    const initiated = /<Initiated>([^<]+)<\/Initiated>/.exec(block)?.[1] ?? "";
    if (key && uploadId) {
      uploads.push({ key, uploadId, initiated });
    }
  }
  return uploads;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    if (!authHeader.includes(serviceRoleKey)) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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

    const listUrl = `${endpoint}/${bucketName}/?uploads`;
    const listReq = await aws.sign(new Request(listUrl, { method: "GET" }));
    const listResp = await fetch(listReq.url, {
      method: "GET",
      headers: listReq.headers,
    });

    if (!listResp.ok) {
      const errText = await listResp.text();
      return new Response(
        JSON.stringify({ error: `ListMultipartUploads failed: ${listResp.status}`, details: errText }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const xml = await listResp.text();
    const uploads = parseListMultipartUploadsXml(xml);
    const now = Date.now();
    const stale = uploads.filter((u) => {
      const age = now - new Date(u.initiated).getTime();
      return age > MAX_AGE_MS;
    });

    const aborted: string[] = [];
    const failed: { key: string; error: string }[] = [];

    for (const upload of stale) {
      try {
        const abortUrl = `${endpoint}/${bucketName}/${upload.key}?uploadId=${encodeURIComponent(upload.uploadId)}`;
        const abortReq = await aws.sign(
          new Request(abortUrl, { method: "DELETE" })
        );
        const abortResp = await fetch(abortReq.url, {
          method: "DELETE",
          headers: abortReq.headers,
        });
        if (abortResp.ok || abortResp.status === 204) {
          aborted.push(`${upload.key} (uploadId=${upload.uploadId})`);
        } else {
          const errText = await abortResp.text();
          failed.push({ key: upload.key, error: `${abortResp.status}: ${errText}` });
        }
      } catch (err) {
        failed.push({ key: upload.key, error: err instanceof Error ? err.message : String(err) });
      }
    }

    return new Response(
      JSON.stringify({
        total_found: uploads.length,
        stale_count: stale.length,
        aborted_count: aborted.length,
        aborted,
        failed,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ error: "Cleanup failed", details: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
