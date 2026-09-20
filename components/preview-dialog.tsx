"use client";

import { useEffect, useState } from "react";
import { Download, ExternalLink, Loader2, X } from "lucide-react";
import type { FileNode } from "@/lib/types";
import { fileKind, formatBytes, extensionOf } from "@/lib/paths";
import { FileIcon } from "./file-icon";
import {
  ArchivePanel,
  DocxPanel,
  MarkdownPanel,
  NotebookPanel,
  SheetPanel,
  SlidePanel,
} from "./preview-panels";

export function PreviewDialog({
  file,
  onClose,
}: {
  file: FileNode | null;
  onClose: () => void;
}) {
  const kind = file ? fileKind(file.name) : "other";
  const ext = file ? extensionOf(file.name) : "";
  const wantsText = (kind === "code" || kind === "text") && ext !== "md";
  const wantsMd = ext === "md";

  useEffect(() => {
    if (!file) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [file, onClose]);

  if (!file) return null;

  const src = `/api/file?path=${encodeURIComponent(file.pathname)}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-zinc-800 px-4 py-3">
          <FileIcon name={file.name} className="h-5 w-5 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium text-zinc-100">{file.name}</p>
            <p className="text-xs text-zinc-500">{formatBytes(file.size)}</p>
          </div>
          <a
            href={file.downloadUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-md border border-zinc-700 px-2.5 py-1.5 text-xs font-medium text-zinc-200 transition hover:bg-zinc-800"
          >
            <Download className="h-3.5 w-3.5" /> Download
          </a>
          <a
            href={file.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-md border border-zinc-700 px-2.5 py-1.5 text-xs font-medium text-zinc-200 transition hover:bg-zinc-800"
          >
            <ExternalLink className="h-3.5 w-3.5" /> Open
          </a>
          <button
            onClick={onClose}
            aria-label="Close preview"
            className="rounded-md p-1.5 text-zinc-400 transition hover:bg-zinc-800 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-[30vh] flex-1 overflow-auto bg-black/40">
          {kind === "pdf" && <iframe src={src} className="h-[70vh] w-full" title={file.name} />}
          {kind === "image" && (
            <div className="flex h-[70vh] items-center justify-center p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt={file.name} className="max-h-full max-w-full object-contain" />
            </div>
          )}
          {kind === "video" && (
            <video controls src={src} className="h-[70vh] w-full" preload="metadata" />
          )}
          {kind === "audio" && (
            <div className="flex h-[30vh] items-center justify-center p-6">
              <audio controls src={src} className="w-full" />
            </div>
          )}
          {kind === "notebook" && <NotebookPanel key={file.pathname} path={file.pathname} />}
          {wantsMd && <MarkdownPanel key={file.pathname} path={file.pathname} />}
          {wantsText && <CodePreview key={file.pathname} path={file.pathname} />}
          {kind === "doc" && <DocxPanel key={file.pathname} path={file.pathname} />}
          {kind === "sheet" && <SheetPanel key={file.pathname} path={file.pathname} />}
          {kind === "slide" && <SlidePanel key={file.pathname} path={file.pathname} />}
          {kind === "archive" && <ArchivePanel key={file.pathname} path={file.pathname} />}
          {!["pdf", "image", "video", "audio", "notebook"].includes(kind) &&
            !wantsMd &&
            !wantsText &&
            !["doc", "sheet", "slide", "archive"].includes(kind) && (
              <div className="flex h-[30vh] items-center justify-center gap-3 text-sm text-zinc-400">
                <FileIcon name={file.name} className="h-6 w-6" />
                No inline preview — download to view.
              </div>
            )}
        </div>
      </div>
    </div>
  );
}

function CodePreview({ path }: { path: string }) {
  const [state, setState] = useState<{ text: string | null; loading: boolean }>({
    text: null,
    loading: true,
  });

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/raw?path=${encodeURIComponent(path)}`)
      .then((r) => (r.ok ? r.text() : Promise.reject(new Error("failed"))))
      .then((t) => {
        if (!cancelled) setState({ text: t, loading: false });
      })
      .catch(() => {
        if (!cancelled) setState({ text: "(Preview not available for this file.)", loading: false });
      });
    return () => {
      cancelled = true;
    };
  }, [path]);

  if (state.loading) {
    return (
      <div className="flex h-[40vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
      </div>
    );
  }

  return (
    <pre className="max-h-[70vh] overflow-auto whitespace-pre-wrap break-words p-4 font-mono text-xs text-zinc-200">
      {state.text}
    </pre>
  );
}