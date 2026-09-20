import Link from "next/link";
import { FolderOpen, GraduationCap, Info, Search } from "lucide-react";

const nav = [
  { href: "/browse", label: "Browse", icon: FolderOpen },
  { href: "/search", label: "Search", icon: Search },
  { href: "/about", label: "About", icon: Info },
];

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4">
        <Link href="/" className="flex shrink-0 items-center gap-2 font-semibold tracking-tight text-zinc-50">
          <span className="grid h-7 w-7 place-items-center rounded-lg border border-emerald-500/40 bg-emerald-500/15 text-emerald-400">
            <GraduationCap className="h-4 w-4" />
          </span>
          ASAS-WEB
        </Link>
        <nav className="flex items-center gap-1 overflow-x-auto text-sm">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-zinc-300 transition hover:bg-zinc-800/70 hover:text-white"
            >
              <item.icon className="h-4 w-4" />
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}