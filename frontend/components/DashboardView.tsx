"use client";

import React, { useEffect, useState } from "react";

interface EvaluationData {
    scores: {
        overall: number;
        technical_accuracy: number;
        communication: number;
        problem_solving: number;
    };
    strengths: string[];
    weaknesses: string[];
}

interface Scorecard {
    target_role: string;
    target_company: string;
    evaluation: EvaluationData;
    created_at: string;
}

interface DashboardViewProps {
    candidateId: string;
    token: string;
    onTakeInterview: () => void;
}

export default function DashboardView({ candidateId, token, onTakeInterview }: DashboardViewProps) {
    const [scorecards, setScorecards] = useState<Scorecard[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchHistory() {
            try {
                const API_BASE = process.env.NEXT_PUBLIC_API_URL || (typeof window !== "undefined" && window.location.hostname === "localhost" ? "http://localhost:8000" : "");
                const res = await fetch(`${API_BASE}/api/scorecards/${candidateId}`, {
                    headers: {
                        "Authorization": `Bearer ${token}`
                    }
                });
                if (!res.ok) throw new Error("Failed to fetch history");
                const data = await res.json();
                setScorecards(data.scorecards || []);
            } catch (err: any) {
                setError(err.message || "An error occurred");
            } finally {
                setLoading(false);
            }
        }

        if (candidateId && token) {
            fetchHistory();
        }
    }, [candidateId, token]);

    return (
        <div className="flex-1 max-w-6xl w-full mx-auto p-6 md:p-12 animate-fade-in flex flex-col gap-10">

            {/* Hero Section */}
            <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl p-8 lg:p-12 flex flex-col items-center text-center shadow-lg relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 pointer-events-none" />
                <h1 className="text-3xl md:text-5xl font-extrabold mb-4 tracking-tight">
                    Welcome to your <span className="gradient-text">AgentVerse</span> Dashboard
                </h1>
                <p className="text-[var(--text-muted)] text-base md:text-lg max-w-2xl mb-8 leading-relaxed">
                    Ready to level up your interview skills? Take a highly realistic mock interview powered by our multi-agent AI system.
                </p>
                <button
                    onClick={onTakeInterview}
                    className="gradient-btn px-8 py-4 rounded-xl text-white font-bold text-lg hover:shadow-[0_0_20px_var(--indigo)] transition-all hover:-translate-y-0.5 active:scale-95 flex items-center gap-3"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                    Take Mock Interview
                </button>
            </div>

            {/* History Section */}
            <div className="flex flex-col gap-6">
                <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                        <svg className="w-6 h-6 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Interview History
                    </h2>
                    <div className="text-sm text-[var(--text-muted)] font-medium">
                        {scorecards.length} {scorecards.length === 1 ? 'Session' : 'Sessions'} completed
                    </div>
                </div>

                {loading ? (
                    <div className="h-40 flex items-center justify-center text-[var(--text-muted)] border border-[var(--border-light)] rounded-xl border-dashed">
                        <div className="animate-spin w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full mr-3" />
                        Loading history...
                    </div>
                ) : error ? (
                    <div className="h-40 flex items-center justify-center text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-xl">
                        {error}
                    </div>
                ) : scorecards.length === 0 ? (
                    <div className="h-48 flex flex-col items-center justify-center text-[var(--text-muted)] bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl border-dashed gap-2">
                        <svg className="w-8 h-8 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                        </svg>
                        <p>No interviews taken yet.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {scorecards.map((card, idx) => (
                            <div key={idx} className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl p-6 flex flex-col gap-4 hover:border-indigo-500/40 hover:shadow-lg transition-all group relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-4">
                                    <div className="w-12 h-12 rounded-full border-4 border-emerald-500/20 flex items-center justify-center relative shadow-sm">
                                        <span className="text-emerald-400 font-bold text-sm tracking-tighter">
                                            {card.evaluation.scores.overall}%
                                        </span>
                                        <svg className="absolute inset-0 w-full h-full -rotate-90 text-emerald-500" viewBox="0 0 36 36">
                                            <path
                                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="3"
                                                strokeDasharray={`${card.evaluation.scores.overall}, 100`}
                                                className="transition-all duration-1000 ease-out"
                                            />
                                        </svg>
                                    </div>
                                </div>

                                <div>
                                    <div className="text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-1">
                                        {card.target_company || "General"}
                                    </div>
                                    <h3 className="text-lg font-bold text-[var(--text-primary)] truncate pr-16" title={card.target_role}>
                                        {card.target_role}
                                    </h3>
                                    <div className="text-xs text-[var(--text-muted)] mt-1.5 flex items-center gap-1.5">
                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                        {new Date(card.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                    </div>
                                </div>

                                <div className="flex-1 mt-2">
                                    <div className="text-xs font-semibold text-[var(--text-muted)] mb-2 flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Key Strength
                                    </div>
                                    <p className="text-sm text-[var(--text-primary)] line-clamp-2 leading-relaxed">
                                        {card.evaluation.strengths?.[0] || "Solid overall performance."}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

        </div>
    );
}
