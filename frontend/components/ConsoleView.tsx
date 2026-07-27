"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import Button from "./ui/Button";
import Badge from "./ui/Badge";
import { useVoice } from "@/hooks/useVoice";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || (typeof window !== "undefined" && window.location.hostname === "localhost" ? "http://localhost:8000" : "");

interface Message {
    id: string;
    sender: "assistant" | "user";
    text: string;
    timestamp: Date;
}

interface ConsoleViewProps {
    openingQuestion: string;
    currentFocus: string;
    resumeContext: Record<string, unknown>;
    interviewPlan: Record<string, unknown>;
    targetRole?: string;
    targetCompany?: string;
    candidateId: string;
    token: string;
    onInterviewEnd: (evaluation: Record<string, unknown>) => void;
}

// ── Animated VoiceWave (decorative, always shown beside AI label) ───────────
function VoiceWave({ active = false }: { active?: boolean }) {
    return (
        <div
            className="flex items-end gap-[3px] h-4 flex-shrink-0"
            aria-hidden="true"
        >
            {[1, 2, 3, 4, 5].map((i) => (
                <span
                    key={i}
                    className={`w-[3px] rounded-full transition-colors ${active
                        ? `bg-emerald-400 animate-voice-wave-${i}`
                        : `bg-[var(--accent-light)] animate-voice-wave-${i}`
                        }`}
                    style={{ height: "100%" }}
                />
            ))}
        </div>
    );
}

// ── Thinking indicator while AI is fetching ─────────────────────────────────
function TypingIndicator() {
    return (
        <div className="flex items-center gap-3 animate-fade-in">
            <div className="w-7 h-7 rounded-full gradient-btn flex items-center justify-center flex-shrink-0">
                <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L5 14.5m14.8.8l1.402 1.402c1 1 .3 2.7-1.1 2.7H3.9c-1.4 0-2.1-1.7-1.1-2.7L4.2 15.3" />
                </svg>
            </div>
            <div className="chat-bubble-assistant rounded-2xl px-4 py-3 flex items-center gap-3">
                <VoiceWave />
                <span className="text-xs text-[var(--text-muted)]">Thinking…</span>
            </div>
        </div>
    );
}

// ── Mic button ───────────────────────────────────────────────────────────────
function MicButton({
    listening,
    onClick,
    disabled,
}: {
    listening: boolean;
    onClick: () => void;
    disabled: boolean;
}) {
    return (
        <button
            id="mic-btn"
            type="button"
            onClick={onClick}
            disabled={disabled}
            title={listening ? "Stop recording" : "Speak your answer"}
            aria-label={listening ? "Stop recording" : "Start voice input"}
            className={[
                "relative w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 self-end transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]",
                listening
                    ? "bg-rose-500/20 border-2 border-rose-500/60 text-rose-400 hover:bg-rose-500/30"
                    : "bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-[var(--accent-light)]",
                disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer",
            ].join(" ")}
        >
            {/* Pulse ring while listening */}
            {listening && (
                <span className="absolute inset-0 rounded-xl border-2 border-rose-400 animate-ping opacity-60" />
            )}
            {listening ? (
                /* Stop icon */
                <svg className="w-4 h-4 relative z-10" viewBox="0 0 24 24" fill="currentColor">
                    <rect x="6" y="6" width="12" height="12" rx="2" />
                </svg>
            ) : (
                /* Mic icon */
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
                </svg>
            )}
        </button>
    );
}

// ── Per-message replay button ────────────────────────────────────────────────
function ReplayButton({ onClick, active }: { onClick: () => void; active: boolean }) {
    return (
        <button
            type="button"
            onClick={onClick}
            title={active ? "Stop speaking" : "Read aloud"}
            aria-label={active ? "Stop speaking" : "Read message aloud"}
            className={[
                "w-6 h-6 rounded-lg flex items-center justify-center transition-all duration-150 flex-shrink-0",
                active
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                    : "bg-[var(--bg-highlight)] text-[var(--text-muted)] border border-[var(--border)] hover:text-[var(--accent-light)] hover:border-[var(--border-hover)]",
            ].join(" ")}
        >
            {active ? (
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                    <rect x="6" y="4" width="4" height="16" rx="1" />
                    <rect x="14" y="4" width="4" height="16" rx="1" />
                </svg>
            ) : (
                <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
                </svg>
            )}
        </button>
    );
}

