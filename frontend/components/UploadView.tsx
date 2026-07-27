"use client";

import React, { useState, useRef, useCallback } from "react";
import Button from "./ui/Button";
import Badge from "./ui/Badge";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || (typeof window !== "undefined" && window.location.hostname === "localhost" ? "http://localhost:8000" : "");

interface UploadViewProps {
    onInterviewStart: (data: {
        resumeAnalysis: Record<string, unknown>;
        interviewPlan: Record<string, unknown>;
        openingQuestion: string;
        sessionContext: Record<string, unknown>;
    }) => void;
}

type Status = "idle" | "uploading" | "parsing" | "planning" | "starting" | "error";

const statusMessages: Record<Status, string> = {
    idle: "",
    uploading: "Uploading resume to secure storage…",
    parsing: "Reading and parsing your resume…",
    planning: "AI agents crafting your personalised interview plan…",
    starting: "Spinning up your interviewer…",
    error: "",
};

export default function UploadView({ onInterviewStart }: UploadViewProps) {
    const [file, setFile] = useState<File | null>(null);
    const [dragOver, setDragOver] = useState(false);
    const [company, setCompany] = useState("");
    const [role, setRole] = useState("");
    const [jd, setJd] = useState("");
    const [status, setStatus] = useState<Status>("idle");
    const [error, setError] = useState("");

    const inputRef = useRef<HTMLInputElement>(null);

    /* ── Drag & Drop ── */
    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
        const dropped = e.dataTransfer.files[0];
        if (dropped?.type === "application/pdf") {
            setFile(dropped);
            setError("");
        } else {
            setError("Please drop a PDF file.");
        }
    }, []);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const picked = e.target.files?.[0] ?? null;
        if (picked?.type === "application/pdf") {
            setFile(picked);
            setError("");
        } else if (picked) {
            setError("Only PDF files are accepted.");
        }
    };

    /* ── Submit ── */
    const handleSubmit = async () => {
        if (!file) return setError("Please select a PDF resume.");
        if (!company.trim()) return setError("Company name is required.");
        if (!role.trim()) return setError("Target role is required.");

        setError("");

        try {
            // Request Fullscreen immediately on form submission (synchronously within the click handler)
            if (typeof document !== 'undefined' && document.documentElement.requestFullscreen) {
                await document.documentElement.requestFullscreen().catch(err => {
                    console.warn("Fullscreen request failed", err);
                });
            }

            /* Step 1 — process-resume */
            setStatus("uploading");
            const form = new FormData();
            form.append("file", file);
            form.append("company", company.trim());
            form.append("role", role.trim());
            if (jd.trim()) form.append("jd", jd.trim());

            setStatus("parsing");
            const resumeRes = await fetch(`${API_BASE}/api/process-resume`, {
                method: "POST",
                body: form,
            });
            if (!resumeRes.ok) {
                const err = await resumeRes.json().catch(() => ({}));
                throw new Error(err?.detail ?? "Resume processing failed.");
            }
            const resumeData = await resumeRes.json();

            /* Step 2 — start-interview */
            setStatus("starting");
            const startRes = await fetch(`${API_BASE}/api/start-interview`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    target_role: role.trim(),
                    target_company: company.trim(),
                    resume_analysis: resumeData.resume_analysis,
                    interview_plan: resumeData.interview_plan,
                }),
            });
            if (!startRes.ok) {
                const err = await startRes.json().catch(() => ({}));
                throw new Error(err?.detail ?? "Failed to start interview.");
            }
            const startData = await startRes.json();

            onInterviewStart({
                resumeAnalysis: resumeData.resume_analysis,
                interviewPlan: resumeData.interview_plan,
                openingQuestion: startData.opening_question,
                sessionContext: startData.session_context,
            });
        } catch (err: unknown) {
            setStatus("error");
            setError(err instanceof Error ? err.message : "Unexpected error.");
        }
    };

    const isLoading = status !== "idle" && status !== "error";
    const canSubmit = !!file && !!company.trim() && !!role.trim() && !isLoading;

    return (
        <div className="flex-1 flex flex-col items-center justify-center px-4 py-12 animate-fade-in">
            <div className="w-full max-w-2xl space-y-6">

                {/* Header */}
                <div className="text-center space-y-2 animate-slide-up" style={{ animationDelay: "0.05s" }}>
                    <Badge variant="accent">AI-Powered Interview Simulator</Badge>
                    <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
                        <span className="gradient-text">Prepare Smarter,</span>
                        <br />
                        Interview Better.
                    </h1>
                    <p className="text-[var(--text-secondary)] text-sm sm:text-base max-w-md mx-auto">
                        Upload your resume and let our multi-agent AI craft a personalised
                        interview session tailored to your target role.
                    </p>
                </div>

                {/* Card */}
                <div className="surface-card p-6 space-y-5 animate-slide-up" style={{ animationDelay: "0.1s" }}>

                    {/* Dropzone */}
                    <div
                        id="pdf-dropzone"
                        role="button"
                        tabIndex={0}
                        aria-label="Upload PDF resume"
                        onClick={() => inputRef.current?.click()}
                        onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
                        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                        onDragLeave={() => setDragOver(false)}
                        onDrop={handleDrop}
                        className={[
                            "group relative border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center gap-3 transition-all duration-200 cursor-pointer",
                            dragOver
                                ? "dropzone-active"
                                : file
                                    ? "border-emerald-500/40 bg-emerald-500/5"
                                    : "border-[var(--border)] bg-[var(--bg-elevated)] hover:border-[var(--border-hover)] hover:bg-[var(--bg-highlight)]",
                        ].join(" ")}
                    >
                        <input
                            ref={inputRef}
                            type="file"
                            accept="application/pdf"
                            className="sr-only"
                            onChange={handleFileChange}
                            id="resume-file-input"
                        />

                        {file ? (
                            <>
                                {/* File accepted icon */}
                                <div className="w-12 h-12 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
                                    <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <div className="text-center">
                                    <p className="font-semibold text-emerald-300 text-sm">{file.name}</p>
                                    <p className="text-xs text-[var(--text-muted)] mt-0.5">
                                        {(file.size / 1024).toFixed(1)} KB · PDF
                                    </p>
                                </div>
                                <button
                                    onClick={(e) => { e.stopPropagation(); setFile(null); }}
                                    className="absolute top-3 right-3 w-7 h-7 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 hover:bg-rose-500/20 transition-colors"
                                    aria-label="Remove file"
                                >
                                    ✕
                                </button>
                            </>
                        ) : (
                            <>
                                <div className="w-12 h-12 rounded-xl bg-[var(--bg-highlight)] border border-[var(--border)] flex items-center justify-center group-hover:border-[var(--accent)] transition-colors">
                                    <svg className="w-6 h-6 text-[var(--text-muted)] group-hover:text-[var(--accent-light)] transition-colors" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                                    </svg>
                                </div>
                                <div className="text-center">
                                    <p className="font-medium text-[var(--text-secondary)] text-sm">
                                        <span className="text-[var(--accent-light)]">Click to browse</span> or drag & drop
                                    </p>
                                    <p className="text-xs text-[var(--text-muted)] mt-0.5">PDF files only · Max 10 MB</p>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Form fields */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label htmlFor="company-input" className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                                Company <span className="text-rose-400">*</span>
                            </label>
                            <input
                                id="company-input"
                                type="text"
                                placeholder="e.g. Google"
                                value={company}
                                onChange={(e) => setCompany(e.target.value)}
                                className="w-full h-10 px-3 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text-primary)] placeholder-[var(--text-muted)] text-sm focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] transition-colors"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label htmlFor="role-input" className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                                Target Role <span className="text-rose-400">*</span>
                            </label>
                            <input
                                id="role-input"
                                type="text"
                                placeholder="e.g. Software Engineer"
                                value={role}
                                onChange={(e) => setRole(e.target.value)}
                                className="w-full h-10 px-3 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text-primary)] placeholder-[var(--text-muted)] text-sm focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] transition-colors"
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label htmlFor="jd-input" className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                            Job Description <span className="text-[var(--text-muted)]">(Optional)</span>
                        </label>
                        <textarea
                            id="jd-input"
                            placeholder="Paste the job description for more targeted interview questions…"
                            value={jd}
                            onChange={(e) => setJd(e.target.value)}
                            rows={3}
                            className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text-primary)] placeholder-[var(--text-muted)] text-sm focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] transition-colors resize-none"
                        />
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

                    {/* Status progress */}
                    {isLoading && (
                        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-sm animate-fade-in">
                            <span className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin-slow flex-shrink-0" />
                            {statusMessages[status]}
                        </div>
                    )}

                    {/* Submit */}
                    <Button
                        id="start-interview-btn"
                        variant="primary"
                        size="lg"
                        className="w-full"
                        onClick={handleSubmit}
                        disabled={!canSubmit}
                        loading={isLoading}
                    >
                        {isLoading ? "Preparing Interview…" : "Start AI Interview →"}
                    </Button>
                </div>

                {/* Feature pills */}
                <div className="flex flex-wrap justify-center gap-2 text-xs text-[var(--text-muted)] animate-slide-up" style={{ animationDelay: "0.15s" }}>
                    {["Adaptive questioning", "Resume-aware AI", "Real-time scoring", "7-day roadmap"].map((f) => (
                        <span key={f} className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--bg-elevated)] border border-[var(--border)]">
                            <span className="w-1 h-1 rounded-full bg-[var(--accent)]" />
                            {f}
                        </span>
                    ))}
                </div>
            </div>
        </div>
    );
}
