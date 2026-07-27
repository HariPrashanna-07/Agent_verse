"use client";

import React from "react";
import ProgressRing from "./ui/ProgressRing";
import Badge from "./ui/Badge";
import Button from "./ui/Button";
import type { InterviewEvaluationData } from "@/types";



interface ScorecardViewProps {
    evaluation: InterviewEvaluationData;
    candidateId?: string;
    onRetake: () => void;
}

function ScoreGrade(score: number) {
    if (score >= 85) return { label: "Excellent", variant: "emerald" as const };
    if (score >= 70) return { label: "Good", variant: "accent" as const };
    if (score >= 55) return { label: "Average", variant: "amber" as const };
    return { label: "Needs Work", variant: "rose" as const };
}

export default function ScorecardView({ evaluation, candidateId, onRetake }: ScorecardViewProps) {
    const { scores, strengths, weaknesses, detailed_feedback = [], roadmap = [] } = evaluation;
    const grade = ScoreGrade(scores.overall);

    const handleDownload = () => {
        if (typeof window !== "undefined") {
            window.print();
        }
    };

    return (
        <div id="scorecard-report-container" className="flex-1 max-w-5xl w-full mx-auto px-4 py-8 space-y-8 animate-fade-in relative">

            {/* ── Header ── */}
            <div className="text-center space-y-2 animate-slide-up">
                <Badge variant={grade.variant}>{grade.label} Performance</Badge>
                <h2 className="text-3xl font-bold gradient-text">Interview Results</h2>
                {candidateId && (
                    <p className="text-xs text-[var(--text-muted)] font-mono">ID: {candidateId}</p>
                )}
                <p className="text-[var(--text-secondary)] text-sm">
                    Here's a breakdown of your performance across all dimensions.
                </p>
            </div>

            {/* ── Score Rings ── */}
            <div className="surface-card p-6 animate-slide-up" style={{ animationDelay: "0.08s" }}>
                <h3 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-6">
                    Performance Scores
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 justify-items-center">
                    <ProgressRing
                        value={scores.overall}
                        label="Overall"
                        sublabel={grade.label}
                        size={120}
                    />
                    <ProgressRing
                        value={scores.technical_accuracy}
                        label="Technical"
                        sublabel="Accuracy"
                        size={120}
                    />
                    <ProgressRing
                        value={scores.communication}
                        label="Communication"
                        sublabel="Clarity"
                        size={120}
                    />
                    <ProgressRing
                        value={scores.problem_solving}
                        label="Problem Solving"
                        sublabel="Approach"
                        size={120}
                    />
                </div>
            </div>

            {/* ── Strengths & Weaknesses ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-slide-up" style={{ animationDelay: "0.12s" }}>
                {/* Strengths */}
                <div className="surface-card p-5 space-y-3">
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
                            <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                            </svg>
                        </div>
                        <h3 className="text-sm font-semibold text-emerald-300">Strengths</h3>
                    </div>
                    {strengths.length > 0 ? (
                        <ul className="space-y-2">
                            {strengths.map((s, i) => (
                                <li key={i} className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
                                    {s}
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-xs text-[var(--text-muted)] italic">No specific strengths noted.</p>
                    )}
                </div>

                {/* Weaknesses */}
                <div className="surface-card p-5 space-y-3">
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-rose-500/15 border border-rose-500/30 flex items-center justify-center">
                            <svg className="w-3.5 h-3.5 text-rose-400" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                            </svg>
                        </div>
                        <h3 className="text-sm font-semibold text-rose-300">Areas to Improve</h3>
                    </div>
                    {weaknesses.length > 0 ? (
                        <ul className="space-y-2">
                            {weaknesses.map((w, i) => (
                                <li key={i} className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-rose-400 flex-shrink-0" />
                                    {w}
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-xs text-[var(--text-muted)] italic">No specific weaknesses noted.</p>
                    )}
                </div>
            </div>

            {/* ── Detailed Feedback ── */}
            {detailed_feedback.length > 0 && (
                <div className="surface-card p-5 space-y-3 animate-slide-up" style={{ animationDelay: "0.16s" }}>
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center">
                            <svg className="w-3.5 h-3.5 text-indigo-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
                            </svg>
                        </div>
                        <h3 className="text-sm font-semibold text-indigo-300">Detailed Feedback</h3>
                    </div>
                    <ul className="space-y-2">
                        {detailed_feedback.map((fb, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-indigo-400 flex-shrink-0" />
                                {fb}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* ── 7-Day Roadmap ── */}
            {roadmap.length > 0 && <div className="surface-card p-5 space-y-5 animate-slide-up" style={{ animationDelay: "0.2s" }}>
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-violet-500/15 border border-violet-500/30 flex items-center justify-center">
                        <svg className="w-3.5 h-3.5 text-violet-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                        </svg>
                    </div>
                    <h3 className="text-sm font-semibold text-violet-300">Your 7-Day Study Roadmap</h3>
                </div>

                <div className="relative">
                    {/* Vertical timeline line */}
                    <div className="absolute left-[19px] top-0 bottom-0 w-0.5 timeline-line rounded-full" aria-hidden="true" />

                    <div className="space-y-4">
                        {roadmap.map((item, idx) => {
                            const dayColors = [
                                "bg-indigo-500/15 border-indigo-500/30 text-indigo-300",
                                "bg-violet-500/15 border-violet-500/30 text-violet-300",
                                "bg-purple-500/15 border-purple-500/30 text-purple-300",
                                "bg-blue-500/15 border-blue-500/30 text-blue-300",
                                "bg-cyan-500/15  border-cyan-500/30  text-cyan-300",
                                "bg-teal-500/15  border-teal-500/30  text-teal-300",
                                "bg-emerald-500/15 border-emerald-500/30 text-emerald-300",
                            ];
                            const colorClass = dayColors[idx % dayColors.length];

                            return (
                                <div
                                    key={item.day}
                                    className="flex gap-4 animate-slide-in"
                                    style={{ animationDelay: `${0.22 + idx * 0.05}s` }}
                                >
                                    {/* Day badge (sits on the line) */}
                                    <div
                                        className={`w-10 h-10 rounded-xl border flex flex-col items-center justify-center flex-shrink-0 z-10 text-center ${colorClass}`}
                                        style={{ background: "var(--bg-surface)" }}
                                    >
                                        <span className="text-[9px] font-bold uppercase leading-none">Day</span>
                                        <span className="text-base font-bold leading-tight">{item.day}</span>
                                    </div>

                                    {/* Card */}
                                    <div className="surface-elevated flex-1 p-4 space-y-1 mb-1">
                                        <p className="text-sm font-semibold text-[var(--text-primary)]">{item.topic}</p>
                                        <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{item.task}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>}

            {/* ── CTA ── */}
            <div className="no-print flex flex-col sm:flex-row gap-3 justify-center pb-4 animate-slide-up" style={{ animationDelay: "0.28s" }}>
                <Button
                    id="download-report-btn"
                    variant="ghost"
                    size="lg"
                    onClick={handleDownload}
                    icon={
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                        </svg>
                    }
                >
                    Download PDF
                </Button>
                <Button
                    id="retake-interview-btn"
                    variant="primary"
                    size="lg"
                    onClick={onRetake}
                    icon={
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                        </svg>
                    }
                >
                    Retake Interview
                </Button>
            </div>
        </div>
    );
}
