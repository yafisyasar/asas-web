import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getVisibleFiles } from "@/lib/github";
import { buildTree, childFolderCards, findFolder, folderFileCount } from "@/lib/paths";
import type { FileNode } from "@/lib/types";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { FolderGrid } from "@/components/folder-grid";
import { FileList } from "@/components/file-list";

export const dynamic = "force-dynamic";

function decodePath(value: string[] = []): string[] {
  return value.map((s) => decodeURIComponent(s));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ path?: string[] }>;
}): Promise<Metadata> {
  const path = decodePath((await params).path);
  return { title: path.length ? `${path[path.length - 1]} · ASAS-WEB` : "Browse · ASAS-WEB" };
}

export default async function BrowsePage({
  params,
}: {
  params: Promise<{ path?: string[] }>;
}) {
  const path = decodePath((await params).path);
  const files = await getVisibleFiles();
  const tree = buildTree(files);
  const folder = findFolder(tree, path);

  if (!folder) {
    notFound();
  }

  const subFolders = childFolderCards(folder);
  const childFiles = folder.children.filter((c): c is FileNode => c.type === "file");
  const folderCount = folderFileCount(folder);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8">
      <Breadcrumbs parts={path} />

      <div className="mt-4 mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">
          {folder.name || "Browse all files"}
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          {folderCount} file{folderCount === 1 ? "" : "s"}
        </p>
      </div>

      {subFolders.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-zinc-500">
            Folders
          </h2>
          <FolderGrid folders={subFolders} layout="list" />
        </section>
      )}

      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-zinc-500">
          Files
        </h2>
        <FileList files={childFiles} />
      </section>
    </div>
  );
}