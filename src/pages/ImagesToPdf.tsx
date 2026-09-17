import { useState, useRef, useCallback } from "react";
import { PDFDocument } from "pdf-lib";
import { Upload, Images, Download, Loader2, CheckCircle2, X, ArrowUp, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { downloadBlob } from "@/lib/download";
import Layout from "@/components/Layout";
import ToolHeader from "@/components/ToolHeader";
import DownloadHint from "@/components/DownloadHint";

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

interface PhotoItem {
  id: string;
  file: File;
  url: string;
  w: number;
  h: number;
}

type PageSize = "fit" | "a4" | "letter";
type Margin = "none" | "small" | "medium";
type Orientation = "auto" | "portrait" | "landscape";

const PAGE_PT: Record<"a4" | "letter", [number, number]> = {
  a4: [595.28, 841.89],
  letter: [612, 792],
};

const MARGIN_PT: Record<Margin, number> = {
  none: 0,
  small: 24,
  medium: 48,
};

const pageSizeOptions: { value: PageSize; label: string; desc: string }[] = [
  { value: "fit", label: "Fit to photo", desc: "Each page matches the photo's own size." },
  { value: "a4", label: "A4", desc: "Standard document paper size." },
  { value: "letter", label: "Letter", desc: "US letter paper size." },
];

const marginOptions: { value: Margin; label: string }[] = [
  { value: "none", label: "No margin" },
  { value: "small", label: "Small margin" },
  { value: "medium", label: "Large margin" },
];

const orientationOptions: { value: Orientation; label: string }[] = [
  { value: "auto", label: "Auto" },
  { value: "portrait", label: "Portrait" },
  { value: "landscape", label: "Landscape" },
];

const ACCEPTED = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/bmp", "image/avif"];

async function readImageMeta(file: File): Promise<{ w: number; h: number } | null> {
  try {
    const bitmap = await createImageBitmap(file);
    const meta = { w: bitmap.width, h: bitmap.height };
    bitmap.close();
    return meta;
  } catch {
    return null;
  }
}

async function photoToJpegBytes(file: File, maxDim: number): Promise<{ bytes: ArrayBuffer; w: number; h: number }> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();

  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Could not encode image"))), "image/jpeg", 0.92)
  );
  return { bytes: await blob.arrayBuffer(), w, h };
}

