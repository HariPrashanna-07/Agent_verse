"use client";

import React, { useEffect, useState } from "react";

interface ProgressRingProps {
    value: number;      // 0–100
    label: string;
    sublabel?: string;
    size?: number;      // px diameter (default 120)
    strokeWidth?: number;
    color?: string;     // stroke color (CSS color)
    className?: string;
}

export default function ProgressRing({
    value,
    label,
    sublabel,
    size = 120,
    strokeWidth = 8,
    color = "var(--accent)",
    className = "",
}: ProgressRingProps) {
    const [animated, setAnimated] = useState(0);

    useEffect(() => {
        const timeout = setTimeout(() => setAnimated(value), 100);
        return () => clearTimeout(timeout);
    }, [value]);

    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (animated / 100) * circumference;

    // Color based on score bracket
    const ringColor =
        color !== "var(--accent)"
            ? color
            : value >= 75
                ? "var(--emerald)"
                : value >= 50
                    ? "var(--accent)"
                    : value >= 30
                        ? "var(--amber)"
                        : "var(--rose)";

    return (
        <div
            className={`flex flex-col items-center gap-2 ${className}`}
            role="progressbar"
            aria-valuenow={value}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={label}
        >
            <div className="relative" style={{ width: size, height: size }}>
                <svg width={size} height={size} className="-rotate-90">
                    {/* Track */}
                    <circle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        fill="none"
                        stroke="var(--bg-highlight)"
                        strokeWidth={strokeWidth}
                    />
                    {/* Progress */}
                    <circle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        fill="none"
                        stroke={ringColor}
                        strokeWidth={strokeWidth}
                        strokeLinecap="round"
                        strokeDasharray={circumference}
                        strokeDashoffset={offset}
                        style={{
                            transition: "stroke-dashoffset 1s cubic-bezier(0.4, 0, 0.2, 1)",
                            filter: `drop-shadow(0 0 6px ${ringColor}80)`,
                        }}
                    />
                </svg>
                {/* Center text */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span
                        className="font-bold leading-none"
                        style={{ fontSize: size * 0.22, color: ringColor }}
                    >
                        {animated}
                    </span>
                    <span className="text-xs text-[var(--text-muted)] mt-0.5">/ 100</span>
                </div>
            </div>
            <div className="text-center">
                <p className="text-sm font-semibold text-[var(--text-primary)]">{label}</p>
                {sublabel && (
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">{sublabel}</p>
                )}
            </div>
        </div>
    );
}
