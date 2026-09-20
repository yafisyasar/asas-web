import Link from "next/link";
import { ChevronRight, FolderOpen } from "lucide-react";
import type { FolderCardInfo } from "@/lib/paths";

export function FolderGrid({
  folders,
  layout = "grid",
}: {
  folders: FolderCardInfo[];
  layout?: "grid" | "list";
}) {
  if (folders.length === 0) return null;

  if (layout === "list") {
    return (
      <div className="overflow-hidden rounded-xl border border-zinc-800">
        {folders.map((folder) => (
          <Link
            key={folder.path}
            href={`/browse/${folder.path}`}
            className="group flex items-center gap-3 border-b border-zinc-800/70 px-4 py-3 transition last:border-0 hover:bg-zinc-900/60"
          >
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-emerald-500/10 text-emerald-400">
              <FolderOpen className="h-4.5 w-4.5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-zinc-100 group-hover:text-white">
                {folder.name}
              </p>
              <p className="text-xs text-zinc-500">
                {folder.count} file{folder.count === 1 ? "" : "s"}
              </p>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-zinc-600 transition group-hover:text-zinc-300" />
          </Link>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {folders.map((folder) => (
        <Link
          key={folder.path}
          href={`/browse/${folder.path}`}
          className="group flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3.5 transition hover:border-emerald-500/40 hover:bg-zinc-900"
        >
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-emerald-500/10 text-emerald-400">
            <FolderOpen className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="truncate font-medium text-zinc-100 group-hover:text-white">{folder.name}</p>
            <p className="text-xs text-zinc-500">
              {folder.count} file{folder.count === 1 ? "" : "s"}
            </p>
          </div>
        </Link>
      ))}
    </div>
  );
}