"use client";

import React from "react";

type BadgeVariant = "default" | "accent" | "emerald" | "amber" | "rose" | "muted";

interface BadgeProps {
    children: React.ReactNode;
    variant?: BadgeVariant;
    className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
    default: "bg-[var(--bg-highlight)] text-[var(--text-secondary)] border border-[var(--border)]",
    accent: "bg-indigo-500/15 text-indigo-300 border border-indigo-500/30",
    emerald: "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30",
    amber: "bg-amber-500/15 text-amber-300 border border-amber-500/30",
    rose: "bg-rose-500/15 text-rose-300 border border-rose-500/30",
    muted: "bg-[var(--bg-surface)] text-[var(--text-muted)] border border-[var(--border)]",
};

export default function Badge({ children, variant = "default", className = "" }: BadgeProps) {
    return (
        <span
            className={[
                "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                variantStyles[variant],
                className,
            ].join(" ")}
        >
            {children}
        </span>
    );
}
