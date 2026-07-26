import logging
import uuid

from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Depends
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional

from backend.app.config import settings
from backend.app.models.schemas import (
    ProcessResumeResponse,
    InterviewTurnRequest,
    InterviewTurnResponse,
    StartInterviewRequest,
    StartInterviewResponse,
    EvaluationRequest,
    EvaluationResponse,
    RoadmapRequest,
    RoadmapResponse,
    HealthResponse,
    RegisterRequest,
    LoginRequest,
    AuthResponse,
    SaveScorecardRequest,
    ScorecardHistoryResponse,
)
from backend.app.utils.pdf_parser import extract_text_from_pdf_bytes
from backend.app.utils.s3_uploader import upload_pdf_to_s3
from backend.app.utils.dynamodb import (
    get_user_by_email,
    create_user,
    save_scorecard,
    get_scorecards,
)
from backend.app.utils.auth import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_candidate_id,
)
from backend.app.agents.resume_agent import analyze_resume
from backend.app.agents.planner_agent import generate_interview_plan
from backend.app.agents.interview_agent import get_interviewer_response
from backend.app.agents.evaluation_agent import evaluate_interview
from backend.app.agents.roadmap_agent import generate_7day_roadmap

import edge_tts
import tempfile
import os
from starlette.background import BackgroundTask
from pydantic import BaseModel

class TTSRequest(BaseModel):
    text: str
    voice: Optional[str] = "en-US-ChristopherNeural"
    rate: Optional[str] = "+0%"

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)
logger = logging.getLogger("agentverse")

