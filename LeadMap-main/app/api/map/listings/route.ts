import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_TABLES = new Set([
  "listings",
  "expired_listings",
  "probate_leads",
  "fsbo_leads",
  "frbo_leads",
  "imports",
  "trash",
  "foreclosure_listings",
]);

const MAP_PIN_SELECT_COLUMNS = [
  "listing_id",
  "property_url",
  "street",
  "city",
  "state",
  "zip_code",
  "list_price",
  "lat",
  "lng",
  "created_at"
].join(",");

const MAP_DETAIL_SELECT_COLUMNS = MAP_PIN_SELECT_COLUMNS;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const table = searchParams.get("table") || "";
    const page = Math.max(1, Number(searchParams.get("page") || "1"));
    const mode = searchParams.get("mode") === "detail" ? "detail" : "pin";
    const pageSize = Math.min(
      mode === "detail" ? 2000 : 5000,
      Math.max(100, Number(searchParams.get("pageSize") || (mode === "detail" ? "1000" : "2000")))
    );
    const sortBy = searchParams.get("sortBy") || "created_at";
    const sortOrder = searchParams.get("sortOrder") === "asc" ? "asc" : "desc";

    if (!VALID_TABLES.has(table)) {
      return NextResponse.json(
        { error: `Unsupported table "${table}"` },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: "Missing Supabase server configuration" },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const start = (page - 1) * pageSize;
    const end = start + pageSize - 1;

    const { data, error } = await supabase
      .from(table)
      .select(mode === "detail" ? MAP_DETAIL_SELECT_COLUMNS : MAP_PIN_SELECT_COLUMNS)
      .order(sortBy, { ascending: sortOrder === "asc" })
      .range(start, end);

    if (error) {
      console.error(`Map listing fetch failed for ${table}:`, error);
      return NextResponse.json(
        { error: error.message || "Failed to fetch map listings" },
        { status: 500 }
      );
    }

    const rows = Array.isArray(data)
      ? data.map((row) =>
          typeof row === "object" && row !== null
            ? { ...(row as Record<string, unknown>), source_table: table }
            : { source_table: table }
        )
      : [];
    return NextResponse.json({
      data: rows,
      page,
      pageSize,
      hasMore: rows.length === pageSize,
    });
  } catch (error: any) {
    console.error("GET /api/map/listings failed:", error);
    return NextResponse.json(
      { error: error?.message || "Unknown error" },
      { status: 500 }
    );
  }
}
