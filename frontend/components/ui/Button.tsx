"use client";

import React from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: Variant;
    size?: Size;
    loading?: boolean;
    icon?: React.ReactNode;
}

const variantStyles: Record<Variant, string> = {
    primary:
        "gradient-btn text-white font-semibold shadow-lg hover:shadow-indigo-500/25 hover:scale-[1.02] active:scale-[0.98]",
    secondary:
        "bg-transparent border border-[var(--border-hover)] text-[var(--text-primary)] hover:bg-[var(--bg-highlight)] hover:border-[var(--accent)] active:scale-[0.98]",
    ghost:
        "bg-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-highlight)] active:scale-[0.98]",
    danger:
        "bg-rose-600/10 border border-rose-500/30 text-rose-400 hover:bg-rose-600/20 hover:border-rose-500/60 active:scale-[0.98]",
};

const sizeStyles: Record<Size, string> = {
    sm: "h-8  px-3 text-sm  rounded-lg  gap-1.5",
    md: "h-10 px-4 text-sm  rounded-xl gap-2",
    lg: "h-12 px-6 text-base rounded-xl gap-2.5",
};

export default function Button({
    variant = "primary",
    size = "md",
    loading = false,
    icon,
    children,
    className = "",
    disabled,
    ...rest
}: ButtonProps) {
    const isDisabled = disabled || loading;

    return (
        <button
            disabled={isDisabled}
            className={[
                "inline-flex items-center justify-center font-medium transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-base)] select-none cursor-pointer",
                variantStyles[variant],
                sizeStyles[size],
                isDisabled ? "opacity-50 cursor-not-allowed pointer-events-none" : "",
                className,
            ].join(" ")}
            {...rest}
        >
            {loading ? (
                <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin-slow" />
            ) : icon ? (
                <span className="flex-shrink-0">{icon}</span>
            ) : null}
            {children}
        </button>
    );
}
