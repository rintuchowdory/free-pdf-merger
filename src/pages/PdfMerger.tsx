import { useState, useCallback, useRef } from "react";
import { PDFDocument } from "pdf-lib";
import { Upload, FileText, Trash2, ArrowUp, ArrowDown, Download, Loader2, GripVertical, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface PdfFile {
  id: string;
  file: File;
  name: string;
  size: number;
  pageCount: number | null;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

async function getPdfPageCount(file: File): Promise<number | null> {
  try {
    const buffer = await file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
    return pdfDoc.getPageCount();
  } catch {
    return null;
  }
}

export default function PdfMerger() {
  const [files, setFiles] = useState<PdfFile[]>([]);
  const [dragging, setDragging] = useState(false);
  const [merging, setMerging] = useState(false);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const addFiles = useCallback(async (newFiles: File[]) => {
    const pdfs = newFiles.filter((f) => f.type === "application/pdf" || f.name.endsWith(".pdf"));
    if (pdfs.length !== newFiles.length) {
      toast({ title: "Only PDF files are supported", variant: "destructive" });
    }
    const entries: PdfFile[] = await Promise.all(
      pdfs.map(async (file) => {
        const pageCount = await getPdfPageCount(file);
        return {
          id: `${Date.now()}-${Math.random()}`,
          file,
          name: file.name,
          size: file.size,
          pageCount,
        };
      })
    );
    setFiles((prev) => [...prev, ...entries]);
  }, [toast]);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const dropped = Array.from(e.dataTransfer.files);
      addFiles(dropped);
    },
    [addFiles]
  );

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      addFiles(Array.from(e.target.files));
      e.target.value = "";
    }
  };

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const moveFile = (index: number, direction: "up" | "down") => {
    setFiles((prev) => {
      const next = [...prev];
      const target = direction === "up" ? index - 1 : index + 1;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const handleDragStart = (index: number) => setDraggingIndex(index);
  const handleDragEnd = () => {
    setDraggingIndex(null);
    setDragOverIndex(null);
  };
  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };
  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggingIndex === null || draggingIndex === dropIndex) return;
    setFiles((prev) => {
      const next = [...prev];
      const [moved] = next.splice(draggingIndex, 1);
      next.splice(dropIndex, 0, moved);
      return next;
    });
    setDraggingIndex(null);
    setDragOverIndex(null);
  };

  const mergePdfs = async () => {
    if (files.length < 2) {
      toast({ title: "Add at least 2 PDF files to merge", variant: "destructive" });
      return;
    }
    setMerging(true);
    try {
      const merged = await PDFDocument.create();
      for (const entry of files) {
        const buffer = await entry.file.arrayBuffer();
        const doc = await PDFDocument.load(buffer, { ignoreEncryption: true });
        const pages = await merged.copyPages(doc, doc.getPageIndices());
        pages.forEach((p) => merged.addPage(p));
      }
      const bytes = await merged.save();
      const blob = new Blob([bytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "merged.pdf";
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "PDF merged and downloaded!" });
    } catch (err) {
      toast({ title: "Failed to merge PDFs", description: String(err), variant: "destructive" });
    } finally {
      setMerging(false);
    }
  };

  const totalPages = files.reduce((sum, f) => sum + (f.pageCount ?? 0), 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/40">
      {/* Header */}
      <header className="border-b border-border/60 bg-white/70 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shadow-sm">
            <FileText className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground leading-tight">Free PDF Merger</h1>
            <p className="text-xs text-muted-foreground">Combine multiple PDFs into one — free, private, instant</p>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-10 space-y-8">
        {/* Hero */}
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-extrabold tracking-tight text-foreground">
            Merge PDF Files Online
          </h2>
          <p className="text-muted-foreground text-base max-w-lg mx-auto">
            Upload your PDFs, reorder them however you like, then download a single merged file.
            Everything runs in your browser — no uploads to any server.
          </p>
        </div>

        {/* Drop zone */}
        <div
          onDragEnter={() => setDragging(true)}
          onDragLeave={() => setDragging(false)}
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDrop}
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            "relative cursor-pointer rounded-2xl border-2 border-dashed transition-all duration-200 p-12 flex flex-col items-center justify-center gap-4 group",
            dragging
              ? "border-primary bg-primary/5 scale-[1.01]"
              : "border-border hover:border-primary/50 hover:bg-primary/3 bg-white/60"
          )}
        >
          <div className={cn(
            "w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-200",
            dragging ? "bg-primary text-white scale-110" : "bg-primary/10 text-primary group-hover:bg-primary/15"
          )}>
            <Upload className="w-8 h-8" />
          </div>
          <div className="text-center">
            <p className="font-semibold text-foreground text-lg">
              {dragging ? "Drop your PDFs here" : "Click or drag & drop PDFs"}
            </p>
            <p className="text-sm text-muted-foreground mt-1">You can add multiple files at once</p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,application/pdf"
            multiple
            className="hidden"
            onChange={onFileChange}
          />
        </div>

        {/* File list */}
        {files.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-foreground">
                {files.length} file{files.length !== 1 ? "s" : ""}
                {totalPages > 0 && (
                  <span className="text-muted-foreground font-normal ml-2 text-sm">
                    — {totalPages} pages total
                  </span>
                )}
              </h3>
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground text-xs"
                onClick={() => setFiles([])}
              >
                Clear all
              </Button>
            </div>

            <div className="space-y-2">
              {files.map((f, index) => (
                <div
                  key={f.id}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragEnd={handleDragEnd}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDrop={(e) => handleDrop(e, index)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-xl border bg-white shadow-xs transition-all duration-150",
                    draggingIndex === index && "opacity-40 scale-95",
                    dragOverIndex === index && draggingIndex !== index && "border-primary bg-primary/5 scale-[1.01]"
                  )}
                >
                  {/* Drag handle */}
                  <div className="cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground transition-colors">
                    <GripVertical className="w-4 h-4" />
                  </div>

                  {/* Page number badge */}
                  <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                    {index + 1}
                  </div>

                  {/* File icon */}
                  <div className="w-9 h-9 rounded-lg bg-red-50 border border-red-100 flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5 text-red-400" />
                  </div>

                  {/* File info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{f.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatBytes(f.size)}
                      {f.pageCount !== null && ` · ${f.pageCount} page${f.pageCount !== 1 ? "s" : ""}`}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-8 h-8 text-muted-foreground hover:text-foreground"
                      disabled={index === 0}
                      onClick={() => moveFile(index, "up")}
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-8 h-8 text-muted-foreground hover:text-foreground"
                      disabled={index === files.length - 1}
                      onClick={() => moveFile(index, "down")}
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-8 h-8 text-muted-foreground hover:text-destructive"
                      onClick={() => removeFile(f.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* Add more + merge */}
            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => fileInputRef.current?.click()}
              >
                <Plus className="w-4 h-4" />
                Add more PDFs
              </Button>

              <Button
                className="flex-1 gap-2 h-11 text-base font-semibold shadow-md"
                onClick={mergePdfs}
                disabled={merging || files.length < 2}
              >
                {merging ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Merging...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    Merge &amp; Download PDF
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Features */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
          {[
            {
              icon: "🔒",
              title: "100% Private",
              desc: "Your files never leave your device. All processing happens locally in the browser.",
            },
            {
              icon: "⚡",
              title: "Instant Merging",
              desc: "No waiting, no queues. PDFs are merged instantly using your device's CPU.",
            },
            {
              icon: "🆓",
              title: "Completely Free",
              desc: "No sign-up, no watermarks, no limits. Just upload and merge.",
            },
          ].map((item) => (
            <div key={item.title} className="bg-white/70 rounded-xl border border-border/60 p-5 space-y-2">
              <div className="text-2xl">{item.icon}</div>
              <h4 className="font-semibold text-sm text-foreground">{item.title}</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/60 mt-16 py-6 text-center">
        <p className="text-xs text-muted-foreground">
          Free PDF Merger &mdash; Your files stay on your device, always.
        </p>
      </footer>
    </div>
  );
}
