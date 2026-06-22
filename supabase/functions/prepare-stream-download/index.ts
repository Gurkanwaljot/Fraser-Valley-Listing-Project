import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.106.2";
import { AwsClient } from "npm:aws4fetch@1.0.20";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface PrepareRequest {
  listing_id: string;
  kind: "photo" | "video" | "document" | "floor_plan" | "all";
  share_token?: string;
}

interface MediaAssetRow {
  id: string;
  kind: string;
  original_key: string;
  filename_original: string;
  file_size_bytes: number;
  sort_order: number;
  mime_type: string;
}

const SIGNED_URL_TTL_S = 3600;

const KIND_LABELS: Record<string, string> = {
  photo: "photo",
  video: "video",
  floor_plan: "floorplan",
  document: "doc",
};

const FOLDER_NAMES: Record<string, string> = {
  photo: "Photos",
  video: "Videos",
  floor_plan: "Floor Plans",
  document: "Documents",
};

function sanitizeAddress(address: string): string {
  return address
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function getExtension(filename: string): string {
  const dot = filename.lastIndexOf(".");
  return dot >= 0 ? filename.slice(dot) : "";
}

function buildAssetFilename(
  address: string,
  kind: string,
  index: number,
  originalFilename: string
): string {
  const slug = sanitizeAddress(address);
  const kindLabel = KIND_LABELS[kind] || kind;
  const num = String(index + 1).padStart(2, "0");
  const ext = getExtension(originalFilename);
  return `${slug}-${kindLabel}-${num}${ext}`;
}

function buildZipFilenameForKind(address: string, kind: string): string {
  const slug = sanitizeAddress(address);
  if (kind === "all") return `${slug}-all-assets.zip`;
  const kindLabel = KIND_LABELS[kind] || kind;
  return `${slug}-${kindLabel}s.zip`;
}

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function generateRunToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const accessToken = authHeader.replace(/^Bearer\s+/i, "");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
    });
    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData?.user) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }
    const userId = userData.user.id;

    const body: PrepareRequest = await req.json().catch(() => ({} as PrepareRequest));
    const { listing_id, kind, share_token } = body;
    if (!listing_id || !kind) {
      return jsonResponse({ error: "Missing listing_id or kind" }, 400);
    }
    if (!["photo", "video", "document", "floor_plan", "all"].includes(kind)) {
      return jsonResponse({ error: "Invalid kind" }, 400);
    }

    const admin = createClient(supabaseUrl, serviceRoleKey);

    const { data: listing, error: listingError } = await admin
      .from("listings")
      .select("id, address_line_1, photographer_id")
      .eq("id", listing_id)
      .maybeSingle();
    if (listingError || !listing) {
      return jsonResponse({ error: "Listing not found" }, 404);
    }

    let authorized = false;
    if (listing.photographer_id === userId) {
      authorized = true;
    } else {
      const { data: roles } = await admin
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);
      if ((roles || []).some((r: { role: string }) => r.role === "admin")) {
        authorized = true;
      }
    }

    if (!authorized && share_token) {
      const { data: share } = await admin
        .from("listing_shares")
        .select("id, listing_id, realtor_id, expires_at, revoked_at")
        .eq("share_token", share_token)
        .eq("listing_id", listing_id)
        .maybeSingle();
      if (share && !share.revoked_at) {
        const notExpired =
          !share.expires_at || new Date(share.expires_at).getTime() > Date.now();
        if (notExpired) {
          const { data: realtor } = await admin
            .from("realtors")
            .select("id, auth_user_id")
            .eq("id", share.realtor_id)
            .maybeSingle();
          if (realtor && realtor.auth_user_id === userId) {
            authorized = true;
          }
        }
      }
    }

    if (!authorized) {
      return jsonResponse({ error: "Forbidden" }, 403);
    }

    const accountId = Deno.env.get("CLOUDFLARE_ACCOUNT_ID");
    const accessKeyId = Deno.env.get("R2_ACCESS_KEY_ID");
    const secretAccessKey = Deno.env.get("R2_SECRET_ACCESS_KEY");
    const bucketName = Deno.env.get("R2_BUCKET_NAME") || "lumen-listings-media";
    if (!accountId || !accessKeyId || !secretAccessKey) {
      return jsonResponse({ error: "Storage not configured" }, 503);
    }
    const endpoint = `https://${accountId}.r2.cloudflarestorage.com`;
    const aws = new AwsClient({
      accessKeyId,
      secretAccessKey,
      region: "auto",
      service: "s3",
    });

    let assetQuery = admin
      .from("media_assets")
      .select(
        "id, kind, original_key, filename_original, file_size_bytes, sort_order, mime_type"
      )
      .eq("listing_id", listing_id)
      .eq("is_public", true)
      .order("kind")
      .order("sort_order");
    if (kind !== "all") {
      assetQuery = assetQuery.eq("kind", kind);
    }
    const { data: assetRows, error: assetErr } = await assetQuery;
    if (assetErr) {
      return jsonResponse({ error: "Asset query failed" }, 500);
    }
    const assets = (assetRows ?? []) as MediaAssetRow[];
    if (assets.length === 0) {
      return jsonResponse({ error: "No assets to download" }, 404);
    }

    const address = (listing.address_line_1 as string) || "listing";
    const kindCounters: Record<string, number> = {};
    const files: {
      path: string;
      signed_url: string;
      size_bytes: number;
      mime_type: string;
    }[] = [];
    let expectedBytes = 0;

    for (const asset of assets) {
      const kindCount = kindCounters[asset.kind] || 0;
      kindCounters[asset.kind] = kindCount + 1;
      const filename = buildAssetFilename(
        address,
        asset.kind,
        kindCount,
        asset.filename_original
      );
      const path = kind === "all"
        ? `${FOLDER_NAMES[asset.kind] || asset.kind}/${filename}`
        : filename;

      const objectUrl = `${endpoint}/${bucketName}/${asset.original_key}`;
      const signed = await aws.sign(
        new Request(objectUrl, { method: "GET" }),
        { aws: { signQuery: true }, expiresIn: SIGNED_URL_TTL_S }
      );

      files.push({
        path,
        signed_url: signed.url,
        size_bytes: asset.file_size_bytes,
        mime_type: asset.mime_type,
      });
      expectedBytes += asset.file_size_bytes;
    }

    const expectedFileCount = files.length;
    const runToken = generateRunToken();
    const zipFilename = buildZipFilenameForKind(address, kind);

    const { error: insertError } = await admin
      .from("stream_download_runs")
      .insert({
        token: runToken,
        listing_id,
        kind,
        level: 0,
        expected_bytes: expectedBytes,
        expected_file_count: expectedFileCount,
        terminal_status: "in_progress",
      });
    if (insertError) {
      return jsonResponse({ error: "Failed to start run" }, 500);
    }

    return jsonResponse(
      {
        run_token: runToken,
        zip_filename: zipFilename,
        expected_bytes: expectedBytes,
        expected_file_count: expectedFileCount,
        files,
      },
      200
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return jsonResponse({ error: "Prepare failed", details: message }, 500);
  }
});