# ---------------------------------------------------------------------------
# App factory
# ---------------------------------------------------------------------------
app = FastAPI(
    title="AgentVerse API",
    description=(
        "Multi-Agent Mock Interview Backend — powered by Groq LLMs & AWS S3/DynamoDB. "
        "Visit /docs for interactive Swagger UI."
    ),
    version=settings.APP_VERSION,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ===========================================================================
# Utility Routes
# ===========================================================================

@app.get("/", tags=["Meta"])
def read_root():
    return {
        "status": "online",
        "service": "AgentVerse Multi-Agent Engine",
        "version": settings.APP_VERSION,
        "docs_url": "/docs",
    }


@app.get("/api/health", response_model=HealthResponse, tags=["Meta"])
def health_check():
    """Return environment configuration status (no secrets exposed)."""
    return HealthResponse(
        status="ok",
        groq_configured=settings.groq_configured,
        aws_configured=settings.aws_configured,
        version=settings.APP_VERSION,
    )


# ===========================================================================
# Auth
# ===========================================================================

@app.post("/api/auth/register", response_model=AuthResponse, tags=["Auth"])
def register(req: RegisterRequest):
    """
    Create a new candidate account.
    Returns a JWT token and the generated candidate_id.
    """
    # Check duplicate email
    try:
        existing = get_user_by_email(req.email)
    except Exception as exc:
        logger.exception("DynamoDB error during registration: %s", exc)
        raise HTTPException(status_code=500, detail="Database error — please retry.")

    if existing:
        raise HTTPException(status_code=409, detail="An account with this email already exists.")

    candidate_id = f"cand-{uuid.uuid4().hex[:12]}"
    hashed = hash_password(req.password)

    try:
        create_user(candidate_id, req.email, hashed, req.name)
    except ValueError:
        raise HTTPException(status_code=409, detail="Account already exists.")
    except Exception as exc:
        logger.exception("create_user failed: %s", exc)
        raise HTTPException(status_code=500, detail="Could not create account.")

    token = create_access_token({"sub": candidate_id})
    logger.info("New user registered: %s (%s)", req.email, candidate_id)
    return AuthResponse(status="success", token=token, candidate_id=candidate_id, name=req.name)


@app.post("/api/auth/login", response_model=AuthResponse, tags=["Auth"])
def login(req: LoginRequest):
    """Verify credentials and return a JWT token."""
    try:
        user = get_user_by_email(req.email)
    except Exception as exc:
        logger.exception("DynamoDB error during login: %s", exc)
        raise HTTPException(status_code=500, detail="Database error — please retry.")

    if not user or not verify_password(req.password, user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    token = create_access_token({"sub": user["candidate_id"]})
    logger.info("User logged in: %s", req.email)
    return AuthResponse(
        status="success",
        token=token,
        candidate_id=user["candidate_id"],
        name=user.get("name", ""),
    )


# ===========================================================================
# Resume Processing
# ===========================================================================

@app.post("/api/process-resume", response_model=ProcessResumeResponse, tags=["Resume"])
async def process_resume(
    file: UploadFile = File(...),
    company: str = Form(...),
    role: str = Form(...),
    jd: Optional[str] = Form(""),
):
    """
    Upload a PDF resume and receive a structured resume analysis + interview plan.
    """
    try:
        pdf_bytes = await file.read()
        if not pdf_bytes:
            raise HTTPException(status_code=400, detail="Empty file uploaded.")

        s3_url = upload_pdf_to_s3(pdf_bytes, company, file.filename or "resume.pdf")
        text = extract_text_from_pdf_bytes(pdf_bytes)

        if not text.strip():
            raise HTTPException(
                status_code=422,
                detail="Could not extract text from PDF. Ensure it is not encrypted or image-only.",
            )

        resume_analysis = analyze_resume(text)
        interview_plan = generate_interview_plan(resume_analysis, company, role, jd or "")

        logger.info(
            "Resume processed: role=%s company=%s skills=%d",
            role, company, len(resume_analysis.get("technical_skills", [])),
        )

        return ProcessResumeResponse(
            status="success",
            s3_url=s3_url,
            resume_analysis=resume_analysis,
            interview_plan=interview_plan,
        )
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("process-resume failed: %s", exc)
        raise HTTPException(status_code=500, detail=str(exc))


# ===========================================================================
# Interview Session
# ===========================================================================

@app.post("/api/start-interview", response_model=StartInterviewResponse, tags=["Interview"])
async def start_interview(req: StartInterviewRequest):
    """Initialize the interview session — generates the very first question."""
    try:
        plan_items = req.interview_plan.get("plan", [])
        first_focus = plan_items[0].get("focus", req.target_role) if plan_items else req.target_role

        opening_question = "Hello! Thank you for joining me today. Could you please start by introducing yourself and giving a brief overview of your background?"

        session_context = {
            "target_role": req.target_role,
            "target_company": req.target_company,
            "resume_analysis": req.resume_analysis,
            "interview_plan": req.interview_plan,
            "current_question_index": 0,
        }

        logger.info("Interview started: role=%s company=%s", req.target_role, req.target_company)

        return StartInterviewResponse(
            status="success",
            opening_question=opening_question,
            session_context=session_context,
        )
    except Exception as exc:
        logger.exception("start-interview failed: %s", exc)
        raise HTTPException(status_code=500, detail=str(exc))


@app.post("/api/interview-turn", response_model=InterviewTurnResponse, tags=["Interview"])
async def interview_turn(req: InterviewTurnRequest):
    """Generate the next interviewer question/follow-up based on conversation history."""
    try:
        history_dicts = [{"sender": m.sender, "text": m.text} for m in req.history]
        response_text = get_interviewer_response(
            history=history_dicts,
            current_focus=req.current_focus,
            candidate_answer=req.candidate_answer or "",
            target_company=req.target_company or "",
            resume_context=req.resume_context,
            interview_plan=req.interview_plan,
        )
        return InterviewTurnResponse(status="success", interviewer_response=response_text)
    except Exception as exc:
        logger.exception("interview-turn failed: %s", exc)
        raise HTTPException(status_code=500, detail=str(exc))


# ===========================================================================
# Evaluation & Roadmap
# ===========================================================================

@app.post("/api/evaluate", response_model=EvaluationResponse, tags=["Evaluation"])
async def evaluate(req: EvaluationRequest):
    """Score the full interview transcript across 4 dimensions."""
    try:
        transcript_dicts = [{"sender": m.sender, "text": m.text} for m in req.transcript]
        evaluation_result = evaluate_interview(
            transcript_dicts, req.target_role, req.target_company or "",
        )
        logger.info(
            "Evaluation complete: role=%s overall_score=%s",
            req.target_role,
            evaluation_result.get("scores", {}).get("overall", "n/a"),
        )
        return EvaluationResponse(status="success", evaluation=evaluation_result)
    except Exception as exc:
        logger.exception("evaluate failed: %s", exc)
        raise HTTPException(status_code=500, detail=str(exc))


@app.post("/api/generate-roadmap", response_model=RoadmapResponse, tags=["Evaluation"])
async def generate_roadmap(req: RoadmapRequest):
    """Standalone 7-day study roadmap generator."""
    try:
        roadmap = generate_7day_roadmap(req.target_role, req.weaknesses)
        return RoadmapResponse(status="success", roadmap=roadmap)
    except Exception as exc:
        logger.exception("generate-roadmap failed: %s", exc)
        raise HTTPException(status_code=500, detail=str(exc))


# ===========================================================================
# Scorecards (DynamoDB persistence)
# ===========================================================================

@app.post("/api/scorecards", tags=["Scorecards"])
def store_scorecard(
    req: SaveScorecardRequest,
    candidate_id: str = Depends(get_current_candidate_id),
):
    """
    Persist a completed scorecard to DynamoDB.
    Requires a valid Bearer token — candidate_id in token must match req.candidate_id.
    """
    if req.candidate_id != candidate_id:
        raise HTTPException(status_code=403, detail="Cannot save scorecards for another candidate.")

    interview_id = req.interview_id or f"iv-{uuid.uuid4().hex[:10]}"
    try:
        save_scorecard(
            candidate_id=candidate_id,
            interview_id=interview_id,
            payload={
                "target_role": req.target_role,
                "target_company": req.target_company or "",
                "evaluation": req.evaluation,
            },
        )
        logger.info("Scorecard stored: candidate=%s interview=%s", candidate_id, interview_id)
        return {"status": "saved", "interview_id": interview_id}
    except Exception as exc:
        logger.exception("store_scorecard failed: %s", exc)
        raise HTTPException(status_code=500, detail=str(exc))


@app.get("/api/scorecards/{cid}", response_model=ScorecardHistoryResponse, tags=["Scorecards"])
def fetch_scorecards(
    cid: str,
    candidate_id: str = Depends(get_current_candidate_id),
):
    """Fetch all scorecards for the authenticated candidate."""
    if cid != candidate_id:
        raise HTTPException(status_code=403, detail="Access denied.")
    try:
        cards = get_scorecards(candidate_id)
        return ScorecardHistoryResponse(status="success", scorecards=cards)
    except Exception as exc:
        logger.exception("fetch_scorecards failed: %s", exc)
        raise HTTPException(status_code=500, detail=str(exc))


# ===========================================================================
# TTS (Edge-TTS backend)
# ===========================================================================

@app.post("/api/tts", tags=["Voice"])
async def generate_speech(req: TTSRequest):
    """
    Generate high-quality Neural TTS using the edge_tts library.
    Returns the MP3 binary stream and cleans up the temporary file automatically.
    """
    try:
        communicate = edge_tts.Communicate(req.text, req.voice, rate=req.rate)
        
        # Create temporary file
        fd, temp_path = tempfile.mkstemp(suffix=".mp3")
        os.close(fd)
        
        # Generate and save audio
        await communicate.save(temp_path)
        
        # Clean up the file automatically after transmission is complete
        return FileResponse(
            temp_path, 
            media_type="audio/mpeg", 
            background=BackgroundTask(os.remove, temp_path)
        )
    except Exception as e:
        logger.error("TTS generation failed: %s", str(e))
        raise HTTPException(status_code=500, detail="Voice generation failed.")