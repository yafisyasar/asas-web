"use client";

import { useMemo, useState } from "react";
import {
  ArrowDownAZ,
  ArrowUpAZ,
  Download,
  LayoutGrid,
  List,
  Search,
  X,
} from "lucide-react";
import type { FileNode } from "@/lib/types";
import { formatBytes } from "@/lib/paths";
import { FileBadge, FileIcon } from "./file-icon";
import { PreviewDialog } from "./preview-dialog";

type SortBy = "name" | "size";
type View = "list" | "grid";

function toggleInSet(set: Set<string>, value: string): Set<string> {
  const next = new Set(set);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
}

function downloadFiles(paths: string[]) {
  for (const path of paths) {
    const a = document.createElement("a");
    a.href = `/api/file?path=${encodeURIComponent(path)}`;
    a.download = path.split("/").pop() ?? path;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }
}

export function FileList({ files, simple = false }: { files: FileNode[]; simple?: boolean }) {
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortBy>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [view, setView] = useState<View>("list");
  const [preview, setPreview] = useState<FileNode | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q ? files.filter((f) => f.name.toLowerCase().includes(q)) : [...files];
    list.sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name);
      return a.size - b.size;
    });
    return sortDir === "asc" ? list : list.reverse();
  }, [files, query, sortBy, sortDir]);

  const toggleSort = (next: SortBy) => {
    if (sortBy === next) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(next);
      setSortDir("asc");
    }
  };

  const selectedCount = selected.size;

  const selectAll = (checked: boolean) => {
    setSelected(checked ? new Set(filtered.map((f) => f.pathname)) : new Set());
  };

  if (files.length === 0) {
    return <p className="py-12 text-center text-sm text-zinc-500">No files in this folder.</p>;
  }

  return (
    <div>
      {!simple && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter files in this folder…"
              className="w-full rounded-lg border border-zinc-800 bg-zinc-900 py-2 pl-9 pr-3 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-emerald-500/50"
            />
          </div>
          <div className="flex items-center gap-1 rounded-lg border border-zinc-800 bg-zinc-900 p-1 text-xs">
            {(["name", "size"] as SortBy[]).map((key) => (
              <button
                key={key}
                onClick={() => toggleSort(key)}
                className={`flex items-center gap-1 rounded-md px-2 py-1 transition ${
                  sortBy === key ? "bg-zinc-800 text-white" : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {key === "name" ? "Name" : "Size"}
                {sortBy === key &&
                  (sortDir === "asc" ? (
                    <ArrowDownAZ className="h-3 w-3" />
                  ) : (
                    <ArrowUpAZ className="h-3 w-3" />
                  ))}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1 rounded-lg border border-zinc-800 bg-zinc-900 p-1">
            {(
              [
                { key: "list", icon: List },
                { key: "grid", icon: LayoutGrid },
              ] as const
            ).map((v) => (
              <button
                key={v.key}
                onClick={() => setView(v.key)}
                aria-label={`${v.key} view`}
                className={`rounded-md p-1.5 transition ${
                  view === v.key ? "bg-zinc-800 text-white" : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                <v.icon className="h-3.5 w-3.5" />
              </button>
            ))}
          </div>
        </div>
      )}

      {selectedCount > 0 && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2">
          <p className="text-sm text-emerald-200">
            {selectedCount} file{selectedCount === 1 ? "" : "s"} selected
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => downloadFiles([...selected])}
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

      {!simple && (
        <label className="mb-3 flex w-fit cursor-pointer items-center gap-2 text-xs text-zinc-500 transition hover:text-zinc-300">
          <input
            type="checkbox"
            className="accent-emerald-500"
            checked={selectedCount === filtered.length && filtered.length > 0}
            onChange={(e) => selectAll(e.target.checked)}
          />
          Select all ({filtered.length})
        </label>
      )}

      {view === "grid" ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {filtered.map((file) => (
            <div
              key={file.pathname}
              onClick={() => setPreview(file)}
              className={`group relative cursor-pointer rounded-xl border bg-zinc-900/50 px-3 pb-3 pt-4 transition hover:border-zinc-600 ${
                selected.has(file.pathname)
                  ? "border-emerald-500/50 bg-emerald-500/5"
                  : "border-zinc-800"
              }`}
            >
              <span
                role="checkbox"
                aria-checked={selected.has(file.pathname)}
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelected((s) => toggleInSet(s, file.pathname));
                }}
                onKeyDown={(e) => {
                  if (e.key === " " || e.key === "Enter") {
                    e.preventDefault();
                    e.stopPropagation();
                    setSelected((s) => toggleInSet(s, file.pathname));
                  }
                }}
                className={`absolute right-2 top-2 grid h-5 w-5 place-items-center rounded border text-[10px] transition ${
                  selected.has(file.pathname)
                    ? "border-emerald-500 bg-emerald-500 text-emerald-950"
                    : "border-zinc-700 bg-zinc-950 text-transparent group-hover:border-zinc-500"
                }`}
              >
                ✓
              </span>
              <div className="flex items-center gap-3">
                <FileIcon name={file.name} className="h-6 w-6 shrink-0" />
                <p className="min-w-0 flex-1 truncate text-sm text-zinc-100 group-hover:text-white">
                  {file.name}
                </p>
              </div>
              <div className="mt-2">
                <FileBadge name={file.name} />
              </div>
              <p className="mt-1 truncate text-[11px] text-zinc-500">{formatBytes(file.size)}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-zinc-800">
          <table className="w-full text-left text-sm">
            <tbody>
              {filtered.map((file) => (
                <tr
                  key={file.pathname}
                  className={`group border-b border-zinc-800/70 transition last:border-0 hover:bg-zinc-900/60 ${
                    selected.has(file.pathname) ? "bg-emerald-500/5" : ""
                  }`}
                >
                  <td className="w-10 px-3 py-2.5">
                    <input
                      type="checkbox"
                      className="accent-emerald-500"
                      checked={selected.has(file.pathname)}
                      onChange={() => setSelected((s) => toggleInSet(s, file.pathname))}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </td>
                  <td className="w-10 px-2 py-2.5">
                    <FileIcon name={file.name} className="h-4.5 w-4.5" />
                  </td>
                  <td className="max-w-[340px] cursor-pointer px-2 py-2.5" onClick={() => setPreview(file)}>
                    <p className="truncate text-zinc-100 group-hover:text-white">{file.name}</p>
                  </td>
                  <td className="hidden px-2 py-2.5 sm:table-cell">
                    <FileBadge name={file.name} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <PreviewDialog file={preview} onClose={() => setPreview(null)} />
    </div>
  );
}