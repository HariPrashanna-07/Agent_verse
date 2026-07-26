from __future__ import annotations

from pydantic import BaseModel, Field
from typing import List, Optional


# ---------------------------------------------------------------------------
# Shared / Primitive
# ---------------------------------------------------------------------------

class MessageItem(BaseModel):
    sender: str = Field(..., description="'assistant' or 'user'")
    text: str = Field(..., description="The message content")


# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------

class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str

class LoginRequest(BaseModel):
    email: str
    password: str

class AuthResponse(BaseModel):
    status: str
    token: str
    candidate_id: str
    name: str


# ---------------------------------------------------------------------------
# Resume Processing
# ---------------------------------------------------------------------------

class ProcessResumeResponse(BaseModel):
    status: str
    s3_url: str
    resume_analysis: dict
    interview_plan: dict


# ---------------------------------------------------------------------------
# Interview Turn
# ---------------------------------------------------------------------------

class InterviewTurnRequest(BaseModel):
    history: List[MessageItem] = []
    current_focus: str
    candidate_answer: Optional[str] = ""
    resume_context: Optional[dict] = None
    interview_plan: Optional[dict] = None


class InterviewTurnResponse(BaseModel):
    status: str
    interviewer_response: str


# ---------------------------------------------------------------------------
# Start Interview (opening question)
# ---------------------------------------------------------------------------

class StartInterviewRequest(BaseModel):
    target_role: str
    target_company: str
    resume_analysis: dict
    interview_plan: dict


class StartInterviewResponse(BaseModel):
    status: str
    opening_question: str
    session_context: dict


# ---------------------------------------------------------------------------
# Evaluation
# ---------------------------------------------------------------------------

class EvaluationRequest(BaseModel):
    transcript: List[MessageItem]
    target_role: str
    target_company: Optional[str] = ""


class ScoreBreakdown(BaseModel):
    overall: int
    technical_accuracy: int
    communication: int
    problem_solving: int


class RoadmapItem(BaseModel):
    day: int
    topic: str
    task: str


class EvaluationOutput(BaseModel):
    scores: ScoreBreakdown
    strengths: List[str]
    weaknesses: List[str]
    detailed_feedback: List[str] = []
    roadmap: List[RoadmapItem]


class EvaluationResponse(BaseModel):
    status: str
    evaluation: EvaluationOutput


# ---------------------------------------------------------------------------
# Scorecard Persistence
# ---------------------------------------------------------------------------

class SaveScorecardRequest(BaseModel):
    candidate_id: str
    interview_id: str
    target_role: str
    target_company: Optional[str] = ""
    evaluation: dict  # raw dict — avoid nested model serialisation issues


class ScorecardHistoryResponse(BaseModel):
    status: str
    scorecards: List[dict]


# ---------------------------------------------------------------------------
# Roadmap (standalone)
# ---------------------------------------------------------------------------

class RoadmapRequest(BaseModel):
    target_role: str
    weaknesses: List[str] = Field(..., min_length=1)


class RoadmapResponse(BaseModel):
    status: str
    roadmap: List[RoadmapItem]


# ---------------------------------------------------------------------------
# Health Check
# ---------------------------------------------------------------------------

class HealthResponse(BaseModel):
    status: str
    groq_configured: bool
    aws_configured: bool
    version: str