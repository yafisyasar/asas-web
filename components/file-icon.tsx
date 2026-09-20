import {
  FileArchive,
  FileAudio,
  FileCode2,
  FileDown,
  FileImage,
  FileSpreadsheet,
  FileText,
  File as FileGeneric,
  FileType,
  FileVideo,
  LibraryBig,
  type LucideIcon,
} from "lucide-react";
import { fileKind } from "@/lib/paths";

const ICONS: Record<string, { icon: LucideIcon; className: string }> = {
  pdf: { icon: FileText, className: "text-red-400" },
  image: { icon: FileImage, className: "text-violet-400" },
  video: { icon: FileVideo, className: "text-rose-400" },
  audio: { icon: FileAudio, className: "text-pink-400" },
  archive: { icon: FileArchive, className: "text-amber-400" },
  doc: { icon: FileType, className: "text-sky-400" },
  sheet: { icon: FileSpreadsheet, className: "text-green-400" },
  slide: { icon: FileType, className: "text-orange-400" },
  code: { icon: FileCode2, className: "text-cyan-400" },
  notebook: { icon: LibraryBig, className: "text-yellow-400" },
  text: { icon: FileText, className: "text-zinc-400" },
  other: { icon: FileGeneric, className: "text-zinc-400" },
};

export function FileIcon({ name, className }: { name: string; className?: string }) {
  const kind = fileKind(name);
  const { icon: Icon, className: color } = ICONS[kind] ?? ICONS.other;
  return <Icon className={`${color} ${className ?? ""}`} />;
}

export function FileBadge({ name }: { name: string }) {
  const kind = fileKind(name);
  const labels: Record<string, string> = {
    pdf: "PDF",
    image: "Image",
    video: "Video",
    audio: "Audio",
    archive: "Archive",
    doc: "Document",
    sheet: "Spreadsheet",
    slide: "Slides",
    code: "Code",
    notebook: "Notebook",
    text: "Text",
    other: "File",
  };
  return (
    <span className="inline-flex items-center gap-1 rounded-md border border-zinc-800 bg-zinc-900 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-zinc-400">
      {labels[kind] ?? "File"}
    </span>
  );
}

export function DownloadGlyph({ className }: { className?: string }) {
  return <FileDown className={className ?? ""} />;
}