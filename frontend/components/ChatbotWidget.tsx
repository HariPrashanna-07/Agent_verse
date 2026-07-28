"use client";

import React, { useState, useRef, useEffect } from "react";

interface Message {
    role: "user" | "assistant";
    content: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || (
    typeof window !== "undefined" && window.location.hostname === "localhost"
        ? "http://localhost:8000"
        : ""
);

export default function ChatbotWidget() {
    const [open, setOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        {
            role: "assistant",
            content:
                "Hi! 👋 I'm your PrepAI Career Assistant. Ask me anything about interview prep, your resume, or career advice!",
        },
    ]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const bottomRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    /* Auto-scroll to the latest message */
    useEffect(() => {
        if (open) {
            bottomRef.current?.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages, open]);

    /* Focus input when panel opens */
    useEffect(() => {
        if (open) {
            setTimeout(() => inputRef.current?.focus(), 150);
        }
    }, [open]);

    const sendMessage = async () => {
        const text = input.trim();
        if (!text || loading) return;

        const userMsg: Message = { role: "user", content: text };
        const next = [...messages, userMsg];
        setMessages(next);
        setInput("");
        setLoading(true);

        try {
            const res = await fetch(`${API_BASE}/api/chat`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ messages: next }),
            });
            if (!res.ok) throw new Error("Request failed");
            const data = await res.json();
            setMessages([...next, { role: "assistant", content: data.reply }]);
        } catch {
            setMessages([
                ...next,
                {
                    role: "assistant",
                    content: "Sorry, I couldn't reach the server. Please try again.",
                },
            ]);
        } finally {
            setLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    return (
        <>
            {/* Floating Action Button */}
            <button
                id="chatbot-toggle-btn"
                onClick={() => setOpen((v) => !v)}
                aria-label={open ? "Close chatbot" : "Open chatbot"}
                style={{
                    position: "fixed",
                    bottom: "1.5rem",
                    right: "1.5rem",
                    zIndex: 9999,
                    width: "3.25rem",
                    height: "3.25rem",
                    borderRadius: "50%",
                    background: "linear-gradient(135deg, #6366f1, #7c3aed)",
                    boxShadow: "0 4px 20px rgba(99,102,241,0.45)",
                    border: "none",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "transform 0.2s, box-shadow 0.2s",
                }}
                onMouseEnter={(e) =>
                    Object.assign((e.currentTarget as HTMLButtonElement).style, {
                        transform: "scale(1.08)",
                        boxShadow: "0 6px 28px rgba(99,102,241,0.6)",
                    })
                }
                onMouseLeave={(e) =>
                    Object.assign((e.currentTarget as HTMLButtonElement).style, {
                        transform: "scale(1)",
                        boxShadow: "0 4px 20px rgba(99,102,241,0.45)",
                    })
                }
            >
                {open ? (
                    /* Close icon */
                    <svg width="20" height="20" fill="none" stroke="white" strokeWidth="2.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                ) : (
                    /* Chat icon */
                    <svg width="22" height="22" fill="none" stroke="white" strokeWidth="2" viewBox="0 0 24 24">
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                        />
                    </svg>
                )}
            </button>

            {/* Chat Panel */}
            {open && (
                <div
                    id="chatbot-panel"
                    style={{
                        position: "fixed",
                        bottom: "5.5rem",
                        right: "1.5rem",
                        zIndex: 9998,
                        width: "22rem",
                        maxHeight: "32rem",
                        display: "flex",
                        flexDirection: "column",
                        background: "rgba(17,20,32,0.85)",
                        backdropFilter: "blur(16px)",
                        WebkitBackdropFilter: "blur(16px)",
                        border: "1px solid rgba(99,102,241,0.22)",
                        borderRadius: "1.25rem",
                        boxShadow: "0 16px 48px rgba(0,0,0,0.55), 0 0 0 1px rgba(99,102,241,0.1)",
                        animation: "slideUpChat 0.28s cubic-bezier(0.34,1.56,0.64,1) both",
                        overflow: "hidden",
                    }}
                >
                    {/* Header */}
                    <div
                        style={{
                            padding: "0.85rem 1rem",
                            borderBottom: "1px solid rgba(99,102,241,0.15)",
                            display: "flex",
                            alignItems: "center",
                            gap: "0.6rem",
                            background: "linear-gradient(135deg,rgba(99,102,241,0.12),rgba(124,58,237,0.08))",
                            flexShrink: 0,
                        }}
                    >
                        <div
                            style={{
                                width: "2rem",
                                height: "2rem",
                                borderRadius: "50%",
                                background: "linear-gradient(135deg,#6366f1,#7c3aed)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                flexShrink: 0,
                            }}
                        >
                            <svg width="14" height="14" fill="none" stroke="white" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                            </svg>
                        </div>
                        <div>
                            <div style={{ color: "#e8eaf6", fontWeight: 700, fontSize: "0.85rem", lineHeight: 1 }}>
                                Career Assistant
                            </div>
                            <div style={{ color: "#6366f1", fontSize: "0.7rem", marginTop: "0.15rem", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                                <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#10b981", display: "inline-block" }} />
                                Online
                            </div>
                        </div>
                    </div>

                    {/* Message list */}
                    <div
                        style={{
                            flex: 1,
                            overflowY: "auto",
                            padding: "0.85rem",
                            display: "flex",
                            flexDirection: "column",
                            gap: "0.6rem",
                            scrollbarWidth: "thin",
                            scrollbarColor: "rgba(99,102,241,0.3) transparent",
                        }}
                    >
                        {messages.map((m, i) => (
                            <div
                                key={i}
                                style={{
                                    display: "flex",
                                    justifyContent: m.role === "user" ? "flex-end" : "flex-start",
                                    animation: "fadeIn 0.2s ease both",
                                }}
                            >
                                <div
                                    style={{
                                        maxWidth: "82%",
                                        padding: "0.55rem 0.8rem",
                                        borderRadius: m.role === "user" ? "1rem 1rem 0.2rem 1rem" : "1rem 1rem 1rem 0.2rem",
                                        background:
                                            m.role === "user"
                                                ? "linear-gradient(135deg,rgba(99,102,241,0.25),rgba(124,58,237,0.18))"
                                                : "rgba(24,28,42,0.9)",
                                        border:
                                            m.role === "user"
                                                ? "1px solid rgba(99,102,241,0.35)"
                                                : "1px solid rgba(99,102,241,0.12)",
                                        color: "#e8eaf6",
                                        fontSize: "0.82rem",
                                        lineHeight: 1.55,
                                        whiteSpace: "pre-wrap",
                                        wordBreak: "break-word",
                                    }}
                                >
                                    {m.content}
                                </div>
                            </div>
                        ))}

                        {/* Typing indicator */}
                        {loading && (
                            <div style={{ display: "flex", justifyContent: "flex-start" }}>
                                <div
                                    style={{
                                        padding: "0.55rem 0.9rem",
                                        borderRadius: "1rem 1rem 1rem 0.2rem",
                                        background: "rgba(24,28,42,0.9)",
                                        border: "1px solid rgba(99,102,241,0.12)",
                                        display: "flex",
                                        gap: "0.3rem",
                                        alignItems: "center",
                                    }}
                                >
                                    {[0, 1, 2].map((d) => (
                                        <span
                                            key={d}
                                            style={{
                                                width: 6,
                                                height: 6,
                                                borderRadius: "50%",
                                                background: "#6366f1",
                                                display: "inline-block",
                                                animation: `voiceWave 1s ease-in-out infinite`,
                                                animationDelay: `${d * 0.15}s`,
                                            }}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

                        <div ref={bottomRef} />
                    </div>

                    {/* Input bar */}
                    <div
                        style={{
                            padding: "0.7rem 0.8rem",
                            borderTop: "1px solid rgba(99,102,241,0.15)",
                            display: "flex",
                            gap: "0.5rem",
                            alignItems: "center",
                            background: "rgba(9,11,16,0.6)",
                            flexShrink: 0,
                        }}
                    >
                        <input
                            ref={inputRef}
                            id="chatbot-input"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Ask me anything…"
                            disabled={loading}
                            style={{
                                flex: 1,
                                background: "rgba(24,28,42,0.9)",
                                border: "1px solid rgba(99,102,241,0.2)",
                                borderRadius: "0.6rem",
                                padding: "0.5rem 0.75rem",
                                color: "#e8eaf6",
                                fontSize: "0.82rem",
                                outline: "none",
                                transition: "border-color 0.2s",
                            }}
                            onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(99,102,241,0.55)")}
                            onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(99,102,241,0.2)")}
                        />
                        <button
                            id="chatbot-send-btn"
                            onClick={sendMessage}
                            disabled={loading || !input.trim()}
                            style={{
                                width: "2.1rem",
                                height: "2.1rem",
                                borderRadius: "0.6rem",
                                background:
                                    loading || !input.trim()
                                        ? "rgba(99,102,241,0.25)"
                                        : "linear-gradient(135deg,#6366f1,#7c3aed)",
                                border: "none",
                                cursor: loading || !input.trim() ? "not-allowed" : "pointer",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                flexShrink: 0,
                                transition: "background 0.2s",
                            }}
                        >
                            <svg width="15" height="15" fill="none" stroke="white" strokeWidth="2.2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 19V5m-7 7l7-7 7 7" />
                            </svg>
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}
