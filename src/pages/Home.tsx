import { Link } from "wouter";
import { ArrowRight, ShieldCheck, Zap, Infinity as InfinityIcon, Lock, MousePointerClick, Download } from "lucide-react";
import Layout from "@/components/Layout";
import { TOOLS } from "@/lib/tools";
import { cn } from "@/lib/utils";

export default function Home() {
  return (
    <Layout>
      <div className="space-y-14">
        {/* Hero */}
        <section className="text-center space-y-5 pt-6">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            100% private — files never leave your device
          </span>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight leading-tight">
            Your entire PDF toolkit,{" "}
            <span className="bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-500 bg-clip-text text-transparent">
              right in your browser
            </span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Merge, convert, compress and split PDFs — or turn your photos into a PDF document.
            No uploads. No registration. No watermarks.
          </p>
          <div className="flex items-center justify-center gap-3 pt-1">
            <Link
              href="/merge"
              className="inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground px-5 py-2.5 text-sm font-semibold shadow-lg shadow-primary/25 hover:bg-primary/90 hover:shadow-primary/30 transition-all"
            >
              Merge PDFs <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/images-to-pdf"
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-5 py-2.5 text-sm font-semibold text-foreground hover:bg-muted transition-colors"
            >
              Photos → PDF
            </Link>
          </div>

          {/* Stats */}
          <div className="flex items-center justify-center gap-8 sm:gap-14 pt-8">
            {[
              { value: `${TOOLS.length}`, label: "Free tools" },
              { value: "0", label: "File uploads" },
              { value: "∞", label: "Usage limit" },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-3xl font-extrabold bg-gradient-to-br from-blue-500 to-indigo-600 bg-clip-text text-transparent">
                  {s.value}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Tool grid */}
        <section>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {TOOLS.map((tool) => (
              <Link key={tool.href} href={tool.href}>
                <div className="group relative h-full rounded-2xl border border-border bg-card p-6 cursor-pointer transition-all duration-200 hover:shadow-lg hover:border-primary/30 hover:-translate-y-0.5">
                  {tool.tag && (
                    <span className="absolute top-4 right-4 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                      {tool.tag}
                    </span>
                  )}
                  <div
                    className={cn(
                      "w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center mb-4 shadow-md transition-transform duration-200 group-hover:scale-110",
                      tool.gradient
                    )}
                  >
                    <tool.icon className="w-6 h-6 text-white" />
                  </div>
                  <h2 className="font-bold text-foreground text-lg mb-1">{tool.label}</h2>
                  <p className="text-sm text-muted-foreground leading-relaxed">{tool.desc}</p>
                  <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all">
                    Open tool <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </Link>
            ))}

            {/* Privacy card */}
            <div className="rounded-2xl border border-dashed border-border bg-muted/40 p-6 flex flex-col justify-center gap-3">
              <div className="flex items-center gap-3">
                <Lock className="w-5 h-5 text-emerald-500" />
                <h3 className="font-semibold text-sm text-foreground">Works offline, too</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Every tool runs entirely on your machine with WebAssembly. Open the site once,
                and it even works without internet.
              </p>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="rounded-2xl border border-border bg-card p-8">
          <h3 className="text-center font-bold text-lg mb-8">How it works</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              { icon: MousePointerClick, title: "1. Pick a tool", desc: "Choose what you need — merge, convert, compress or split." },
              { icon: Zap, title: "2. Drop your files", desc: "Drag and drop. Everything is processed locally in your browser." },
              { icon: Download, title: "3. Download", desc: "Get your file instantly. Nothing was ever uploaded anywhere." },
            ].map((step) => (
              <div key={step.title} className="text-center space-y-3">
                <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
                  <step.icon className="w-5 h-5" />
                </div>
                <h4 className="font-semibold text-sm text-foreground">{step.title}</h4>
                <p className="text-xs text-muted-foreground leading-relaxed max-w-[16rem] mx-auto">{step.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Features */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { icon: Lock, title: "100% Private", desc: "Files are processed on your device and never uploaded." },
            { icon: Zap, title: "Instant", desc: "No queues, no waiting — results in a second." },
            { icon: InfinityIcon, title: "Always Free", desc: "No sign-up, no watermarks, no page limits." },
          ].map((f) => (
            <div key={f.title} className="rounded-xl border border-border bg-card p-5 flex gap-4 items-start">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <f.icon className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h4 className="font-semibold text-sm text-foreground">{f.title}</h4>
                <p className="text-xs text-muted-foreground mt-0.5">{f.desc}</p>
              </div>
            </div>
          ))}
        </section>
      </div>
    </Layout>
  );
}
