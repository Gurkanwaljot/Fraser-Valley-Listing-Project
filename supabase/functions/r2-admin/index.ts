import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.106.2";
import { AwsClient } from "npm:aws4fetch@1.0.20";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

type Action =
  | "list-objects"
  | "get-bucket-stats"
  | "delete-object"
  | "delete-prefix"
  | "list-multipart-uploads"
  | "abort-multipart-upload"
  | "abort-all-stale-multiparts"
  | "find-orphans"
  | "get-listing-storage"
  | "delete-listing-storage";

interface R2AdminRequest {
  action: Action;
  prefix?: string;
  continuation_token?: string;
  key?: string;
  upload_id?: string;
  max_age_ms?: number;
  listing_id?: string;
}

interface S3Object {
  key: string;
  size: number;
  last_modified: string;
}

function parseListObjectsXml(xml: string): {
  objects: S3Object[];
  isTruncated: boolean;
  nextToken: string | null;
} {
  const objects: S3Object[] = [];
  const contentRegex = /<Contents>([\s\S]*?)<\/Contents>/g;
  let match: RegExpExecArray | null;
  while ((match = contentRegex.exec(xml)) !== null) {
    const block = match[1];
    const key = /<Key>([^<]+)<\/Key>/.exec(block)?.[1] ?? "";
    const sizeStr = /<Size>([^<]+)<\/Size>/.exec(block)?.[1] ?? "0";
    const lastMod = /<LastModified>([^<]+)<\/LastModified>/.exec(block)?.[1] ?? "";
    if (key) {
      objects.push({ key, size: parseInt(sizeStr, 10), last_modified: lastMod });
    }
  }
  const isTruncated = /<IsTruncated>true<\/IsTruncated>/.test(xml);
  const nextToken =
    /<NextContinuationToken>([^<]+)<\/NextContinuationToken>/.exec(xml)?.[1] ?? null;
  return { objects, isTruncated, nextToken };
}

interface MultipartUpload {
  key: string;
  uploadId: string;
  initiated: string;
}

