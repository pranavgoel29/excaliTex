import {
  TEXO_OCR_MODEL_ID,
  TEXO_OCR_TRANSFORMERS_CACHE_KEY,
} from "./texoOcrModelConstants";

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "0 B";
  }
  const units = ["B", "KB", "MB", "GB"] as const;
  let v = bytes;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  const digits = i === 0 ? 0 : v < 10 ? 1 : v < 100 ? 1 : 0;
  return `${v.toFixed(digits)} ${units[i]}`;
}

/**
 * Best-effort size of cached Hub responses for this model (Cache API).
 * Returns null if unavailable or on error.
 */
export async function getTexoOcrCachedWeightsBytes(): Promise<number | null> {
  if (!("caches" in globalThis)) {
    return null;
  }

  const needlePlain = TEXO_OCR_MODEL_ID;

  try {
    const cache = await caches.open(TEXO_OCR_TRANSFORMERS_CACHE_KEY);
    const requests = await cache.keys();
    let total = 0;

    for (const req of requests) {
      const url = req.url;
      if (
        !url.includes(needlePlain) &&
        !url.includes("alephpi%2FFormulaNet")
      ) {
        continue;
      }
      const res = await cache.match(req);
      if (!res) {
        continue;
      }
      const cl = res.headers.get("content-length");
      if (cl != null && /^\d+$/.test(cl)) {
        total += Number(cl);
      } else {
        total += (await res.blob()).size;
      }
    }

    return total;
  } catch {
    return null;
  }
}
