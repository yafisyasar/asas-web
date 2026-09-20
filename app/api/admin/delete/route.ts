import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken, SESSION_COOKIE } from "@/lib/auth";
import { deletePaths, deletePrefix, getTree } from "@/lib/github";

export async function POST(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!verifySessionToken(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json().catch(() => ({}));
  const pathname = typeof body?.pathname === "string" ? body.pathname.trim() : "";
  if (!pathname) {
    return NextResponse.json({ error: "pathname is required" }, { status: 400 });
  }
  if (pathname.includes("..") || pathname.startsWith("/")) {
    return NextResponse.json({ error: "Invalid pathname" }, { status: 400 });
  }
  try {
    const files = await getTree();
    const isExact = files.some((f) => f.pathname === pathname);
    let deleted: number;
    if (isExact) {
      deleted = await deletePaths([pathname]);
    } else {
      deleted = await deletePrefix(pathname);
    }
    if (deleted === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, deleted });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 502 });
  }
}