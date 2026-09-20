"use client";

import { useRef, useState } from "react";
import {
  CheckCircle2,
  ChevronDown,
  CloudUpload,
  FolderPlus,
  FolderSearch,
  FolderUp,
  Loader2,
  Trash2,
  UploadCloud,
  XCircle,
} from "lucide-react";
import { formatBytes } from "@/lib/paths";

type UploadItem = {
  id: number;
  relPath: string;
  target: string;
  size: number;
  blockedReason?: string;
  status: "pending" | "uploading" | "done" | "error";
  error?: string;
  file?: File;
};

const QUICK_FOLDERS = ["sem 3", "sem 4", "sem 5"];
const MAX_FILE_SIZE = 4 * 1024 * 1024;
const MAX_BATCH_SIZE = 3.5 * 1024 * 1024;
let nextId = 1;

type UploadResponse = {
  ok: boolean;
  files: Array<{ pathname: string; name: string }>;
  skipped: Array<{ path: string; name: string; reason: string }>;
};

export function AdminUploader({
  folders,
  folder,
  onFolderChange,
  onDone,
}: {
  folders: string[];
  folder: string;
  onFolderChange: (folder: string) => void;
  onDone: () => Promise<void>;
}) {
  const [dragOver, setDragOver] = useState(false);
  const [overwrite, setOverwrite] = useState(false);
  const [items, setItems] = useState<UploadItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerQuery, setPickerQuery] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const cleanDestination = folder.replace(/^\/+|\/+$/g, "").replace(/\/+/g, "/");

  function makeItems(fileList: FileList | null, nested: boolean): UploadItem[] {
    if (!fileList) return [];
    return Array.from(fileList).map((f) => {
      const relPath = (nested ? f.webkitRelativePath || f.name : f.name).replace(/\\/g, "/");
      const cleaned = cleanDestination
        ? `${cleanDestination}/${relPath}`.replace(/\/+/g, "/").replace(/^\/+/, "")
        : relPath;
      return {
        id: nextId++,
        relPath,
        target: cleaned,
        size: f.size,
        blockedReason:
          f.size > MAX_FILE_SIZE
            ? "Over 4.5MB — add this file with git push instead (large files can't pass through Vercel)."
            : undefined,
        status: "pending",
        file: f,
      };
    });
  }

  function queueFiles(fileList: FileList | null) {
    setItems((prev) => [...prev, ...makeItems(fileList, false)]);
  }

  function queueDirectory(fileList: FileList | null) {
    const entries = makeItems(fileList, true);
    entries.sort((a, b) => a.relPath.localeCompare(b.relPath));
    setItems((prev) => [...prev, ...entries]);
  }

  function patchItem(id: number, patch: Partial<UploadItem>) {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  }

  async function uploadBatch(batch: UploadItem[]) {
    const form = new FormData();
    form.set("overwrite", String(overwrite));
    form.set(
      "paths",
      JSON.stringify(batch.map((it) => it.target))
    );
    for (const it of batch) form.append("file", it.file as Blob, it.relPath.split("/").pop());
    const res = await fetch("/api/admin/upload", { method: "POST", body: form });
    const data = (await res.json().catch(() => null)) as UploadResponse | null;
    if (!res.ok || !data?.ok) {
      throw new Error(data?.ok === false ? "server rejected the upload" : "request failed");
    }
    const okNames = new Map(data.files.map((f) => [f.pathname, f]));
    const skippedPaths = new Map(data.skipped.map((s) => [s.path, s]));
    for (const it of batch) {
      if (okNames.has(it.target)) {
        patchItem(it.id, { status: "done" });
      } else if (skippedPaths.has(it.target)) {
        patchItem(it.id, {
          status: "error",
          error: skippedPaths.get(it.target)?.reason ?? "skipped",
        });
      } else {
        patchItem(it.id, { status: "error", error: "no response for file" });
      }
    }
  }

  async function startUpload() {
    const pending = items.filter((it) => it.status === "pending" && !it.blockedReason && it.file);
    if (pending.length === 0) return;
    setBusy(true);
    setItems((prev) =>
      prev.map((it) => (it.status === "pending" ? { ...it, status: "uploading" } : it))
    );

    const batches: UploadItem[][] = [[]];
    for (const it of pending) {
      const last = batches[batches.length - 1];
      if (last.reduce((sum, b) => sum + b.size, 0) + it.size > MAX_BATCH_SIZE) {
        batches.push([it]);
      } else {
        last.push(it);
      }
    }

    for (const batch of batches) {
      try {
        await uploadBatch(batch);
      } catch (err) {
        for (const it of batch) {
          patchItem(it.id, { status: "error", error: (err as Error).message });
        }
      }
    }

    setBusy(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (folderInputRef.current) folderInputRef.current.value = "";
    await onDone();
  }

  const doneCount = items.filter((i) => i.status === "done").length;
  const failedCount = items.filter((i) => i.status === "error").length;
  const blockedCount = items.filter((i) => i.blockedReason).length;

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
      <h2 className="text-sm font-semibold text-zinc-100">Upload files</h2>
      <p className="mt-1 text-xs text-zinc-500">
        Files are committed straight to the archive on GitHub as one commit per batch. The web upload
        is limited to files under ~4.5MB — for bigger files (video, large PDFs) push them with git
        instead and they&rsquo;ll appear here automatically.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-400">
            Destination folder <span className="text-zinc-600">(any depth, e.g. sem 3/DS/Lab)</span>
          </label>
          <div className="flex gap-2">
            <div className="relative min-w-0 flex-1">
              <FolderPlus className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <input
                list="folder-suggestions"
                value={folder}
                onChange={(e) => onFolderChange(e.target.value)}
                placeholder="sem 3/DS"
                className="w-full rounded-lg border border-zinc-800 bg-zinc-900 py-2 pl-9 pr-3 text-sm text-zinc-100 outline-none focus:border-emerald-500/50"
              />
              <datalist id="folder-suggestions">
                {folders.map((f) => (
                  <option key={f} value={f} />
                ))}
              </datalist>
            </div>
            <div className="relative">
              <button
                type="button"
                onClick={() => setPickerOpen((o) => !o)}
                className="flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-300 transition hover:border-zinc-700"
              >
                <FolderSearch className="h-4 w-4" />
                Browse
                <ChevronDown className={`h-3.5 w-3.5 transition ${pickerOpen ? "rotate-180" : ""}`} />
              </button>
              {pickerOpen && (
                <div className="absolute right-0 z-30 mt-1 w-72 rounded-xl border border-zinc-800 bg-zinc-950 p-2 shadow-2xl">
                  <input
                    autoFocus
                    value={pickerQuery}
                    onChange={(e) => setPickerQuery(e.target.value)}
                    placeholder="Filter folders…"
                    className="mb-2 w-full rounded-lg border border-zinc-800 bg-zinc-900 px-2.5 py-1.5 text-xs text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-emerald-500/50"
                  />
                  <div className="max-h-64 overflow-auto">
                    {(() => {
                      const q = pickerQuery.trim().toLowerCase();
                      const matching = folders.filter((f) =>
                        q ? f.toLowerCase().includes(q) : true
                      );
                      const grouped = new Map<string, string[]>();
                      for (const f of matching) {
                        const top = f.split("/")[0] ?? "";
                        const arr = grouped.get(top) ?? [];
                        arr.push(f);
                        grouped.set(top, arr);
                      }
                      if (matching.length === 0) {
                        return (
                          <p className="px-2 py-3 text-center text-xs text-zinc-600">
                            No matching folders — type the path above.
                          </p>
                        );
                      }
                      return [...grouped.entries()].map(([top, subs]) => (
                        <div key={top} className="mb-1">
                          <p className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-600">
                            {top}
                          </p>
                          {subs.map((f) => (
                            <button
                              key={f}
                              type="button"
                              onClick={() => {
                                onFolderChange(f);
                                setPickerOpen(false);
                              }}
                              className={`block w-full truncate rounded-md px-2 py-1 text-left text-xs transition ${
                                f === folder
                                  ? "bg-emerald-500/15 text-emerald-300"
                                  : "text-zinc-300 hover:bg-zinc-800"
                              }`}
                            >
                              {f}
                            </button>
                          ))}
                        </div>
                      ));
                    })()}
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {QUICK_FOLDERS.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => onFolderChange(f)}
                className={`rounded-full border px-2.5 py-0.5 text-xs transition ${
                  cleanDestination === f
                    ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-300"
                    : "border-zinc-800 bg-zinc-900 text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
        <label className="flex cursor-pointer items-start gap-2 text-sm text-zinc-400">
          <input
            type="checkbox"
            checked={overwrite}
            onChange={(e) => setOverwrite(e.target.checked)}
            className="mt-0.5 h-4 w-4 accent-emerald-500"
          />
          <span>
            Overwrite existing files with the same name.
            <span className="block text-xs text-zinc-600">Off by default (keeps files safe).</span>
          </span>
        </label>
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          queueFiles(e.dataTransfer.files);
        }}
        onClick={() => fileInputRef.current?.click()}
        className={`mt-4 grid cursor-pointer place-items-center gap-1 rounded-xl border-2 border-dashed px-4 py-8 text-center transition ${
          dragOver
            ? "border-emerald-500 bg-emerald-500/10"
            : "border-zinc-700 hover:border-zinc-600 hover:bg-zinc-900"
        }`}
      >
        <UploadCloud className="h-8 w-8 text-zinc-500" />
        <p className="mt-1 text-sm text-zinc-300">Drag & drop files here, or click to select</p>
        <p className="text-xs text-zinc-600">Up to ~4.5MB per file · multiple files supported</p>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => queueFiles(e.target.files)}
        />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => folderInputRef.current?.click()}
          className="flex items-center gap-1.5 rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-300 transition hover:bg-zinc-800"
        >
          <FolderUp className="h-4 w-4" /> Upload a whole folder…
        </button>
        <span className="text-xs text-zinc-600">
          Folder contents keep their internal structure under the destination.
        </span>
        <input
          ref={folderInputRef}
          type="file"
          multiple
          className="hidden"
          {...({ webkitdirectory: "" } as React.InputHTMLAttributes<HTMLInputElement>)}
          onChange={(e) => queueDirectory(e.target.files)}
        />
      </div>

      {items.length > 0 && (
        <>
          <ul className="mt-4 max-h-56 space-y-1.5 overflow-auto">
            {items.map((item) => (
              <li key={item.id} className="flex items-center gap-2 text-sm">
                {item.status === "done" && (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                )}
                {item.status === "error" && <XCircle className="h-4 w-4 shrink-0 text-red-400" />}
                {(item.status === "pending" || item.status === "uploading") && !item.blockedReason && (
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin text-zinc-500" />
                )}
                {item.blockedReason && (
                  <XCircle className="h-4 w-4 shrink-0 text-amber-400" />
                )}
                <span className="min-w-0 flex-1 truncate text-zinc-200" title={item.target}>
                  {item.target}
                </span>
                <span className="shrink-0 text-xs text-zinc-500">{formatBytes(item.size)}</span>
                <span className="w-24 shrink-0 text-right text-xs">
                  {item.status === "error" || item.blockedReason ? (
                    <span
                      className={`block truncate ${
                        item.blockedReason ? "text-amber-400" : "text-red-400"
                      }`}
                      title={item.error ?? item.blockedReason}
                    >
                      {item.blockedReason ? "too large" : "failed"}
                    </span>
                  ) : item.status === "done" ? (
                    <span className="text-emerald-400">done</span>
                  ) : item.status === "uploading" ? (
                    <span className="text-zinc-400">uploading…</span>
                  ) : (
                    <span className="text-zinc-600">queued</span>
                  )}
                </span>
                <button
                  type="button"
                  onClick={() => setItems((prev) => prev.filter((it) => it.id !== item.id))}
                  className="shrink-0 rounded-md p-1 text-zinc-600 transition hover:text-red-400"
                  aria-label="Remove from queue"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
          <button
            onClick={startUpload}
            disabled={busy}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CloudUpload className="h-4 w-4" />
            )}
            {busy
              ? `Committing ${doneCount}/${items.length}…`
              : `Upload ${items.length} item${items.length === 1 ? "" : "s"} (1 commit per batch)`}
          </button>
          {failedCount > 0 && (
            <p className="mt-2 text-xs text-red-400">
              {failedCount} failed — check each row&rsquo;s message (e.g. file already exists unless
              overwrite is on).
            </p>
          )}
          {blockedCount > 0 && (
            <p className="mt-2 text-xs text-amber-400">
              {blockedCount} file{blockedCount === 1 ? "" : "s"} over 4.5MB — push these with
              <code className="mx-1 rounded bg-zinc-800 px-1">git push</code> instead.
            </p>
          )}
        </>
      )}
    </div>
  );
}