// ── Main ConsoleView ─────────────────────────────────────────────────────────
export default function ConsoleView({
    openingQuestion,
    currentFocus,
    resumeContext,
    interviewPlan,
    targetRole = "",
    targetCompany = "",
    candidateId,
    token,
    onInterviewEnd,
}: ConsoleViewProps) {
    const interviewId = React.useRef(`iv-${Date.now().toString(36)}`);
    const { stt, tts } = useVoice();

    const [messages, setMessages] = useState<Message[]>([
        { id: "opening", sender: "assistant", text: openingQuestion, timestamp: new Date() },
    ]);
    const [input, setInput] = useState(""); // Kept for any fallback behavior though mostly unused
    const [isTyping, setIsTyping] = useState(false);
    const [isEnding, setIsEnding] = useState(false);
    const [endError, setEndError] = useState("");
    const [turnCount, setTurnCount] = useState(0);
    const [autoSpeak, setAutoSpeak] = useState(true);
    const [speakingId, setSpeakingId] = useState<string | null>(null);
    const bottomRef = useRef<HTMLDivElement>(null);
    const [codeContent, setCodeContent] = useState("");
    const [requiresCode, setRequiresCode] = useState(false);
    const [typingMode, setTypingMode] = useState(false);
    const [typedAnswer, setTypedAnswer] = useState("");

    // Auto-scroll on new messages
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, isTyping, requiresCode]);

    // Speak opening question on mount (if autoSpeak is on)
    useEffect(() => {
        if (autoSpeak && tts.supported && openingQuestion) {
            setSpeakingId("opening");
            tts.speak(openingQuestion);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // only on mount

    // Track when TTS finishes speaking
    useEffect(() => {
        if (!tts.speaking) setSpeakingId(null);
    }, [tts.speaking]);

    // ── Send answer ────────────────────────────────────────────────────────────
    const sendAnswer = useCallback(async () => {
        const transcript = typingMode
            ? typedAnswer.trim()
            : (stt.transcript + (stt.interim ? " " + stt.interim : "")).trim();
        const codeSuffix = requiresCode && codeContent.trim() ? `\n\n[Code Snippet]:\n${codeContent.trim()}` : "";
        const answer = transcript + codeSuffix;

        if (!answer || isTyping) return;

        // Stop mic and TTS before sending
        if (!typingMode) { stt.stop(); stt.reset(); }
        setTypedAnswer("");
        tts.cancel();
        setSpeakingId(null);
        setCodeContent("");

        const userMsg: Message = {
            id: `user-${Date.now()}`,
            sender: "user",
            text: answer,
            timestamp: new Date(),
        };
        setMessages((prev) => [...prev, userMsg]);
        setIsTyping(true);
        setTurnCount((c) => c + 1);

        try {
            const history = messages.map((m) => ({ sender: m.sender, text: m.text }));
            const res = await fetch(`${API_BASE}/api/interview-turn`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    current_focus: currentFocus,
                    candidate_answer: answer,
                    history,
                    target_role: targetRole,
                    target_company: targetCompany,
                    resume_context: resumeContext,
                    interview_plan: interviewPlan,
                }),
            });

            const data = await res.json();
            let rawAiText = data.interviewer_response ?? "Let's move on to the next question.";

            // Check for code request tag
            const hasCodeReq = rawAiText.includes("[REQUIRES_CODE]");
            setRequiresCode(hasCodeReq);
            const aiText = rawAiText.replace("[REQUIRES_CODE]", "").trim();

            const aiId = `ai-${Date.now()}`;
            const aiMsg: Message = { id: aiId, sender: "assistant", text: aiText, timestamp: new Date() };

            setMessages((prev) => [...prev, aiMsg]);

            // Auto-speak AI response
            if (autoSpeak && tts.supported) {
                setSpeakingId(aiId);
                tts.speak(aiText);
            }
        } catch {
            const errMsg: Message = {
                id: `err-${Date.now()}`,
                sender: "assistant",
                text: "⚠️ Connection issue. Please try again.",
                timestamp: new Date(),
            };
            setMessages((prev) => [...prev, errMsg]);
        } finally {
            setIsTyping(false);
        }
    }, [stt, isTyping, tts, messages, autoSpeak, currentFocus, resumeContext, interviewPlan, requiresCode, codeContent, typingMode, typedAnswer]);

    // ── Mic toggle ─────────────────────────────────────────────────────────────
    const toggleMic = useCallback(() => {
        if (stt.listening) {
            stt.stop();
        } else {
            tts.cancel();         // stop TTS before mic opens
            setSpeakingId(null);
            stt.start();
        }
    }, [stt, tts]);

    // ── Per-message replay ─────────────────────────────────────────────────────
    const replayMessage = useCallback(
        (msg: Message) => {
            if (speakingId === msg.id && tts.speaking) {
                tts.cancel();
                setSpeakingId(null);
            } else {
                setSpeakingId(msg.id);
                tts.speak(msg.text);
            }
        },
        [speakingId, tts]
    );

    // ── TTS toggle ─────────────────────────────────────────────────────────────
    const toggleAutoSpeak = () => {
        if (autoSpeak) tts.cancel();
        setAutoSpeak((v) => !v);
    };

    // ── End interview ─────────────────────────────────────────────────────────
    const endInterview = async () => {
        stt.stop();
        tts.cancel();
        setIsEnding(true);
        setEndError("");
        try {
            const transcript = messages.map((m) => ({ sender: m.sender, text: m.text }));
            const targetRole = (interviewPlan as Record<string, unknown>)?.role as string ?? "Software Engineer";
            const targetCompany = (resumeContext?.company as string) ?? "";

            // Step 1: Evaluate
            const res = await fetch(`${API_BASE}/api/evaluate`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ transcript, target_role: targetRole, target_company: targetCompany }),
            });
            if (!res.ok) throw new Error("Evaluation failed.");
            const data = await res.json();

            // Step 2: Persist scorecard to DynamoDB
            if (candidateId && token) {
                fetch(`${API_BASE}/api/scorecards`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                    body: JSON.stringify({
                        candidate_id: candidateId,
                        interview_id: interviewId.current,
                        target_role: targetRole,
                        target_company: targetCompany,
                        evaluation: data.evaluation,
                    }),
                }).catch((err) => console.warn("Scorecard save failed (non-fatal):", err));
            }

            onInterviewEnd(data.evaluation);
        } catch (err: unknown) {
            setEndError(err instanceof Error ? err.message : "Evaluation failed.");
            setIsEnding(false);
        }
    };

    const formatTime = (d: Date) => d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    return (
        <div className="flex-1 flex flex-col max-w-4xl w-full mx-auto px-4 py-4 gap-4 animate-fade-in">

            {/* ── Header bar ───────────────────────────────────────────────── */}
            <div className="surface-card px-4 py-3 flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_var(--emerald)]" />
                    <div>
                        <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider">Current Focus</p>
                        <p className="text-sm font-semibold text-[var(--text-primary)] leading-tight">{currentFocus}</p>
                    </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="accent">{turnCount} exchange{turnCount !== 1 ? "s" : ""}</Badge>

                    {/* TTS auto-speak toggle */}
                    {tts.supported && (
                        <button
                            id="tts-toggle-btn"
                            type="button"
                            onClick={toggleAutoSpeak}
                            title={autoSpeak ? "Mute AI voice" : "Unmute AI voice"}
                            aria-label={autoSpeak ? "Mute AI voice" : "Enable AI voice"}
                            className={[
                                "flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-xs font-medium border transition-all duration-200",
                                autoSpeak
                                    ? "bg-emerald-500/15 border-emerald-500/35 text-emerald-300 hover:bg-emerald-500/25"
                                    : "bg-[var(--bg-highlight)] border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--border-hover)]",
                            ].join(" ")}
                        >
                            {tts.speaking ? (
                                <svg className="w-3.5 h-3.5 animate-pulse" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.318.664-2.66 1.905A9.76 9.76 0 001.5 12c0 .898.121 1.768.35 2.595.341 1.24 1.518 1.905 2.659 1.905h1.93l4.5 4.5c.945.945 2.561.276 2.561-1.06V4.06z" />
                                    <path d="M18.584 5.106a.75.75 0 011.06 0c3.808 3.807 3.808 9.98 0 13.788a.75.75 0 11-1.06-1.06 8.25 8.25 0 000-11.668.75.75 0 010-1.06z" />
                                    <path d="M15.932 7.757a.75.75 0 011.061 0 6 6 0 010 8.486.75.75 0 01-1.06-1.061 4.5 4.5 0 000-6.364.75.75 0 010-1.061z" />
                                </svg>
                            ) : autoSpeak ? (
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
                                </svg>
                            ) : (
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 9.75L19.5 12m0 0l2.25 2.25M19.5 12l2.25-2.25M19.5 12l-2.25 2.25m-10.5-6l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
                                </svg>
                            )}
                            <span className="hidden sm:inline">
                                {tts.speaking ? "Speaking…" : autoSpeak ? "Voice ON" : "Voice OFF"}
                            </span>
                        </button>
                    )}
                    {/* End Interview — visible only after 5 exchanges */}
                    {turnCount >= 5 ? (
                        <Button
                            id="end-interview-btn"
                            variant="danger"
                            size="sm"
                            onClick={endInterview}
                            loading={isEnding}
                        >
                            {isEnding ? "Evaluating…" : "End Interview"}
                        </Button>
                    ) : (
                        <div className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium bg-[var(--bg-highlight)] border border-[var(--border)] text-[var(--text-muted)]" title={`End Interview unlocks after 5 exchanges (${5 - turnCount} remaining)`}>
                            <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                            </svg>
                            <span className="hidden sm:inline">{5 - turnCount} more exchange{5 - turnCount !== 1 ? "s" : ""}</span>
                        </div>
                    )}
                </div>
            </div>

            {endError && (
                <div className="px-3 py-2 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-300 text-sm animate-fade-in">
                    {endError}
                </div>
            )}

            {stt.error && (
                <div className="px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-300 text-sm animate-fade-in flex items-center gap-2">
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                    </svg>
                    Microphone error: {stt.error}. Check browser permissions and try again.
                </div>
            )}

            {/* Browser support notice */}
            {!stt.supported && (
                <div className="px-3 py-2 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text-muted)] text-xs flex items-center gap-2">
                    ⚠️ Voice features require Chrome or Edge.
                </div>
            )}

            {/* ── Chat window ──────────────────────────────────────────────── */}
            <div className="flex-1 surface-card p-4 overflow-y-auto space-y-5" style={{ minHeight: requiresCode ? "220px" : "380px" }}>
                {messages.map((msg, idx) => (
                    <div
                        key={msg.id}
                        className={`flex gap-3 animate-slide-up ${msg.sender === "user" ? "flex-row-reverse" : ""}`}
                        style={{ animationDelay: `${idx * 0.03}s` }}
                    >
                        {/* Avatar */}
                        {msg.sender === "assistant" ? (
                            <div className="w-7 h-7 rounded-full gradient-btn flex items-center justify-center flex-shrink-0 mt-0.5">
                                <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L5 14.5m14.8.8l1.402 1.402c1 1 .3 2.7-1.1 2.7H3.9c-1.4 0-2.1-1.7-1.1-2.7L4.2 15.3" />
                                </svg>
                            </div>
                        ) : (
                            <div className="w-7 h-7 rounded-full bg-[var(--bg-highlight)] border border-[var(--border)] flex items-center justify-center flex-shrink-0 mt-0.5">
                                <svg className="w-3.5 h-3.5 text-[var(--text-secondary)]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                                </svg>
                            </div>
                        )}

                        {/* Bubble */}
                        <div className={`max-w-[78%] space-y-1 ${msg.sender === "user" ? "items-end" : "items-start"} flex flex-col`}>
                            {msg.sender === "assistant" && (
                                <div className="flex items-center gap-2 mb-1">
                                    <VoiceWave active={speakingId === msg.id && tts.speaking} />
                                    <span className="text-[10px] text-[var(--text-muted)]">
                                        {speakingId === msg.id && tts.speaking ? "Speaking…" : "Interviewer"}
                                    </span>
                                </div>
                            )}
                            <div
                                className={`rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${msg.sender === "assistant"
                                    ? "chat-bubble-assistant text-[var(--text-primary)]"
                                    : "chat-bubble-user text-[var(--text-primary)]"
                                    }`}
                            >
                                {msg.text}
                            </div>
                            <div className={`flex items-center gap-2 px-1 ${msg.sender === "user" ? "flex-row-reverse" : ""}`}>
                                <span className="text-[10px] text-[var(--text-muted)]">{formatTime(msg.timestamp)}</span>
                                {/* Replay button — only on assistant messages if TTS is available */}
                                {msg.sender === "assistant" && tts.supported && (
                                    <ReplayButton
                                        onClick={() => replayMessage(msg)}
                                        active={speakingId === msg.id && tts.speaking}
                                    />
                                )}
                            </div>
                        </div>
                    </div>
                ))}

                {isTyping && <TypingIndicator />}
                <div ref={bottomRef} />
            </div>

            {/* ── Input area ───────────────────────────────────────────────── */}
            <div className="surface-card p-4 space-y-4">

                {/* Embedded Code Editor (Conditional) */}
                {requiresCode && (
                    <div className="space-y-1.5 animate-fade-in">
                        <div className="flex items-center justify-between px-1">
                            <label className="text-xs font-semibold text-emerald-400 uppercase tracking-widest flex items-center gap-2">
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
                                </svg>
                                Code Snippet Environment
                            </label>
                        </div>
                        <textarea
                            id="code-editor"
                            placeholder="Interviewer requested code. Type your snippet here..."
                            value={codeContent}
                            onChange={(e) => setCodeContent(e.target.value)}
                            disabled={isTyping || isEnding}
                            rows={6}
                            spellCheck={false}
                            className="w-full font-mono bg-[#090b10] border border-emerald-500/30 rounded-xl p-4 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors disabled:opacity-50"
                        />
                    </div>
                )}

                {/* Voice / Typing mode toggle */}
                <div className="flex items-center justify-end">
                    <button
                        id="toggle-typing-mode-btn"
                        type="button"
                        onClick={() => {
                            // Stop voice if switching away from voice mode
                            if (!typingMode && stt.listening) { stt.stop(); stt.reset(); }
                            setTypingMode((v) => !v);
                        }}
                        disabled={isTyping || isEnding}
                        className={[
                            "flex items-center gap-1.5 h-7 px-2.5 rounded-lg text-xs font-medium border transition-all duration-200",
                            typingMode
                                ? "bg-violet-500/15 border-violet-500/35 text-violet-300 hover:bg-violet-500/25"
                                : "bg-[var(--bg-highlight)] border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--border-hover)] hover:text-[var(--text-secondary)]",
                            (isTyping || isEnding) ? "opacity-40 cursor-not-allowed" : "",
                        ].join(" ")}
                        title={typingMode ? "Switch to voice input" : "Switch to text input"}
                        aria-label={typingMode ? "Switch to voice input" : "Type your answer"}
                    >
                        {typingMode ? (
                            /* mic icon */
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
                            </svg>
                        ) : (
                            /* keyboard icon */
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 7.5h10.5M6.75 12h10.5M6.75 16.5h4.5M3 6.75A2.25 2.25 0 015.25 4.5h13.5A2.25 2.25 0 0121 6.75v10.5A2.25 2.25 0 0118.75 19.5H5.25A2.25 2.25 0 013 17.25V6.75z" />
                            </svg>
                        )}
                        <span>{typingMode ? "Use Voice" : "Type Answer"}</span>
                    </button>
                </div>

                {/* Voice Box & Actions */}
                <div className="flex gap-4 items-end">

                    {typingMode ? (
                        /* ── Typing mode: plain textarea ── */
                        <textarea
                            id="typed-answer-input"
                            placeholder="Type your answer here…"
                            value={typedAnswer}
                            onChange={(e) => setTypedAnswer(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                                    e.preventDefault();
                                    sendAnswer();
                                }
                            }}
                            disabled={isTyping || isEnding}
                            rows={3}
                            className="flex-1 bg-[var(--bg-highlight)] border border-[var(--border)] rounded-xl px-4 py-3 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] resize-none focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] transition-colors disabled:opacity-50"
                        />
                    ) : (
                        /* ── Voice mode: transcript display ── */
                        <div className="flex-1 min-h-[52px] relative bg-[var(--bg-highlight)] border border-[var(--border)] rounded-xl px-4 py-3 flex items-center gap-3 overflow-hidden">

                            {/* Mic Button Inline */}
                            {stt.supported && (
                                <button
                                    onClick={toggleMic}
                                    disabled={isTyping || isEnding}
                                    className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${stt.listening ? "bg-rose-500 text-white animate-pulse shadow-[0_0_12px_rgba(244,63,94,0.5)]" : "bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text-muted)] hover:text-white"
                                        } disabled:opacity-40`}
                                >
                                    {stt.listening ? (
                                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2" /></svg>
                                    ) : (
                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" /></svg>
                                    )}
                                </button>
                            )}

                            {/* Native Voice Transcript Visualization */}
                            <div className="flex-1 text-sm">
                                {stt.transcript ? (
                                    <span className="text-[var(--text-primary)]">{stt.transcript} </span>
                                ) : stt.listening ? (
                                    <span className="text-[var(--text-muted)] italic">Listening to your answer...</span>
                                ) : (
                                    <span className="text-[var(--text-muted)] italic">Click the mic to speak your answer</span>
                                )}

                                {stt.interim && (
                                    <span className="text-[var(--text-muted)] opacity-60"> {stt.interim}</span>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Send button */}
                    <Button
                        id="send-answer-btn"
                        variant="primary"
                        size="lg"
                        onClick={sendAnswer}
                        disabled={
                            (typingMode
                                ? !typedAnswer.trim()
                                : (!stt.transcript.trim() && !stt.interim.trim())
                            ) && !codeContent.trim() || isTyping || isEnding
                        }
                        loading={isTyping}
                        className="flex-shrink-0 px-6"
                    >
                        Submit
                    </Button>
                </div>
            </div>
        </div>
    );
}
