import {
  useExcalidrawAPI,
  useExcalidrawStateValue,
} from "@excalidraw/excalidraw/index";
import React from "react";

import { TexoOcrModelPanel } from "./TexoOcrModelPanel";

import { runTexoOcrFromSelection } from "../texo/runTexoOcrFromSelection";

import "./TexoOcrFooterButton.scss";

/** Footer OCR actions: compact chip-style controls + model panel. */
export const TexoOcrFooterButton: React.FC = () => {
  const api = useExcalidrawAPI();
  const viewModeEnabled = useExcalidrawStateValue("viewModeEnabled");

  const disabled = !api || !!viewModeEnabled;

  return (
    <div className="TexoOcrFooterCluster">
      <div className="TexoOcrFooterCluster__chrome">
        <span className="TexoOcrFooterCluster__eyebrow" aria-hidden="true">
          Formula OCR
        </span>
        <div className="TexoOcrFooterCluster__actions">
          <button
            type="button"
            className="TexoOcrFooterButton"
            title="Recognize writing to LaTeX text. Rasterizes the selection and runs on-device OCR (AGPL-3.0 Texo / FormulaNet weights)."
            disabled={disabled}
            onClick={() => {
              if (api) {
                void runTexoOcrFromSelection(api, { mode: "text" });
              }
            }}
          >
            <span className="TexoOcrFooterButton__label">OCR → LaTeX text</span>
            <span className="TexoOcrFooterButton__hint">Plain text element</span>
          </button>
          <button
            type="button"
            className="TexoOcrFooterButton"
            title="Recognize writing and render with KaTeX (OCR, then math render pipeline)."
            disabled={disabled}
            onClick={() => {
              if (api) {
                void runTexoOcrFromSelection(api, { mode: "math" });
              }
            }}
          >
            <span className="TexoOcrFooterButton__label">OCR → rendered math</span>
            <span className="TexoOcrFooterButton__hint">KaTeX raster</span>
          </button>
        </div>
        <TexoOcrModelPanel />
      </div>
    </div>
  );
};
