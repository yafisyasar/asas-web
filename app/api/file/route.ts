import { NextRequest } from "next/server";
import { rawUrl } from "@/lib/github";

export const dynamic = "force-dynamic";

const MIME_BY_EXT: Record<string, string> = {
  pdf: "application/pdf",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  svg: "image/svg+xml",
  bmp: "image/bmp",
  ico: "image/x-icon",
  mp4: "video/mp4",
  mov: "video/quicktime",
  webm: "video/webm",
  m4v: "video/x-m4v",
  mkv: "video/x-matroska",
  avi: "video/x-msvideo",
  mp3: "audio/mpeg",
  wav: "audio/wav",
  ogg: "audio/ogg",
  m4a: "audio/mp4",
  flac: "audio/flac",
};

export async function GET(request: NextRequest) {
  const path = request.nextUrl.searchParams.get("path");
  if (!path) {
    return new Response("missing path", { status: 400 });
  }
  if (path.includes("..") || path.startsWith("/")) {
    return new Response("invalid path", { status: 400 });
  }

  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  const range = request.headers.get("range");

  let upstream: Response;
  try {
    upstream = await fetch(rawUrl(path), {
      cache: "no-store",
      headers: range ? { Range: range } : {},
    });
  } catch {
    return new Response("not found", { status: 404 });
  }
  if (!upstream.ok && upstream.status !== 206) {
    return new Response("not found", { status: 404 });
  }

  const headers = new Headers();
  headers.set("Content-Type", MIME_BY_EXT[ext] ?? "application/octet-stream");
  headers.set("Access-Control-Allow-Origin", "*");
  const passthrough = ["content-range", "content-length", "accept-ranges", "cache-control"];
  for (const name of passthrough) {
    const value = upstream.headers.get(name);
    if (value) headers.set(name, value);
  }
  if (!headers.has("cache-control")) headers.set("Cache-Control", "public, max-age=300");

  return new Response(upstream.body, { status: upstream.status, headers });
}