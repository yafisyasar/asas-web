"use client";

import { useMemo, useState } from "react";
import {
  Check,
  FolderOpen,
  FolderX,
  Pencil,
  Search,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";
import type { SearchableFile } from "@/lib/types";
import { formatBytes } from "@/lib/paths";
import { FileBadge, FileIcon } from "./file-icon";

export function AdminFileManager({
  files,
  refresh,
  onUploadHere,
}: {
  files: SearchableFile[];
  refresh: () => Promise<void>;
  onUploadHere: (folderPath: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  const grouped = useMemo(() => {
    const map = new Map<string, SearchableFile[]>();
    for (const f of files) {
      const key = f.folderPath || "root";
      const arr = map.get(key) ?? [];
      arr.push(f);
      map.set(key, arr);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [files]);

  const q = query.trim().toLowerCase();
  const visible = grouped.filter(([path, fs]) =>
    q
      ? fs.some((f) => f.name.toLowerCase().includes(q)) || path.toLowerCase().includes(q)
      : true
  );

  async function removeFile(pathname: string) {
    if (!confirm(`Delete "${pathname}"?\nThis cannot be undone.`)) return;
    setBusy(pathname);
    try {
      const r = await fetch("/api/admin/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pathname }),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        alert(j.error ?? "Delete failed");
      }
    } finally {
      setBusy(null);
      await refresh();
    }
  }

  async function removeFolder(path: string) {
    if (!confirm(`Delete the whole folder "${path}" and everything inside?\nThis cannot be undone.`)) {
      return;
    }
    setBusy(path);
    try {
      const r = await fetch("/api/admin/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pathname: path }),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        alert(j.error ?? "Delete failed");
      }
    } finally {
      setBusy(null);
      await refresh();
    }
  }

  function startRename(file: SearchableFile) {
    setEditing(file.pathname);
    setDraft(file.name);
  }

  async function saveRename(file: SearchableFile) {
    const name = draft.trim();
    if (!name || name === file.name) {
      setEditing(null);
      return;
    }
    const parts = file.pathname.split("/");
    parts[parts.length - 1] = name;
    const to = parts.join("/");
    setBusy(file.pathname);
    try {
      const r = await fetch("/api/admin/rename", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ from: file.pathname, to }),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        alert(j.error ?? "Rename failed");
      }
    } finally {
      setBusy(null);
      setEditing(null);
      await refresh();
    }
  }

  if (files.length === 0) {
    return (
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 text-center text-sm text-zinc-500">
        No files yet — add some with the Upload tab above, or push them to the GitHub repo and they&rsquo;ll appear here.
      </div>
    );
  }

  return (
    <div>
      <div className="relative mb-4">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter files or folders…"
          className="w-full rounded-lg border border-zinc-800 bg-zinc-900 py-2 pl-9 pr-3 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-emerald-500/50"
        />
      </div>

      <div className="space-y-5">
        {visible.map(([folderPath, fs]) => (
          <section key={folderPath}>
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-1.5 text-sm">
                <FolderOpen className="h-4 w-4 shrink-0 text-emerald-400" />
                <span className="truncate font-medium text-zinc-200">{folderPath}</span>
                <span className="shrink-0 text-xs text-zinc-600">· {fs.length}</span>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  onClick={() => onUploadHere(folderPath)}
                  title="Upload into this folder"
                  className="flex items-center gap-1 rounded-md px-1.5 py-1 text-xs text-zinc-500 transition hover:bg-emerald-500/10 hover:text-emerald-400"
                >
                  <UploadCloud className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => removeFolder(folderPath)}
                  disabled={busy === folderPath}
                  title="Delete whole folder"
                  className="flex items-center gap-1 rounded-md px-1.5 py-1 text-xs text-zinc-500 transition hover:bg-red-500/10 hover:text-red-400"
                >
                  <FolderX className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
            <div className="overflow-hidden rounded-xl border border-zinc-800">
              <table className="w-full text-left text-sm">
                <tbody>
                  {fs
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map((file) => (
                      <tr
                        key={file.pathname}
                        className="border-b border-zinc-800/70 last:border-0 hover:bg-zinc-900/60"
                      >
                        <td className="w-10 px-3 py-2">
                          <FileIcon name={file.name} className="h-4 w-4" />
                        </td>
                        <td className="max-w-[260px] px-2 py-2">
                          {editing === file.pathname ? (
                            <div className="flex items-center gap-1.5">
                              <input
                                value={draft}
                                onChange={(e) => setDraft(e.target.value)}
                                autoFocus
                                className="w-full rounded-md border border-emerald-500/50 bg-zinc-900 px-2 py-1 text-sm text-zinc-100 outline-none"
                              />
                              <button
                                onClick={() => saveRename(file)}
                                className="rounded-md p-1 text-emerald-400 hover:bg-zinc-800"
                              >
                                <Check className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => setEditing(null)}
                                className="rounded-md p-1 text-zinc-500 hover:bg-zinc-800"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="block truncate text-zinc-100" title={file.pathname}>
                                {file.name}
                              </span>
                              <FileBadge name={file.name} />
                            </div>
                          )}
                        </td>
                        <td className="hidden px-2 py-2 text-xs tabular-nums text-zinc-500 md:table-cell">
                          {formatBytes(file.size)}
                        </td>
                        <td className="px-2 py-2 text-right">
                          <button
                            onClick={() => startRename(file)}
                            title="Rename"
                            className="rounded-md p-1.5 text-zinc-500 transition hover:bg-zinc-800 hover:text-zinc-200"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => removeFile(file.pathname)}
                            disabled={busy === file.pathname}
                            title="Delete"
                            className="rounded-md p-1.5 text-zinc-500 transition hover:bg-red-500/10 hover:text-red-400"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </section>
        ))}
        {visible.length === 0 && (
          <p className="text-sm text-zinc-500">No files match that filter.</p>
        )}
      </div>
    </div>
  );
}