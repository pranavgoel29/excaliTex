import {
  useExcalidrawAPI,
  useExcalidrawStateValue,
} from "@excalidraw/excalidraw/index";
import React from "react";

import { runTexoOcrFromSelection } from "../texo/runTexoOcrFromSelection";

import "./TexoOcrFooterButton.scss";

/** Footer OCR actions: text-only buttons (no icons). */
export const TexoOcrFooterButton: React.FC = () => {
  const api = useExcalidrawAPI();
  const viewModeEnabled = useExcalidrawStateValue("viewModeEnabled");

  const disabled = !api || !!viewModeEnabled;

  return (
    <>
      <button
        type="button"
        className="TexoOcrFooterButton__btn"
        title="Recognize writing to LaTeX text. Rasterizes the selection and runs on-device OCR (AGPL-3.0 Texo / FormulaNet weights)."
        disabled={disabled}
        onClick={() => {
          if (api) {
            void runTexoOcrFromSelection(api, { mode: "text" });
          }
        }}
      >
        OCR → LaTeX text
      </button>
      <button
        type="button"
        className="TexoOcrFooterButton__btn"
        title="Recognize writing and render with KaTeX (OCR, then math render pipeline)."
        disabled={disabled}
        onClick={() => {
          if (api) {
            void runTexoOcrFromSelection(api, { mode: "math" });
          }
        }}
      >
        OCR → rendered LaTeX
      </button>
    </>
  );
};