function parseMultipartUploadsXml(xml: string): MultipartUpload[] {
  const uploads: MultipartUpload[] = [];
  const uploadRegex = /<Upload>([\s\S]*?)<\/Upload>/g;
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

async function listAllObjects(
  aws: AwsClient,
  endpoint: string,
  bucketName: string,
  prefix?: string
): Promise<S3Object[]> {
  const allObjects: S3Object[] = [];
  let continuationToken: string | null = null;

  do {
    const params = new URLSearchParams({ "list-type": "2", "max-keys": "1000" });
    if (prefix) params.set("prefix", prefix);
    if (continuationToken) params.set("continuation-token", continuationToken);

    const listUrl = `${endpoint}/${bucketName}/?${params.toString()}`;
    const listReq = await aws.sign(new Request(listUrl, { method: "GET" }));
    const resp = await fetch(listReq.url, { method: "GET", headers: listReq.headers });
    if (!resp.ok) break;

    const xml = await resp.text();
    const parsed = parseListObjectsXml(xml);
    allObjects.push(...parsed.objects);
    continuationToken = parsed.isTruncated ? parsed.nextToken : null;
  } while (continuationToken);

  return allObjects;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin");

    if (!roles || roles.length === 0) {
      return new Response(
        JSON.stringify({ error: "Forbidden - admin role required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: R2AdminRequest = await req.json();
    const { action } = body;

    const accountId = Deno.env.get("CLOUDFLARE_ACCOUNT_ID");
    const accessKeyId = Deno.env.get("R2_ACCESS_KEY_ID");
    const secretAccessKey = Deno.env.get("R2_SECRET_ACCESS_KEY");
    const bucketName = Deno.env.get("R2_BUCKET_NAME") || "lumen-listings-media";
    const storageQuotaGb = parseInt(Deno.env.get("R2_STORAGE_QUOTA_GB") || "10", 10);

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

    switch (action) {
      case "list-objects": {
        const params = new URLSearchParams({ "list-type": "2", "max-keys": "200" });
        if (body.prefix) params.set("prefix", body.prefix);
        if (body.continuation_token) params.set("continuation-token", body.continuation_token);

        const listUrl = `${endpoint}/${bucketName}/?${params.toString()}`;
        const listReq = await aws.sign(new Request(listUrl, { method: "GET" }));
        const resp = await fetch(listReq.url, { method: "GET", headers: listReq.headers });
        if (!resp.ok) {
          return new Response(
            JSON.stringify({ error: `ListObjects failed: ${resp.status}` }),
            { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        const xml = await resp.text();
        const parsed = parseListObjectsXml(xml);
        return new Response(JSON.stringify(parsed), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "get-bucket-stats": {
        let totalSize = 0;
        let totalCount = 0;
        const breakdown: Record<string, { count: number; size: number }> = {};

        const allObjects = await listAllObjects(aws, endpoint, bucketName);
        for (const obj of allObjects) {
          totalSize += obj.size;
          totalCount++;
          const category = obj.key.startsWith("zips/") ? "zips" :
            obj.key.startsWith("listings/") ? getCategoryFromKey(obj.key) : "other";
          if (!breakdown[category]) breakdown[category] = { count: 0, size: 0 };
          breakdown[category].count++;
          breakdown[category].size += obj.size;
        }

        return new Response(
          JSON.stringify({
            total_size: totalSize,
            total_count: totalCount,
            quota_bytes: storageQuotaGb * 1024 * 1024 * 1024,
            breakdown,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "delete-object": {
        if (!body.key) {
          return new Response(
            JSON.stringify({ error: "Missing key" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        const objectUrl = `${endpoint}/${bucketName}/${body.key}`;
        const delResp = await aws.fetch(objectUrl, { method: "DELETE" });
        return new Response(
          JSON.stringify({ success: delResp.ok || delResp.status === 204 || delResp.status === 404, key: body.key }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "delete-prefix": {
        if (!body.prefix) {
          return new Response(
            JSON.stringify({ error: "Missing prefix" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        let deleted = 0;
        let failed = 0;

        const objects = await listAllObjects(aws, endpoint, bucketName, body.prefix);
        for (const obj of objects) {
          const objectUrl = `${endpoint}/${bucketName}/${obj.key}`;
          const delResp = await aws.fetch(objectUrl, { method: "DELETE" });
          if (delResp.ok || delResp.status === 204 || delResp.status === 404) {
            deleted++;
          } else {
            failed++;
          }
        }

        return new Response(
          JSON.stringify({ deleted, failed, prefix: body.prefix }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "list-multipart-uploads": {
        const listUrl = `${endpoint}/${bucketName}/?uploads`;
        const listReq = await aws.sign(new Request(listUrl, { method: "GET" }));
        const resp = await fetch(listReq.url, { method: "GET", headers: listReq.headers });
        if (!resp.ok) {
          return new Response(
            JSON.stringify({ error: `ListMultipartUploads failed: ${resp.status}` }),
            { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        const xml = await resp.text();
        const uploads = parseMultipartUploadsXml(xml);
        return new Response(JSON.stringify({ uploads, count: uploads.length }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "abort-multipart-upload": {
        if (!body.key || !body.upload_id) {
          return new Response(
            JSON.stringify({ error: "Missing key or upload_id" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        const abortUrl = `${endpoint}/${bucketName}/${body.key}?uploadId=${encodeURIComponent(body.upload_id)}`;
        const abortReq = await aws.sign(new Request(abortUrl, { method: "DELETE" }));
        const abortResp = await fetch(abortReq.url, { method: "DELETE", headers: abortReq.headers });
        return new Response(
          JSON.stringify({ success: abortResp.ok || abortResp.status === 204, key: body.key }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "abort-all-stale-multiparts": {
        const maxAge = body.max_age_ms || 60 * 60 * 1000;
        const listUrl = `${endpoint}/${bucketName}/?uploads`;
        const listReq = await aws.sign(new Request(listUrl, { method: "GET" }));
        const resp = await fetch(listReq.url, { method: "GET", headers: listReq.headers });
        if (!resp.ok) {
          return new Response(
            JSON.stringify({ error: `ListMultipartUploads failed: ${resp.status}` }),
            { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        const xml = await resp.text();
        const uploads = parseMultipartUploadsXml(xml);
        const now = Date.now();
        const stale = uploads.filter((u) => now - new Date(u.initiated).getTime() > maxAge);

        let aborted = 0;
        let failed = 0;
        for (const upload of stale) {
          const abortUrl = `${endpoint}/${bucketName}/${upload.key}?uploadId=${encodeURIComponent(upload.uploadId)}`;
          const abortReq = await aws.sign(new Request(abortUrl, { method: "DELETE" }));
          const abortResp = await fetch(abortReq.url, { method: "DELETE", headers: abortReq.headers });
          if (abortResp.ok || abortResp.status === 204) {
            aborted++;
          } else {
            failed++;
          }
        }

        return new Response(
          JSON.stringify({ total_found: uploads.length, stale_count: stale.length, aborted, failed }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "find-orphans": {
        const allObjects = await listAllObjects(aws, endpoint, bucketName, "listings/");

        const r2Keys = new Set(allObjects.map((o) => o.key));

        const { data: mediaAssets, error: dbError } = await supabase
          .from("media_assets")
          .select("original_key, thumbnail_url, poster_url, large_url");

        if (dbError) {
          return new Response(
            JSON.stringify({ error: `DB query failed: ${dbError.message}` }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const dbKeys = new Set<string>();
        for (const asset of mediaAssets || []) {
          if (asset.original_key) dbKeys.add(asset.original_key);
          if (asset.thumbnail_url) {
            const thumbKey = extractKeyFromUrl(asset.thumbnail_url);
            if (thumbKey) dbKeys.add(thumbKey);
          }
          if (asset.poster_url) {
            const posterKey = extractKeyFromUrl(asset.poster_url);
            if (posterKey) dbKeys.add(posterKey);
          }
          if (asset.large_url) {
            const largeKey = extractKeyFromUrl(asset.large_url);
            if (largeKey) dbKeys.add(largeKey);
          }
        }

        const orphans: S3Object[] = allObjects.filter((o) => !dbKeys.has(o.key));
        const orphanSize = orphans.reduce((sum, o) => sum + o.size, 0);

        return new Response(
          JSON.stringify({
            total_r2_files: allObjects.length,
            total_db_keys: dbKeys.size,
            orphan_count: orphans.length,
            orphan_size: orphanSize,
            orphans: orphans.slice(0, 200),
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "get-listing-storage": {
        const { data: listings, error: listErr } = await supabase
          .from("listings")
          .select("id, title, slug")
          .order("created_at", { ascending: false });

        if (listErr) {
          return new Response(
            JSON.stringify({ error: `DB query failed: ${listErr.message}` }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const allObjects = await listAllObjects(aws, endpoint, bucketName);
        const listingStorage: Record<string, { size: number; count: number }> = {};

        for (const obj of allObjects) {
          const listingId = extractListingIdFromKey(obj.key);
          if (listingId) {
            if (!listingStorage[listingId]) listingStorage[listingId] = { size: 0, count: 0 };
            listingStorage[listingId].size += obj.size;
            listingStorage[listingId].count++;
          }
        }

        const result = (listings || []).map((l) => ({
          id: l.id,
          title: l.title,
          slug: l.slug,
          storage_size: listingStorage[l.id]?.size ?? 0,
          file_count: listingStorage[l.id]?.count ?? 0,
        })).filter((l) => l.file_count > 0)
          .sort((a, b) => b.storage_size - a.storage_size);

        return new Response(
          JSON.stringify({ listings: result }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "delete-listing-storage": {
        if (!body.listing_id) {
          return new Response(
            JSON.stringify({ error: "Missing listing_id" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const listingPrefix = `listings/${body.listing_id}/`;
        const zipKey = `zips/${body.listing_id}.zip`;

        const listingObjects = await listAllObjects(aws, endpoint, bucketName, listingPrefix);

        let deleted = 0;
        let failed = 0;

        for (const obj of listingObjects) {
          const objectUrl = `${endpoint}/${bucketName}/${obj.key}`;
          const delResp = await aws.fetch(objectUrl, { method: "DELETE" });
          if (delResp.ok || delResp.status === 204 || delResp.status === 404) {
            deleted++;
          } else {
            failed++;
          }
        }

        const zipUrl = `${endpoint}/${bucketName}/${zipKey}`;
        const zipResp = await aws.fetch(zipUrl, { method: "DELETE" });
        if (zipResp.ok || zipResp.status === 204 || zipResp.status === 404) {
          deleted++;
        }

        return new Response(
          JSON.stringify({ deleted, failed, listing_id: body.listing_id }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: `Unknown action: ${action}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
  } catch (error) {
    return new Response(
      JSON.stringify({ error: "Internal server error", details: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function extractKeyFromUrl(url: string): string | null {
  if (!url) return null;
  const match = /\/storage-download\?key=([^&]+)/.exec(url);
  if (match) return decodeURIComponent(match[1]);
  const pathMatch = /listings\/[^/]+\/[^?]+/.exec(url);
  if (pathMatch) return pathMatch[0];
  return null;
}

function extractListingIdFromKey(key: string): string | null {
  if (key.startsWith("listings/")) {
    const parts = key.split("/");
    return parts[1] || null;
  }
  if (key.startsWith("zips/")) {
    const filename = key.replace("zips/", "").replace(".zip", "");
    return filename || null;
  }
  return null;
}

function getCategoryFromKey(key: string): string {
  const mime = guessMimeFromKey(key);
  if (mime.startsWith("video/")) return "videos";
  if (mime.startsWith("image/")) return "photos";
  if (mime === "application/pdf") return "documents";
  if (key.includes("-thumb.") || key.includes("-poster.")) return "thumbnails";
  return "other";
}

function guessMimeFromKey(key: string): string {
  const ext = key.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp",
    heic: "image/heic", gif: "image/gif", tiff: "image/tiff", tif: "image/tiff",
    mp4: "video/mp4", mov: "video/quicktime", avi: "video/x-msvideo", mkv: "video/x-matroska",
    pdf: "application/pdf",
  };
  return map[ext] || "application/octet-stream";
}
