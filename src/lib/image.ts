/**
 * Turn a user-picked image File into a background source string.
 *
 * The result is persisted to localStorage (alongside cart/consent/lang), so we
 * downscale to a sane max and re-encode as JPEG to keep the data URL small — a
 * full-resolution phone photo would blow the storage quota and silently drop the
 * rest of the saved app state. Non-images are rejected with a friendly message.
 */
export async function fileToBackgroundSrc(
  file: File,
  { maxW = 1600, maxH = 900, quality = 0.82 }: { maxW?: number; maxH?: number; quality?: number } = {},
): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Please choose an image file (JPG, PNG, or WebP).");
  }

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("That file could not be read."));
    reader.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error("That image could not be loaded."));
    el.src = dataUrl;
  });

  // Fit within maxW×maxH without upscaling.
  const scale = Math.min(1, maxW / (img.width || maxW), maxH / (img.height || maxH));
  const w = Math.max(1, Math.round((img.width || maxW) * scale));
  const h = Math.max(1, Math.round((img.height || maxH) * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return dataUrl; // canvas unsupported — fall back to the original

  // Flatten any transparency onto white so the JPEG re-encode reads cleanly.
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);
  return canvas.toDataURL("image/jpeg", quality);
}
