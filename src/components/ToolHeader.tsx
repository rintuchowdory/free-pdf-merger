import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface ToolHeaderProps {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  gradient: string;
  className?: string;
}

export default function ToolHeader({ icon: Icon, title, subtitle, gradient, className }: ToolHeaderProps) {
  return (
    <div className={cn("text-center space-y-3", className)}>
      <div
        className={cn(
          "w-14 h-14 rounded-2xl bg-gradient-to-br flex items-center justify-center mx-auto shadow-lg shadow-primary/20",
          gradient
        )}
      >
        <Icon className="w-7 h-7 text-white" />
      </div>
      <h1 className="text-3xl font-extrabold tracking-tight text-foreground">{title}</h1>
      <p className="text-muted-foreground max-w-lg mx-auto leading-relaxed">{subtitle}</p>
    </div>
  );
}
