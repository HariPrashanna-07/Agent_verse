"use client";

import React from "react";
import { useAuth } from "@/context/AuthContext";

type AppView = "dashboard" | "upload" | "console" | "scorecard";

interface NavbarProps {
    currentView: AppView;
    userName?: string;
    showSteps?: boolean;
}

const steps: { id: AppView; label: string; number: number }[] = [
    { id: "upload", label: "Upload", number: 1 },
    { id: "console", label: "Interview", number: 2 },
    { id: "scorecard", label: "Results", number: 3 },
];

const viewOrder: AppView[] = ["upload", "console", "scorecard"];

export default function Navbar({ currentView, userName, showSteps = true }: NavbarProps) {
    const { isAuthenticated, logout } = useAuth();
    const currentIndex = viewOrder.indexOf(currentView);

    return (
        <nav className="sticky top-0 z-50 glass border-b border-[var(--border)]">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">

                {/* Brand */}
                <div className="flex items-center gap-2.5 flex-shrink-0">
                    <div className="w-8 h-8 rounded-lg gradient-btn flex items-center justify-center shadow-lg">
                        <svg viewBox="0 0 24 24" className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="2.2">
                            <path d="M12 2L2 7l10 5 10-5-10-5z" strokeLinejoin="round" />
                            <path d="M2 17l10 5 10-5" strokeLinejoin="round" />
                            <path d="M2 12l10 5 10-5" strokeLinejoin="round" />
                        </svg>
                    </div>
                    <span className="font-bold text-base tracking-tight gradient-text">AgentVerse</span>
                </div>

                {/* Step Indicator */}
                {showSteps && (
                    <div className="flex items-center gap-1 sm:gap-2">
                        {steps.map((step, idx) => {
                            const isCompleted = idx < currentIndex;
                            const isActive = step.id === currentView;
                            return (
                                <React.Fragment key={step.id}>
                                    <div className={[
                                        "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all duration-300",
                                        isActive ? "bg-indigo-500/20 border border-indigo-500/40 text-indigo-300"
                                            : isCompleted ? "bg-emerald-500/15 border border-emerald-500/30 text-emerald-400"
                                                : "bg-[var(--bg-highlight)] border border-[var(--border)] text-[var(--text-muted)]",
                                    ].join(" ")}>
                                        <span className={[
                                            "w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0",
                                            isCompleted ? "bg-emerald-500 text-white"
                                                : isActive ? "bg-indigo-500 text-white"
                                                    : "bg-[var(--bg-surface)] text-[var(--text-muted)] border border-[var(--border)]",
                                        ].join(" ")}>
                                            {isCompleted ? "✓" : step.number}
                                        </span>
                                        <span className="hidden sm:inline">{step.label}</span>
                                    </div>
                                    {idx < steps.length - 1 && (
                                        <div className={["w-6 h-px transition-colors duration-500", isCompleted ? "bg-emerald-500/50" : "bg-[var(--border)]"].join(" ")} />
                                    )}
                                </React.Fragment>
                            );
                        })}
                    </div>
                )}

                {/* Right: user + logout */}
                <div className="flex items-center gap-2 flex-shrink-0">
                    {isAuthenticated ? (
                        <>
                            {userName && (
                                <span className="hidden sm:block text-xs text-[var(--text-muted)] max-w-[120px] truncate">
                                    {userName}
                                </span>
                            )}
                            {currentView !== "dashboard" && (
                                <button
                                    onClick={() => window.location.href = '/'}
                                    className="flex items-center gap-1.5 h-7 px-2.5 rounded-lg text-xs font-medium bg-[var(--bg-surface)] border border-[var(--border)] text-[var(--text-muted)] hover:text-indigo-400 hover:border-indigo-500/40 transition-all mr-1"
                                >
                                    Dashboard
                                </button>
                            )}
                            <button
                                onClick={logout}
                                className="flex items-center gap-1.5 h-7 px-2.5 rounded-lg text-xs font-medium bg-[var(--bg-highlight)] border border-[var(--border)] text-[var(--text-muted)] hover:text-rose-300 hover:border-rose-500/40 transition-all"
                            >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
                                </svg>
                                Sign out
                            </button>
                        </>
                    ) : (
                        <div className="hidden sm:flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_var(--emerald)]" />
                            AI Online
                        </div>
                    )}
                </div>
            </div>
        </nav>
    );
}
