import { GoogleGenAI } from "@google/genai";
import type { GenerateMedicalResponseOptions, GenerateMedicalResponseResult } from "./types";

// Primary configuration for Gemini model name
export const GEMINI_PRIMARY_MODEL = "gemini-2.0-flash";
export const GEMINI_FALLBACK_MODELS = ["gemini-1.5-flash", "gemini-2.5-flash"];

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
  const isApiKeyConfigured = Boolean(apiKey);

  console.log("[RASED] Gemini API key configured:", isApiKeyConfigured);

  if (!apiKey) {
    console.error("[RASED Gemini Server Error]", {
      message: "RASD_GEMENI environment variable is missing or empty in server environment.",
    });
    return {
      success: false,
      error: "Le service d'assistance médicale est indisponible (Clé d'API non configurée).",
    };
  }

  const { messages, systemInstruction, attachments } = options;
  const hasAttachments = Boolean(attachments && attachments.length > 0);

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

      // ONLY if this is the latest user message AND user explicitly attached files, append inlineData parts
      if (isLatest && role === "user" && hasAttachments && attachments) {
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
        error: "Veuillez saisir un message.",
      };
    }

    // Try primary model first, fallback models if needed
    const modelsToTry = [GEMINI_PRIMARY_MODEL, ...GEMINI_FALLBACK_MODELS];
    let lastErrorDetails: any = null;

    for (const modelName of modelsToTry) {
      console.log("[RASED] Gemini model:", modelName);
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
        lastErrorDetails = modelErr;
        console.error("[RASED Gemini Server Error]", {
          model: modelName,
          message: modelErr instanceof Error ? modelErr.message : String(modelErr),
          stack: modelErr instanceof Error ? modelErr.stack : undefined,
          status: modelErr?.status,
        });
      }
    }

    const rawError = lastErrorDetails instanceof Error ? lastErrorDetails.message : String(lastErrorDetails || "Model generation failed");
    return {
      success: false,
      error: hasAttachments
        ? `Impossible d'analyser le fichier joint (${rawError}).`
        : `Désolé, l'assistant n'a pas pu répondre (${rawError}).`,
    };
  } catch (err: any) {
    console.error("[RASED Gemini Server Error]", {
      message: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    });
    return {
      success: false,
      error: `Désolé, l'assistant a rencontré une erreur réseau (${err?.message || "Erreur inconnue"}).`,
    };
  }
}
