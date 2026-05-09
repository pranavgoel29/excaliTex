/// <reference types="vite/client" />

import TexoWorkerConstructor from "./texoOcr.worker?worker";

export const TEXO_OCR_ENGINE_READY_EVENT = "texo-ocr-engine-ready";

let worker: Worker | null = null;
let initPromise: Promise<void> | null = null;

export type TexoOcrWorkerRuntime = {
  modelId: string;
  allowLocalModels: boolean;
  allowRemoteModels: boolean;
  useBrowserCache: boolean;
  remoteHost: string;
  cacheKey: string;
};

let workerRuntime: TexoOcrWorkerRuntime | null = null;
let engineInitialized = false;

export function getTexoOcrWorkerRuntime(): TexoOcrWorkerRuntime | null {
  return workerRuntime;
}

export function isTexoOcrEngineInitialized(): boolean {
  return engineInitialized;
}

function getWorker(): Worker {
  if (!worker) {
    worker = new TexoWorkerConstructor();
  }
  return worker;
}

export function ensureTexoOcrReady(): Promise<void> {
  if (!initPromise) {
    initPromise = new Promise((resolve, reject) => {
      const w = getWorker();
      const onMessage = (ev: MessageEvent) => {
        const data = ev.data as {
          status?: string;
          error?: unknown;
        };
        if (data?.status === "ready") {
          const payload = data as {
            status: string;
            runtime?: TexoOcrWorkerRuntime;
          };
          workerRuntime = payload.runtime ?? null;
          engineInitialized = true;
          if (typeof globalThis.dispatchEvent === "function") {
            globalThis.dispatchEvent(
              new CustomEvent(TEXO_OCR_ENGINE_READY_EVENT),
            );
          }
          w.removeEventListener("message", onMessage);
          resolve();
        }
        if (data?.status === "error") {
          w.removeEventListener("message", onMessage);
          reject(
            data.error instanceof Error
              ? data.error
              : new Error(String(data.error)),
          );
        }
      };
      w.addEventListener("message", onMessage);
      w.postMessage({ action: "init" });
    });
  }
  return initPromise;
}

export async function texoOcrPredict(file: File, key: string): Promise<string> {
  await ensureTexoOcrReady();
  const w = getWorker();
  return new Promise((resolve, reject) => {
    const onMessage = (ev: MessageEvent) => {
      const data = ev.data as {
        status?: string;
        output?: string;
        error?: unknown;
        key?: string;
      };
      if (data?.status === "progress") {
        return;
      }
      if (data?.key !== key) {
        return;
      }
      w.removeEventListener("message", onMessage);
      if (data.status === "result" && typeof data.output === "string") {
        resolve(data.output);
      } else if (data.status === "error") {
        reject(
          data.error instanceof Error
            ? data.error
            : new Error(String(data.error)),
        );
      } else {
        reject(new Error("Unexpected worker response."));
      }
    };
    w.addEventListener("message", onMessage);
    w.postMessage({ action: "predict", image: file, key });
  });
}
