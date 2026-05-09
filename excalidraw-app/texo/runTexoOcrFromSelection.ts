/**
 * Rasterizes the current selection and runs Texo-style OCR (FormulaNet via Transformers.js).
 * Texo / Texo-web are AGPL-3.0; verify licensing before redistribution.
 */

import { VERTICAL_ALIGN } from "@excalidraw/common";

import {
  CaptureUpdateAction,
  EXCALIDRAW_MATH_SUBTYPE,
  newTextElement,
} from "@excalidraw/element";

import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";

import { exportToCanvas, getCommonBounds } from "@excalidraw/excalidraw";

import { ensureTexoOcrReady, texoOcrPredict } from "./texoOcrClient";

type TexoOcrMode = "text" | "math";

/** Minimum short edge (px) so tiny scene selections are not nearly blank before the worker resizes to 384². */
const OCR_RASTER_MIN_SHORT_EDGE_PX = 640;

/** Avoid oversized canvases / GPU limits while still matching large selections’ apparent detail. */
const OCR_RASTER_MAX_LONG_EDGE_PX = 4096;

function getOcrRasterDimensions(
  sceneWidth: number,
  sceneHeight: number,
): { width: number; height: number; scale: number } {
  const w = Math.max(sceneWidth, 1);
  const h = Math.max(sceneHeight, 1);
  const minDim = Math.min(w, h);
  const maxDim = Math.max(w, h);

  let scale = 1;

  const shortPx = minDim * scale;
  if (shortPx < OCR_RASTER_MIN_SHORT_EDGE_PX) {
    scale = OCR_RASTER_MIN_SHORT_EDGE_PX / minDim;
  }

  const longPx = maxDim * scale;
  if (longPx > OCR_RASTER_MAX_LONG_EDGE_PX) {
    scale *= OCR_RASTER_MAX_LONG_EDGE_PX / longPx;
  }

  return {
    width: Math.max(1, Math.ceil(w * scale)),
    height: Math.max(1, Math.ceil(h * scale)),
    scale,
  };
}

export async function runTexoOcrFromSelection(
  api: ExcalidrawImperativeAPI,
  { mode = "math" }: { mode?: TexoOcrMode } = {},
): Promise<void> {
  const appState = api.getAppState();
  if (appState.viewModeEnabled) {
    return;
  }

  const selectedIds = new Set(
    Object.entries(appState.selectedElementIds)
      .filter(([, selected]) => selected)
      .map(([id]) => id),
  );

  const elements = api
    .getSceneElements()
    .filter((el) => !el.isDeleted && selectedIds.has(el.id));

  if (elements.length === 0) {
    api.setToast({
      message: "Select something on the canvas to recognize as a formula.",
      closable: true,
    });
    return;
  }

  api.setToast({
    message:
      "Loading formula model (first run downloads weights from Hugging Face)…",
    closable: true,
    duration: 12000,
  });

  try {
    await ensureTexoOcrReady();

    const canvas = await exportToCanvas({
      elements,
      appState,
      files: api.getFiles(),
      exportPadding: 12,
      getDimensions: (width, height) =>
        getOcrRasterDimensions(width, height),
    });

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), "image/png"),
    );

    if (!blob) {
      throw new Error("Could not rasterize the selection.");
    }

    const file = new File([blob], "selection.png", { type: "image/png" });
    const key = `texo-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    api.setToast({
      message: "Recognizing formula…",
      closable: true,
    });

    const latex = await texoOcrPredict(file, key);
    const trimmed = latex.trim();

    if (!trimmed) {
      api.setToast({
        message: "No formula detected.",
        closable: true,
      });
      return;
    }

    const [minX, minY, maxX, maxY] = getCommonBounds(elements);
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;

    const textEl = newTextElement({
      x: cx,
      y: cy,
      strokeColor: appState.currentItemStrokeColor,
      backgroundColor: appState.currentItemBackgroundColor,
      fillStyle: appState.currentItemFillStyle,
      strokeWidth: appState.currentItemStrokeWidth,
      strokeStyle: appState.currentItemStrokeStyle,
      roughness: appState.currentItemRoughness,
      opacity: appState.currentItemOpacity,
      text: trimmed,
      fontSize: appState.currentItemFontSize,
      fontFamily: appState.currentItemFontFamily,
      textAlign: "center",
      verticalAlign: VERTICAL_ALIGN.MIDDLE,
      ...(mode === "math" ? { subtype: EXCALIDRAW_MATH_SUBTYPE } : {}),
    });

    api.updateScene({
      elements: [...api.getSceneElements(), textEl],
      captureUpdate: CaptureUpdateAction.IMMEDIATELY,
    });

    api.setToast({
      message:
        mode === "math"
          ? "Recognized writing and rendered it as LaTeX math."
          : "Recognized writing and inserted LaTeX text.",
      closable: true,
    });
  } catch (e) {
    console.error(e);
    api.setToast({
      message: e instanceof Error ? e.message : "Formula recognition failed.",
      closable: true,
    });
  }
}
