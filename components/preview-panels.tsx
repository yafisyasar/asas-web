"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type NbCell = {
  cell_type?: string;
  source?: string[];
  execution_count?: number | null;
  outputs?: NbOutput[];
};

type NbOutput = {
  output_type?: string;
  text?: string | string[];
  traceback?: string | string[];
  data?: Record<string, string | string[] | undefined>;
};

type Notebook = {
  cells?: NbCell[];
  metadata?: { kernelspec?: { display_name?: string } };
};

function useText(path: string): { text: string | null; error: string | null } {
  const [state, setState] = useState<{ text: string | null; error: string | null }>({
    text: null,
    error: null,
  });
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/raw?path=${encodeURIComponent(path)}`)
      .then((r) => (r.ok ? r.text() : Promise.reject("failed to load")))
      .then((text) => !cancelled && setState({ text, error: null }))
      .catch(() => !cancelled && setState({ text: null, error: "Could not load this file." }));
    return () => {
      cancelled = true;
    };
  }, [path]);
  return state;
}

function useBuffer(path: string): { buf: ArrayBuffer | null; error: string | null } {
  const [state, setState] = useState<{ buf: ArrayBuffer | null; error: string | null }>({
    buf: null,
    error: null,
  });
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/file?path=${encodeURIComponent(path)}`)
      .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject("failed to load")))
      .then((buf) => !cancelled && setState({ buf, error: null }))
      .catch(() => !cancelled && setState({ buf: null, error: "Could not load this file." }));
    return () => {
      cancelled = true;
    };
  }, [path]);
  return state;
}

function Loading() {
  return (
    <div className="flex h-[40vh] items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
    </div>
  );
}

function Error({ message }: { message: string }) {
  return (
    <div className="flex h-[30vh] items-center justify-center px-6 text-sm text-amber-400">
      {message}
    </div>
  );
}

export function MarkdownPanel({ path }: { path: string }) {
  const { text, error } = useText(path);
  if (error) return <Error message={error} />;
  if (text === null) return <Loading />;
  return (
    <div className="prose prose-invert max-h-[70vh] max-w-none overflow-auto p-5">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
    </div>
  );
}

export function NotebookPanel({ path }: { path: string }) {
  const { text, error } = useText(path);
  const notebook = useMemo<Notebook | null | undefined>(() => {
    if (text === null) return null;
    try {
      return JSON.parse(text) as Notebook;
    } catch {
      return undefined;
    }
  }, [text]);

  if (error || notebook === undefined) {
    return <CodeFallback text={text ?? null} />;
  }
  if (notebook === null) return <Loading />;

  const cells = notebook.cells ?? [];
  const kernel = notebook.metadata?.kernelspec?.display_name ?? "notebook";

  return (
    <div className="max-h-[70vh] overflow-auto p-4">
      <p className="mb-3 text-xs text-zinc-500">
        {kernel} · {cells.length} cell{cells.length === 1 ? "" : "s"}
      </p>
      <div className="space-y-3">
        {cells.map((cell, i) => (
          <CellView key={i} cell={cell} index={i} />
        ))}
      </div>
    </div>
  );
}

function CellView({ cell, index }: { cell: NbCell; index: number }) {
  if (cell.cell_type === "markdown") {
    return (
      <div className="rounded-lg bg-zinc-900/40 px-3 py-2">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{cell.source?.join("") ?? ""}</ReactMarkdown>
      </div>
    );
  }

  const count = cell.execution_count ?? null;
  return (
    <div className="overflow-hidden rounded-lg border border-zinc-800">
      <div className="flex items-center gap-2 border-b border-zinc-800 bg-zinc-900/60 px-3 py-1.5 text-xs text-zinc-500">
        <span className="font-mono text-zinc-400">{count === null ? "In [ ]" : `In [${count}]`}</span>
        <span className="text-zinc-600">code cell {index + 1}</span>
      </div>
      <pre className="overflow-auto whitespace-pre-wrap break-words px-3 py-2 font-mono text-xs text-zinc-200">
        {cell.source?.join("") ?? ""}
      </pre>
      {(cell.outputs ?? []).length > 0 && (
        <div className="border-t border-zinc-800 bg-black/40">
          {(cell.outputs ?? []).map((o, j) => (
            <OutputView key={j} output={o} />
          ))}
        </div>
      )}
    </div>
  );
}

