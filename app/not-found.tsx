import Link from "next/link";
import { FolderSearch2, Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[60vh] w-full max-w-lg flex-col items-center justify-center px-4 text-center">
      <FolderSearch2 className="h-10 w-10 text-zinc-600" />
      <h1 className="mt-4 text-2xl font-semibold text-zinc-100">Folder not found</h1>
      <p className="mt-2 text-sm text-zinc-500">
        The folder or file you&rsquo;re looking for doesn&rsquo;t exist (or hasn&rsquo;t been uploaded yet).
      </p>
      <Link
        href="/browse"
        className="mt-6 inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-400"
      >
        <Home className="h-4 w-4" /> Browse the archive
      </Link>
    </div>
  );
}