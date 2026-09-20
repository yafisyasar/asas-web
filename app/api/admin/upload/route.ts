import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken, SESSION_COOKIE } from "@/lib/auth";
import { commitChanges, getTree, rawUrl, type CommitChange } from "@/lib/github";

const MAX_FILE_SIZE = 4 * 1024 * 1024;

function clean(path: string): string {
  return path.replace(/^\/+|\/+$/g, "").replace(/\/+/g, "/");
}

function isValidPathname(pathname: string): boolean {
  return (
    pathname.length > 0 &&
    !pathname.startsWith("/") &&
    !pathname.includes("..") &&
    pathname.split("/").every((s) => s.length > 0 && s !== "." && s !== "..")
  );
}

function baseName(pathname: string): string {
  return pathname.split("/").pop() ?? pathname;
}

export async function POST(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!verifySessionToken(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!process.env.GITHUB_TOKEN) {
    return NextResponse.json({ error: "GITHUB_TOKEN is not configured" }, { status: 500 });
  }

  const form = await request.formData().catch(() => null);
  if (!form) {
    return NextResponse.json({ error: "Expected multipart form data" }, { status: 400 });
  }
  const overwrite = String(form.get("overwrite") ?? "") === "true";

  let paths: string[] = [];
  try {
    paths = JSON.parse(String(form.get("paths") ?? "[]"));
  } catch {
    return NextResponse.json({ error: "Invalid paths" }, { status: 400 });
  }

  const files = form.getAll("file");
  if (files.length === 0) {
    return NextResponse.json({ error: "No files provided" }, { status: 400 });
  }
  if (paths.length !== files.length) {
    return NextResponse.json({ error: "paths does not match files" }, { status: 400 });
  }

  const existingPaths = new Set((await getTree()).map((f) => f.pathname));
  const seen = new Set<string>();

  const upserts: Array<{ pathname: string; name: string; content: Buffer }> = [];
  const skipped: Array<{ path: string; name: string; reason: string }> = [];

  for (let i = 0; i < files.length; i++) {
    const entry = files[i];
    const pathname = clean(String(paths[i] ?? ""));
    const name = baseName(pathname);
    if (!(entry instanceof File)) continue;
    if (entry.size > MAX_FILE_SIZE) {
      skipped.push({
        path: pathname || entry.name,
        name: name || entry.name,
        reason: "over 4.5MB — add this file with git push instead",
      });
      continue;
    }
    if (!isValidPathname(pathname)) {
      skipped.push({ path: pathname || entry.name, name: name || entry.name, reason: "invalid path" });
      continue;
    }
    if ((existingPaths.has(pathname) || seen.has(pathname)) && !overwrite) {
      skipped.push({ path: pathname, name, reason: "already exists (overwrite is off)" });
      continue;
    }
    seen.add(pathname);
    upserts.push({
      pathname,
      name,
      content: Buffer.from(await entry.arrayBuffer()),
    });
  }

  let committedCount = 0;
  if (upserts.length > 0) {
    const message =
      upserts.length === 1
        ? `Add ${upserts[0].pathname}`
        : `Add ${upserts.length} files (${baseName(upserts[0].pathname)}…)`;
    try {
      await commitChanges(
        message,
        upserts.map(
          (u): CommitChange => ({ type: "upsert", path: u.pathname, content: u.content })
        )
      );
    } catch (error) {
      return NextResponse.json(
        { error: `Commit failed: ${(error as Error).message}` },
        { status: 502 }
      );
    }
    committedCount = upserts.length;
  }

  return NextResponse.json({
    ok: true,
    committed: committedCount,
    files: upserts.map((u) => ({
      pathname: u.pathname,
      url: rawUrl(u.pathname),
      size: u.content.length,
      name: u.name,
    })),
    skipped,
  });
}