/**
 * Robust "download this file" helper for the browser.
 *
 * Plain `<a href={blobUrl} download>` links are unreliable inside many
 * embedded / in-app browsers (e.g. WebViews used by native apps to preview
 * links) — they often can't hand blob: URLs to the OS download manager, so
 * the click silently does nothing. We try progressively more compatible
 * strategies:
 *
 * 1. Web Share API with a File — hands the file to the native share/save
 *    sheet, which works even inside locked-down WebViews.
 * 2. Classic anchor + blob URL + programmatic click — works everywhere else
 *    (desktop browsers, most mobile browsers).
 * 3. Opening the blob URL in a new tab as a last resort, so the user can use
 *    their browser's own "Save/Share" option.
 */
export async function downloadBlob(blob: Blob, filename: string): Promise<void> {
  try {
    const file = new File([blob], filename, { type: blob.type || "application/octet-stream" });
    const nav = navigator as Navigator & { canShare?: (data?: ShareData) => boolean };
    if (nav.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: filename });
      return;
    }
  } catch (err) {
    // AbortError = user cancelled the share sheet, that's a valid outcome.
    if (err instanceof DOMException && err.name === "AbortError") return;
    // Otherwise fall through to the anchor-based download below.
  }

  const url = URL.createObjectURL(blob);
  try {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
  } catch {
    window.open(url, "_blank", "noopener");
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }
}
