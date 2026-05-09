import katex from "katex";
import { toCanvas } from "html-to-image";

import { THEME, applyDarkModeFilter } from "@excalidraw/common";

import type { ExcalidrawElement, ExcalidrawTextElement } from "../types";

import { EXCALIDRAW_MATH_SUBTYPE } from "./constants";
import { isMathTextElement } from "./typeChecks";

export { EXCALIDRAW_MATH_SUBTYPE };

export const isMathSubtype = (el: ExcalidrawElement | null | undefined): boolean =>
  isMathTextElement(el);

/** Minimal TeX when empty so KaTeX still lays out a line. */
const PLACEHOLDER_TEX = "\\,";

export function measureKatexDisplay(
  tex: string,
  fontSize: number,
): { width: number; height: number } {
  if (typeof document === "undefined") {
    const t = tex || PLACEHOLDER_TEX;
    return {
      width: Math.min(800, Math.max(24, t.length * fontSize * 0.45)),
      height: Math.ceil(fontSize * 1.4),
    };
  }

  const wrap = document.createElement("div");
  wrap.style.position = "absolute";
  wrap.style.left = "-99999px";
  wrap.style.top = "0";
  wrap.style.fontSize = `${fontSize}px`;
  wrap.style.color = "#000";
  wrap.style.pointerEvents = "none";
  document.body.appendChild(wrap);

  try {
    katex.render(tex.trim() ? tex : PLACEHOLDER_TEX, wrap, {
      throwOnError: false,
      displayMode: true,
    });
    const rect = wrap.getBoundingClientRect();
    return {
      width: Math.max(8, Math.ceil(rect.width)),
      height: Math.max(8, Math.ceil(rect.height)),
    };
  } finally {
    document.body.removeChild(wrap);
  }
}

export function measureTextElementMathematics(
  element: ExcalidrawTextElement,
  displayText: string,
): { width: number; height: number } {
  return measureKatexDisplay(displayText, element.fontSize);
}

function strokeColorForTheme(
  strokeColor: string,
  theme: typeof THEME.LIGHT | typeof THEME.DARK,
): string {
  return theme === THEME.DARK ? applyDarkModeFilter(strokeColor) : strokeColor;
}

export async function rasterizeKatexElement(
  element: ExcalidrawTextElement,
  opts: {
    theme: typeof THEME.LIGHT | typeof THEME.DARK;
  },
): Promise<HTMLCanvasElement> {
  const tex = element.text.trim() ? element.text : PLACEHOLDER_TEX;
  const bg =
    opts.theme === THEME.DARK ? "rgb(18,18,18)" : "#ffffff";
  const color = strokeColorForTheme(element.strokeColor, opts.theme);

  const wrap = document.createElement("div");
  wrap.style.padding = "6px";
  wrap.style.display = "inline-block";
  wrap.style.background = bg;
  wrap.style.fontSize = `${element.fontSize}px`;
  wrap.style.color = color;
  wrap.style.lineHeight = "1";
  document.body.appendChild(wrap);

  try {
    katex.render(tex, wrap, {
      throwOnError: false,
      displayMode: true,
    });
    return await toCanvas(wrap, {
      backgroundColor: bg,
      pixelRatio:
        typeof window !== "undefined" ? Math.min(2, window.devicePixelRatio || 1) : 2,
    });
  } finally {
    document.body.removeChild(wrap);
  }
}

export async function buildKatexRasterCacheForElements(
  elements: readonly ExcalidrawElement[],
  opts: { theme: typeof THEME.LIGHT | typeof THEME.DARK },
): Promise<Map<string, HTMLCanvasElement>> {
  const map = new Map<string, HTMLCanvasElement>();
  for (const el of elements) {
    if (!isMathTextElement(el)) {
      continue;
    }
    try {
      const canvas = await rasterizeKatexElement(el, opts);
      map.set(el.id, canvas);
    } catch (e) {
      console.warn("KaTeX raster failed for element", el.id, e);
    }
  }
  return map;
}
