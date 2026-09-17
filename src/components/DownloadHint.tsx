import { AlertTriangle } from "lucide-react";

export default function DownloadHint() {
  return (
    <p className="text-xs text-muted-foreground flex items-start gap-1.5 mt-0.5">
      <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-px" />
      <span>Nothing downloading? In-app browsers (chat apps, previews) often block file downloads. Open this site in Chrome or Safari and try again.</span>
    </p>
  );
}
