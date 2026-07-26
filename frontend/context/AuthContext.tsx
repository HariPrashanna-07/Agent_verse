"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

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

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [token, setToken] = useState<string | null>(null);

    // Restore from localStorage on mount
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

    const login = useCallback((t: string, u: AuthUser) => {
        setToken(t);
        setUser(u);
        localStorage.setItem("agentverse_auth", JSON.stringify({ token: t, user: u }));
    }, []);

    const logout = useCallback(() => {
        setToken(null);
        setUser(null);
        localStorage.removeItem("agentverse_auth");
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
