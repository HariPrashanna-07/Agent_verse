"use client";

import { useState, useEffect, useRef, useCallback } from "react";

// ---------------------------------------------------------------------------
// Type augmentation for browser Speech APIs
// ---------------------------------------------------------------------------
declare global {
    interface Window {
        SpeechRecognition: typeof SpeechRecognition;
        webkitSpeechRecognition: typeof SpeechRecognition;
    }
}

// ---------------------------------------------------------------------------
// Speech-to-Text
// ---------------------------------------------------------------------------
interface STTState {
    listening: boolean;
    transcript: string;        // final confirmed transcript
    interim: string;           // live partial transcript
    supported: boolean;
    error: string;
    start: () => void;
    stop: () => void;
    reset: () => void;
}

function useSpeechRecognition(): STTState {
    const [listening, setListening] = useState(false);
    const [transcript, setTranscript] = useState("");
    const [interim, setInterim] = useState("");
    const [error, setError] = useState("");
    const recognitionRef = useRef<SpeechRecognition | null>(null);
    const supported =
        typeof window !== "undefined" &&
        !!(window.SpeechRecognition || window.webkitSpeechRecognition);

    useEffect(() => {
        if (!supported) return;

        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        const rec = new SR();
        rec.lang = "en-US";
        rec.continuous = false;
        rec.interimResults = true;
        rec.maxAlternatives = 1;

        rec.onstart = () => {
            setListening(true);
            setError("");
            setInterim("");
        };

        rec.onresult = (e: SpeechRecognitionEvent) => {
            let interimText = "";
            let finalText = "";
            for (let i = e.resultIndex; i < e.results.length; i++) {
                const result = e.results[i];
                if (result.isFinal) {
                    finalText += result[0].transcript;
                } else {
                    interimText += result[0].transcript;
                }
            }
            setInterim(interimText);
            if (finalText) {
                setTranscript((prev) => (prev ? prev + " " + finalText : finalText).trim());
                setInterim("");
            }
        };

        rec.onerror = (e: SpeechRecognitionErrorEvent) => {
            if (e.error !== "aborted") setError(e.error);
            setListening(false);
            setInterim("");
        };

        rec.onend = () => {
            setListening(false);
            setInterim("");
        };

        recognitionRef.current = rec;
        return () => {
            rec.abort();
        };
    }, [supported]);

    const start = useCallback(() => {
        if (!recognitionRef.current || listening) return;
        setTranscript("");
        setInterim("");
        setError("");
        try {
            recognitionRef.current.start();
        } catch {
            // recognition already started — ignore
        }
    }, [listening]);

    const stop = useCallback(() => {
        recognitionRef.current?.stop();
    }, []);

    const reset = useCallback(() => {
        setTranscript("");
        setInterim("");
        setError("");
    }, []);

    return { listening, transcript, interim, supported, error, start, stop, reset };
}

// ---------------------------------------------------------------------------
// Text-to-Speech
// ---------------------------------------------------------------------------
interface TTSState {
    speaking: boolean;
    supported: boolean;
    speak: (text: string) => void;
    cancel: () => void;
}

function useSpeechSynthesis(): TTSState {
    const [speaking, setSpeaking] = useState(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const supported = typeof window !== "undefined"; // Always supported if backend is running

    const cancel = useCallback(() => {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
        }
        setSpeaking(false);
    }, []);

    const speak = useCallback(
        async (text: string) => {
            if (!text.trim()) return;
            cancel();
            setSpeaking(true);

            try {
                // Determine API base url
                const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

                const res = await fetch(`${API_BASE}/api/tts`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        text,
                        voice: "en-US-ChristopherNeural", // Very natural, deep male voice
                        rate: "+0%" // Normal speed
                    }),
                });

                if (!res.ok) throw new Error("TTS generation failed");

                const blob = await res.blob();
                const url = URL.createObjectURL(blob);
                const audio = new Audio(url);

                audioRef.current = audio;

                audio.onended = () => setSpeaking(false);
                audio.onerror = () => setSpeaking(false);

                await audio.play();
            } catch (err) {
                console.error("TTS Error:", err);

                // Fallback to minimal native TTS on complete failure
                const utterance = new SpeechSynthesisUtterance(text);
                window.speechSynthesis.speak(utterance);

                setSpeaking(false);
            }
        },
        [cancel]
    );

    // Cancel on unmount
    useEffect(() => {
        return () => cancel();
    }, [cancel]);

    return { speaking, supported, speak, cancel };
}

// ---------------------------------------------------------------------------
// Combined hook
// ---------------------------------------------------------------------------
export interface VoiceHook {
    stt: STTState;
    tts: TTSState;
}

export function useVoice(): VoiceHook {
    const stt = useSpeechRecognition();
    const tts = useSpeechSynthesis();
    return { stt, tts };
}
