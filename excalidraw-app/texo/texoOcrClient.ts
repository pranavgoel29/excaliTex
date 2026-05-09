/// <reference types="vite/client" />

import TexoWorkerConstructor from "./texoOcr.worker?worker";

let worker: Worker | null = null;
let initPromise: Promise<void> | null = null;

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
