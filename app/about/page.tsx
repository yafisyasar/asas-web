import Link from "next/link";
import type { Metadata } from "next";
import { BookOpen, ExternalLink, GraduationCap, Mail } from "lucide-react";
import { getVisibleFiles } from "@/lib/github";
import { compareFolderNames, summarizeTop } from "@/lib/paths";

export const metadata: Metadata = {
  title: "About · ASAS-WEB",
  description: "What is ASAS-WEB and how the archive is organised.",
};

export const dynamic = "force-dynamic";

export default async function AboutPage() {
  const files = await getVisibleFiles();
  const semesters = summarizeTop(files)
    .filter((s) => /^sem/i.test(s.name))
    .sort((a, b) => compareFolderNames(a.name, b.name));

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12">
      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300">
        <GraduationCap className="h-3.5 w-3.5" />
        About ASAS-WEB
      </span>
      <h1 className="mt-4 text-3xl font-bold tracking-tight text-zinc-50">Public repo for college files</h1>
      <p className="mt-3 leading-relaxed text-zinc-400">
        <strong className="text-zinc-200">ASAS-WEB</strong> is an open archive of study materials from
        the 2024 batch of the BCA (Honours) programme, originally shared on GitHub at{" "}
        <Link
          href="https://github.com/yafisyasar/asas"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-emerald-400 transition hover:text-emerald-300"
        >
          yafisyasar/asas <ExternalLink className="h-3 w-3" />
        </Link>
        .
      </p>

      <h2 className="mt-8 text-lg font-semibold text-zinc-100">What&rsquo;s inside</h2>
      <ul className="mt-3 space-y-2 text-sm text-zinc-400">
        <li>Lecture notes, slides and PDFs for every semester&rsquo;s core subjects.</li>
        <li>Lab files, code and projects in Python, C, JavaScript and more.</li>
        <li>Question papers, evaluation patterns and handy tools.</li>
        <li className="font-medium text-zinc-300">{files.length} files and counting.</li>
      </ul>

      {semesters.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-semibold text-zinc-300">Semesters available</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {semesters.map((s) => (
              <Link
                key={s.name}
                href={`/browse/${s.name}`}
                className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-200 transition hover:border-emerald-500/40"
              >
                {s.name}
                <span className="ml-1.5 text-xs text-zinc-500">{s.count}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      <h2 className="mt-10 text-lg font-semibold text-zinc-100">Contribute</h2>
      <p className="mt-3 text-sm leading-relaxed text-zinc-400">
        Have notes or handouts to add? The archive is open — new files can be added to the source
        repository on GitHub, or via the admin panel. Suggestions and corrections are welcome.
      </p>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href="/browse"
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-400"
        >
          <BookOpen className="h-4 w-4" /> Start browsing
        </Link>
        <Link
          href="https://github.com/yafisyasar/asas"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900/60 px-4 py-2 text-sm font-semibold text-zinc-100 transition hover:bg-zinc-800"
        >
          <ExternalLink className="h-4 w-4" /> View on GitHub
        </Link>
      </div>

      <p className="mt-10 flex items-center gap-1.5 text-xs text-zinc-600">
        <Mail className="h-3.5 w-3.5" /> Archive maintained for the 2024 BCA (Honours) batch.
      </p>
    </div>
  );
}