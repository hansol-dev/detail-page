import { NextResponse } from "next/server";
import { readDb } from "@/lib/store";

export const dynamic = "force-dynamic";

function maskKey(value: string | undefined) {
  if (!value) return null;
  return {
    prefix: value.slice(0, 10),
    length: value.length
  };
}

export async function GET() {
  const url = process.env.SUPABASE_URL?.replace(/\/$/, "") || null;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || "";
  const bucket = process.env.SUPABASE_STORAGE_BUCKET || "detail-page-assets";

  const env = {
    hasSupabaseUrl: Boolean(url),
    hasServiceKey: Boolean(serviceRoleKey),
    serviceKey: maskKey(serviceRoleKey),
    bucket
  };

  if (!url || !serviceRoleKey) {
    return NextResponse.json({
      ok: false,
      env,
      error: "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SECRET_KEY are required."
    });
  }

  const headers = {
    apikey: serviceRoleKey,
    authorization: `Bearer ${serviceRoleKey}`,
    "content-type": "application/json"
  };

  try {
    const tableResponse = await fetch(`${url}/rest/v1/detail_page_app_state?select=key&limit=1`, { headers });
    const tableText = await tableResponse.text();

    const bucketResponse = await fetch(`${url}/storage/v1/bucket/${encodeURIComponent(bucket)}`, { headers });
    const bucketText = await bucketResponse.text();

    let dbStatus: { ok: boolean; users?: number; error?: string } = { ok: false };
    try {
      const db = await readDb();
      dbStatus = { ok: true, users: db.users.length };
    } catch (error) {
      dbStatus = {
        ok: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }

    return NextResponse.json({
      ok: tableResponse.ok && bucketResponse.ok && dbStatus.ok,
      env,
      table: {
        ok: tableResponse.ok,
        status: tableResponse.status,
        body: tableText.slice(0, 500)
      },
      bucket: {
        ok: bucketResponse.ok,
        status: bucketResponse.status,
        body: bucketText.slice(0, 500)
      },
      db: dbStatus
    });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      env,
      error: error instanceof Error ? error.message : String(error)
    });
  }
}
