import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken, SESSION_COOKIE } from "@/lib/auth";
import { renamePath } from "@/lib/github";

export async function POST(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!verifySessionToken(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json().catch(() => ({}));
  const from = typeof body?.from === "string" ? body.from.trim() : "";
  const to = typeof body?.to === "string" ? body.to.trim() : "";
  if (!from || !to) {
    return NextResponse.json({ error: "from and to are required" }, { status: 400 });
  }
  if (
    from.includes("..") ||
    to.includes("..") ||
    from.startsWith("/") ||
    to.startsWith("/")
  ) {
    return NextResponse.json({ error: "Invalid pathnames" }, { status: 400 });
  }
  if (from === to) {
    return NextResponse.json({ error: "Destination is the same" }, { status: 400 });
  }
  try {
    await renamePath(from, to);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = (error as Error).message;
    const status = message.startsWith("GitHub API") ? 502 : message.includes("already exists") ? 409 : 404;
    return NextResponse.json({ error: message }, { status });
  }
}