function OutputView({ output }: { output: NbOutput }) {
  if (output.output_type === "stream") {
    const text = Array.isArray(output.text) ? output.text.join("") : String(output.text ?? "");
    return (
      <pre className="overflow-auto whitespace-pre-wrap break-words px-3 py-1.5 font-mono text-xs text-zinc-400">
        {text}
      </pre>
    );
  }
  if (output.output_type === "error") {
    const trace = Array.isArray(output.traceback) ? output.traceback.join("\n") : output.traceback ?? "";
    return (
      <pre className="overflow-auto whitespace-pre-wrap break-words px-3 py-1.5 font-mono text-xs text-red-400">
        {trace}
      </pre>
    );
  }
  const data = output.data ?? {};
  const plain = data["text/plain"];
  if (plain) {
    return (
      <pre className="overflow-auto whitespace-pre-wrap break-words px-3 py-1.5 font-mono text-xs text-zinc-300">
        {Array.isArray(plain) ? plain.join("") : plain}
      </pre>
    );
  }
  const html = data["text/html"];
  if (html) {
    return (
      <pre className="overflow-auto whitespace-pre-wrap break-words px-3 py-1.5 font-mono text-xs text-zinc-300">
        {Array.isArray(html) ? html.join("") : html}
      </pre>
    );
  }
  const png = data["image/png"];
  if (png) {
    const src = Array.isArray(png) ? png.join("") : png;
    return (
      <div className="flex justify-center bg-white/5 p-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`data:image/png;base64,${src}`} alt="output" className="max-h-72 max-w-full object-contain" />
      </div>
    );
  }
  return null;
}

function CodeFallback({ text }: { text: string | null }) {
  if (text === null) return <Loading />;
  return (
    <pre className="max-h-[70vh] overflow-auto whitespace-pre-wrap break-words p-4 font-mono text-xs text-zinc-200">
      {text}
    </pre>
  );
}

