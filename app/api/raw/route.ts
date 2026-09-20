import { NextRequest } from "next/server";
import { rawUrl } from "@/lib/github";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const path = request.nextUrl.searchParams.get("path");
  if (!path) {
    return new Response("missing path", { status: 400 });
  }
  if (path.includes("..") || path.startsWith("/")) {
    return new Response("invalid path", { status: 400 });
  }
  try {
    const upstream = await fetch(rawUrl(path), { cache: "no-store" });
    if (!upstream.ok) {
      return new Response("not found", { status: 404 });
    }
    return new Response(upstream.body, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "public, max-age=300",
      },
    });
  } catch {
    return new Response("not found", { status: 404 });
  }
}