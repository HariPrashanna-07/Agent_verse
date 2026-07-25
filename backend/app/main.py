import os
import boto3
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from dotenv import load_dotenv

from utils.pdf_parser import extract_text_from_pdf_bytes
from agents.resume_agent import analyze_resume
from agents.planner_agent import generate_interview_plan
from agents.interview_agent import get_interviewer_response
from agents.evaluation_agent import evaluate_interview_session

load_dotenv()

app = FastAPI(title="AgentVerse - AI Multi-Agent Mock Interviewer API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize AWS S3 Client
s3_client = boto3.client(
    "s3",
    aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
    aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
    region_name=os.getenv("AWS_REGION", "us-east-1")
)
BUCKET_NAME = os.getenv("AWS_S3_BUCKET_NAME", "agentverse-interview-data")


class InterviewTurnRequest(BaseModel):
    history: List[dict]
    current_focus: str
    candidate_answer: Optional[str] = ""


class EvaluationRequest(BaseModel):
    transcript: List[dict]
    target_role: str


import io


@app.post("/api/process-resume")
async def process_resume(
        file: UploadFile = File(...),
        company: str = Form(...),
        role: str = Form(...),
        jd: Optional[str] = Form("")
):
    try:
        pdf_bytes = await file.read()

        # 1. Upload raw PDF bytes to AWS S3 using BytesIO
        s3_key = f"resumes/{company}/{file.filename}"
        s3_client.upload_fileobj(
            io.BytesIO(pdf_bytes),
            BUCKET_NAME,
            s3_key
        )
        s3_url = f"https://{BUCKET_NAME}.s3.amazonaws.com/{s3_key}"
    except Exception as e:
        print(f"AWS Upload Warning: {e}")
        s3_url = "s3_upload_skipped_or_pending"

    # 2. Extract Text & Run Multi-Agent Processing
    text = extract_text_from_pdf_bytes(pdf_bytes)
    resume_analysis = analyze_resume(text)
    interview_plan = generate_interview_plan(resume_analysis, company, role, jd)

    return {
        "status": "success",
        "s3_url": s3_url,
        "resume_analysis": resume_analysis,
        "interview_plan": interview_plan
    }

class FileChunk:
    """Helper wrapper to enable byte uploading with boto3."""

    def __init__(self, bytes_data):
        self.bytes_data = bytes_data

    def read(self, n=-1):
        return self.bytes_data


@app.post("/api/interview-turn")
async def interview_turn(req: InterviewTurnRequest):
    """Generates the next question or response in the interview turn."""
    response_text = get_interviewer_response(
        history=req.history,
        current_focus=req.current_focus,
        candidate_answer=req.candidate_answer
    )
    return {"status": "success", "interviewer_response": response_text}


@app.post("/api/evaluate")
async def evaluate(req: EvaluationRequest):
    """Evaluates the full interview transcript and returns scores + 7-day roadmap."""
    evaluation_result = evaluate_interview_session(req.transcript, req.target_role)
    return {"status": "success", "evaluation": evaluation_result}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)