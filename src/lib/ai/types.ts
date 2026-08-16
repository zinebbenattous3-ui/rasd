export interface ChatAttachment {
  id: string;
  name: string;
  type: "pdf" | "image";
  mimeType: string;
  data: string; // base64 string
  size: number;
}

export interface ChatMessageInput {
  role: "user" | "assistant" | "system";
  content: string;
  attachments?: ChatAttachment[] | undefined;
}

export interface GenerateMedicalResponseOptions {
  messages: ChatMessageInput[];
  systemInstruction: string;
  attachments?: ChatAttachment[] | undefined;
}

export interface GenerateMedicalResponseResult {
  success: boolean;
  content?: string;
  error?: string;
}
