import { MainMenu, useExcalidrawAPI } from "@excalidraw/excalidraw/index";
import { MathFormulaIcon } from "@excalidraw/excalidraw/components/icons";
import React from "react";

import { runTexoOcrFromSelection } from "../texo/runTexoOcrFromSelection";

/** Uses AGPL-3.0 Texo / FormulaNet weights; see `runTexoOcrFromSelection.ts`. */
export const TexoOcrMainMenuItem: React.FC = () => {
  const excalidrawAPI = useExcalidrawAPI();

  return (
    <MainMenu.Item
      icon={MathFormulaIcon}
      onSelect={() => {
        if (excalidrawAPI) {
          void runTexoOcrFromSelection(excalidrawAPI, { mode: "math" });
        }
      }}
    >
      Recognize writing and render LaTeX (Texo)
    </MainMenu.Item>
  );
};
