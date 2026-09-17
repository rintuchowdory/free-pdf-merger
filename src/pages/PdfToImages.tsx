import { useState, useRef, useCallback } from "react";
import * as pdfjsLib from "pdfjs-dist";
import type { PDFDocumentProxy } from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { Upload, FileText, Download, Loader2, CheckCircle2, FileImage } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { downloadBlob } from "@/lib/download";
import Layout from "@/components/Layout";
import ToolHeader from "@/components/ToolHeader";
import DownloadHint from "@/components/DownloadHint";

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

type Resolution = "72" | "150" | "300";

const resOptions: { value: Resolution; label: string; desc: string }[] = [
  { value: "72", label: "Screen (72 DPI)", desc: "Smaller files, fast preview quality." },
  { value: "150", label: "Standard (150 DPI)", desc: "Good for screen viewing and sharing." },
  { value: "300", label: "Print (300 DPI)", desc: "High quality, ideal for printing." },
];

export default function PdfToImages() {
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [resolution, setResolution] = useState<Resolution>("150");
  const [dragging, setDragging] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [resultSize, setResultSize] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const loadFile = useCallback(
    async (f: File) => {
      if (!f.name.toLowerCase().endsWith(".pdf") && f.type !== "application/pdf") {
        toast({ title: "Please select a PDF file", variant: "destructive" });
        return;
      }
      try {
        const buf = await f.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: buf.slice(0) }).promise;
        setPageCount(pdf.numPages);
        setFile(f);
        setDone(false);
        setProgress(0);
        setResultBlob(null);
      } catch {
        toast({ title: "Could not read PDF", variant: "destructive" });
      }
    },
    [toast]
  );

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) loadFile(f);
  };

  const convert = async () => {
    if (!file) return;
    setProcessing(true);
    setDone(false);
    setProgress(0);
    setResultBlob(null);

    try {
      const buf = await file.arrayBuffer();
      const pdf: PDFDocumentProxy = await pdfjsLib.getDocument({ data: buf.slice(0) }).promise;
      const total = pdf.numPages;
      const baseName = file.name.replace(/\.pdf$/i, "");
      const dpi = parseInt(resolution);

      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();
      const canvas = document.createElement("canvas");

      for (let i = 1; i <= total; i++) {
        setProgress(Math.round(((i - 1) / total) * 100));
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: dpi / 72 });
        canvas.width = Math.round(viewport.width);
        canvas.height = Math.round(viewport.height);
        const ctx = canvas.getContext("2d")!;
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        await page.render({ canvasContext: ctx, viewport }).promise;
        page.cleanup();

        const pngBlob = await new Promise<Blob>((resolve) =>
          canvas.toBlob((b) => resolve(b!), "image/png")
        );
        zip.file(`${baseName}_page${String(i).padStart(2, "0")}.png`, pngBlob);
      }

      setProgress(95);
      const zipBlob = await zip.generateAsync({ type: "blob", compression: "DEFLATE", compressionOptions: { level: 6 } });
      setResultBlob(zipBlob);
      setResultSize(zipBlob.size);
      setProgress(100);
      setDone(true);
      toast({ title: "Images ready!", description: `${total} page${total > 1 ? "s" : ""} rendered as PNG` });
    } catch (err) {
      toast({ title: "Conversion failed", description: String(err), variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Layout breadcrumb={{ label: "PDF to Images" }}>
      <div className="space-y-8 max-w-5xl mx-auto">
        <ToolHeader
          icon={FileImage}
          title="PDF to Images"
          subtitle="Render every page of your PDF as a crisp PNG image — real page rendering, powered by PDF.js. Downloads as a ZIP."
          gradient="from-purple-500 to-violet-600"
        />

        {/* Drop zone */}
        <div
          onDragEnter={() => setDragging(true)}
          onDragLeave={() => setDragging(false)}
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDrop}
          onClick={() => !file && fileInputRef.current?.click()}
          className={cn(
            "relative rounded-2xl border-2 border-dashed transition-all duration-200 p-10 flex flex-col items-center justify-center gap-4 group",
            file ? "border-border bg-card cursor-default" : "cursor-pointer",
            dragging
              ? "border-primary bg-primary/5 scale-[1.01]"
              : !file && "border-border bg-card hover:border-primary/50 hover:bg-primary/3"
          )}
        >
          {file ? (
            <div className="flex items-center gap-4 w-full max-w-sm">
              <div className="w-12 h-12 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 flex items-center justify-center shrink-0">
                <FileText className="w-6 h-6 text-red-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground truncate">{file.name}</p>
                <p className="text-sm text-muted-foreground">{pageCount} pages · {formatBytes(file.size)}</p>
              </div>
              <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => { setFile(null); setPageCount(0); setDone(false); setProgress(0); setResultBlob(null); }}>
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
          <div className="space-y-3">
            <h3 className="font-semibold text-foreground">Image resolution</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {resOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => { setResolution(opt.value); setDone(false); }}
                  className={cn(
                    "text-left rounded-xl border p-4 transition-colors",
                    resolution === opt.value
                      ? "border-primary bg-primary/5"
                      : "border-border bg-card hover:bg-muted"
                  )}
                >
                  <p className="text-sm font-semibold text-foreground">{opt.label}</p>
                  <p className="text-xs text-muted-foreground mt-1">{opt.desc}</p>
                </button>
              ))}
            </div>
            <Button className="w-full gap-2" size="lg" disabled={processing} onClick={convert}>
              {processing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Rendering pages… {progress}%
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" /> Convert to PNG images
                </>
              )}
            </Button>
          </div>
        )}

        {(processing || done) && (
          <div className="rounded-xl border border-border bg-card p-5 space-y-3">
            {processing ? (
              <>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-foreground">Rendering pages…</span>
                  <span className="text-muted-foreground">{progress}%</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full bg-primary transition-all duration-300" style={{ width: `${progress}%` }} />
                </div>
              </>
            ) : (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                  <div>
                    <p className="font-semibold text-foreground">Your images are ready</p>
                    <p className="text-xs text-muted-foreground">{pageCount} PNGs · {formatBytes(resultSize)}</p>
                    <DownloadHint />
                  </div>
                </div>
                <Button
                  className="gap-2"
                  onClick={() => resultBlob && downloadBlob(resultBlob, `${file?.name.replace(/\.pdf$/i, "") || "pdf"}_images.zip`)}
                >
                  <Download className="w-4 h-4" /> Download ZIP
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
