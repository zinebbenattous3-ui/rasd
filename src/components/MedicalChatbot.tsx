import React, { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import { Bot, X, Send, RotateCcw, AlertTriangle, ShieldCheck, Sparkles, Loader2, Lock, LogIn } from "lucide-react";
import { getStoredSession } from "@/lib/auth";
import { sendMedicalChatMessage, type ChatMessage } from "@/lib/medicalChatServer";

const INITIAL_WELCOME_MESSAGE: ChatMessage = {
  role: "assistant",
  content:
    "Bonjour ! Je suis l'assistant d'information médicale RASED. Je peux vous aider à comprendre des termes médicaux, vous fournir des informations de santé générale ou vous guider sur la plateforme.\n\n⚠️ *Note importante : Je suis un assistant virtuel d'information générale, et non un médecin. Je ne pose aucun diagnostic et ne prescris aucun traitement.*",
};

export function MedicalChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [sessionToken, setSessionToken] = useState<string | undefined>(undefined);

  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_WELCOME_MESSAGE]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

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
  }, [messages, isLoading, isOpen, isAuthenticated]);

  // Reset conversation to fresh start
  const handleResetConversation = () => {
    setMessages([INITIAL_WELCOME_MESSAGE]);
    setInput("");
    setErrorMsg(null);
  };

  // Send message handler
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || isLoading || !userId || !isAuthenticated) return;

    const userText = input.trim();
    const newUserMsg: ChatMessage = { role: "user", content: userText };

    const updatedMessages = [...messages, newUserMsg];
    setMessages(updatedMessages);
    setInput("");
    setIsLoading(true);
    setErrorMsg(null);

    try {
      // Call server function (executes strictly on backend server)
      const response = await sendMedicalChatMessage({
        data: {
          messages: updatedMessages.filter((m) => m !== INITIAL_WELCOME_MESSAGE),
          userId: userId,
          sessionToken: sessionToken,
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

  return (
    <div style={{ position: "fixed", bottom: "24px", right: "24px", zIndex: 9999, fontFamily: "sans-serif" }}>
      {/* FLOATING CHAT BUTTON */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          style={{
            backgroundColor: "#062C54",
            color: "white",
            border: "2px solid #0fa29b",
            borderRadius: "999px",
            padding: "12px 20px",
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
            <div style={{ fontSize: "0.7rem", color: "#38BDF8", fontWeight: "700" }}>Information médicale</div>
          </div>
          <Sparkles size={16} color="#38BDF8" style={{ marginLeft: "4px" }} />
        </button>
      )}

      {/* FLOATING CHAT WINDOW */}
      {isOpen && (
        <div
          style={{
            width: "380px",
            maxWidth: "calc(100vw - 32px)",
            height: "540px",
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
                <div style={{ fontSize: "0.95rem", fontWeight: "800", color: "white" }}>Assistant Médical</div>
                <div style={{ fontSize: "0.72rem", color: isAuthenticated ? "#38BDF8" : "#94A3B8", display: "flex", alignItems: "center", gap: "4px" }}>
                  <span style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: isAuthenticated ? "#10B981" : "#F59E0B" }} />
                  {isAuthenticated ? "Information générale · En direct" : "Authentification requise"}
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
              <strong>Avertissement :</strong> Informations générales uniquement. Ne remplace pas un avis médical. En cas d'urgence, contactez les secours.
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
              <div style={{ margin: "auto", padding: "1.5rem 1rem", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem" }}>
                <div style={{ width: "56px", height: "56px", borderRadius: "50%", backgroundColor: "#e6f5f4", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Lock size={28} color="#0fa29b" />
                </div>
                <div>
                  <h4 style={{ margin: "0 0 0.5rem 0", color: "#062C54", fontSize: "1.05rem", fontWeight: "700" }}>Connexion requise</h4>
                  <p style={{ margin: 0, color: "#64748B", fontSize: "0.85rem", lineHeight: "1.5" }}>
                    L'assistant médical intelligent RASED est réservé aux membres connectés. Veuillez vous connecter pour échanger avec l'IA.
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
                          maxWidth: "85%",
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
                                <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: "#0fa29b", fontWeight: "600", textDecoration: "underline" }}>
                                  {children}
                                </a>
                              ),
                              strong: ({ children }) => <strong style={{ fontWeight: "700", color: "#062C54" }}>{children}</strong>,
                              em: ({ children }) => <em style={{ fontStyle: "italic", color: "#475569" }}>{children}</em>,
                              code: ({ children }) => <code style={{ backgroundColor: "#F1F5F9", padding: "2px 5px", borderRadius: "4px", fontSize: "0.82rem", fontFamily: "monospace" }}>{children}</code>
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
                        border: "1px solid #E2E8F0",
                        borderRadius: "16px 16px 16px 4px",
                        padding: "10px 14px",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        color: "#64748B",
                        fontSize: "0.82rem",
                      }}
                    >
                      <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
                      <span>Rédaction de la réponse...</span>
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
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Posez votre question médicale..."
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
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                style={{
                  backgroundColor: isLoading || !input.trim() ? "#CBD5E1" : "#0fa29b",
                  color: "white",
                  border: "none",
                  borderRadius: "12px",
                  padding: "10px 14px",
                  cursor: isLoading || !input.trim() ? "not-allowed" : "pointer",
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
              Connectez-vous pour poser vos questions.
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
