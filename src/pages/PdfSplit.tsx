import { useState, useRef, useCallback } from "react";
import { PDFDocument } from "pdf-lib";
import { Upload, FileText, Download, Loader2, CheckCircle2, Scissors } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import Layout from "@/components/Layout";

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function parsePageRange(input: string, total: number): number[] | null {
  const pages = new Set<number>();
  const parts = input.split(",").map((s) => s.trim()).filter(Boolean);
  for (const part of parts) {
    if (part.includes("-")) {
      const [a, b] = part.split("-").map(Number);
      if (isNaN(a) || isNaN(b) || a < 1 || b > total || a > b) return null;
      for (let i = a; i <= b; i++) pages.add(i - 1);
    } else {
      const n = Number(part);
      if (isNaN(n) || n < 1 || n > total) return null;
      pages.add(n - 1);
    }
  }
  return pages.size > 0 ? Array.from(pages).sort((a, b) => a - b) : null;
}

type SplitMode = "all" | "range";

export default function PdfSplit() {
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState<number>(0);
  const [mode, setMode] = useState<SplitMode>("all");
  const [rangeInput, setRangeInput] = useState("");
  const [dragging, setDragging] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [done, setDone] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const loadFile = useCallback(async (f: File) => {
    if (!f.name.endsWith(".pdf") && f.type !== "application/pdf") {
      toast({ title: "Please select a PDF file", variant: "destructive" });
      return;
    }
    try {
      const buf = await f.arrayBuffer();
      const doc = await PDFDocument.load(buf, { ignoreEncryption: true });
      setPageCount(doc.getPageCount());
      setFile(f);
      setDone(false);
    } catch {
      toast({ title: "Could not read PDF", variant: "destructive" });
    }
  }, [toast]);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) loadFile(f);
  };

  const process = async () => {
    if (!file) return;
    setProcessing(true);
    setDone(false);
    try {
      const buf = await file.arrayBuffer();
      const src = await PDFDocument.load(buf, { ignoreEncryption: true });
      const baseName = file.name.replace(".pdf", "");

      if (mode === "all") {
        // Export each page as a separate PDF, download as individual files
        for (let i = 0; i < src.getPageCount(); i++) {
          const single = await PDFDocument.create();
          const [page] = await single.copyPages(src, [i]);
          single.addPage(page);
          const bytes = await single.save();
          const blob = new Blob([bytes], { type: "application/pdf" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `${baseName}_page${i + 1}.pdf`;
          a.click();
          URL.revokeObjectURL(url);
          await new Promise((r) => setTimeout(r, 100));
        }
      } else {
        const indices = parsePageRange(rangeInput, pageCount);
        if (!indices) {
          toast({ title: "Invalid page range", description: `Enter pages between 1 and ${pageCount}, e.g. 1-3, 5, 7-9`, variant: "destructive" });
          setProcessing(false);
          return;
        }
        const extracted = await PDFDocument.create();
        const pages = await extracted.copyPages(src, indices);
        pages.forEach((p) => extracted.addPage(p));
        const bytes = await extracted.save();
        const blob = new Blob([bytes], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${baseName}_pages${rangeInput.replace(/\s/g, "")}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      }
      setDone(true);
    } catch (err) {
      toast({ title: "Split failed", description: String(err), variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Layout breadcrumb={{ label: "Split PDF" }}>
      <div className="space-y-8">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center text-3xl mx-auto shadow-md">✂️</div>
          <h1 className="text-3xl font-extrabold tracking-tight">Split PDF</h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            Split a PDF into individual pages, or extract a specific range of pages.
          </p>
        </div>

        {/* Drop zone */}
        <div
          onDragEnter={() => setDragging(true)}
          onDragLeave={() => setDragging(false)}
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDrop}
          onClick={() => !file && fileInputRef.current?.click()}
          className={cn(
            "relative rounded-2xl border-2 border-dashed transition-all duration-200 p-10 flex flex-col items-center justify-center gap-4 group",
            file ? "border-border bg-white cursor-default" : "cursor-pointer",
            dragging ? "border-primary bg-primary/5 scale-[1.01]" : !file && "hover:border-primary/50 hover:bg-primary/3 bg-white/60"
          )}
        >
          {file ? (
            <div className="flex items-center gap-4 w-full max-w-sm">
              <div className="w-12 h-12 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center shrink-0">
                <FileText className="w-6 h-6 text-red-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground truncate">{file.name}</p>
                <p className="text-sm text-muted-foreground">{pageCount} pages · {formatBytes(file.size)}</p>
              </div>
              <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => { setFile(null); setPageCount(0); setDone(false); }}>
                Change
              </Button>
            </div>
          ) : (
            <>
              <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center transition-all", dragging ? "bg-primary text-white scale-110" : "bg-primary/10 text-primary group-hover:bg-primary/15")}>
                <Upload className="w-7 h-7" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-foreground text-lg">{dragging ? "Drop your PDF here" : "Click or drag & drop a PDF"}</p>
              </div>
            </>
          )}
          <input ref={fileInputRef} type="file" accept=".pdf,application/pdf" className="hidden" onChange={(e) => { if (e.target.files?.[0]) loadFile(e.target.files[0]); e.target.value = ""; }} />
        </div>

        {file && (
          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">How to split?</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={() => setMode("all")}
                className={cn(
                  "rounded-xl border-2 p-4 text-left transition-all",
                  mode === "all" ? "border-orange-300 bg-orange-50" : "border-border bg-white hover:border-primary/40"
                )}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-sm flex items-center gap-2"><Scissors className="w-4 h-4" /> Split all pages</span>
                  {mode === "all" && <CheckCircle2 className="w-4 h-4 text-orange-500" />}
                </div>
                <p className="text-xs text-muted-foreground">Download every page as a separate PDF file ({pageCount} files)</p>
              </button>
              <button
                onClick={() => setMode("range")}
                className={cn(
                  "rounded-xl border-2 p-4 text-left transition-all",
                  mode === "range" ? "border-orange-300 bg-orange-50" : "border-border bg-white hover:border-primary/40"
                )}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-sm">Extract pages</span>
                  {mode === "range" && <CheckCircle2 className="w-4 h-4 text-orange-500" />}
                </div>
                <p className="text-xs text-muted-foreground">Enter specific pages or ranges to extract into one PDF</p>
              </button>
            </div>

            {mode === "range" && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Page range</label>
                <input
                  type="text"
                  placeholder={`e.g. 1-3, 5, 7-9  (max: ${pageCount})`}
                  value={rangeInput}
                  onChange={(e) => setRangeInput(e.target.value)}
                  className="w-full rounded-xl border border-border bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
                <p className="text-xs text-muted-foreground">Use commas to separate pages, and hyphens for ranges.</p>
              </div>
            )}
          </div>
        )}

        {done && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center gap-3">
            <CheckCircle2 className="w-6 h-6 text-emerald-500 shrink-0" />
            <p className="font-medium text-foreground">Done! Your files have been downloaded.</p>
          </div>
        )}

        {file && (
          <Button
            className="w-full h-12 text-base font-semibold gap-2 shadow-md"
            onClick={process}
            disabled={processing || (mode === "range" && !rangeInput.trim())}
          >
            {processing ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Splitting…</>
            ) : (
              <><Scissors className="w-4 h-4" /> Split & Download</>
            )}
          </Button>
        )}
      </div>
    </Layout>
  );
}
