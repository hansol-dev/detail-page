import { NextResponse } from "next/server";
import { readAssetBytes, readDb } from "@/lib/store";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await readDb();
  const asset = db.assets.find((item) => item.id === id);
  if (!asset) {
    return new NextResponse("Not found", { status: 404 });
  }
  const bytes = await readAssetBytes(asset);
  return new NextResponse(bytes, {
    headers: {
      "content-type": asset.mimeType,
      "cache-control": "private, max-age=60"
    }
  });
}
