/// <reference lib="webworker" />

/**
 * In-browser OCR adapted from Texo-web (AGPL-3.0). Model: FormulaNet (alephpi/FormulaNet).
 */

import {
  AutoTokenizer,
  VisionEncoderDecoderModel,
  Tensor,
  cat,
  env,
  type ProgressInfo,
} from "@huggingface/transformers";

import { preprocessImg } from "./imageProcessor";

const OCR_ACTION = {
  Init: "init",
  Predict: "predict",
} as const;

const WORKER_STATUS = {
  Ready: "ready",
  Error: "error",
  Result: "result",
  Progress: "progress",
} as const;

const MODEL_NAME = "alephpi/FormulaNet";

env.allowLocalModels = false;
env.remoteHost = "https://huggingface.co/";
env.remotePathTemplate = "{model}/resolve/{revision}";

try {
  const onnx = env.backends?.onnx as Record<string, unknown> | undefined;
  if (onnx && typeof onnx === "object") {
    onnx.wasm = { ...(onnx.wasm as object), proxy: true };
  }
} catch {
  /* ignore optional onnx wasm threading hint */
}

let model: VisionEncoderDecoderModel | undefined;
let tokenizer: Awaited<ReturnType<typeof AutoTokenizer.from_pretrained>>;
let isInitialized = false;

const init = async (progress_callback: (data: ProgressInfo) => void) => {
  if (isInitialized) {
    return;
  }

  model = await VisionEncoderDecoderModel.from_pretrained(MODEL_NAME, {
    dtype: "fp32",
    progress_callback,
  });

  tokenizer = await AutoTokenizer.from_pretrained(MODEL_NAME, {
    progress_callback,
  });

  isInitialized = true;

  globalThis.postMessage({
    status: WORKER_STATUS.Ready,
  });
};

const predict = async (imageFile: File) => {
  if (!isInitialized || !model) {
    throw new Error("Model not initialized. Please call init first.");
  }

  const { array } = await preprocessImg(imageFile);
  const tensor = new Tensor("float32", array, [1, 1, 384, 384]);
  const pixel_values = cat([tensor, tensor, tensor], 1);
  const outputs = await model.generate({ inputs: pixel_values });
  const sequences =
    outputs && typeof outputs === "object" && "sequences" in outputs
      ? (outputs as { sequences: Tensor }).sequences
      : (outputs as Tensor);
  const text = tokenizer.batch_decode(sequences, {
    skip_special_tokens: true,
  })[0];

  return text;
};

globalThis.onmessage = async (
  event: MessageEvent<{
    action: string;
    image?: File;
    key?: string;
  }>,
) => {
  if (event.data.action === OCR_ACTION.Init) {
    try {
      await init((info: ProgressInfo) => {
        globalThis.postMessage({
          status: WORKER_STATUS.Progress,
          info,
        });
      });
    } catch (error) {
      globalThis.postMessage({
        status: WORKER_STATUS.Error,
        error,
        key: "",
      });
    }
    return;
  }

  if (event.data.action === OCR_ACTION.Predict) {
    const image = event.data.image;
    const key = event.data.key ?? "";
    try {
      if (!image) {
        throw new Error("Missing image file.");
      }
      const output = await predict(image);
      globalThis.postMessage({
        status: WORKER_STATUS.Result,
        output,
        key,
      });
    } catch (error) {
      globalThis.postMessage({
        status: WORKER_STATUS.Error,
        error,
        key,
      });
    }
  }
};
