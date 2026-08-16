import { GoogleGenAI } from "@google/genai";
import type { GenerateMedicalResponseOptions, GenerateMedicalResponseResult } from "./types";

// Primary configuration for Gemini model name
export const GEMINI_PRIMARY_MODEL = "gemini-2.5-flash";
export const GEMINI_FALLBACK_MODELS = ["gemini-2.0-flash", "gemini-1.5-flash"];

function getGeminiApiKey(): string | null {
  const env = typeof process !== "undefined" && process.env ? process.env : {};
  // Exclusively check RASD_GEMENI (or server-side GEMINI_API_KEY fallback)
  const key = env["RASD_GEMENI"] || env["GEMINI_API_KEY"];
  if (key && typeof key === "string" && key.trim()) {
    return key.trim();
  }
  return null;
}

export async function generateGeminiMedicalResponse(
  options: GenerateMedicalResponseOptions
): Promise<GenerateMedicalResponseResult> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    console.error("[GeminiProvider] RASD_GEMENI environment variable is missing in server environment.");
    return {
      success: false,
      error: "Le service d'assistance médicale est indisponible (Clé d'API non configurée).",
    };
  }

  const { messages, systemInstruction, attachments } = options;

  try {
    const ai = new GoogleGenAI({ apiKey });

    // Filter out system messages from history array
    const historyMessages = messages.filter((m) => m.role !== "system");

    const contents: Array<{ role: "user" | "model"; parts: any[] }> = [];

    // Map conversation history into Gemini format
    for (let i = 0; i < historyMessages.length; i++) {
      const msg = historyMessages[i];
      if (!msg) continue;

      const isLatest = i === historyMessages.length - 1;
      const role = msg.role === "assistant" ? "model" : "user";
      const parts: any[] = [];

      if (msg.content && msg.content.trim()) {
        parts.push({ text: msg.content.trim() });
      }

      // If this is the latest user message and contains attachments, append them as inlineData parts
      if (isLatest && role === "user" && attachments && attachments.length > 0) {
        for (const file of attachments) {
          let base64Data = file.data;
          if (base64Data.includes(",")) {
            base64Data = base64Data.split(",")[1] || "";
          }

          parts.push({
            inlineData: {
              mimeType: file.mimeType || "application/octet-stream",
              data: base64Data,
            },
          });
        }
      }

      // Ensure at least one part exists
      if (parts.length > 0) {
        contents.push({ role, parts });
      }
    }

    if (contents.length === 0) {
      return {
        success: false,
        error: "Veuillez saisir un message ou joindre un fichier.",
      };
    }

    // Try primary model first, fallback models if needed
    const modelsToTry = [GEMINI_PRIMARY_MODEL, ...GEMINI_FALLBACK_MODELS];

    for (const modelName of modelsToTry) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: contents,
          config: {
            systemInstruction: systemInstruction,
            temperature: 0.3,
            maxOutputTokens: 1200,
          },
        });

        const outputText = response.text?.trim();
        if (outputText) {
          return {
            success: true,
            content: outputText,
          };
        }
      } catch (modelErr: any) {
        console.warn(`[GeminiProvider] Model ${modelName} failed:`, modelErr?.message || modelErr);
      }
    }

    return {
      success: false,
      error: "Impossible d'analyser ce fichier. Veuillez réessayer ou vérifier son format.",
    };
  } catch (err: any) {
    console.error("[GeminiProvider] Exception:", err);
    return {
      success: false,
      error: "Désolé, l'assistant a rencontré une erreur. Veuillez réessayer.",
    };
  }
}