export function DocxPanel({ path }: { path: string }) {
  const { buf, error } = useBuffer(path);
  const [html, setHtml] = useState<string | null>(null);
  const [convertError, setConvertError] = useState<string | null>(null);

  useEffect(() => {
    if (!buf) return;
    let cancelled = false;
    import("mammoth")
      .then((m) => m.default.convertToHtml({ arrayBuffer: buf }))
      .then((result) => !cancelled && setHtml(result.value))
      .catch(() => !cancelled && setConvertError("Could not parse this document."));
    return () => {
      cancelled = true;
    };
  }, [buf]);

  if (error || convertError) return <Error message={error ?? convertError ?? ""} />;
  if (html === null) return <Loading />;
  return (
    <div className="prose prose-invert max-h-[70vh] max-w-none overflow-auto p-5">
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}

export function SheetPanel({ path }: { path: string }) {
  const { buf, error } = useBuffer(path);
  const [html, setHtml] = useState<string | null>(null);
  const [sheetError, setSheetError] = useState<string | null>(null);

  useEffect(() => {
    if (!buf) return;
    let cancelled = false;
    import("xlsx")
      .then((XLSX) => {
        const wb = XLSX.read(buf, { type: "array" });
        const first = wb.SheetNames[0];
        const ws = wb.Sheets[first];
        if (!ws) return Promise.reject("empty workbook");
        const cells = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: "" });
        const max = Math.max(1, ...cells.map((r) => r.length));
        const rowsHtml = cells
          .map((r) => {
            const row = Array.from({ length: max }, (_, i) => r[i]);
            return `<tr>${row.map((c) => `<td>${escapeHtml(String(c))}</td>`).join("")}</tr>`;
          })
          .join("");
        return `<p class="text-xs text-zinc-500 mb-2">${first} · ${cells.length} rows</p>
          <table class="border-collapse text-xs">${rowsHtml}</table>`;
      })
      .then((h) => !cancelled && setHtml(h))
      .catch(() => !cancelled && setSheetError("Could not read this spreadsheet."));
    return () => {
      cancelled = true;
    };
  }, [buf]);

  if (error || sheetError) return <Error message={error ?? sheetError ?? ""} />;
  if (html === null) return <Loading />;
  return (
    <div
      className="max-h-[70vh] overflow-auto p-4 text-xs [&_table]:w-full [&_td]:whitespace-nowrap [&_td]:border [&_td]:border-zinc-800 [&_td]:px-2 [&_td]:py-1 [&_td]:text-zinc-200"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function SlidePanel({ path }: { path: string }) {
  const { buf, error } = useBuffer(path);
  const [slides, setSlides] = useState<string[] | null>(null);
  const [slideError, setSlideError] = useState<string | null>(null);

  useEffect(() => {
    if (!buf) return;
    let cancelled = false;
    import("jszip")
      .then(async (mod) => {
        const JSZip = mod.default;
        const zip = await JSZip.loadAsync(buf);
        const names = Object.keys(zip.files)
          .filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n))
          .sort((a, b) => {
            const na = parseInt((a.match(/\d+/) ?? ["0"])[0], 10);
            const nb = parseInt((b.match(/\d+/) ?? ["0"])[0], 10);
            return na - nb;
          });
        const out: string[] = [];
        for (const name of names) {
          const xml = await zip.files[name].async("string");
          const texts = [...xml.matchAll(/<a:t>([^<]*)<\/a:t>/g)].map((m) => m[1]);
          out.push(texts.join("\n"));
        }
        return out;
      })
      .then((out) => !cancelled && setSlides(out.length ? out : ["(no slide text found)"]))
      .catch(() => !cancelled && setSlideError("Could not read this presentation."));
    return () => {
      cancelled = true;
    };
  }, [buf]);

  if (error || slideError) return <Error message={error ?? slideError ?? ""} />;
  if (slides === null) return <Loading />;
  return (
    <div className="max-h-[70vh] space-y-3 overflow-auto p-4">
      {slides.map((slide, i) => (
        <div key={i} className="rounded-lg border border-zinc-800 bg-zinc-900/40">
          <p className="border-b border-zinc-800 px-3 py-1.5 text-xs text-zinc-500">Slide {i + 1}</p>
          <pre className="overflow-auto whitespace-pre-wrap break-words px-3 py-2 font-mono text-xs text-zinc-200">
            {slide}
          </pre>
        </div>
      ))}
    </div>
  );
}

export function ArchivePanel({ path }: { path: string }) {
  const { buf, error } = useBuffer(path);
  const [entries, setEntries] = useState<Array<{ name: string }> | null>(null);
  const [archiveError, setArchiveError] = useState<string | null>(null);

  useEffect(() => {
    if (!buf) return;
    let cancelled = false;
    import("jszip")
      .then(async (mod) => {
        const zip = await mod.default.loadAsync(buf);
        return Object.keys(zip.files)
          .filter((n) => !zip.files[n].dir)
          .sort((a, b) => a.localeCompare(b))
          .map((name) => ({ name }));
      })
      .then((list) => !cancelled && setEntries(list))
      .catch(() => !cancelled && setArchiveError("Could not read this archive."));
    return () => {
      cancelled = true;
    };
  }, [buf]);

  if (error || archiveError) return <Error message={error ?? archiveError ?? ""} />;
  if (entries === null) return <Loading />;
  return (
    <div className="max-h-[70vh] overflow-auto p-4">
      <p className="mb-2 text-xs text-zinc-500">
        {entries.length} file{entries.length === 1 ? "" : "s"} inside
      </p>
      <ul className="space-y-0.5 font-mono text-xs">
        {entries.map((e) => (
          <li key={e.name} className="truncate text-zinc-300">
            <span className="text-zinc-600">File</span> {e.name}
          </li>
        ))}
      </ul>
    </div>
  );
}