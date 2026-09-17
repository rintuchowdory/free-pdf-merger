import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { FileText, Github, Sun, Moon } from "lucide-react";
import { TOOLS } from "@/lib/tools";
import { cn } from "@/lib/utils";

function useTheme() {
  const [dark, setDark] = useState<boolean>(() => {
    try {
      return document.documentElement.classList.contains("dark");
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const stored = localStorage.getItem("theme");
    const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches;
    const initial = stored === "dark" || (!stored && prefersDark);
    if (initial) {
      document.documentElement.classList.add("dark");
      setDark(true);
    }
  }, []);

  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  };

  return { dark, toggle };
}

interface LayoutProps {
  children: React.ReactNode;
  breadcrumb?: { label: string; href?: string };
}

export default function Layout({ children, breadcrumb }: LayoutProps) {
  const [location] = useLocation();
  const { dark, toggle } = useTheme();

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors">
      {/* Decorative background glow */}
      <div className="pointer-events-none fixed inset-x-0 top-0 h-96 overflow-hidden -z-10">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[50rem] h-[30rem] rounded-full bg-primary/10 dark:bg-primary/15 blur-3xl" />
      </div>

      <header className="sticky top-0 z-20 border-b border-border/60 bg-background/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2.5 shrink-0 hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-sm shadow-primary/30">
              <FileText className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-foreground text-sm whitespace-nowrap">
              Free PDF Tools
            </span>
          </Link>

          <nav className="hidden lg:flex items-center gap-1 flex-1">
            {TOOLS.map((tool) => (
              <Link
                key={tool.href}
                href={tool.href}
                className={cn(
                  "px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                  location === tool.href
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                {tool.short}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2 ml-auto lg:ml-0">
            <button
              onClick={toggle}
              aria-label="Toggle dark mode"
              className="w-9 h-9 rounded-lg border border-border/60 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <a
              href="https://github.com/rintuchowdory/free-pdf-merger"
              target="_blank"
              rel="noreferrer"
              aria-label="GitHub repository"
              className="w-9 h-9 rounded-lg border border-border/60 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <Github className="w-4 h-4" />
            </a>
          </div>
        </div>
        {breadcrumb && (
          <div className="max-w-6xl mx-auto px-4 pb-2 text-sm text-muted-foreground">
            {breadcrumb.href ? (
              <Link href={breadcrumb.href} className="hover:text-foreground transition-colors">
                {breadcrumb.label}
              </Link>
            ) : (
              <span className="font-medium text-foreground">{breadcrumb.label}</span>
            )}
          </div>
        )}
      </header>

      <main className="max-w-6xl mx-auto px-4 py-10">{children}</main>

      <footer className="border-t border-border/60 mt-16">
        <div className="max-w-6xl mx-auto px-4 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">
            Free PDF Tools — all processing happens in your browser. Your files are never uploaded.
          </p>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span>{TOOLS.length} tools · no sign-up · no watermarks</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
