"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Download, FolderOpen, Search, X } from "lucide-react";
import Link from "next/link";
import type { SearchableFile } from "@/lib/types";
import { fileKind } from "@/lib/paths";
import { FileBadge, FileIcon } from "@/components/file-icon";
import { PreviewDialog } from "@/components/preview-dialog";
import { FileSkeletonRows, Skeleton } from "@/components/skeleton";

type BlobsResponse = { files: unknown[]; search: SearchableFile[]; total: number };

const KINDS = [
  "all",
  "pdf",
  "code",
  "doc",
  "sheet",
  "slide",
  "image",
  "video",
  "audio",
  "archive",
  "text",
] as const;

function extractSemester(folderPath: string): string {
  const first = folderPath.split("/")[0] ?? "";
  const m = first.match(/sem\s*(\d)/i);
  return m ? `Sem ${m[1]}` : first;
}

export default function SearchPage() {
  const [data, setData] = useState<BlobsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<(typeof KINDS)[number]>("all");
  const [preview, setPreview] = useState<SearchableFile | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const loaded = useRef(false);

  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;
    fetch("/api/blobs")
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load index");
        return r.json();
      })
      .then((json: BlobsResponse) => setData(json))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const results = useMemo(() => {
    if (!data) return [] as SearchableFile[];
    const q = query.trim().toLowerCase();
    return data.search
      .filter((f) => (q ? f.name.toLowerCase().includes(q) || f.folderPath.toLowerCase().includes(q) : true))
      .filter((f) => (kind === "all" ? true : fileKind(f.name) === kind))
      .sort((a, b) => a.folderPath.localeCompare(b.folderPath) || a.name.localeCompare(b.name));
  }, [data, query, kind]);

  const groups = useMemo(() => {
    const map = new Map<string, SearchableFile[]>();
    for (const file of results) {
      const key = file.folderPath || "root";
      const arr = map.get(key) ?? [];
      arr.push(file);
      map.set(key, arr);
    }
    return [...map.entries()];
  }, [results]);

  function downloadSelected() {
    for (const path of selected) {
      const a = document.createElement("a");
      a.href = `/api/file?path=${encodeURIComponent(path)}`;
      a.download = path.split("/").pop() ?? path;
      document.body.appendChild(a);
      a.click();
      a.remove();
    }
  }

  const toggleFile = (pathname: string) =>
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(pathname)) next.delete(pathname);
      else next.add(pathname);
      return next;
    });

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8">
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">Search</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Search across {data ? data.total : "…"} files in the archive.
      </p>

      <div className="sticky top-14 z-30 -mx-4 mt-5 space-y-3 bg-zinc-950/90 px-4 py-3 backdrop-blur">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Try “floating point”, “node js”, “DBMS quiz”…"
            className="w-full rounded-xl border border-zinc-800 bg-zinc-900 py-2.5 pl-10 pr-3 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-emerald-500/50"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {KINDS.map((k) => (
            <button
              key={k}
              onClick={() => setKind(k)}
              className={`rounded-full border px-3 py-1 text-xs capitalize transition ${
                kind === k
                  ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-300"
                  : "border-zinc-800 bg-zinc-900 text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {k}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="mt-6 space-y-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i}>
              <div className="mb-2 flex items-center gap-2">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-4 w-40" />
              </div>
              <FileSkeletonRows rows={3} />
            </div>
          ))}
        </div>
      )}
      {error && !loading && (
        <p className="py-16 text-center text-sm text-red-400">Failed to load: {error}</p>
      )}
      {!loading && !error && results.length === 0 && (
        <p className="py-16 text-center text-sm text-zinc-500">No files match your search.</p>
      )}
      {selected.size > 0 && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2">
          <p className="text-sm text-emerald-200">
            {selected.size} file{selected.size === 1 ? "" : "s"} selected
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={downloadSelected}
              className="flex items-center gap-1.5 rounded-md bg-emerald-500 px-2.5 py-1 text-xs font-semibold text-emerald-950 transition hover:bg-emerald-400"
            >
              <Download className="h-3.5 w-3.5" /> Download selected
            </button>
            <button
              onClick={() => setSelected(new Set())}
              className="flex items-center gap-1 rounded-md border border-zinc-700 px-2 py-1 text-xs text-zinc-300 transition hover:bg-zinc-800"
            >
              <X className="h-3 w-3" /> Clear
            </button>
          </div>
        </div>
      )}

      {!loading &&
        !error &&
        groups.map(([folderPath, files]) => (
          <section key={folderPath} className="mt-6">
            <div className="mb-2 flex items-center gap-2">
              <FolderOpen className="h-4 w-4 text-emerald-400" />
              <Link
                href={`/browse/${folderPath}`}
                className="text-sm font-medium text-zinc-300 transition hover:text-white"
              >
                {folderPath}
              </Link>
              <span className="text-xs text-zinc-600">· {files.length}</span>
            </div>
            <div className="overflow-hidden rounded-xl border border-zinc-800">
              <table className="w-full text-left text-sm">
                <tbody>
                  {files.map((file) => (
                    <tr
                      key={file.pathname}
                      className="group border-b border-zinc-800/70 transition last:border-0 hover:bg-zinc-900/60"
                      onClick={() => setPreview(file)}
                    >
                      <td
                        className="w-10 px-3 py-2.5"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          className="accent-emerald-500"
                          checked={selected.has(file.pathname)}
                          onChange={() => toggleFile(file.pathname)}
                        />
                      </td>
                      <td className="w-10 px-2 py-2.5">
                        <FileIcon name={file.name} className="h-4.5 w-4.5" />
                      </td>
                      <td className="max-w-[380px] px-2 py-2.5">
                        <p className="truncate text-zinc-100 group-hover:text-white">{file.name}</p>
                      </td>
                      <td className="hidden px-2 py-2.5 sm:table-cell">
                        <FileBadge name={file.name} />
                      </td>
                      <td className="hidden px-2 py-2.5 text-xs text-zinc-600 md:table-cell">
                        {folderPath === "root" ? "" : extractSemester(folderPath)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ))}

      <PreviewDialog file={preview} onClose={() => setPreview(null)} />
    </div>
  );
}