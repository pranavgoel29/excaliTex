import { MOBILE_ACTION_BUTTON_BG, viewportCoordsToSceneCoords } from "@excalidraw/common";

import {
  CaptureUpdateAction,
  EXCALIDRAW_MATH_SUBTYPE,
  getContainerElement,
  isBoundToContainer,
  isMathTextElement,
  isTextElement,
  newElementWith,
  redrawTextBoundingBox,
  refreshTextDimensions,
  updateBoundElements,
} from "@excalidraw/element";

import type { ExcalidrawTextElement } from "@excalidraw/element/types";

import { useStylesPanelMode } from "../components/App";
import { MathFormulaIcon } from "../components/icons";
import { ToolButton } from "../components/ToolButton";
import { t } from "../i18n";
import { getSelectedElements, getTargetElements } from "../scene";

import { changeProperty } from "./actionProperties";
import { register } from "./register";

const offsetElementAfterSubtypeChange = (
  prevElement: ExcalidrawTextElement,
  nextElement: ExcalidrawTextElement,
) => {
  if (isBoundToContainer(nextElement) || !nextElement.autoResize) {
    return nextElement;
  }
  const widthDelta = prevElement.width - nextElement.width;
  const alignmentOffset =
    prevElement.textAlign === "center" ? widthDelta / 2 : widthDelta;
  const x =
    prevElement.textAlign === "left"
      ? prevElement.x
      : prevElement.x + alignmentOffset;

  return newElementWith(nextElement, {
    x,
    y: prevElement.y + (prevElement.height - nextElement.height) / 2,
  });
};

export const actionInsertMathText = register({
  name: "insertMathText",
  label: "labels.insertMath",
  icon: MathFormulaIcon,
  keywords: ["latex", "katex", "formula", "math", "equation"],
  trackEvent: { category: "element", action: "insertMathText" },
  predicate: (_elements, appState) => !appState.viewModeEnabled,
  perform: (elements, appState, _, app) => {
    if (appState.viewModeEnabled) {
      return false;
    }
    const { x: sceneX, y: sceneY } = viewportCoordsToSceneCoords(
      {
        clientX: appState.offsetLeft + appState.width / 2,
        clientY: appState.offsetTop + appState.height / 2,
      },
      appState,
    );
    app.insertMathTextAtSceneCoords({ sceneX, sceneY });
    return {
      elements,
      appState,
      captureUpdate: CaptureUpdateAction.EVENTUALLY,
    };
  },
  PanelComponent: ({ appState, updateData, app }) => {
    const isMobile = useStylesPanelMode() === "mobile";
    const elementsMap = app.scene.getNonDeletedElementsMap();
    const targetElements = getTargetElements(elementsMap, appState);
    const canInsert =
      appState.activeTool.type === "text" ||
      targetElements.some(isTextElement);

    return (
      <ToolButton
        type="button"
        className="math-panel-action--text"
        label={t("labels.insertMath")}
        title={t("labels.insertMath")}
        aria-label={t("labels.insertMath")}
        onClick={() => updateData(null)}
        disabled={appState.viewModeEnabled || !canInsert}
        style={{
          ...(isMobile && appState.openPopup !== "compactOtherProperties"
            ? MOBILE_ACTION_BUTTON_BG
            : {}),
        }}
      />
    );
  },
});

export const actionConvertSelectedTextToMath = register({
  name: "convertSelectedTextToMath",
  label: "labels.convertToMath",
  icon: MathFormulaIcon,
  keywords: ["latex", "katex", "formula", "math"],
  trackEvent: { category: "element", action: "convertSelectedTextToMath" },
  predicate: (elements, appState, _, app) => {
    if (appState.viewModeEnabled) {
      return false;
    }
    return app.scene
      .getSelectedElements(appState)
      .some((el) => isTextElement(el) && !isMathTextElement(el));
  },
  perform: (elements, appState, _, app) => {
    const updatedElements = changeProperty(
      elements,
      appState,
      (oldElement) => {
        if (!isTextElement(oldElement) || isMathTextElement(oldElement)) {
          return oldElement;
        }
        const elementsMap = app.scene.getNonDeletedElementsMap();
        const container = getContainerElement(oldElement, elementsMap);
        const dims = refreshTextDimensions(
          { ...oldElement, subtype: EXCALIDRAW_MATH_SUBTYPE },
          container,
          elementsMap,
        );
        let newElement = newElementWith(oldElement, {
          subtype: EXCALIDRAW_MATH_SUBTYPE,
          ...dims,
        });
        redrawTextBoundingBox(
          newElement,
          app.scene.getContainerElement(oldElement),
          app.scene,
        );
        const live = app.scene.getElement(oldElement.id);
        if (!live || !isTextElement(live)) {
          return oldElement;
        }
        newElement = offsetElementAfterSubtypeChange(
          oldElement,
          newElement,
        );
        return newElement;
      },
      true,
    );

    getSelectedElements(updatedElements, appState, {
      includeBoundTextElement: true,
    }).forEach((element) => {
      if (isTextElement(element)) {
        updateBoundElements(element, app.scene);
      }
    });

    return {
      elements: updatedElements,
      appState,
      captureUpdate: CaptureUpdateAction.IMMEDIATELY,
    };
  },
  PanelComponent: ({ appState, updateData, app }) => {
    const isMobile = useStylesPanelMode() === "mobile";
    const selected = app.scene.getSelectedElements(appState);
    const canConvert = selected.some(
      (el) => isTextElement(el) && !isMathTextElement(el),
    );

    return (
      <ToolButton
        type="button"
        className="math-panel-action--text"
        label={t("labels.convertToMath")}
        title={t("labels.convertToMath")}
        aria-label={t("labels.convertToMath")}
        onClick={() => updateData(null)}
        disabled={appState.viewModeEnabled || !canConvert}
        style={{
          ...(isMobile && appState.openPopup !== "compactOtherProperties"
            ? MOBILE_ACTION_BUTTON_BG
            : {}),
        }}
      />
    );
  },
});
