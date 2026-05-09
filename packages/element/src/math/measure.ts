import { getFontString } from "@excalidraw/common";

import type { ExcalidrawTextElement } from "../types";

import { measureText } from "../textMeasurements";

import { measureKatexDisplay } from "./katexRaster";
import { isMathTextElement } from "./typeChecks";

/** Width/height for plain text or KaTeX math text. */
export function measureTextElementContent(
  element: ExcalidrawTextElement,
  text: string,
): { width: number; height: number } {
  if (isMathTextElement(element)) {
    return measureKatexDisplay(text, element.fontSize);
  }
  return measureText(text, getFontString(element), element.lineHeight);
}
