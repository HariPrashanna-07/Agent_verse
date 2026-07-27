"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";

interface AuthUser {
    candidateId: string;
    name: string;
    email: string;
}

interface AuthContextValue {
    user: AuthUser | null;
    token: string | null;
    isAuthenticated: boolean;
    login: (token: string, user: AuthUser) => void;
    logout: () => void;
}

const AuthContext = createContext<AuthContextValue>({
    user: null,
    token: null,
    isAuthenticated: false,
    login: () => { },
    logout: () => { },
});

const INACTIVITY_MS = 10 * 60 * 1000; // 10 minutes
const ACTIVITY_EVENTS = ["mousemove", "mousedown", "keydown", "touchstart", "scroll", "click"];

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const logout = useCallback(() => {
        setToken(null);
        setUser(null);
        localStorage.removeItem("agentverse_auth");
    }, []);

    // ── Reset the inactivity countdown ────────────────────────────────────────
    const resetTimer = useCallback(() => {
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
            logout();
        }, INACTIVITY_MS);
    }, [logout]);

    // ── Restore from localStorage on mount ────────────────────────────────────
    useEffect(() => {
        try {
            const stored = localStorage.getItem("agentverse_auth");
            if (stored) {
                const parsed = JSON.parse(stored);
                if (parsed.token && parsed.user) {
                    setToken(parsed.token);
                    setUser(parsed.user);
                }
            }
        } catch {
            localStorage.removeItem("agentverse_auth");
        }
    }, []);

    // ── Inactivity timer — only runs when authenticated ────────────────────────
    useEffect(() => {
        if (!token) {
            if (timerRef.current) clearTimeout(timerRef.current);
            return;
        }

        // Start the timer and listen for activity
        resetTimer();
        ACTIVITY_EVENTS.forEach((evt) => window.addEventListener(evt, resetTimer, { passive: true }));

        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
            ACTIVITY_EVENTS.forEach((evt) => window.removeEventListener(evt, resetTimer));
        };
    }, [token, resetTimer]);

    // ── Sign out when user leaves / closes the tab ─────────────────────────────
    useEffect(() => {
        if (!token) return;

        const handleVisibility = () => {
            if (document.visibilityState === "hidden") {
                logout();
            }
        };

        document.addEventListener("visibilitychange", handleVisibility);
        return () => document.removeEventListener("visibilitychange", handleVisibility);
    }, [token, logout]);

    const login = useCallback((t: string, u: AuthUser) => {
        setToken(t);
        setUser(u);
        localStorage.setItem("agentverse_auth", JSON.stringify({ token: t, user: u }));
    }, []);

    return (
        <AuthContext.Provider value={{ user, token, isAuthenticated: !!token, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}
