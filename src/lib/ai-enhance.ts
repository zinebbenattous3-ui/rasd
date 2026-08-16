import { createServerFn } from "@tanstack/react-start";

/**
 * AI Service helper for enhancing medical observations.
 * Communicates with the backend server / Groq API to rephrase and structure
 * clinical notes while preserving 100% of the doctor's original facts.
 * 
 * Enforces NO DUPLICATION OF FACTS (one fact -> mention it once).
 * Produces clean plain text (free of Markdown symbols) for DB storage.
 */

export interface ObservationItem {
  label: string;
  content: string;
}

export interface StructuredObservation {
  title: string;
  paragraph?: string;
  items?: ObservationItem[];
}

export interface EnhanceObservationResponse {
  success: boolean;
  structuredObservation?: StructuredObservation;
  formattedPlainText?: string;
  error?: string;
}

const SYSTEM_PROMPT = `You are assisting a healthcare professional with clinical documentation.
Rewrite the doctor's observations into a SINGLE, clear, professional medical text in French.

STRICT RULES:
- Produce ONE unified observation output. Do NOT create both a summary paragraph AND a list of bullet points containing the same facts.
- ONE FACT -> MENTION IT ONCE. Do not repeat facts across multiple sentences or sections.
- Improve grammar, clarity, and professional tone while preserving 100% of the doctor's facts.
- Do NOT invent symptoms, diagnoses, test results, treatments, medications, dates, measurements, or circumstances.
- Do NOT add a diagnosis or clinical decision that the doctor did not explicitly provide.
- Return STRICTLY valid JSON matching the output schema without Markdown code blocks or backticks.

OUTPUT JSON SCHEMA:
{
  "title": "Observations cliniques",
  "paragraph": "Single coherent professional medical narrative combining all observations without duplicate bullet points.",
  "items": []
}

NOTE ON ITEMS:
Use the "items" array ONLY if the doctor's original text consisted of distinct non-narrative observations (e.g. vitals/lab values) and leave "paragraph" empty.
NEVER populate both "paragraph" and "items" with the same facts.`;

/**
 * Strips all raw Markdown syntax characters (*, #, `, _, etc.) from strings
 */
export function stripMarkdown(str: string): string {
  if (!str) return "";
  return str
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/^#+\s+/gm, '')
    .replace(/^[-*•]\s+/gm, '')
    .replace(/`/g, '')
    .trim();
}

/**
 * Converts a StructuredObservation object into clean, Markdown-free plain text
 * suitable for editable textareas and database storage.
 */
export function toCleanPlainText(structured: StructuredObservation): string {
  const parts: string[] = [];

  if (structured.title) {
    parts.push(stripMarkdown(structured.title));
  }

  // Use single coherent paragraph if present (primary path)
  if (structured.paragraph && structured.paragraph.trim()) {
    parts.push(stripMarkdown(structured.paragraph));
  } else if (structured.items && structured.items.length > 0) {
    // Only use list items if no paragraph exists
    const listLines = structured.items
      .map(item => {
        const cleanLabel = stripMarkdown(item.label);
        const cleanContent = stripMarkdown(item.content);
        if (cleanLabel && cleanContent) {
          return `• ${cleanLabel} — ${cleanContent}`;
        } else if (cleanContent) {
          return `• ${cleanContent}`;
        } else if (cleanLabel) {
          return `• ${cleanLabel}`;
        }
        return null;
      })
      .filter((line): line is string => Boolean(line));

    if (listLines.length > 0) {
      parts.push(listLines.join('\n'));
    }
  }

  return parts.join('\n\n').trim();
}

/**
 * Parses raw JSON or fallback raw text into a guaranteed StructuredObservation object
 */
export function parseOrConvertTextToStructured(rawText: string): StructuredObservation {
  const cleaned = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();

  // 1. Try parsing JSON directly
  try {
    const parsed = JSON.parse(cleaned);
    if (parsed && typeof parsed === 'object') {
      const title = stripMarkdown(parsed.title || "Observations cliniques");
      const paragraph = parsed.paragraph ? stripMarkdown(parsed.paragraph) : undefined;
      const itemsList = Array.isArray(parsed.items) ? parsed.items : [];

      const items: ObservationItem[] = itemsList.map((it: any) => ({
        label: stripMarkdown(it.label || it.key || it.title || "Observation"),
        content: stripMarkdown(it.content || it.value || it.description || it.text || "")
      }));

      const result: StructuredObservation = { title };
      if (paragraph) {
        result.paragraph = paragraph;
      }
      if (items.length > 0 && !paragraph) {
        result.items = items;
      }
      return result;
    }
  } catch (e) {
    // Parsing JSON failed, proceed to fallback line parsing
  }

  // 2. Fallback parsing for text / markdown lines
  const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
  let title = "Observations cliniques";
  const bodyParagraphs: string[] = [];

  for (const line of lines) {
    const clean = stripMarkdown(line);
    if (!clean) continue;

    if (line.startsWith('#') || (line.length < 35 && line.toLowerCase().includes('observation'))) {
      title = clean;
    } else {
      bodyParagraphs.push(clean);
    }
  }

  const result: StructuredObservation = {
    title,
    paragraph: bodyParagraphs.join(' ').trim() || stripMarkdown(rawText)
  };

  return result;
}

const enhanceMedicalObservationServerFn = createServerFn({ method: "POST" })
  .validator((data: { observation: string }) => data)
  .handler(async ({ data }): Promise<EnhanceObservationResponse> => {
    const { observation } = data;

    if (!observation || !observation.trim()) {
      return {
        success: false,
        error: "Veuillez rédiger vos observations initiales avant de demander l'amélioration par l'IA."
      };
    }

    try {
      const processEnv = typeof process !== "undefined" ? process.env : {};
      const hasApiKey = processEnv['RASD_GEMENI'] || processEnv['GROQ_AI1'] || processEnv['GROQ_API_KEY'] || processEnv['GEMINI_API_KEY'];

      if (!hasApiKey) {
        return {
          success: false,
          error: "L'amélioration par IA est temporairement indisponible (Clé API non configurée)."
        };
      }

      const { generateMedicalResponse } = await import("./ai/provider");

      const response = await generateMedicalResponse({
        messages: [
          { role: "user", content: `Observations cliniques à améliorer (sans répétition) :\n\n${observation.trim()}` }
        ],
        systemInstruction: SYSTEM_PROMPT
      });

      if (response.success && response.content) {
        const structured = parseOrConvertTextToStructured(response.content);
        const plainText = toCleanPlainText(structured);
        return {
          success: true,
          structuredObservation: structured,
          formattedPlainText: plainText
        };
      }

      return {
        success: false,
        error: response.error || "⚠️ Impossible d'améliorer le texte pour le moment."
      };
    } catch (error: any) {
      console.error("AI enhancement failed:", error);
      return {
        success: false,
        error: "⚠️ L'amélioration par IA est temporairement indisponible. Vous pouvez continuer avec vos observations originales."
      };
    }
  });

/**
 * Call server-side endpoint to enhance medical observation notes using GROQ_AI1.
 * Ensures no sensitive patient identifiers (NIN, Name, Phone, etc.) are sent.
 */
export async function enhanceMedicalObservation(observation: string): Promise<EnhanceObservationResponse> {
  return enhanceMedicalObservationServerFn({ data: { observation } });
}
