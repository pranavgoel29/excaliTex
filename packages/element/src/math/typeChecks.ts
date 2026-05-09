import type { ExcalidrawElement, ExcalidrawTextElement } from "../types";

import { isTextElement } from "../typeChecks";

import { EXCALIDRAW_MATH_SUBTYPE } from "./constants";

export const isMathTextElement = (
  element: ExcalidrawElement | null | undefined,
): element is ExcalidrawTextElement & { subtype: typeof EXCALIDRAW_MATH_SUBTYPE } => {
  return (
    element != null &&
    isTextElement(element) &&
    element.subtype === EXCALIDRAW_MATH_SUBTYPE
  );
};
