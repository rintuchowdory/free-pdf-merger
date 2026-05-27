import { Link } from "wouter";
import { FileText, ChevronRight } from "lucide-react";

interface LayoutProps {
  children: React.ReactNode;
  breadcrumb?: { label: string; href?: string };
}

export default function Layout({ children, breadcrumb }: LayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/40">
      <header className="border-b border-border/60 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-sm">
              <FileText className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-foreground text-sm">PDF Tools</span>
          </Link>
          {breadcrumb && (
            <>
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
              {breadcrumb.href ? (
                <Link href={breadcrumb.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  {breadcrumb.label}
                </Link>
              ) : (
                <span className="text-sm font-medium text-foreground">{breadcrumb.label}</span>
              )}
            </>
          )}
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 py-10">
        {children}
      </main>
      <footer className="border-t border-border/60 mt-16 py-6 text-center">
        <p className="text-xs text-muted-foreground">
          Free PDF Tools — All processing happens in your browser. Your files are never uploaded.
        </p>
      </footer>
    </div>
  );
}
