import React, { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import {
  Bot,
  X,
  Send,
  RotateCcw,
  AlertTriangle,
  Sparkles,
  Loader2,
  Lock,
  LogIn,
  Paperclip,
  FileText,
  Image as ImageIcon,
  Trash2,
} from "lucide-react";
import { getStoredSession } from "@/lib/auth";
import { sendMedicalChatMessage, type ChatMessage } from "@/lib/medicalChatServer";
import type { ChatAttachment } from "@/lib/ai/provider";

const INITIAL_WELCOME_MESSAGE: ChatMessage = {
  role: "assistant",
  content:
    "Bonjour ! Je suis l'assistant d'information médicale RASED propulsé par l'IA. Je peux vous aider à analyser des rapports médicaux (PDF), des radiographies ou images cliniques, et répondre à vos questions médicales.\n\n⚠️ *Note importante : Je suis un assistant virtuel d'information médicale générale, et non un médecin. Je ne pose aucun diagnostic et ne prescris aucun traitement.*",
};

const MAX_PDF_SIZE = 25 * 1024 * 1024; // 25 MB
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10 MB per image
const MAX_IMAGES_COUNT = 5;

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(0)} Ko`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

export function MedicalChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [sessionToken, setSessionToken] = useState<string | undefined>(undefined);

  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_WELCOME_MESSAGE]);
  const [input, setInput] = useState("");
  const [attachments, setAttachments] = useState<ChatAttachment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check authentication status on mount and when storage changes
  useEffect(() => {
    const checkAuth = () => {
      const sess = getStoredSession();
      if (sess && sess.userId) {
        setIsAuthenticated(true);
        setUserId(sess.userId);
        setSessionToken(sess.token);
      } else {
        setIsAuthenticated(false);
        setUserId(null);
        setSessionToken(undefined);
      }
    };

    checkAuth();
    window.addEventListener("storage", checkAuth);
    return () => window.removeEventListener("storage", checkAuth);
  }, []);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    if (isOpen && isAuthenticated) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isLoading, isOpen, isAuthenticated, attachments]);

  // Reset conversation
  const handleResetConversation = () => {
    setMessages([INITIAL_WELCOME_MESSAGE]);
    setInput("");
    setAttachments([]);
    setErrorMsg(null);
  };

  // Handle file selection (PDF & Images)
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setErrorMsg(null);
    const newAttachments: ChatAttachment[] = [];

    let currentPdfCount = attachments.filter((a) => a.type === "pdf").length;
    let currentImageCount = attachments.filter((a) => a.type === "image").length;

    for (const file of files) {
      const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
      const isImage = file.type.startsWith("image/");

      if (!isPdf && !isImage) {
        setErrorMsg("Format de fichier non supporté. Seuls les fichiers PDF et les images (JPEG, PNG, WEBP) sont autorisés.");
        continue;
      }

      if (isPdf) {
        if (currentPdfCount >= 1) {
          setErrorMsg("Un seul fichier PDF est autorisé par message.");
          continue;
        }
        if (file.size > MAX_PDF_SIZE) {
          setErrorMsg("Le fichier PDF dépasse la taille maximale autorisée de 25 Mo.");
          continue;
        }

        try {
          const base64Data = await readFileAsBase64(file);
          newAttachments.push({
            id: Math.random().toString(36).substring(2, 9),
            name: file.name,
            type: "pdf",
            mimeType: "application/pdf",
            data: base64Data,
            size: file.size,
          });
          currentPdfCount++;
        } catch {
          setErrorMsg("Impossible de lire le fichier PDF sélectionné.");
        }
      } else if (isImage) {
        if (currentImageCount >= 5) {
          setErrorMsg("Vous pouvez joindre jusqu'à 5 images par message.");
          continue;
        }
        if (file.size > MAX_IMAGE_SIZE) {
          setErrorMsg("Une image dépasse la taille maximale autorisée (10 Mo).");
          continue;
        }

        try {
          const base64Data = await readFileAsBase64(file);
          newAttachments.push({
            id: Math.random().toString(36).substring(2, 9),
            name: file.name,
            type: "image",
            mimeType: file.type || "image/jpeg",
            data: base64Data,
            size: file.size,
          });
          currentImageCount++;
        } catch {
          setErrorMsg("Impossible de lire l'image sélectionnée.");
        }
      }
    }

    if (newAttachments.length > 0) {
      setAttachments((prev) => [...prev, ...newAttachments]);
    }

    // Reset file input value
    e.target.value = "";
  };

  const handleRemoveAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
    setErrorMsg(null);
  };

  // Send message handler
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if ((!input.trim() && attachments.length === 0) || isLoading || !userId || !isAuthenticated) return;

    const currentAttachments = [...attachments];
    const userText = input.trim() || (currentAttachments.length > 0 ? "Analyse des documents ci-joints" : "");

    const newUserMsg: ChatMessage = {
      role: "user",
      content: userText,
      attachments: currentAttachments.length > 0 ? currentAttachments : undefined,
    };

    const updatedMessages = [...messages, newUserMsg];
    setMessages(updatedMessages);
    setInput("");
    setAttachments([]);
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const response = await sendMedicalChatMessage({
        data: {
          messages: updatedMessages.filter((m) => m !== INITIAL_WELCOME_MESSAGE),
          userId: userId,
          sessionToken: sessionToken,
          attachments: currentAttachments.length > 0 ? currentAttachments : undefined,
        },
      });

      if (response.success && response.message) {
        setMessages((prev) => [...prev, response.message!]);
      } else {
        setErrorMsg(response.error || "Impossible d'obtenir une réponse pour le moment.");
      }
    } catch (err: any) {
      console.error("Medical chatbot server call failed:", err);
      setErrorMsg(err.message || "Erreur de connexion au service d'assistance médicale.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isDismissed) {
    return null;
  }

  // Dynamic loading message text
  const getLoadingText = () => {
    const lastUserMsg = messages[messages.length - 1];
    if (lastUserMsg && lastUserMsg.attachments && lastUserMsg.attachments.length > 0) {
      const hasPdf = lastUserMsg.attachments.some((a) => a.type === "pdf");
      const imgCount = lastUserMsg.attachments.filter((a) => a.type === "image").length;
      if (hasPdf && imgCount > 0) {
        return "RASED analyse vos documents et images...";
      }
      if (hasPdf) {
        return "Analyse du document PDF par RASED...";
      }
      if (imgCount > 0) {
        return `Analyse de ${imgCount} image(s) par RASED...`;
      }
    }
    return "RASED rédige la réponse médicale...";
  };

  return (
    <div style={{ position: "fixed", bottom: "24px", left: "24px", zIndex: 9999, fontFamily: "sans-serif" }}>
      {/* FLOATING CHAT BUTTON */}
      {!isOpen && (
        <div style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
          <button
            onClick={() => setIsOpen(true)}
            style={{
              backgroundColor: "#062C54",
              color: "white",
              border: "2px solid #0fa29b",
              borderRadius: "999px",
              padding: "12px 18px",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              boxShadow: "0 10px 30px rgba(6, 44, 84, 0.4)",
              cursor: "pointer",
              transition: "all 0.25s ease",
            }}
            aria-label="Ouvrir l'assistant médical"
          >
            <div
              style={{
                width: "34px",
                height: "34px",
                borderRadius: "50%",
                backgroundColor: "#0fa29b",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Bot size={20} color="white" />
            </div>
            <div style={{ textAlign: "left" }}>
              <div style={{ fontSize: "0.85rem", fontWeight: "800", letterSpacing: "0.02em" }}>Assistant RASED</div>
              <div style={{ fontSize: "0.7rem", color: "#38BDF8", fontWeight: "700" }}>Gemini Multimodal IA</div>
            </div>
            <Sparkles size={16} color="#38BDF8" style={{ marginLeft: "2px" }} />
          </button>

          {/* CLOSE / DISMISS BUTTON */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsDismissed(true);
            }}
            title="Masquer l'assistant AI"
            style={{
              position: "absolute",
              top: "-6px",
              right: "-6px",
              backgroundColor: "#062C54",
              color: "#94A3B8",
              border: "1.5px solid #0fa29b",
              borderRadius: "50%",
              width: "22px",
              height: "22px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "white";
              e.currentTarget.style.backgroundColor = "#EF4444";
              e.currentTarget.style.borderColor = "#EF4444";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "#94A3B8";
              e.currentTarget.style.backgroundColor = "#062C54";
              e.currentTarget.style.borderColor = "#0fa29b";
            }}
            aria-label="Masquer le bouton de l'assistant AI"
          >
            <X size={12} />
          </button>
        </div>
      )}

      {/* FLOATING CHAT WINDOW */}
      {isOpen && (
        <div
          style={{
            width: "410px",
            maxWidth: "calc(100vw - 32px)",
            height: "580px",
            maxHeight: "calc(100vh - 48px)",
            backgroundColor: "#ffffff",
            borderRadius: "20px",
            boxShadow: "0 20px 50px rgba(6, 44, 84, 0.3)",
            border: "1.5px solid #e2e8f0",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          {/* CHAT HEADER */}
          <div
            style={{
              backgroundColor: "#062C54",
              color: "white",
              padding: "1rem 1.25rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "10px",
                  backgroundColor: "#0fa29b",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Bot size={22} color="white" />
              </div>
              <div>
                <div style={{ fontSize: "0.95rem", fontWeight: "800", color: "white" }}>Assistant Médical RASED</div>
                <div
                  style={{
                    fontSize: "0.72rem",
                    color: isAuthenticated ? "#38BDF8" : "#94A3B8",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  <span
                    style={{
                      width: "6px",
                      height: "6px",
                      borderRadius: "50%",
                      backgroundColor: isAuthenticated ? "#10B981" : "#F59E0B",
                    }}
                  />
                  {isAuthenticated ? "IA Médicale · Gemini Multimodal" : "Authentification requise"}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              {/* Reset Conversation Button */}
              {isAuthenticated && (
                <button
                  onClick={handleResetConversation}
                  title="Nouvelle conversation (Réinitialiser)"
                  style={{
                    background: "rgba(255,255,255,0.1)",
                    border: "none",
                    borderRadius: "8px",
                    padding: "6px",
                    color: "white",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <RotateCcw size={16} />
                </button>
              )}

              {/* Close Button */}
              <button
                onClick={() => setIsOpen(false)}
                title="Fermer"
                style={{
                  background: "rgba(255,255,255,0.1)",
                  border: "none",
                  borderRadius: "8px",
                  padding: "6px",
                  color: "white",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* MEDICAL SAFETY DISCLAIMER BANNER */}
          <div
            style={{
              backgroundColor: "#FFFBEB",
              borderBottom: "1px solid #FDE68A",
              padding: "8px 12px",
              display: "flex",
              alignItems: "flex-start",
              gap: "8px",
              fontSize: "0.73rem",
              color: "#92400E",
              lineHeight: "1.35",
            }}
          >
            <AlertTriangle size={15} color="#D97706" style={{ flexShrink: 0, marginTop: "2px" }} />
            <div>
              <strong>Avertissement :</strong> Information médicale assistée par IA. Ne remplace pas un médecin. En cas d'urgence, contactez le 14 ou les urgences.
            </div>
          </div>

          {/* MESSAGES BODY */}
          <div
            style={{
              flex: 1,
              padding: "1rem",
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
              backgroundColor: "#F8FAFC",
            }}
          >
            {!isAuthenticated ? (
              <div
                style={{
                  margin: "auto",
                  padding: "1.5rem 1rem",
                  textAlign: "center",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "1rem",
                }}
              >
                <div
                  style={{
                    width: "56px",
                    height: "56px",
                    borderRadius: "50%",
                    backgroundColor: "#e6f5f4",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Lock size={28} color="#0fa29b" />
                </div>
                <div>
                  <h4 style={{ margin: "0 0 0.5rem 0", color: "#062C54", fontSize: "1.05rem", fontWeight: "700" }}>
                    Connexion requise
                  </h4>
                  <p style={{ margin: 0, color: "#64748B", fontSize: "0.85rem", lineHeight: "1.5" }}>
                    L'assistant médical intelligent RASED est réservé aux professionnels de santé et utilisateurs connectés.
                  </p>
                </div>
                <a
                  href="/login"
                  style={{
                    marginTop: "0.5rem",
                    backgroundColor: "#062C54",
                    color: "white",
                    textDecoration: "none",
                    fontWeight: "700",
                    fontSize: "0.9rem",
                    padding: "10px 20px",
                    borderRadius: "12px",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px",
                    boxShadow: "0 4px 14px rgba(6,44,84,0.25)",
                    transition: "transform 0.2s ease",
                  }}
                >
                  <LogIn size={18} />
                  Se connecter à RASED
                </a>
              </div>
            ) : (
              <>
                {messages.map((msg, index) => {
                  const isUser = msg.role === "user";
                  return (
                    <div
                      key={index}
                      style={{
                        display: "flex",
                        justifyContent: isUser ? "flex-end" : "flex-start",
                      }}
                    >
                      <div
                        style={{
                          maxWidth: "88%",
                          padding: "10px 14px",
                          borderRadius: isUser ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                          backgroundColor: isUser ? "#062C54" : "#ffffff",
                          color: isUser ? "#ffffff" : "#1E293B",
                          border: isUser ? "none" : "1px solid #E2E8F0",
                          boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
                          fontSize: "0.88rem",
                          lineHeight: "1.5",
                          wordBreak: "break-word",
                        }}
                      >
                        {/* ATTACHMENTS IN MESSAGE BUBBLE */}
                        {msg.attachments && msg.attachments.length > 0 && (
                          <div
                            style={{
                              display: "flex",
                              flexWrap: "wrap",
                              gap: "6px",
                              marginBottom: "8px",
                              paddingBottom: "6px",
                              borderBottom: isUser ? "1px solid rgba(255,255,255,0.2)" : "1px solid #E2E8F0",
                            }}
                          >
                            {msg.attachments.map((att) => (
                              <div
                                key={att.id || att.name}
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "6px",
                                  padding: "4px 8px",
                                  borderRadius: "8px",
                                  backgroundColor: isUser ? "rgba(255,255,255,0.15)" : "#F1F5F9",
                                  fontSize: "0.75rem",
                                  color: isUser ? "#ffffff" : "#334155",
                                }}
                              >
                                {att.type === "pdf" ? (
                                  <FileText size={14} color={isUser ? "#38BDF8" : "#0fa29b"} />
                                ) : (
                                  <ImageIcon size={14} color={isUser ? "#38BDF8" : "#0fa29b"} />
                                )}
                                <span style={{ fontWeight: "600", maxWidth: "140px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                  {att.name}
                                </span>
                                <span style={{ opacity: 0.8, fontSize: "0.7rem" }}>({formatFileSize(att.size)})</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {isUser ? (
                          <div style={{ whiteSpace: "pre-wrap" }}>{msg.content}</div>
                        ) : (
                          <ReactMarkdown
                            components={{
                              p: ({ children }) => <p style={{ margin: "0 0 6px 0", lineHeight: "1.5" }}>{children}</p>,
                              ul: ({ children }) => <ul style={{ margin: "4px 0 6px 0", paddingLeft: "18px" }}>{children}</ul>,
                              ol: ({ children }) => <ol style={{ margin: "4px 0 6px 0", paddingLeft: "18px" }}>{children}</ol>,
                              li: ({ children }) => <li style={{ marginBottom: "3px" }}>{children}</li>,
                              a: ({ href, children }) => (
                                <a
                                  href={href}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{ color: "#0fa29b", fontWeight: "600", textDecoration: "underline" }}
                                >
                                  {children}
                                </a>
                              ),
                              strong: ({ children }) => <strong style={{ fontWeight: "700", color: "#062C54" }}>{children}</strong>,
                              em: ({ children }) => <em style={{ fontStyle: "italic", color: "#475569" }}>{children}</em>,
                              code: ({ children }) => (
                                <code
                                  style={{
                                    backgroundColor: "#F1F5F9",
                                    padding: "2px 5px",
                                    borderRadius: "4px",
                                    fontSize: "0.82rem",
                                    fontFamily: "monospace",
                                  }}
                                >
                                  {children}
                                </code>
                              ),
                              table: ({ children }) => (
                                <table style={{ borderCollapse: "collapse", width: "100%", margin: "8px 0", fontSize: "0.8rem" }}>
                                  {children}
                                </table>
                              ),
                              th: ({ children }) => (
                                <th style={{ border: "1px solid #CBD5E1", backgroundColor: "#F1F5F9", padding: "4px 6px", fontWeight: "700" }}>
                                  {children}
                                </th>
                              ),
                              td: ({ children }) => (
                                <td style={{ border: "1px solid #E2E8F0", padding: "4px 6px" }}>{children}</td>
                              ),
                            }}
                          >
                            {msg.content}
                          </ReactMarkdown>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* TYPING / LOADING INDICATOR */}
                {isLoading && (
                  <div style={{ display: "flex", justifyContent: "flex-start" }}>
                    <div
                      style={{
                        backgroundColor: "#ffffff",
                        border: "1.5px solid #0fa29b",
                        borderRadius: "16px 16px 16px 4px",
                        padding: "10px 14px",
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        color: "#062C54",
                        fontSize: "0.84rem",
                        boxShadow: "0 4px 12px rgba(15, 162, 155, 0.15)",
                      }}
                    >
                      <Loader2 size={18} color="#0fa29b" style={{ animation: "spin 1s linear infinite" }} />
                      <span style={{ fontWeight: "600" }}>{getLoadingText()}</span>
                    </div>
                  </div>
                )}

                {/* ERROR BANNER */}
                {errorMsg && (
                  <div
                    style={{
                      backgroundColor: "#FEF2F2",
                      border: "1px solid #FCA5A5",
                      borderRadius: "12px",
                      padding: "10px 12px",
                      color: "#991B1B",
                      fontSize: "0.82rem",
                      display: "flex",
                      flexDirection: "column",
                      gap: "6px",
                    }}
                  >
                    <div>⚠️ {errorMsg}</div>
                    <button
                      onClick={() => handleSendMessage()}
                      style={{
                        alignSelf: "flex-end",
                        backgroundColor: "#DC2626",
                        color: "white",
                        border: "none",
                        borderRadius: "6px",
                        padding: "4px 10px",
                        fontSize: "0.75rem",
                        fontWeight: "700",
                        cursor: "pointer",
                      }}
                    >
                      Réessayer
                    </button>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* ATTACHMENT PREVIEW TRAY */}
          {isAuthenticated && attachments.length > 0 && (
            <div
              style={{
                backgroundColor: "#F1F5F9",
                borderTop: "1px solid #E2E8F0",
                padding: "8px 12px",
                display: "flex",
                flexWrap: "wrap",
                gap: "8px",
                maxHeight: "100px",
                overflowY: "auto",
              }}
            >
              {attachments.map((att) => (
                <div
                  key={att.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    backgroundColor: "#ffffff",
                    border: "1px solid #CBD5E1",
                    borderRadius: "8px",
                    padding: "4px 8px",
                    fontSize: "0.75rem",
                    color: "#1E293B",
                  }}
                >
                  {att.type === "pdf" ? (
                    <FileText size={16} color="#DC2626" style={{ flexShrink: 0 }} />
                  ) : (
                    <div style={{ width: "22px", height: "22px", borderRadius: "4px", overflow: "hidden", flexShrink: 0 }}>
                      <img src={att.data} alt={att.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    </div>
                  )}
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <span
                      style={{
                        fontWeight: "600",
                        maxWidth: "120px",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {att.name}
                    </span>
                    <span style={{ fontSize: "0.68rem", color: "#64748B" }}>{formatFileSize(att.size)}</span>
                  </div>
                  <button
                    onClick={() => handleRemoveAttachment(att.id)}
                    title="Supprimer la pièce jointe"
                    style={{
                      background: "none",
                      border: "none",
                      color: "#94A3B8",
                      cursor: "pointer",
                      padding: "2px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = "#EF4444")}
                    onMouseLeave={(e) => (e.currentTarget.style.color = "#94A3B8")}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* CHAT INPUT FOOTER */}
          {isAuthenticated ? (
            <form
              onSubmit={handleSendMessage}
              style={{
                padding: "0.75rem 1rem",
                backgroundColor: "#ffffff",
                borderTop: "1px solid #E2E8F0",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              {/* HIDDEN FILE INPUT */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,image/jpeg,image/png,image/webp"
                multiple
                style={{ display: "none" }}
                onChange={handleFileSelect}
              />

              {/* ATTACHMENT BUTTON */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading}
                title="Joindre un document PDF (max 25 Mo) ou des images (max 5)"
                style={{
                  backgroundColor: attachments.length > 0 ? "#e6f5f4" : "#F1F5F9",
                  color: attachments.length > 0 ? "#0fa29b" : "#64748B",
                  border: attachments.length > 0 ? "1px solid #0fa29b" : "1px solid #CBD5E1",
                  borderRadius: "12px",
                  padding: "10px",
                  cursor: isLoading ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "all 0.2s ease",
                }}
              >
                <Paperclip size={18} />
              </button>

              {/* TEXT INPUT */}
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={attachments.length > 0 ? "Ajouter un message accompagnant..." : "Posez votre question médicale..."}
                disabled={isLoading}
                style={{
                  flex: 1,
                  border: "1px solid #CBD5E1",
                  borderRadius: "12px",
                  padding: "10px 12px",
                  fontSize: "0.88rem",
                  outline: "none",
                  backgroundColor: isLoading ? "#F1F5F9" : "#ffffff",
                }}
              />

              {/* SEND BUTTON */}
              <button
                type="submit"
                disabled={isLoading || (!input.trim() && attachments.length === 0)}
                style={{
                  backgroundColor: isLoading || (!input.trim() && attachments.length === 0) ? "#CBD5E1" : "#0fa29b",
                  color: "white",
                  border: "none",
                  borderRadius: "12px",
                  padding: "10px 14px",
                  cursor: isLoading || (!input.trim() && attachments.length === 0) ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "all 0.2s ease",
                }}
              >
                <Send size={18} />
              </button>
            </form>
          ) : (
            <div
              style={{
                padding: "0.85rem 1rem",
                backgroundColor: "#ffffff",
                borderTop: "1px solid #E2E8F0",
                textAlign: "center",
                fontSize: "0.82rem",
                color: "#64748B",
                fontWeight: "500",
              }}
            >
              Connectez-vous pour poser vos questions et analyser des documents.
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
