"use client";

import React from "react";
import { useAuth } from "@/context/AuthContext";

type AppView = "dashboard" | "upload" | "console" | "scorecard";

interface NavbarProps {
    currentView: AppView;
    userName?: string;
    showSteps?: boolean;
    onOpenSettings?: () => void;
    onBack?: () => void;
}

const steps: { id: AppView; label: string; number: number }[] = [
    { id: "upload", label: "Upload", number: 1 },
    { id: "console", label: "Interview", number: 2 },
    { id: "scorecard", label: "Results", number: 3 },
];

const viewOrder: AppView[] = ["upload", "console", "scorecard"];

export default function Navbar({ currentView, userName, showSteps = true, onOpenSettings, onBack }: NavbarProps) {
    const { isAuthenticated, logout } = useAuth();
    const currentIndex = viewOrder.indexOf(currentView);

    return (
        <nav className="sticky top-0 z-50 glass border-b border-[var(--border)]">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">

                {/* Brand */}
                <div className="flex items-center gap-2.5 flex-shrink-0">
                    {onBack && (
                        <button
                            onClick={onBack}
                            title="Go Back"
                            className="flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--bg-surface)] border border-[var(--border)] text-[var(--text-muted)] hover:text-indigo-400 hover:border-indigo-500/40 transition-all mr-1"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
                            </svg>
                        </button>
                    )}
                    <div className="w-8 h-8 rounded-lg gradient-btn flex items-center justify-center shadow-lg">
                        <svg viewBox="0 0 24 24" className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="2.2">
                            <path d="M12 2L2 7l10 5 10-5-10-5z" strokeLinejoin="round" />
                            <path d="M2 17l10 5 10-5" strokeLinejoin="round" />
                            <path d="M2 12l10 5 10-5" strokeLinejoin="round" />
                        </svg>
                    </div>
                    <span className="font-bold text-base tracking-tight gradient-text">PrepAI</span>
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

                {/* Right: settings + user + logout */}
                <div className="flex items-center gap-2 flex-shrink-0">
                    {isAuthenticated ? (
                        <>


                            {/* Settings gear */}
                            {onOpenSettings && (
                                <button
                                    id="settings-open-btn"
                                    onClick={onOpenSettings}
                                    title="Settings"
                                    className="flex items-center justify-center w-7 h-7 rounded-lg bg-[var(--bg-surface)] border border-[var(--border)] text-[var(--text-muted)] hover:text-indigo-400 hover:border-indigo-500/40 transition-all"
                                >
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 011.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.56.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.893.149c-.425.07-.765.383-.93.78-.165.398-.143.854.107 1.204l.527.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 01-1.449.12l-.738-.527c-.35-.25-.806-.272-1.203-.107-.397.165-.71.505-.781.929l-.149.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.269-1.45-.12l-.773-.774a1.125 1.125 0 01-.12-1.45l.527-.737c.25-.35.273-.806.108-1.204-.165-.397-.505-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.108-1.204l-.526-.738a1.125 1.125 0 01.12-1.45l.773-.773a1.125 1.125 0 011.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
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
