import React, { useCallback, useEffect, useState } from "react";

import {
  formatBytes,
  getTexoOcrCachedWeightsBytes,
} from "../texo/texoOcrBrowserCache";
import type { TexoOcrWorkerRuntime } from "../texo/texoOcrClient";
import {
  getTexoOcrWorkerRuntime,
  isTexoOcrEngineInitialized,
  TEXO_OCR_ENGINE_READY_EVENT,
} from "../texo/texoOcrClient";
import {
  TEXO_OCR_APPROX_WEIGHT_BYTES_TYPICAL,
  TEXO_OCR_APPROX_WEIGHT_BYTES_UPPER,
  TEXO_OCR_CONFIGURED_REMOTE_HOST,
  TEXO_OCR_MODEL_ID,
} from "../texo/texoOcrModelConstants";

import "./TexoOcrModelPanel.scss";

function cacheVariant(bytes: number | null): "unknown" | "empty" | "cached" {
  if (bytes === null) {
    return "unknown";
  }
  if (bytes === 0) {
    return "empty";
  }
  return "cached";
}

function describeBrowserCache(
  cachedBytes: number | null,
  cacheKey: string | undefined,
): string {
  if (cachedBytes == null) {
    return "Unable to read Cache API (private window, blocked storage, or unsupported).";
  }
  if (cachedBytes === 0) {
    return "Nothing cached for this model in this browser profile yet.";
  }
  return `${formatBytes(cachedBytes)} in "${cacheKey ?? "transformers-cache"}".`;
}

function cachePillLabel(
  cv: ReturnType<typeof cacheVariant>,
  cachedBytes: number | null,
): string {
  if (cv === "cached" && cachedBytes != null) {
    return `Cache ${formatBytes(cachedBytes)}`;
  }
  if (cv === "empty") {
    return "Cache empty";
  }
  return "Cache ?";
}

type DetailRowsProps = {
  rt: TexoOcrWorkerRuntime | null;
  typical: string;
  upper: string;
  cachedLabel: string;
  engineReady: boolean;
};

function TexoOcrModelDetailRows({
  rt,
  typical,
  upper,
  cachedLabel,
  engineReady,
}: Readonly<DetailRowsProps>) {
  const runtimeFlags = rt
    ? ([
        { label: "Remote Hub", on: rt.allowRemoteModels },
        { label: "Local FS weights", on: rt.allowLocalModels },
        { label: "Cache API", on: rt.useBrowserCache },
      ] as const)
    : null;

  return (
    <dl className="TexoOcrModelPanel__dl">
      <div className="TexoOcrModelPanel__row">
        <dt>Model</dt>
        <dd>
          <code className="TexoOcrModelPanel__mono">{TEXO_OCR_MODEL_ID}</code>
        </dd>
      </div>

      <div className="TexoOcrModelPanel__row">
        <dt>Weights</dt>
        <dd>Not bundled — fetched from the Hub when you run OCR.</dd>
      </div>

      <div className="TexoOcrModelPanel__row">
        <dt>Hub host</dt>
        <dd>
          <code className="TexoOcrModelPanel__mono">
            {rt?.remoteHost ?? TEXO_OCR_CONFIGURED_REMOTE_HOST}
          </code>
        </dd>
      </div>

      <div className="TexoOcrModelPanel__row">
        <dt>Download size</dt>
        <dd>
          Typically{" "}
          <strong className="TexoOcrModelPanel__emph">
            {typical} – {upper}
          </strong>{" "}
          (ONNX + tokenizer; exact set depends on the runtime).
        </dd>
      </div>

      <div className="TexoOcrModelPanel__row">
        <dt>Browser cache</dt>
        <dd>{cachedLabel}</dd>
      </div>

      <div className="TexoOcrModelPanel__row">
        <dt>Worker</dt>
        <dd>
          {engineReady
            ? "Initialized in this tab."
            : "Starts on first OCR (downloads may begin then)."}
        </dd>
      </div>

      {runtimeFlags && (
        <div className="TexoOcrModelPanel__row TexoOcrModelPanel__row--flags">
          <dt>Runtime</dt>
          <dd>
            <ul className="TexoOcrModelPanel__flagList">
              {runtimeFlags.map(({ label, on }) => (
                <li key={label}>
                  {label}{" "}
                  <span
                    className={`TexoOcrModelPanel__tag ${on ? "TexoOcrModelPanel__tag--yes" : "TexoOcrModelPanel__tag--no"}`}
                  >
                    {on ? "on" : "off"}
                  </span>
                </li>
              ))}
            </ul>
          </dd>
        </div>
      )}
    </dl>
  );
}

export const TexoOcrModelPanel: React.FC = () => {
  const [runtime, setRuntime] = useState(getTexoOcrWorkerRuntime);
  const [engineReady, setEngineReady] = useState(isTexoOcrEngineInitialized);
  const [cachedBytes, setCachedBytes] = useState<number | null>(null);

  const refreshStats = useCallback(async () => {
    setRuntime(getTexoOcrWorkerRuntime());
    setEngineReady(isTexoOcrEngineInitialized());
    setCachedBytes(await getTexoOcrCachedWeightsBytes());
  }, []);

  useEffect(() => {
    const onReady = () => {
      void refreshStats();
    };
    globalThis.addEventListener(TEXO_OCR_ENGINE_READY_EVENT, onReady);
    return () =>
      globalThis.removeEventListener(TEXO_OCR_ENGINE_READY_EVENT, onReady);
  }, [refreshStats]);

  const onToggle = (e: React.SyntheticEvent<HTMLDetailsElement>) => {
    if (e.currentTarget.open) {
      void refreshStats();
    }
  };

  const rt = runtime;
  const typical = formatBytes(TEXO_OCR_APPROX_WEIGHT_BYTES_TYPICAL);
  const upper = formatBytes(TEXO_OCR_APPROX_WEIGHT_BYTES_UPPER);
  const cv = cacheVariant(cachedBytes);
  const cachedLabel = describeBrowserCache(cachedBytes, rt?.cacheKey);
  const pillText = cachePillLabel(cv, cachedBytes);

  return (
    <details
      className="TexoOcrModelPanel"
      aria-label="Formula OCR model and storage details"
      onToggle={onToggle}
    >
      <summary className="TexoOcrModelPanel__summary">
        <span className="TexoOcrModelPanel__summaryMain">
          <span className="TexoOcrModelPanel__summaryTitle">Details</span>
          <span className="TexoOcrModelPanel__summarySub">
            FormulaNet · Hugging Face Hub
          </span>
        </span>
        <span className="TexoOcrModelPanel__pillRow">
          <span
            className={`TexoOcrModelPanel__pill TexoOcrModelPanel__pill--engine TexoOcrModelPanel__pill--engine-${engineReady ? "on" : "off"}`}
          >
            {engineReady ? "Ready" : "Idle"}
          </span>
          <span
            className={`TexoOcrModelPanel__pill TexoOcrModelPanel__pill--cache TexoOcrModelPanel__pill--cache-${cv}`}
          >
            {pillText}
          </span>
        </span>
        <span className="TexoOcrModelPanel__chevron" aria-hidden="true" />
      </summary>

      <div className="TexoOcrModelPanel__body">
        <TexoOcrModelDetailRows
          rt={rt}
          typical={typical}
          upper={upper}
          cachedLabel={cachedLabel}
          engineReady={engineReady}
        />

        <button
          type="button"
          className="TexoOcrModelPanel__refresh"
          onClick={() => void refreshStats()}
        >
          Refresh status
        </button>
      </div>
    </details>
  );
};