export default function ImagesToPdf() {
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [pageSize, setPageSize] = useState<PageSize>("a4");
  const [margin, setMargin] = useState<Margin>("small");
  const [orientation, setOrientation] = useState<Orientation>("auto");
  const [dragging, setDragging] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [resultSize, setResultSize] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const addFiles = useCallback(
    async (files: FileList | File[]) => {
      const list = Array.from(files).filter((f) => ACCEPTED.includes(f.type) || /\.(jpe?g|png|webp|gif|bmp|avif)$/i.test(f.name));
      if (list.length === 0) {
        toast({ title: "Please select image files (JPG, PNG, WebP…)", variant: "destructive" });
        return;
      }
      const next: PhotoItem[] = [];
      for (const f of list) {
        const meta = await readImageMeta(f);
        if (!meta) {
          toast({ title: `Could not read ${f.name}`, variant: "destructive" });
          continue;
        }
        next.push({ id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, file: f, url: URL.createObjectURL(f), w: meta.w, h: meta.h });
      }
      if (next.length) {
        setPhotos((prev) => [...prev, ...next]);
        setDone(false);
        setProgress(0);
        setResultBlob(null);
      }
    },
    [toast]
  );

  const removePhoto = (id: string) => {
    setPhotos((prev) => {
      const p = prev.find((x) => x.id === id);
      if (p) URL.revokeObjectURL(p.url);
      return prev.filter((x) => x.id !== id);
    });
    setDone(false);
  };

  const move = (index: number, dir: -1 | 1) => {
    setPhotos((prev) => {
      const target = index + dir;
      if (target < 0 || target >= prev.length) return prev;
      const copy = [...prev];
      [copy[index], copy[target]] = [copy[target], copy[index]];
      return copy;
    });
  };

  const convert = async () => {
    if (photos.length === 0) return;
    setProcessing(true);
    setDone(false);
    setProgress(0);
    setResultBlob(null);

    try {
      const pdfDoc = await PDFDocument.create();
      const total = photos.length;

      for (let i = 0; i < total; i++) {
        setProgress(Math.round((i / total) * 100));
        const { bytes, w, h } = await photoToJpegBytes(photos[i].file, 2400);
        const jpg = await pdfDoc.embedJpg(bytes);

        let pageW: number;
        let pageH: number;
        if (pageSize === "fit") {
          pageW = w;
          pageH = h;
        } else {
          const [baseW, baseH] = PAGE_PT[pageSize];
          const landscape =
            orientation === "landscape" || (orientation === "auto" && w > h);
          pageW = landscape ? baseH : baseW;
          pageH = landscape ? baseW : baseH;
        }

        const page = pdfDoc.addPage([pageW, pageH]);
        const m = pageSize === "fit" ? 0 : MARGIN_PT[margin];
        const boxW = Math.max(1, pageW - m * 2);
        const boxH = Math.max(1, pageH - m * 2);
        const scale = Math.min(boxW / jpg.width, boxH / jpg.height);
        const drawW = jpg.width * scale;
        const drawH = jpg.height * scale;

        page.drawImage(jpg, {
          x: (pageW - drawW) / 2,
          y: (pageH - drawH) / 2,
          width: drawW,
          height: drawH,
        });
      }

      setProgress(95);
      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes as unknown as BlobPart], { type: "application/pdf" });
      setResultBlob(blob);
      setResultSize(blob.size);
      setProgress(100);
      setDone(true);
      toast({ title: "PDF created!", description: `${total} photo${total > 1 ? "s" : ""} → PDF` });
    } catch (err) {
      toast({ title: "Conversion failed", description: String(err), variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  const totalBytes = photos.reduce((sum, p) => sum + p.file.size, 0);

  return (
    <Layout breadcrumb={{ label: "Photos to PDF" }}>
      <div className="space-y-8 max-w-5xl mx-auto">
        <ToolHeader
          icon={Images}
          title="Photos to PDF"
          subtitle="Turn your photos into a single PDF — one page per photo. Reorder them, choose the paper size, done. Everything stays on your device."
          gradient="from-rose-500 to-pink-600"
        />

        {/* Drop zone */}
        <div
          onDragEnter={() => setDragging(true)}
          onDragLeave={() => setDragging(false)}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
          }}
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            "rounded-2xl border-2 border-dashed transition-all duration-200 p-10 flex flex-col items-center justify-center gap-4 group cursor-pointer",
            dragging
              ? "border-primary bg-primary/5 scale-[1.01]"
              : "border-border bg-card hover:border-primary/50 hover:bg-primary/3"
          )}
        >
          <div
            className={cn(
              "w-14 h-14 rounded-2xl flex items-center justify-center transition-all",
              dragging ? "bg-primary text-white scale-110" : "bg-primary/10 text-primary group-hover:bg-primary/15"
            )}
          >
            <Upload className="w-7 h-7" />
          </div>
          <div className="text-center">
            <p className="font-semibold text-foreground text-lg">
              {dragging ? "Drop your photos here" : "Click or drag & drop photos"}
            </p>
            <p className="text-sm text-muted-foreground mt-1">JPG · PNG · WebP · GIF · BMP — as many as you like</p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp,image/gif,image/bmp,image/avif"
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.length) addFiles(e.target.files);
              e.target.value = "";
            }}
          />
        </div>

        {/* Photo list */}
        {photos.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-foreground">
                Your photos <span className="text-muted-foreground font-normal">({photos.length})</span>
              </h3>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{formatBytes(totalBytes)}</span>
                <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => { photos.forEach((p) => URL.revokeObjectURL(p.url)); setPhotos([]); setDone(false); setProgress(0); setResultBlob(null); }}>
                  Clear all
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {photos.map((photo, i) => (
                <div key={photo.id} className="group relative rounded-xl border border-border bg-card overflow-hidden">
                  <div className="aspect-[4/3] bg-muted flex items-center justify-center overflow-hidden">
                    <img src={photo.url} alt={photo.file.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="absolute inset-x-0 top-0 h-8 bg-gradient-to-b from-black/50 to-transparent flex items-start justify-between px-2 pt-1.5">
                    <span className="text-[11px] font-bold text-white drop-shadow">{i + 1}</span>
                    <button
                      onClick={() => removePhoto(photo.id)}
                      className="w-6 h-6 rounded-full bg-black/40 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive"
                      aria-label="Remove photo"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="p-2.5">
                    <p className="text-xs font-medium truncate text-foreground">{photo.file.name}</p>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-[11px] text-muted-foreground">{photo.w}×{photo.h}</span>
                      <div className="flex gap-1">
                        <button
                          onClick={() => move(i, -1)}
                          disabled={i === 0}
                          className="w-6 h-6 rounded-md border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 disabled:pointer-events-none"
                          aria-label="Move earlier"
                        >
                          <ArrowUp className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => move(i, 1)}
                          disabled={i === photos.length - 1}
                          className="w-6 h-6 rounded-md border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 disabled:pointer-events-none"
                          aria-label="Move later"
                        >
                          <ArrowDown className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Options */}
        {photos.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-xl border border-border bg-card p-4 space-y-2.5">
              <h4 className="text-sm font-semibold text-foreground">Page size</h4>
              {pageSizeOptions.map((opt) => (
                <label
                  key={opt.value}
                  className={cn(
                    "flex items-start gap-2.5 rounded-lg border p-2.5 cursor-pointer transition-colors",
                    pageSize === opt.value ? "border-primary bg-primary/5" : "border-border hover:bg-muted"
                  )}
                >
                  <input
                    type="radio"
                    name="pagesize"
                    className="mt-0.5 accent-primary"
                    checked={pageSize === opt.value}
                    onChange={() => { setPageSize(opt.value); setDone(false); }}
                  />
                  <span>
                    <span className="block text-sm font-medium text-foreground">{opt.label}</span>
                    <span className="block text-xs text-muted-foreground">{opt.desc}</span>
                  </span>
                </label>
              ))}
            </div>

            <div className="rounded-xl border border-border bg-card p-4 space-y-2.5">
              <h4 className="text-sm font-semibold text-foreground">Page orientation</h4>
              <p className="text-xs text-muted-foreground">Used for A4 / Letter pages.</p>
              <div className="grid grid-cols-3 gap-2">
                {orientationOptions.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => { setOrientation(opt.value); setDone(false); }}
                    className={cn(
                      "rounded-lg border px-2 py-2 text-xs font-medium transition-colors",
                      orientation === opt.value
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:bg-muted"
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              <h4 className="text-sm font-semibold text-foreground pt-3">Margin</h4>
              <div className="grid grid-cols-3 gap-2">
                {marginOptions.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => { setMargin(opt.value); setDone(false); }}
                    className={cn(
                      "rounded-lg border px-2 py-2 text-xs font-medium transition-colors",
                      margin === opt.value
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:bg-muted"
                    )}
                  >
                    {opt.label.replace(" margin", "")}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-4 flex flex-col justify-between gap-4">
              <div>
                <h4 className="text-sm font-semibold text-foreground">Summary</h4>
                <ul className="mt-2 space-y-1.5 text-xs text-muted-foreground">
                  <li>{photos.length} photo{photos.length > 1 ? "s" : ""} · {formatBytes(totalBytes)}</li>
                  <li>Page: {pageSize === "fit" ? "matches each photo" : pageSize.toUpperCase()}</li>
                  <li>Orientation: {orientation === "auto" ? "auto per photo" : orientation}</li>
                </ul>
              </div>
              <Button className="w-full gap-2" size="lg" disabled={processing} onClick={convert}>
                {processing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Creating PDF… {progress}%
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" /> Create PDF
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Progress + result */}
        {(processing || done) && (
          <div className="rounded-xl border border-border bg-card p-5 space-y-3">
            {processing ? (
              <>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-foreground">Building your PDF…</span>
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
                    <p className="font-semibold text-foreground">Your PDF is ready</p>
                    <p className="text-xs text-muted-foreground">{photos.length} pages · {formatBytes(resultSize)}</p>
                    <DownloadHint />
                  </div>
                </div>
                <Button
                  className="gap-2"
                  onClick={() => resultBlob && downloadBlob(resultBlob, "photos.pdf")}
                >
                  <Download className="w-4 h-4" /> Download PDF
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
