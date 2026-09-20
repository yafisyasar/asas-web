import { NextResponse } from "next/server";
import { getVisibleFiles } from "@/lib/github";
import { buildTree, flattenSearchable } from "@/lib/paths";

export const dynamic = "force-dynamic";

export async function GET() {
  const files = await getVisibleFiles();
  const tree = buildTree(files);
  const search = flattenSearchable(tree);
  return NextResponse.json(
    { files, search, total: files.length },
    { headers: { "Cache-Control": "no-store" } }
  );
}