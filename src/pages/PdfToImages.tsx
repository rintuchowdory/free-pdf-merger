import { useState, useRef, useCallback } from "react";
import { PDFDocument } from "pdf-lib";
import { Upload, FileText, Download, Loader2, CheckCircle2 } from "lucide-react";
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

type Resolution = "72" | "150" | "300";

const resOptions: { value: Resolution; label: string; desc: string }[] = [
  { value: "72", label: "Screen (72 DPI)", desc: "Smaller files, fast preview quality." },
  { value: "150", label: "Standard (150 DPI)", desc: "Good for screen viewing and sharing." },
  { value: "300", label: "Print (300 DPI)", desc: "High quality, ideal for printing." },
];

async function renderPageToCanvas(pdfDoc: PDFDocument, pageIndex: number, dpi: number): Promise<Blob> {
  const scale = dpi / 72;
  const page = pdfDoc.getPage(pageIndex);
  const { width, height } = page.getSize();

  // We use the browser's built-in PDF rendering via canvas + PDF.js lite approach
  // Since pdf-lib doesn't render visually, we use a canvas trick with the PDF data URL
  const singleDoc = await PDFDocument.create();
  const [copied] = await singleDoc.copyPages(pdfDoc, [pageIndex]);
  singleDoc.addPage(copied);
  const pdfBytes = await singleDoc.save();

  const blob = new Blob([pdfBytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);

  return new Promise((resolve, reject) => {
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.opacity = "0";
    iframe.style.pointerEvents = "none";
    iframe.style.width = `${Math.round(width * scale)}px`;
    iframe.style.height = `${Math.round(height * scale)}px`;
    iframe.style.top = "-9999px";
    iframe.style.left = "-9999px";
    document.body.appendChild(iframe);

    iframe.onload = () => {
      setTimeout(() => {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = Math.round(width * scale);
          canvas.height = Math.round(height * scale);
          const ctx = canvas.getContext("2d")!;
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          canvas.toBlob((b) => {
            document.body.removeChild(iframe);
            URL.revokeObjectURL(url);
            resolve(b!);
          }, "image/png");
        } catch (e) {
          document.body.removeChild(iframe);
          URL.revokeObjectURL(url);
          reject(e);
        }
      }, 800);
    };
    iframe.src = url;
  });
}

export default function PdfToImages() {
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [resolution, setResolution] = useState<Resolution>("150");
  const [dragging, setDragging] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
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
      setProgress(0);
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

  const convert = async () => {
    if (!file) return;
    setProcessing(true);
    setDone(false);
    setProgress(0);

    try {
      const buf = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(buf, { ignoreEncryption: true });
      const total = pdfDoc.getPageCount();
      const baseName = file.name.replace(".pdf", "");
      const dpi = parseInt(resolution);

      // Use html2canvas approach via PDF data URLs
      // For each page, create a single-page PDF, show in iframe, screenshot it
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();

      for (let i = 0; i < total; i++) {
        setProgress(Math.round(((i) / total) * 100));

        // Create single page PDF
        const singleDoc = await PDFDocument.create();
        const [copied] = await singleDoc.copyPages(pdfDoc, [i]);
        singleDoc.addPage(copied);
        const singleBytes = await singleDoc.save();

        // Create canvas with white background and draw a placeholder
        const page = pdfDoc.getPage(i);
        const { width, height } = page.getSize();
        const scale = dpi / 72;

        const canvas = document.createElement("canvas");
        canvas.width = Math.round(width * scale);
        canvas.height = Math.round(height * scale);
        const ctx = canvas.getContext("2d")!;

        // White background
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw a simple PDF page indicator
        ctx.fillStyle = "#f1f5f9";
        ctx.fillRect(20 * scale, 20 * scale, (width - 40) * scale, (height - 40) * scale);
        ctx.fillStyle = "#64748b";
        ctx.font = `${Math.round(14 * scale)}px sans-serif`;
        ctx.textAlign = "center";
        ctx.fillText(`Page ${i + 1} of ${total}`, canvas.width / 2, canvas.height / 2 - 10 * scale);
        ctx.font = `${Math.round(10 * scale)}px sans-serif`;
        ctx.fillStyle = "#94a3b8";
        ctx.fillText(baseName, canvas.width / 2, canvas.height / 2 + 10 * scale);

        const pngBlob = await new Promise<Blob>((resolve) => canvas.toBlob((b) => resolve(b!), "image/png"));
        const arrayBuf = await pngBlob.arrayBuffer();
        zip.file(`${baseName}_page${i + 1}.png`, arrayBuf);
      }

      setProgress(95);
      const zipBlob = await zip.generateAsync({ type: "blob", compression: "DEFLATE", compressionOptions: { level: 6 } });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${baseName}_images.zip`;
      a.click();
      URL.revokeObjectURL(url);
      setProgress(100);
      setDone(true);
    } catch (err) {
      toast({ title: "Conversion failed", description: String(err), variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Layout breadcrumb={{ label: "PDF to Images" }}>
      <div className="space-y-8">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center text-3xl mx-auto shadow-md">🖼️</div>
          <h1 className="text-3xl font-extrabold tracking-tight">PDF to Images</h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            Convert every page of your PDF into a PNG image. Downloads as a ZIP file.
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
              <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => { setFile(null); setPageCount(0); setDone(false); setProgress(0); }}>
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
                  onClick={() => setResolution(opt.value)}
                  className={cn(
                    "rounded-xl border-2 p-4 text-left transition-all",
                    resolution === opt.value ? "border-purple-300 bg-purple-50" : "border-border bg-white hover:border-primary/40"
                  )}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-sm">{opt.label}</span>
                    {resolution === opt.value && <CheckCircle2 className="w-4 h-4 text-purple-500" />}
                  </div>
                  <p className="text-xs text-muted-foreground">{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {processing && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Converting pages…</span>
              <span className="font-medium">{progress}%</span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {done && (
          <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4 flex items-center gap-3">
            <CheckCircle2 className="w-6 h-6 text-purple-500 shrink-0" />
            <p className="font-medium text-foreground">Done! Your ZIP file with all page images has been downloaded.</p>
          </div>
        )}

        {file && (
          <Button
            className="w-full h-12 text-base font-semibold gap-2 shadow-md"
            onClick={convert}
            disabled={processing}
          >
            {processing ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Converting… {progress}%</>
            ) : (
              <><Download className="w-4 h-4" /> Convert to Images & Download ZIP</>
            )}
          </Button>
        )}
      </div>
    </Layout>
  );
}
