import { Heart } from "lucide-react";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-zinc-800/80">
      <div className="mx-auto flex max-w-6xl items-center justify-center gap-4 px-4 py-6 text-sm text-zinc-500">
        <p className="flex items-center gap-1.5">
          Made with
          <Heart className="h-3.5 w-3.5 text-emerald-500" fill="currentColor" />
          by
          <a
            href="https://yafis-yasar.runs-on.dev"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-zinc-300 transition hover:text-emerald-300"
          >
            yafis_yasar
          </a>
        </p>
      </div>
    </footer>
  );
}