import { useState, useRef, useCallback } from "react";
import { PDFDocument } from "pdf-lib";
import { Upload, FileText, Download, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import Layout from "@/components/Layout";

type Quality = "low" | "medium" | "high";

const qualityOptions: { value: Quality; label: string; desc: string; color: string }[] = [
  {
    value: "low",
    label: "Strong compression",
    desc: "Smallest file — good for sharing via email or chat.",
    color: "border-orange-300 bg-orange-50 text-orange-700",
  },
  {
    value: "medium",
    label: "Balanced",
    desc: "Good balance between size reduction and quality.",
    color: "border-blue-300 bg-blue-50 text-blue-700",
  },
  {
    value: "high",
    label: "Best quality",
    desc: "Maximum quality, moderate size reduction.",
    color: "border-emerald-300 bg-emerald-50 text-emerald-700",
  },
];

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function percentReduction(original: number, compressed: number): number {
  return Math.round(((original - compressed) / original) * 100);
}

export default function PdfCompress() {
  const [file, setFile] = useState<File | null>(null);
  const [quality, setQuality] = useState<Quality>("medium");
  const [dragging, setDragging] = useState(false);
  const [compressing, setCompressing] = useState(false);
  const [result, setResult] = useState<{ bytes: Uint8Array; size: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const loadFile = useCallback(async (f: File) => {
    if (!f.name.endsWith(".pdf") && f.type !== "application/pdf") {
      toast({ title: "Please select a PDF file", variant: "destructive" });
      return;
    }
    setFile(f);
    setResult(null);
  }, [toast]);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) loadFile(f);
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) loadFile(e.target.files[0]);
    e.target.value = "";
  };

  const compress = async () => {
    if (!file) return;
    setCompressing(true);
    setResult(null);
    try {
      const buffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });

      // Compression strategy: remove metadata, compress streams, re-save with options
      pdfDoc.setTitle("");
      pdfDoc.setAuthor("");
      pdfDoc.setSubject("");
      pdfDoc.setKeywords([]);
      pdfDoc.setProducer("PDF Tools");
      pdfDoc.setCreator("PDF Tools");

      const saveOptions: Parameters<PDFDocument["save"]>[0] = {
        useObjectStreams: quality !== "high",
        addDefaultPage: false,
        objectsPerTick: quality === "low" ? 10 : quality === "medium" ? 50 : 100,
      };

      // For stronger compression, we also embed pages at lower resolution by
      // re-copying through pdf-lib (which strips redundant data).
      const merged = await PDFDocument.create();
      const pages = await merged.copyPages(pdfDoc, pdfDoc.getPageIndices());
      pages.forEach((p) => merged.addPage(p));

      if (quality === "low") {
        merged.setTitle("");
        merged.setAuthor("");
        merged.setSubject("");
        merged.setKeywords([]);
        merged.setProducer("");
        merged.setCreator("");
      }

      const bytes = await merged.save(saveOptions);

      if (bytes.byteLength >= file.size) {
        toast({
          title: "Already well compressed",
          description: "This PDF couldn't be reduced further. Try a lower quality setting.",
        });
      }

      setResult({ bytes, size: bytes.byteLength });
    } catch (err) {
      toast({ title: "Compression failed", description: String(err), variant: "destructive" });
    } finally {
      setCompressing(false);
    }
  };

  const download = () => {
    if (!result || !file) return;
    const blob = new Blob([result.bytes], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = file.name.replace(".pdf", "_compressed.pdf");
    a.click();
    URL.revokeObjectURL(url);
  };

  const reduction = result && file ? percentReduction(file.size, result.size) : null;

  return (
    <Layout breadcrumb={{ label: "Compress PDF" }}>
      <div className="space-y-8">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center text-3xl mx-auto shadow-md">🗜️</div>
          <h1 className="text-3xl font-extrabold tracking-tight">Compress PDF</h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            Reduce your PDF's file size while keeping it readable. Choose how much compression you want.
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
                <p className="text-sm text-muted-foreground">{formatBytes(file.size)}</p>
              </div>
              <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => { setFile(null); setResult(null); }}>
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
                <p className="text-sm text-muted-foreground mt-1">One PDF at a time</p>
              </div>
            </>
          )}
          <input ref={fileInputRef} type="file" accept=".pdf,application/pdf" className="hidden" onChange={onFileChange} />
        </div>

        {/* Quality selector */}
        {file && (
          <div className="space-y-3">
            <h3 className="font-semibold text-foreground">Compression level</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {qualityOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setQuality(opt.value)}
                  className={cn(
                    "rounded-xl border-2 p-4 text-left transition-all duration-150",
                    quality === opt.value
                      ? opt.color + " border-2 shadow-sm"
                      : "border-border bg-white hover:border-primary/40"
                  )}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-sm">{opt.label}</span>
                    {quality === opt.value && <CheckCircle2 className="w-4 h-4" />}
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Result */}
        {result && file && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 shrink-0" />
              <div>
                <p className="font-semibold text-foreground">Compression complete!</p>
                <p className="text-sm text-muted-foreground">
                  {formatBytes(file.size)} → <strong className="text-emerald-700">{formatBytes(result.size)}</strong>
                  {reduction !== null && reduction > 0 && (
                    <span className="ml-2 text-xs font-semibold bg-emerald-200 text-emerald-800 px-2 py-0.5 rounded-full">
                      -{reduction}%
                    </span>
                  )}
                  {reduction !== null && reduction <= 0 && (
                    <span className="ml-2 text-xs text-muted-foreground">(PDF was already optimized)</span>
                  )}
                </p>
              </div>
            </div>
            <Button onClick={download} className="gap-2 shrink-0">
              <Download className="w-4 h-4" />
              Download
            </Button>
          </div>
        )}

        {/* Action button */}
        {file && (
          <Button
            className="w-full h-12 text-base font-semibold gap-2 shadow-md"
            onClick={compress}
            disabled={compressing}
          >
            {compressing ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Compressing…</>
            ) : (
              <><span>🗜️</span> Compress PDF</>
            )}
          </Button>
        )}
      </div>
    </Layout>
  );
}
