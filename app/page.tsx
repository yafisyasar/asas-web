import type { Metadata } from "next";
import Link from "next/link";
import {
  Calculator,
  Clock,
  GraduationCap,
  ScrollText,
  Wrench,
} from "lucide-react";
import type { FileNode } from "@/lib/types";
import { getRecentFiles, getVisibleFiles, hasGitHubToken } from "@/lib/github";
import { compareFolderNames, summarizeTop } from "@/lib/paths";
import { FolderGrid } from "@/components/folder-grid";
import { FileList } from "@/components/file-list";
import { FileIcon, FileBadge } from "@/components/file-icon";

export const metadata: Metadata = {
  title: "ASAS-WEB",
  description:
    "Browse, search and download the semester-wise archive of 2024 BCA (Honours) college files.",
};

export const dynamic = "force-dynamic";

function toNode(file: {
  pathname: string;
  url: string;
  downloadUrl?: string;
  size: number;
}): FileNode {
  const parts = file.pathname.split("/");
  return {
    type: "file",
    name: parts[parts.length - 1] ?? file.pathname,
    pathname: file.pathname,
    url: file.url,
    downloadUrl: file.downloadUrl ?? file.url,
    size: file.size,
  };
}

export default async function HomePage() {
  const files = await getVisibleFiles();
  const semesters = summarizeTop(files)
    .filter((s) => /^sem/i.test(s.name))
    .sort((a, b) => compareFolderNames(a.name, b.name));
  const recentFiles = (await getRecentFiles()).filter((rf) => files.some((f) => f.pathname === rf.path));

  const rootFiles: FileNode[] = files.filter((f) => !f.pathname.includes("/")).map(toNode);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pt-8">
      {!hasGitHubToken() && (
        <div className="mx-auto mb-8 max-w-3xl rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          Setup is not finished. Add the <code className="rounded bg-amber-500/20 px-1">GITHUB_TOKEN</code> environment variable so the archive can be listed and edited.
        </div>
      )}

      {semesters.length > 0 && (
        <section className="pb-12">
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-zinc-500">
            Semesters
          </h2>
          <FolderGrid
            folders={semesters.map((s) => ({
              name: s.name,
              path: s.name,
              count: s.count,
              size: s.size,
            }))}
          />
        </section>
      )}

      {rootFiles.length > 0 && (
        <section className="mb-12">
          <div className="mb-4 flex items-center gap-2">
            <ScrollText className="h-4 w-4 text-emerald-400" />
            <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
              Curriculum &amp; evaluation pattern
            </h2>
          </div>
          <FileList files={rootFiles} simple />
        </section>
      )}

      <section className="mb-12">
        <div className="mb-4 flex items-center gap-2">
          <Wrench className="h-4 w-4 text-emerald-400" />
          <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-500">Tools</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <a
            href="https://aumscn.amrita.edu/cas/login"
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-4 transition hover:border-emerald-500/40 hover:bg-zinc-900"
          >
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-cyan-500/10 text-cyan-400">
              <GraduationCap className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="font-medium text-zinc-100 group-hover:text-white">AUMS</p>
              <p className="text-xs text-zinc-500">Attendance, marks &amp; timetable portal</p>
            </div>
          </a>
          <a
            href="https://ysalltools.blogspot.com/2025/05/asas-end-sem-exam-calculator-body-font.html?m=1"
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-4 transition hover:border-emerald-500/40 hover:bg-zinc-900"
          >
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-violet-500/10 text-violet-400">
              <Calculator className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="font-medium text-zinc-100 group-hover:text-white">End-sem mark calculator</p>
              <p className="text-xs text-zinc-500">Work out your final grade</p>
            </div>
          </a>
        </div>
      </section>

{recentFiles.length > 0 && (
        <section className="pb-16">
          <div className="mb-4 flex items-center gap-2">
            <Clock className="h-4 w-4 text-emerald-400" />
            <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
              Latest updates
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {recentFiles.map((file) => (
              <Link
                key={file.path}
                href={`/browse/${file.path}`}
                className="group rounded-xl border border-zinc-800 bg-zinc-900/50 px-3 pb-3 pt-4 transition hover:border-zinc-600"
              >
                <div className="flex items-center gap-3">
                  <FileIcon name={file.name} className="h-6 w-6 shrink-0" />
                  <p className="min-w-0 flex-1 truncate text-sm text-zinc-100 group-hover:text-white">
                    {file.name}
                  </p>
                </div>
                <div className="mt-2">
                  <FileBadge name={file.name} />
                </div>
                <p className="mt-1 truncate text-[11px] text-zinc-500">{file.path}</p>
                <p className="mt-0.5 truncate text-[11px] text-zinc-600">
                  {new Date(file.date).toLocaleDateString()}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}