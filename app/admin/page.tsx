"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Database, Files, LogOut, UploadCloud } from "lucide-react";
import type { SearchableFile, StoredFile } from "@/lib/types";
import { buildTree, flattenSearchable } from "@/lib/paths";
import { AdminUploader } from "@/components/admin-uploader";
import { AdminFileManager } from "@/components/admin-file-manager";

type BlobsResponse = { files?: StoredFile[]; search?: SearchableFile[]; total?: number };

export default function AdminPage() {
  const router = useRouter();
  const [data, setData] = useState<BlobsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"upload" | "files">("upload");
  const [uploadTarget, setUploadTarget] = useState("sem 3");

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/blobs", { cache: "no-store" });
      if (!r.ok) throw new Error("failed");
      const json: BlobsResponse = await r.json();
      const tree = buildTree(json.files ?? []);
      const search = flattenSearchable(tree);
      setData({ files: json.files, search, total: json.total });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void (async () => {
      await load();
    })();
  }, [load]);

  const folders = useMemo(() => {
    const set = new Set<string>();
    for (const f of data?.files ?? []) {
      const parts = f.pathname.split("/");
      parts.pop();
      let acc = "";
      for (const part of parts) {
        acc = acc ? `${acc}/${part}` : part;
        set.add(acc);
      }
    }
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [data]);

  const stats = useMemo(() => {
    const files = data?.files ?? [];
    const distinctFolders = new Set(
      files.map((f) => f.pathname.split("/").slice(0, -1).join("/") || "root")
    ).size;
    return { count: files.length, folders: distinctFolders };
  }, [data]);

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">Admin</h1>
          <p className="mt-1 text-sm text-zinc-500">Upload, organise and remove files.</p>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-1.5 rounded-lg border border-zinc-800 px-3 py-1.5 text-sm text-zinc-400 transition hover:border-zinc-700 hover:text-zinc-200"
        >
          <LogOut className="h-4 w-4" /> Log out
        </button>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <StatCard icon={<Database className="h-4 w-4" />} label="Total files" value={String(stats.count)} />
        <StatCard icon={<Files className="h-4 w-4" />} label="Folders" value={String(stats.folders)} />
      </div>

      <div className="mt-6 flex gap-1 rounded-xl border border-zinc-800 bg-zinc-900 p-1">
        {(
          [
            { key: "upload", label: "Upload", icon: UploadCloud },
            { key: "files", label: "Manage files", icon: Files },
          ] as const
        ).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition ${
              tab === t.key ? "bg-zinc-800 text-white" : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {loading ? (
          <p className="text-sm text-zinc-500">Loading…</p>
        ) : tab === "upload" ? (
          <AdminUploader
            folders={folders}
            folder={uploadTarget}
            onFolderChange={setUploadTarget}
            onDone={load}
          />
        ) : (
          <AdminFileManager
            files={data?.search ?? []}
            refresh={load}
            onUploadHere={(path) => {
              setUploadTarget(path);
              setTab("upload");
            }}
          />
        )}
      </div>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/40 px-4 py-3">
      <span className="grid h-9 w-9 place-items-center rounded-lg bg-emerald-500/10 text-emerald-400">
        {icon}
      </span>
      <div>
        <p className="text-lg font-semibold text-zinc-100">{value}</p>
        <p className="text-xs text-zinc-500">{label}</p>
      </div>
    </div>
  );
}