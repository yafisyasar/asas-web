import type { FileNode, FolderNode, FolderSummary, SearchableFile, StoredFile } from "./types";

export function splitPath(pathname: string): string[] {
  return pathname.split("/").filter(Boolean);
}

export function fileName(pathname: string): string {
  const parts = splitPath(pathname);
  return parts[parts.length - 1] ?? pathname;
}

export function parentPath(pathname: string): string {
  const parts = splitPath(pathname);
  parts.pop();
  return parts.join("/");
}

export function extensionOf(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot > 0 ? name.slice(dot + 1).toLowerCase() : "";
}

function fileToNode(file: StoredFile): FileNode {
  return {
    type: "file",
    name: fileName(file.pathname),
    pathname: file.pathname,
    url: file.url,
    downloadUrl: file.downloadUrl,
    size: file.size,
    uploadedAt: file.uploadedAt,
    contentType: file.contentType,
  };
}

export function buildTree(files: StoredFile[]): FolderNode {
  const root: FolderNode = { type: "folder", name: "", path: "", children: [] };

  const insert = (folder: FolderNode, parts: string[], file: StoredFile) => {
    const [head, ...rest] = parts;
    if (!head) return;

    if (rest.length === 0) {
      if (!folder.children.some((c) => c.type === "file" && c.name === head)) {
        folder.children.push(fileToNode(file));
      }
      return;
    }

    let child = folder.children.find(
      (c): c is FolderNode => c.type === "folder" && c.name === head
    );
    if (!child) {
      child = {
        type: "folder",
        name: head,
        path: folder.path ? `${folder.path}/${head}` : head,
        children: [],
      };
      folder.children.push(child);
    }

    insert(child, rest, file);
  };

  for (const file of files) {
    const parts = splitPath(file.pathname);
    if (parts.length === 1) {
      if (!root.children.some((c) => c.type === "file" && c.name === file.pathname)) {
        root.children.push(fileToNode(file));
      }
    } else {
      insert(root, parts, file);
    }
  }

  return root;
}

export function walkFiles(node: FolderNode, onFile: (file: FileNode, folderPath: string) => void) {
  const visit = (n: FolderNode | FileNode, folderPath: string) => {
    if (n.type === "file") {
      onFile(n, folderPath);
    } else {
      const next = n.path;
      for (const child of n.children) {
        visit(child, next);
      }
    }
  };
  visit(node, "");
}

export function flattenSearchable(node: FolderNode): SearchableFile[] {
  const out: SearchableFile[] = [];
  walkFiles(node, (file, folderPath) => {
    out.push({ ...file, folderPath });
  });
  return out;
}

export function findFolder(root: FolderNode, parts: string[]): FolderNode | undefined {
  let current: FolderNode = root;
  for (const part of parts) {
    const child = current.children.find(
      (c): c is FolderNode => c.type === "folder" && c.name === part
    );
    if (!child) return undefined;
    current = child;
  }
  return current;
}

export function folderSize(folder: FolderNode): number {
  let total = 0;
  walkFiles(folder, (file) => {
    total += file.size;
  });
  return total;
}

export function folderFileCount(folder: FolderNode): number {
  let count = 0;
  walkFiles(folder, () => {
    count += 1;
  });
  return count;
}

export type FolderCardInfo = { name: string; path: string; count: number; size: number };

export function semNumber(name: string): number | null {
  const m = /^sem\s*(\d+)/i.exec(name.trim());
  return m ? parseInt(m[1], 10) : null;
}

export function compareFolderNames(a: string, b: string): number {
  const an = semNumber(a);
  const bn = semNumber(b);
  if (an !== null && bn !== null && an !== bn) return bn - an;
  return a.localeCompare(b);
}

export function childFolderCards(folder: FolderNode): FolderCardInfo[] {
  return folder.children
    .filter((c): c is FolderNode => c.type === "folder")
    .map((c) => ({
      name: c.name,
      path: c.path,
      count: folderFileCount(c),
      size: folderSize(c),
    }))
    .sort((a, b) => compareFolderNames(a.name, b.name));
}

export function summarizeTop(files: StoredFile[]): FolderSummary[] {
  const map = new Map<string, { count: number; size: number }>();
  for (const f of files) {
    const top = splitPath(f.pathname)[0] ?? "";
    const entry = map.get(top) ?? { count: 0, size: 0 };
    entry.count += 1;
    entry.size += f.size;
    map.set(top, entry);
  }
  return [...map.entries()]
    .filter(([name]) => name.length > 0)
    .map(([name, v]) => ({ name, count: v.count, size: v.size }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, i);
  return `${value.toFixed(value >= 100 || i === 0 ? 0 : 1)} ${units[i]}`;
}

export function fileKind(name: string): "video" | "audio" | "image" | "pdf" | "code" | "text" | "archive" | "doc" | "sheet" | "slide" | "notebook" | "other" {
  const ext = extensionOf(name);
  if (["mp4", "mov", "avi", "mkv", "webm", "m4v"].includes(ext)) return "video";
  if (["mp3", "wav", "ogg", "flac", "m4a"].includes(ext)) return "audio";
  if (["png", "jpg", "jpeg", "gif", "webp", "svg", "bmp", "ico"].includes(ext)) return "image";
  if (ext === "pdf") return "pdf";
  if (["py", "js", "jsx", "ts", "tsx", "c", "cpp", "java", "go", "rs", "rb", "php", "sql", "html", "css", "sh", "bash", "json", "xml", "yml", "yaml", "toml", "ini", "md"].includes(ext)) return "code";
  if (["txt", "log", "ini"].includes(ext)) return "text";
  if (["zip", "tar", "gz", "7z", "rar"].includes(ext)) return "archive";
  if (["doc", "docx", "odt", "rtf"].includes(ext)) return "doc";
  if (["xls", "xlsx", "ods", "csv"].includes(ext)) return "sheet";
  if (["ppt", "pptx", "odp"].includes(ext)) return "slide";
  if (ext === "ipynb") return "notebook";
  return "other";
}

export function isPreviewable(name: string): boolean {
  return ["pdf", "image", "video", "audio", "code", "text", "notebook"].includes(fileKind(name));
}