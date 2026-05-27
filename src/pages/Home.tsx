import { Link } from "wouter";
import Layout from "@/components/Layout";

const tools = [
  {
    href: "/merge",
    emoji: "🔗",
    color: "from-blue-500 to-indigo-600",
    bg: "bg-blue-50 hover:bg-blue-100/80 border-blue-200",
    label: "Merge PDF",
    desc: "Combine multiple PDF files into one. Drag to reorder before merging.",
    badge: "Most popular",
    badgeColor: "bg-blue-100 text-blue-700",
  },
  {
    href: "/compress",
    emoji: "🗜️",
    color: "from-emerald-500 to-green-600",
    bg: "bg-emerald-50 hover:bg-emerald-100/80 border-emerald-200",
    label: "Compress PDF",
    desc: "Reduce PDF file size while keeping great quality. Choose your compression level.",
    badge: "New",
    badgeColor: "bg-emerald-100 text-emerald-700",
  },
  {
    href: "/split",
    emoji: "✂️",
    color: "from-orange-500 to-amber-600",
    bg: "bg-orange-50 hover:bg-orange-100/80 border-orange-200",
    label: "Split PDF",
    desc: "Extract specific pages or split a PDF into separate single-page files.",
    badge: null,
    badgeColor: "",
  },
  {
    href: "/to-images",
    emoji: "🖼️",
    color: "from-purple-500 to-violet-600",
    bg: "bg-purple-50 hover:bg-purple-100/80 border-purple-200",
    label: "PDF to Images",
    desc: "Convert every page of your PDF to a high-quality PNG image. Download as ZIP.",
    badge: null,
    badgeColor: "",
  },
];

export default function Home() {
  return (
    <Layout>
      <div className="space-y-10">
        {/* Hero */}
        <div className="text-center space-y-3 pb-2">
          <h1 className="text-4xl font-extrabold tracking-tight text-foreground">
            Free PDF Tools Online
          </h1>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Merge, compress, split, and convert PDFs — all in your browser.
            <span className="font-medium text-foreground"> No uploads. No registration. 100% free.</span>
          </p>
        </div>

        {/* Tool grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {tools.map((tool) => (
            <Link key={tool.href} href={tool.href}>
              <div className={`group relative rounded-2xl border p-6 cursor-pointer transition-all duration-200 ${tool.bg} hover:shadow-md hover:-translate-y-0.5`}>
                {tool.badge && (
                  <span className={`absolute top-4 right-4 text-xs font-semibold px-2 py-0.5 rounded-full ${tool.badgeColor}`}>
                    {tool.badge}
                  </span>
                )}
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${tool.color} flex items-center justify-center text-2xl mb-4 shadow-sm group-hover:scale-105 transition-transform duration-200`}>
                  {tool.emoji}
                </div>
                <h2 className="font-bold text-foreground text-lg mb-1">{tool.label}</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">{tool.desc}</p>
              </div>
            </Link>
          ))}
        </div>

        {/* Feature strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          {[
            { icon: "🔒", title: "100% Private", desc: "Files never leave your device." },
            { icon: "⚡", title: "Instant", desc: "No waiting or queues." },
            { icon: "🆓", title: "Always Free", desc: "No sign-up or watermarks." },
          ].map((item) => (
            <div key={item.title} className="bg-white/70 rounded-xl border border-border/60 p-5 flex gap-4 items-start">
              <span className="text-2xl">{item.icon}</span>
              <div>
                <h4 className="font-semibold text-sm text-foreground">{item.title}</h4>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}
