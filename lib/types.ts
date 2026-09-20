export type StoredFile = {
  pathname: string;
  url: string;
  downloadUrl: string;
  size: number;
  uploadedAt?: string;
  contentType?: string;
};

export type FileNode = {
  type: "file";
  name: string;
  pathname: string;
  url: string;
  downloadUrl: string;
  size: number;
  uploadedAt?: string;
  contentType?: string;
};

export type FolderNode = {
  type: "folder";
  name: string;
  path: string;
  children: Array<FolderNode | FileNode>;
};

export type SearchableFile = FileNode & { folderPath: string };

export type FolderSummary = {
  name: string;
  count: number;
  size: number;
};