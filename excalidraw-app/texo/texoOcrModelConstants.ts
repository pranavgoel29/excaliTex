/**
 * FormulaNet OCR — metadata aligned with `texoOcr.worker.ts`.
 * ONNX sizes from Hugging Face tree API (`onnx/`); runtime may fetch a subset.
 */

export const TEXO_OCR_MODEL_ID = "alephpi/FormulaNet";

/** Default Cache API bucket used by @huggingface/transformers in browsers. */
export const TEXO_OCR_TRANSFORMERS_CACHE_KEY = "transformers-cache";

/** Typical fetch: encoder + merged decoder + tokenizer/config under `onnx/`. */
export const TEXO_OCR_APPROX_WEIGHT_BYTES_TYPICAL =
  54168533 + 25946296 + 25000;

/** Upper bound if the runtime pulls every ONNX variant in `onnx/`. */
export const TEXO_OCR_APPROX_WEIGHT_BYTES_UPPER =
  54168533 + 25946296 + 25872372 + 20337816 + 25000;

/** Worker pins remote Hub loading (not bundled app weights). */
export const TEXO_OCR_CONFIGURED_REMOTE_HOST = "https://huggingface.co/";
