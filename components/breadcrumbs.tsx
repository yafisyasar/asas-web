import Link from "next/link";
import { ChevronRight, House } from "lucide-react";

export function Breadcrumbs({ parts }: { parts: string[] }) {
  const crumbs = [
    { label: "Browse", href: "/browse" },
    ...parts.map((part, i) => ({
      label: part,
      href: `/browse/${parts.slice(0, i + 1).join("/")}`,
    })),
  ];

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1 overflow-x-auto text-sm">
      <Link
        href="/"
        aria-label="Home"
        className="flex shrink-0 items-center text-zinc-500 transition hover:text-white"
      >
        <House className="h-4 w-4" />
      </Link>
      {crumbs.map((crumb, i) => {
        const isLast = i === crumbs.length - 1;
        return (
          <span key={crumb.href} className="flex items-center gap-1">
            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-zinc-600" />
            {i === 0 ? (
              <Link href={crumb.href} className="shrink-0 text-zinc-400 transition hover:text-white">
                {crumb.label}
              </Link>
            ) : isLast ? (
              <span className="truncate font-medium text-zinc-200">{crumb.label}</span>
            ) : (
              <Link href={crumb.href} className="shrink-0 text-zinc-400 transition hover:text-white">
                {crumb.label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}