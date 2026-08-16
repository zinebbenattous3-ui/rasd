import { generateGeminiMedicalResponse } from "./gemini";
import type { GenerateMedicalResponseOptions, GenerateMedicalResponseResult } from "./types";

export * from "./types";
export * from "./gemini";

/**
 * Unified AI Provider abstraction layer for RASED medical assistant.
 * Accepts prompt messages, medical system instructions, and optional multimodal attachments.
 */
export async function generateMedicalResponse(
  options: GenerateMedicalResponseOptions
): Promise<GenerateMedicalResponseResult> {
  return generateGeminiMedicalResponse(options);
}
