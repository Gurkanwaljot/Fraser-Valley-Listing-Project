import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.106.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface RecordRequest {
  run_token: string;
  status: "success" | "error" | "cancelled";
  bytes_delivered?: number;
  files_delivered?: number;
  error_message?: string;
}

const ALLOWED_STATUSES = new Set(["success", "error", "cancelled"]);

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const body: RecordRequest = await req.json().catch(() => ({} as RecordRequest));
    const { run_token, status, bytes_delivered, files_delivered, error_message } = body;

    if (!run_token || !status) {
      return jsonResponse({ error: "Missing run_token or status" }, 400);
    }
    if (!ALLOWED_STATUSES.has(status)) {
      return jsonResponse({ error: "Invalid status" }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceRoleKey);

    const { data: existing, error: lookupError } = await admin
      .from("stream_download_runs")
      .select("started_at, terminal_status")
      .eq("token", run_token)
      .maybeSingle();
    if (lookupError) {
      return jsonResponse({ error: "Run lookup failed" }, 500);
    }
    if (!existing) {
      return jsonResponse({ error: "Run not found" }, 404);
    }
    if (existing.terminal_status && existing.terminal_status !== "in_progress") {
      return jsonResponse({ ok: true, already_recorded: true }, 200);
    }

    const startedAtMs = new Date(existing.started_at as string).getTime();
    const finishedAt = new Date();
    const durationMs = Math.max(0, finishedAt.getTime() - startedAtMs);

    const { error: updateError } = await admin
      .from("stream_download_runs")
      .update({
        bytes_delivered: typeof bytes_delivered === "number" ? bytes_delivered : 0,
        files_delivered: typeof files_delivered === "number" ? files_delivered : 0,
        duration_ms: durationMs,
        terminal_status: status,
        error_message: error_message ?? null,
        finished_at: finishedAt.toISOString(),
      })
      .eq("token", run_token);
    if (updateError) {
      return jsonResponse({ error: "Run update failed" }, 500);
    }

    return jsonResponse({ ok: true }, 200);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return jsonResponse({ error: "Record failed", details: message }, 500);
  }
});
