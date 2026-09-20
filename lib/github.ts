import "server-only";
import { revalidateTag, unstable_cache } from "next/cache";
import type { StoredFile } from "./types";

const CACHE_TAG = "tree";
const CACHE_REVALIDATE = 300;
const API = "https://api.github.com";
const RAW = "https://raw.githubusercontent.com";

export function repoFull(): string {
  const owner = process.env.GITHUB_OWNER ?? "yafisyasar";
  const repo = process.env.GITHUB_REPO ?? "asas";
  return `${owner}/${repo}`;
}

export function repoBranch(): string {
  return process.env.GITHUB_BRANCH ?? "main";
}

export function hasGitHubToken(): boolean {
  return Boolean(process.env.GITHUB_TOKEN);
}

export function rawUrl(path: string): string {
  const encoded = path.split("/").map(encodeURIComponent).join("/");
  return `${RAW}/${repoFull()}/${repoBranch()}/${encoded}`;
}

export function githubUrl(path: string): string {
  const encoded = path.split("/").map(encodeURIComponent).join("/");
  return `https://github.com/${repoFull()}/blob/${repoBranch()}/${encoded}`;
}

async function gh<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}/repos/${repoFull()}${path}`, {
    cache: "no-store",
    ...init,
    headers: {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "asas-web",
      ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}),
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    let detail = "";
    try {
      detail = (await res.json()).message;
    } catch {
      detail = await res.text();
    }
    throw new Error(`GitHub API ${res.status}: ${detail}`.slice(0, 300));
  }
  return res.json() as Promise<T>;
}

type TreeEntry = {
  path?: string;
  mode: string;
  type: "blob" | "tree" | "commit";
  sha: string;
  size?: number;
  url: string;
};

type TreeResponse = {
  sha: string;
  tree: TreeEntry[];
  truncated: boolean;
};

type RefResponse = {
  object: { sha: string };
};

type CommitResponse = {
  sha: string;
};

async function fetchTree(): Promise<StoredFile[]> {
  try {
    const data = await gh<TreeResponse>(`/git/trees/${repoBranch()}?recursive=1`);
    return data.tree
      .filter((e) => e.type === "blob" && e.path)
      .map((e) => {
        const path = e.path as string;
        return {
          pathname: path,
          size: e.size ?? 0,
          url: rawUrl(path),
          downloadUrl: rawUrl(path),
        };
      })
      .sort((a, b) => a.pathname.localeCompare(b.pathname));
  } catch {
    return [];
  }
}

export const getTree = unstable_cache(fetchTree, ["asas-github-tree"], {
  revalidate: CACHE_REVALIDATE,
  tags: [CACHE_TAG],
});

const HIDDEN_PATHS = new Set(["README.md", "input.txt", "output.txt"]);

export async function getVisibleFiles(): Promise<StoredFile[]> {
  const files = await getTree();
  return files.filter((f) => !HIDDEN_PATHS.has(f.pathname));
}

export type CommitInfo = {
  sha: string;
  message: string;
  author: string;
  date: string;
};

export type RecentFile = {
  path: string;
  name: string;
  date: string;
};

type CommitListItem = {
  sha: string;
  commit: { author: { name: string; date: string } };
};

type CommitDetail = {
  files?: Array<{ filename: string; status: string }>;
};

async function fetchRecentFiles(): Promise<RecentFile[]> {
  try {
    const page = await gh<CommitListItem[]>(`/commits?per_page=10`);
    const seen = new Set<string>();
    const out: RecentFile[] = [];
    for (const c of page) {
      const detail = await gh<CommitDetail>(`/commits/${c.sha}`);
      const files = detail.files ?? [];
      for (const f of files) {
        if (f.status === "removed") continue;
        const filename = f.filename.replace(/^"+|"+$/g, "");
        if (seen.has(filename)) continue;
        seen.add(filename);
        out.push({
          path: filename,
          name: filename.split("/").pop() ?? filename,
          date: c.commit.author.date,
        });
        if (out.length >= 10) break;
      }
      if (out.length >= 10) break;
    }
    return out;
  } catch {
    return [];
  }
}

export const getRecentFiles = unstable_cache(fetchRecentFiles, ["asas-github-recent-files"], {
  revalidate: CACHE_REVALIDATE,
  tags: [CACHE_TAG],
});

export async function revalidateTree(): Promise<void> {
  await revalidateTag(CACHE_TAG, { expire: 0 });
}

export type CommitChange =
  | { type: "upsert"; path: string; content: Buffer }
  | { type: "delete"; path: string }
  | { type: "rename"; from: string; to: string };

export async function commitChanges(message: string, changes: CommitChange[]): Promise<void> {
  if (changes.length === 0) return;
  if (!process.env.GITHUB_TOKEN) throw new Error("GITHUB_TOKEN is not configured");

  const branch = repoBranch();

  const ref = await gh<RefResponse>(`/git/refs/heads/${branch}`);
  const headSha = ref.object.sha;

  const current = await gh<TreeResponse>(`/git/trees/${headSha}?recursive=1`);
  const entriesByPath = new Map<string, TreeEntry>();
  for (const e of current.tree) {
    if (e.path && e.type === "blob") entriesByPath.set(e.path, e);
  }

  const fields: Array<{
    path: string;
    mode: string;
    type: "blob";
    sha: string | null;
  }> = [];

  for (const change of changes) {
    if (change.type === "upsert") {
      const blob = await gh<{ sha: string }>(`/git/blobs`, {
        method: "POST",
        body: JSON.stringify({
          content: change.content.toString("base64"),
          encoding: "base64",
        }),
      });
      fields.push({ path: change.path, mode: "100644", type: "blob", sha: blob.sha });
    } else if (change.type === "delete") {
      fields.push({ path: change.path, mode: "100644", type: "blob", sha: null });
    } else if (change.type === "rename") {
      const existing = entriesByPath.get(change.from);
      if (!existing) throw new Error(`Cannot rename: "${change.from}" does not exist`);
      fields.push({ path: change.to, mode: existing.mode, type: "blob", sha: existing.sha });
      fields.push({ path: change.from, mode: existing.mode, type: "blob", sha: null });
    }
  }

  const newTree = await gh<{ sha: string }>(`/git/trees`, {
    method: "POST",
    body: JSON.stringify({
      base_tree: current.sha,
      tree: fields,
    }),
  });

  const commit = await gh<CommitResponse>(`/git/commits`, {
    method: "POST",
    body: JSON.stringify({
      message,
      tree: newTree.sha,
      parents: [headSha],
    }),
  });

  await gh<RefResponse>(`/git/refs/heads/${branch}`, {
    method: "PATCH",
    body: JSON.stringify({ sha: commit.sha }),
  });

  await revalidateTree();
}

export async function existsInTree(pathname: string): Promise<boolean> {
  const files = await getTree();
  return files.some((f) => f.pathname === pathname);
}

export async function deletePaths(paths: string[]): Promise<number> {
  const files = await getTree();
  const valid = paths.filter((p) => files.some((f) => f.pathname === p));
  if (valid.length === 0) return 0;
  await commitChanges(
    `Delete ${valid.length} file${valid.length === 1 ? "" : "s"}: ${shortPreview(valid[0])}`,
    valid.map((p): CommitChange => ({ type: "delete", path: p }))
  );
  return valid.length;
}

export async function deletePrefix(prefix: string): Promise<number> {
  if (!prefix) return 0;
  const files = await getTree();
  const targets = files
    .filter((f) => f.pathname === prefix || f.pathname.startsWith(`${prefix}/`))
    .map((f) => f.pathname);
  if (targets.length === 0) return 0;
  await commitChanges(
    `Delete folder "${prefix}" (${targets.length} file${targets.length === 1 ? "" : "s"})`,
    targets.map((p): CommitChange => ({ type: "delete", path: p }))
  );
  return targets.length;
}

export async function renamePath(from: string, to: string): Promise<number> {
  if (!from || !to || from === to) throw new Error("Invalid rename paths");
  const files = await getTree();
  const file = files.find((f) => f.pathname === from);
  if (file) {
    if (files.some((f) => f.pathname === to)) throw new Error(`"${to}" already exists`);
    await commitChanges(`Rename "${from}" → "${to}"`, [{ type: "rename", from, to }]);
    return 1;
  }

  const prefix = `${from}/`;
  const targets = files.filter((f) => f.pathname.startsWith(prefix));
  if (targets.length === 0) throw new Error(`"${from}" does not exist`);
  const renames: CommitChange[] = targets.map((f) => ({
    type: "rename",
    from: f.pathname,
    to: `${to}/${f.pathname.slice(prefix.length)}`,
  }));
  for (const r of renames) {
    if (r.type === "rename" && files.some((f) => f.pathname === r.to)) {
      throw new Error(`"${r.to}" already exists`);
    }
  }
  await commitChanges(
    `Rename folder "${from}" → "${to}" (${targets.length} file${targets.length === 1 ? "" : "s"})`,
    renames
  );
  return targets.length;
}

function shortPreview(path: string): string {
  return path.length > 60 ? `${path.slice(0, 57)}…` : path;
}