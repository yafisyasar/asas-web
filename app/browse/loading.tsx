import { FolderSkeletonGrid, FileSkeletonRows, Skeleton } from "@/components/skeleton";

export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8">
      <Skeleton className="h-4 w-40" />
      <div className="mt-4 mb-6 space-y-2">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-32" />
      </div>
      <div className="mb-8">
        <Skeleton className="mb-3 h-3 w-16" />
        <FolderSkeletonGrid />
      </div>
      <div>
        <Skeleton className="mb-3 h-3 w-10" />
        <FileSkeletonRows rows={5} />
      </div>
    </div>
  );
}