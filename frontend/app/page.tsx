"use client";

import React, { useState, useEffect } from "react";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import Navbar from "@/components/Navbar";
import LoginView from "@/components/LoginView";
import UploadView from "@/components/UploadView";
import ConsoleView from "@/components/ConsoleView";
import ScorecardView from "@/components/ScorecardView";
import DashboardView from "@/components/DashboardView";
import ChatbotWidget from "@/components/ChatbotWidget";
import SettingsPanel, { loadSettings, applySettings, type AppSettings } from "@/components/SettingsPanel";
import type { InterviewEvaluationData } from "@/types";

type AppView = "login" | "dashboard" | "upload" | "console" | "scorecard";

interface SessionData {
  resumeAnalysis: Record<string, unknown>;
  interviewPlan: Record<string, unknown>;
  openingQuestion: string;
  openingEmotion?: string;
  sessionContext: Record<string, unknown>;
}



function AppInner() {
  const { isAuthenticated, user, token } = useAuth();
  const [view, setView] = useState<AppView>("login");
  const [session, setSession] = useState<SessionData | null>(null);
  const [evaluation, setEvaluation] = useState<InterviewEvaluationData | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settings, setSettings] = useState<AppSettings>(loadSettings);

  // Apply stored settings on first mount
  useEffect(() => { applySettings(settings); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle view transitions based on auth state
  useEffect(() => {
    if (isAuthenticated && view === "login") {
      setView("dashboard");
    } else if (!isAuthenticated && view !== "login") {
      setView("login");
      setSession(null);
      setEvaluation(null);
    }
  }, [isAuthenticated, view]);

  const handleLoginSuccess = () => setView("dashboard");

  const handleInterviewStart = (data: {
    resumeAnalysis: Record<string, unknown>;
    interviewPlan: Record<string, unknown>;
    openingQuestion: string;
    openingEmotion?: string;
    sessionContext: Record<string, unknown>;
  }) => {
    setSession(data);
    setView("console");
  };

  const handleInterviewEnd = (evalData: InterviewEvaluationData) => {
    setEvaluation(evalData as unknown as InterviewEvaluationData);
    setView("scorecard");
  };

  // Called when user clicks "View Report" on a dashboard history card
  const handleViewHistoryScorecard = (evalData: InterviewEvaluationData) => {
    setEvaluation(evalData);
    setView("scorecard");
  };

  const handleRetake = () => {
    setSession(null);
    setEvaluation(null);
    setView("dashboard");
  };

  const currentFocus = (() => {
    if (!session) return "General";
    const plan = session.interviewPlan as { plan?: { focus: string }[] };
    return plan?.plan?.[0]?.focus ?? "General";
  })();

  // Step indicator only shows during the active interview flow (upload → console → scorecard)
  const isInterviewFlow = view === "upload" || view === "console" || view === "scorecard";
  const navView = isInterviewFlow ? view : "upload";

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-base)]">
      <Navbar
        currentView={navView as "upload" | "console" | "scorecard"}
        userName={user?.name}
        showSteps={isInterviewFlow}
        onOpenSettings={isAuthenticated ? () => setSettingsOpen(true) : undefined}
      />

      {view === "login" && <LoginView onLoginSuccess={handleLoginSuccess} />}

      {view === "dashboard" && user && (
        <DashboardView
          candidateId={user.candidateId}
          token={token ?? ""}
          onTakeInterview={() => setView("upload")}
          onViewScorecard={handleViewHistoryScorecard}
        />
      )}

      {view === "upload" && (
        <UploadView onInterviewStart={handleInterviewStart} />
      )}

      {view === "console" && session && (
        <ConsoleView
          openingQuestion={session.openingQuestion}
          openingEmotion={session.openingEmotion}
          currentFocus={currentFocus}
          resumeContext={session.resumeAnalysis}
          interviewPlan={session.interviewPlan}
          targetRole={(session.sessionContext.target_role as string) ?? ""}
          targetCompany={(session.sessionContext.target_company as string) ?? ""}
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

      {/* Chatbot: visible when authenticated, hidden during live interview */}
      {isAuthenticated && view !== "console" && <ChatbotWidget />}

      {/* Settings slide-over */}
      <SettingsPanel
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={settings}
        onSettingsChange={setSettings}
      />
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
