"use client";

import React, { useState } from "react";
import Button from "./ui/Button";
import Badge from "./ui/Badge";
import { useAuth } from "@/context/AuthContext";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || (typeof window !== "undefined" && window.location.hostname === "localhost" ? "http://localhost:8000" : "");

interface LoginViewProps {
    onLoginSuccess: () => void;
}

type Tab = "login" | "register";

export default function LoginView({ onLoginSuccess }: LoginViewProps) {
    const { login } = useAuth();
    const [tab, setTab] = useState<Tab>("login");
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async () => {
        setError("");
        if (!email.trim() || !password.trim()) return setError("Email and password are required.");
        if (tab === "register" && !name.trim()) return setError("Name is required.");

        setLoading(true);
        try {
            const endpoint = tab === "login" ? "/api/auth/login" : "/api/auth/register";
            const body =
                tab === "login"
                    ? { email: email.trim(), password }
                    : { name: name.trim(), email: email.trim(), password };

            const res = await fetch(`${API_BASE}${endpoint}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data?.detail ?? "Authentication failed.");

            login(data.token, {
                candidateId: data.candidate_id,
                name: data.name,
                email: email.trim(),
            });
            onLoginSuccess();
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Something went wrong.");
        } finally {
            setLoading(false);
        }
    };

    const handleKey = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") handleSubmit();
    };

    return (
        <div className="flex-1 flex flex-col items-center justify-center px-4 py-12 animate-fade-in">
            <div className="w-full max-w-md space-y-6">

                {/* Branding */}
                <div className="text-center space-y-2 animate-slide-up">
                    <div className="flex justify-center mb-4">
                        <div className="w-14 h-14 rounded-2xl gradient-btn flex items-center justify-center shadow-lg glow-accent">
                            <svg viewBox="0 0 24 24" className="w-8 h-8 text-white" fill="none" stroke="currentColor" strokeWidth="2.2">
                                <path d="M12 2L2 7l10 5 10-5-10-5z" strokeLinejoin="round" />
                                <path d="M2 17l10 5 10-5" strokeLinejoin="round" />
                                <path d="M2 12l10 5 10-5" strokeLinejoin="round" />
                            </svg>
                        </div>
                    </div>
                    <Badge variant="accent">AI-Powered Interview Platform</Badge>
                    <h1 className="text-3xl font-bold gradient-text">AgentVerse</h1>
                    <p className="text-[var(--text-secondary)] text-sm">
                        {tab === "login" ? "Sign in to continue your interview journey." : "Create your candidate account."}
                    </p>
                </div>

                {/* Card */}
                <div className="surface-card p-6 space-y-5 animate-slide-up" style={{ animationDelay: "0.08s" }}>

                    {/* Tab switcher */}
                    <div className="flex rounded-xl overflow-hidden border border-[var(--border)] p-1 bg-[var(--bg-elevated)]">
                        {(["login", "register"] as Tab[]).map((t) => (
                            <button
                                key={t}
                                onClick={() => { setTab(t); setError(""); }}
                                className={[
                                    "flex-1 h-9 rounded-lg text-sm font-medium transition-all duration-200",
                                    tab === t
                                        ? "gradient-btn text-white shadow"
                                        : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]",
                                ].join(" ")}
                            >
                                {t === "login" ? "Sign In" : "Create Account"}
                            </button>
                        ))}
                    </div>

                    {/* Fields */}
                    <div className="space-y-3">
                        {tab === "register" && (
                            <div className="space-y-1.5">
                                <label htmlFor="name-input" className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                                    Full Name
                                </label>
                                <input
                                    id="name-input"
                                    type="text"
                                    placeholder="Hari Prashanna"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    onKeyDown={handleKey}
                                    className="w-full h-10 px-3 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text-primary)] placeholder-[var(--text-muted)] text-sm focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] transition-colors"
                                />
                            </div>
                        )}

                        <div className="space-y-1.5">
                            <label htmlFor="email-input" className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                                Email
                            </label>
                            <input
                                id="email-input"
                                type="email"
                                placeholder="you@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                onKeyDown={handleKey}
                                className="w-full h-10 px-3 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text-primary)] placeholder-[var(--text-muted)] text-sm focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] transition-colors"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label htmlFor="password-input" className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                                Password
                            </label>
                            <input
                                id="password-input"
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                onKeyDown={handleKey}
                                className="w-full h-10 px-3 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text-primary)] placeholder-[var(--text-muted)] text-sm focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] transition-colors"
                            />
                        </div>
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-300 text-sm animate-fade-in">
                            <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                            </svg>
                            {error}
                        </div>
                    )}

                    {/* Submit */}
                    <Button
                        id="auth-submit-btn"
                        variant="primary"
                        size="lg"
                        className="w-full"
                        onClick={handleSubmit}
                        loading={loading}
                    >
                        {loading ? "Please wait…" : tab === "login" ? "Sign In →" : "Create Account →"}
                    </Button>
                </div>

                {/* Footer note */}
                <p className="text-center text-xs text-[var(--text-muted)] animate-slide-up" style={{ animationDelay: "0.12s" }}>
                    Your resume stays in S3 · Scorecards saved to DynamoDB · JWT-secured
                </p>
            </div>
        </div>
    );
}
