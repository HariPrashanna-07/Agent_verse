"use client";

import React, { useEffect, useState, useCallback } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────
export type AppTheme = "dark" | "midnight" | "ocean";

export interface AppSettings {
    theme: AppTheme;
    ttsVolume: number;       // 0–100
    ttsSpeed: string;        // "+0%" | "+20%" | "-20%" etc.
    voiceEnabled: boolean;
    fontSize: "sm" | "md" | "lg";
    notifications: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
    theme: "dark",
    ttsVolume: 80,
    ttsSpeed: "+0%",
    voiceEnabled: true,
    fontSize: "md",
    notifications: true,
};

const STORAGE_KEY = "agentverse_settings";

// ─── Theme palettes ───────────────────────────────────────────────────────────
const THEME_VARS: Record<AppTheme, Record<string, string>> = {
    dark: {
        "--bg-base": "#090b10",
        "--bg-surface": "#111420",
        "--bg-elevated": "#181c2a",
        "--bg-highlight": "#1e2336",
        "--accent": "#6366f1",
        "--accent-light": "#818cf8",
    },
    midnight: {
        "--bg-base": "#050508",
        "--bg-surface": "#0d0d14",
        "--bg-elevated": "#12121e",
        "--bg-highlight": "#191926",
        "--accent": "#a855f7",
        "--accent-light": "#c084fc",
    },
    ocean: {
        "--bg-base": "#021015",
        "--bg-surface": "#061a22",
        "--bg-elevated": "#0a2430",
        "--bg-highlight": "#0f2e3c",
        "--accent": "#06b6d4",
        "--accent-light": "#22d3ee",
    },
};

const FONT_SIZE_MAP: Record<AppSettings["fontSize"], string> = {
    sm: "13px",
    md: "15px",
    lg: "17px",
};

// ─── Apply settings to DOM ────────────────────────────────────────────────────
export function applySettings(s: AppSettings) {
    const root = document.documentElement;
    const vars = THEME_VARS[s.theme];
    Object.entries(vars).forEach(([k, v]) => root.style.setProperty(k, v));
    root.style.fontSize = FONT_SIZE_MAP[s.fontSize];
}

// ─── Hook exposed so outer components can save settings to localStorage ───────
export function loadSettings(): AppSettings {
    if (typeof window === "undefined") return DEFAULT_SETTINGS;
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
    } catch {
        return DEFAULT_SETTINGS;
    }
}

