import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: listings } = await supabase
      .from("listings")
      .select("slug, updated_at, hero_media_id, status")
      .in("status", ["active", "sold"])
      .order("updated_at", { ascending: false });

    if (!listings || listings.length === 0) {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>`;
      return new Response(xml, {
        headers: { ...corsHeaders, "Content-Type": "application/xml", "Cache-Control": "public, max-age=3600" },
      });
    }

    const heroIds = listings.map((l) => l.hero_media_id).filter(Boolean);
    let heroMap: Record<string, string> = {};
    if (heroIds.length > 0) {
      const { data: heroes } = await supabase
        .from("media_assets")
        .select("id, public_url")
        .in("id", heroIds);
      if (heroes) {
        heroMap = Object.fromEntries(heroes.map((h: { id: string; public_url: string | null }) => [h.id, h.public_url || ""]));
      }
    }

    const baseUrl = req.headers.get("origin") || req.headers.get("referer")?.replace(/\/$/, "") || supabaseUrl.replace(/\.supabase\.co.*/, ".app");

    const urls = listings.map((listing) => {
      const loc = `${baseUrl}/listing/${listing.slug}`;
      const lastmod = listing.updated_at ? new Date(listing.updated_at).toISOString().split("T")[0] : "";
      const imageUrl = listing.hero_media_id ? heroMap[listing.hero_media_id] : "";

      let entry = `  <url>\n    <loc>${escapeXml(loc)}</loc>\n`;
      if (lastmod) entry += `    <lastmod>${lastmod}</lastmod>\n`;
      entry += `    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>\n`;
      if (imageUrl) {
        entry += `    <image:image>\n      <image:loc>${escapeXml(imageUrl)}</image:loc>\n    </image:image>\n`;
      }
      entry += `  </url>`;
      return entry;
    });

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urls.join("\n")}
</urlset>`;

    return new Response(xml, {
      headers: { ...corsHeaders, "Content-Type": "application/xml", "Cache-Control": "public, max-age=3600" },
    });
  } catch (err) {
    return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>`, {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/xml" },
    });
  }
});

function escapeXml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}
