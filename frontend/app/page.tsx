"use client";

import React, { useState, useEffect } from "react";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import Navbar from "@/components/Navbar";
import LoginView from "@/components/LoginView";
import UploadView from "@/components/UploadView";
import ConsoleView from "@/components/ConsoleView";
import ScorecardView from "@/components/ScorecardView";

type AppView = "login" | "upload" | "console" | "scorecard";

interface SessionData {
  resumeAnalysis: Record<string, unknown>;
  interviewPlan: Record<string, unknown>;
  openingQuestion: string;
  sessionContext: Record<string, unknown>;
}

interface EvaluationData {
  scores: {
    overall: number;
    technical_accuracy: number;
    communication: number;
    problem_solving: number;
  };
  strengths: string[];
  weaknesses: string[];
  detailed_feedback?: string[];
  roadmap: { day: number; topic: string; task: string }[];
}

function AppInner() {
  const { isAuthenticated, user, token } = useAuth();
  const [view, setView] = useState<AppView>("login");
  const [session, setSession] = useState<SessionData | null>(null);
  const [evaluation, setEvaluation] = useState<EvaluationData | null>(null);

  // Handle view transitions based on auth state
  useEffect(() => {
    if (isAuthenticated && view === "login") {
      setView("upload");
    } else if (!isAuthenticated && view !== "login") {
      setView("login");
      setSession(null);
      setEvaluation(null);
    }
  }, [isAuthenticated, view]);

  const handleLoginSuccess = () => setView("upload");

  const handleInterviewStart = (data: {
    resumeAnalysis: Record<string, unknown>;
    interviewPlan: Record<string, unknown>;
    openingQuestion: string;
    sessionContext: Record<string, unknown>;
  }) => {
    setSession(data);
    setView("console");
  };

  const handleInterviewEnd = (evalData: Record<string, unknown>) => {
    setEvaluation(evalData as unknown as EvaluationData);
    setView("scorecard");
  };

  const handleRetake = () => {
    setSession(null);
    setEvaluation(null);
    setView("upload");
  };

  const currentFocus = (() => {
    if (!session) return "General";
    const plan = session.interviewPlan as { plan?: { focus: string }[] };
    return plan?.plan?.[0]?.focus ?? "General";
  })();

  // The Navbar only shows step progress for non-login views
  const navView = view === "login" ? "upload" : view;

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-base)]">
      <Navbar
        currentView={navView as "upload" | "console" | "scorecard"}
        userName={user?.name}
        showSteps={view !== "login"}
      />

      {view === "login" && <LoginView onLoginSuccess={handleLoginSuccess} />}

      {view === "upload" && (
        <UploadView onInterviewStart={handleInterviewStart} />
      )}

      {view === "console" && session && (
        <ConsoleView
          openingQuestion={session.openingQuestion}
          currentFocus={currentFocus}
          resumeContext={session.resumeAnalysis}
          interviewPlan={session.interviewPlan}
          candidateId={user?.candidateId ?? ""}
          token={token ?? ""}
          onInterviewEnd={handleInterviewEnd}
        />
      )}

      {view === "scorecard" && evaluation && (
        <ScorecardView
          evaluation={evaluation}
          candidateId={user?.candidateId}
          onRetake={handleRetake}
        />
      )}
    </div>
  );
}

export default function Home() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  );
}