export function saveSettings(s: AppSettings) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    applySettings(s);
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function SectionTitle({ icon, title }: { icon: React.ReactNode; title: string }) {
    return (
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.85rem" }}>
            <span style={{ color: "var(--accent)", display: "flex" }}>{icon}</span>
            <span style={{ color: "var(--text-primary)", fontWeight: 700, fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                {title}
            </span>
        </div>
    );
}

function Toggle({ checked, onChange, id }: { checked: boolean; onChange: (v: boolean) => void; id: string }) {
    return (
        <button
            id={id}
            role="switch"
            aria-checked={checked}
            onClick={() => onChange(!checked)}
            style={{
                width: "2.4rem", height: "1.3rem", borderRadius: "999px",
                background: checked ? "var(--accent)" : "var(--bg-highlight)",
                border: checked ? "none" : "1px solid var(--border)",
                cursor: "pointer", position: "relative", transition: "background 0.2s", flexShrink: 0,
            }}
        >
            <span style={{
                position: "absolute", top: "50%", left: checked ? "calc(100% - 1.05rem)" : "0.15rem",
                transform: "translateY(-50%)", width: "1rem", height: "1rem",
                borderRadius: "50%", background: "white", transition: "left 0.2s",
                boxShadow: "0 1px 4px rgba(0,0,0,0.4)",
            }} />
        </button>
    );
}

function Slider({ value, onChange, min = 0, max = 100, id }: {
    value: number; onChange: (v: number) => void; min?: number; max?: number; id: string;
}) {
    const pct = ((value - min) / (max - min)) * 100;
    return (
        <div style={{ position: "relative", height: "1.5rem", display: "flex", alignItems: "center" }}>
            <input
                id={id} type="range" min={min} max={max} value={value}
                onChange={(e) => onChange(Number(e.target.value))}
                style={{
                    width: "100%", appearance: "none", height: "4px",
                    borderRadius: "4px", outline: "none", cursor: "pointer",
                    background: `linear-gradient(to right, var(--accent) ${pct}%, var(--bg-highlight) ${pct}%)`,
                }}
            />
        </div>
    );
}

// ─── Main component ───────────────────────────────────────────────────────────
interface SettingsPanelProps {
    open: boolean;
    onClose: () => void;
    settings: AppSettings;
    onSettingsChange: (s: AppSettings) => void;
}

const THEMES: { id: AppTheme; label: string; dot: string }[] = [
    { id: "dark", label: "Dark", dot: "#6366f1" },
    { id: "midnight", label: "Midnight", dot: "#a855f7" },
    { id: "ocean", label: "Ocean", dot: "#06b6d4" },
];

const SPEEDS = [
    { value: "-20%", label: "Slower" },
    { value: "+0%", label: "Normal" },
    { value: "+20%", label: "Faster" },
];

export default function SettingsPanel({ open, onClose, settings, onSettingsChange }: SettingsPanelProps) {
    const set = useCallback((patch: Partial<AppSettings>) => {
        const next = { ...settings, ...patch };
        onSettingsChange(next);
        saveSettings(next);
    }, [settings, onSettingsChange]);

    // Close on Escape
    useEffect(() => {
        if (!open) return;
        const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
        document.addEventListener("keydown", handler);
        return () => document.removeEventListener("keydown", handler);
    }, [open, onClose]);

    if (!open) return null;

    const panelStyle: React.CSSProperties = {
        position: "fixed", top: 0, right: 0, bottom: 0,
        width: "min(360px, 95vw)",
        background: "rgba(17,20,32,0.92)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderLeft: "1px solid rgba(99,102,241,0.18)",
        boxShadow: "-12px 0 48px rgba(0,0,0,0.6)",
        zIndex: 10000,
        display: "flex", flexDirection: "column",
        animation: "slideInSettings 0.28s cubic-bezier(0.34,1.2,0.64,1) both",
        overflowY: "auto",
    };

    const rowStyle: React.CSSProperties = {
        display: "flex", alignItems: "center", justifyContent: "space-between",
        gap: "0.75rem", marginBottom: "0.8rem",
    };

    const labelStyle: React.CSSProperties = {
        color: "var(--text-secondary)", fontSize: "0.82rem",
        display: "flex", flexDirection: "column", gap: "0.1rem",
    };

    const sectionStyle: React.CSSProperties = {
        background: "rgba(24,28,42,0.6)",
        border: "1px solid rgba(99,102,241,0.1)",
        borderRadius: "0.85rem",
        padding: "1rem",
        marginBottom: "0.85rem",
    };

    return (
        <>
            {/* Overlay */}
            <div
                onClick={onClose}
                style={{
                    position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)",
                    zIndex: 9999, backdropFilter: "blur(2px)",
                    animation: "fadeIn 0.2s ease both",
                }}
            />

            {/* Panel */}
            <div style={panelStyle}>
                {/* Header */}
                <div style={{
                    padding: "1.1rem 1.25rem 0.9rem",
                    borderBottom: "1px solid rgba(99,102,241,0.12)",
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    flexShrink: 0,
                    background: "linear-gradient(135deg,rgba(99,102,241,0.1),rgba(124,58,237,0.06))",
                }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                        <div style={{
                            width: "2rem", height: "2rem", borderRadius: "0.5rem",
                            background: "linear-gradient(135deg,var(--accent),#7c3aed)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                        }}>
                            <svg width="14" height="14" fill="none" stroke="white" strokeWidth="2.2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 011.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.56.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.893.149c-.425.07-.765.383-.93.78-.165.398-.143.854.107 1.204l.527.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 01-1.449.12l-.738-.527c-.35-.25-.806-.272-1.203-.107-.397.165-.71.505-.781.929l-.149.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.269-1.45-.12l-.773-.774a1.125 1.125 0 01-.12-1.45l.527-.737c.25-.35.273-.806.108-1.204-.165-.397-.505-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.108-1.204l-.526-.738a1.125 1.125 0 01.12-1.45l.773-.773a1.125 1.125 0 011.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894z" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                        </div>
                        <div>
                            <div style={{ color: "var(--text-primary)", fontWeight: 700, fontSize: "0.95rem" }}>Settings</div>
                            <div style={{ color: "var(--text-muted)", fontSize: "0.7rem" }}>Preferences &amp; controls</div>
                        </div>
                    </div>
                    <button
                        id="settings-close-btn"
                        onClick={onClose}
                        style={{
                            width: "1.8rem", height: "1.8rem", borderRadius: "0.5rem",
                            background: "var(--bg-highlight)", border: "1px solid var(--border)",
                            color: "var(--text-muted)", cursor: "pointer",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            transition: "all 0.15s",
                        }}
                    >
                        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Body */}
                <div style={{ padding: "1rem 1.1rem", flex: 1 }}>

                    {/* ── Appearance ── */}
                    <div style={sectionStyle}>
                        <SectionTitle title="Appearance" icon={
                            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                        } />

                        {/* Theme */}
                        <div style={{ marginBottom: "1rem" }}>
                            <div style={{ color: "var(--text-muted)", fontSize: "0.75rem", marginBottom: "0.55rem" }}>Theme</div>
                            <div style={{ display: "flex", gap: "0.5rem" }}>
                                {THEMES.map((t) => (
                                    <button
                                        key={t.id}
                                        id={`theme-${t.id}-btn`}
                                        onClick={() => set({ theme: t.id })}
                                        style={{
                                            flex: 1, padding: "0.55rem 0.5rem", borderRadius: "0.6rem",
                                            border: settings.theme === t.id ? `1.5px solid ${t.dot}` : "1px solid var(--border)",
                                            background: settings.theme === t.id ? `${t.dot}22` : "var(--bg-elevated)",
                                            cursor: "pointer", display: "flex", flexDirection: "column",
                                            alignItems: "center", gap: "0.35rem", transition: "all 0.15s",
                                        }}
                                    >
                                        <span style={{ width: "1rem", height: "1rem", borderRadius: "50%", background: t.dot, display: "block" }} />
                                        <span style={{ color: settings.theme === t.id ? t.dot : "var(--text-muted)", fontSize: "0.68rem", fontWeight: 600 }}>
                                            {t.label}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Font size */}
                        <div>
                            <div style={{ color: "var(--text-muted)", fontSize: "0.75rem", marginBottom: "0.55rem" }}>Font Size</div>
                            <div style={{ display: "flex", gap: "0.4rem" }}>
                                {(["sm", "md", "lg"] as const).map((f) => (
                                    <button
                                        key={f}
                                        id={`fontsize-${f}-btn`}
                                        onClick={() => set({ fontSize: f })}
                                        style={{
                                            flex: 1, padding: "0.4rem", borderRadius: "0.5rem",
                                            border: settings.fontSize === f ? "1.5px solid var(--accent)" : "1px solid var(--border)",
                                            background: settings.fontSize === f ? "rgba(99,102,241,0.15)" : "var(--bg-elevated)",
                                            color: settings.fontSize === f ? "var(--accent-light)" : "var(--text-muted)",
                                            cursor: "pointer", fontSize: f === "sm" ? "0.7rem" : f === "md" ? "0.8rem" : "0.95rem",
                                            fontWeight: 600, transition: "all 0.15s",
                                        }}
                                    >
                                        A{f === "sm" ? "" : f === "md" ? "A" : "A+"}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* ── Voice & Audio ── */}
                    <div style={sectionStyle}>
                        <SectionTitle title="Voice &amp; Audio" icon={
                            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
                            </svg>
                        } />

                        {/* Voice enabled */}
                        <div style={rowStyle}>
                            <span style={labelStyle}>
                                AI Voice
                                <span style={{ color: "var(--text-muted)", fontSize: "0.7rem" }}>Text-to-speech narration</span>
                            </span>
                            <Toggle id="voice-toggle" checked={settings.voiceEnabled} onChange={(v) => set({ voiceEnabled: v })} />
                        </div>

                        {/* Volume */}
                        <div style={{ marginBottom: "0.8rem", opacity: settings.voiceEnabled ? 1 : 0.4, pointerEvents: settings.voiceEnabled ? "auto" : "none", transition: "opacity 0.2s" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.4rem" }}>
                                <span style={{ color: "var(--text-secondary)", fontSize: "0.78rem" }}>Volume</span>
                                <span style={{ color: "var(--accent-light)", fontSize: "0.75rem", fontWeight: 700 }}>{settings.ttsVolume}%</span>
                            </div>
                            <Slider id="volume-slider" value={settings.ttsVolume} onChange={(v) => set({ ttsVolume: v })} />
                        </div>

                        {/* TTS Speed */}
                        <div style={{ opacity: settings.voiceEnabled ? 1 : 0.4, pointerEvents: settings.voiceEnabled ? "auto" : "none", transition: "opacity 0.2s" }}>
                            <div style={{ color: "var(--text-secondary)", fontSize: "0.78rem", marginBottom: "0.45rem" }}>Speaking Speed</div>
                            <div style={{ display: "flex", gap: "0.4rem" }}>
                                {SPEEDS.map((sp) => (
                                    <button
                                        key={sp.value}
                                        id={`speed-${sp.label.toLowerCase()}-btn`}
                                        onClick={() => set({ ttsSpeed: sp.value })}
                                        style={{
                                            flex: 1, padding: "0.4rem", borderRadius: "0.5rem", fontSize: "0.72rem", fontWeight: 600,
                                            border: settings.ttsSpeed === sp.value ? "1.5px solid var(--accent)" : "1px solid var(--border)",
                                            background: settings.ttsSpeed === sp.value ? "rgba(99,102,241,0.15)" : "var(--bg-elevated)",
                                            color: settings.ttsSpeed === sp.value ? "var(--accent-light)" : "var(--text-muted)",
                                            cursor: "pointer", transition: "all 0.15s",
                                        }}
                                    >
                                        {sp.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* ── Notifications ── */}
                    <div style={sectionStyle}>
                        <SectionTitle title="Notifications" icon={
                            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                            </svg>
                        } />
                        <div style={rowStyle}>
                            <span style={labelStyle}>
                                In-app alerts
                                <span style={{ color: "var(--text-muted)", fontSize: "0.7rem" }}>Tips and reminders</span>
                            </span>
                            <Toggle id="notifications-toggle" checked={settings.notifications} onChange={(v) => set({ notifications: v })} />
                        </div>
                    </div>

                    {/* ── Reset ── */}
                    <button
                        id="settings-reset-btn"
                        onClick={() => {
                            onSettingsChange(DEFAULT_SETTINGS);
                            saveSettings(DEFAULT_SETTINGS);
                        }}
                        style={{
                            width: "100%", padding: "0.6rem", borderRadius: "0.65rem",
                            border: "1px solid rgba(244,63,94,0.25)", background: "rgba(244,63,94,0.08)",
                            color: "#f87171", fontSize: "0.8rem", fontWeight: 600,
                            cursor: "pointer", transition: "all 0.15s",
                            display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem",
                        }}
                        onMouseEnter={(e) => Object.assign((e.currentTarget as HTMLButtonElement).style, { background: "rgba(244,63,94,0.15)", borderColor: "rgba(244,63,94,0.45)" })}
                        onMouseLeave={(e) => Object.assign((e.currentTarget as HTMLButtonElement).style, { background: "rgba(244,63,94,0.08)", borderColor: "rgba(244,63,94,0.25)" })}
                    >
                        <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                        </svg>
                        Reset to Defaults
                    </button>
                </div>

                {/* Footer */}
                <div style={{
                    padding: "0.75rem 1.1rem",
                    borderTop: "1px solid rgba(99,102,241,0.1)",
                    textAlign: "center",
                    color: "var(--text-muted)", fontSize: "0.68rem", flexShrink: 0,
                }}>
                    Settings are saved automatically to your browser
                </div>
            </div>
        </>
    );
}
