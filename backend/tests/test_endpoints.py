"""
Integration tests for all AgentVerse API endpoints using FastAPI TestClient.
All LLM and AWS calls are mocked — no real network requests are made.
"""
import json
import io
import unittest
from unittest.mock import patch, MagicMock

from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _mock_groq_text(content: str):
    msg = MagicMock()
    msg.content = content
    choice = MagicMock()
    choice.message = msg
    completion = MagicMock()
    completion.choices = [choice]
    return completion


_DUMMY_RESUME = {
    "technical_skills": ["Python", "FastAPI"],
    "work_experience": [],
    "projects": [],
    "domains": ["Backend"],
    "experience_level": "Junior",
}
_DUMMY_PLAN = {
    "question_count": 5,
    "difficulty": "Medium",
    "estimated_duration_minutes": 30,
    "plan": [
        {
            "question_number": 1,
            "category": "Resume",
            "focus": "FastAPI project",
            "sample_question": "Tell me about your FastAPI project.",
        }
    ],
}

_DUMMY_EVAL = {
    "scores": {"overall": 80, "technical_accuracy": 78, "communication": 82, "problem_solving": 80},
    "strengths": ["Clear explanations"],
    "weaknesses": ["Missed edge cases"],
    "detailed_feedback": ["Q1: Good answer overall."],
    "roadmap": [{"day": i, "topic": f"Topic {i}", "task": f"Task {i}"} for i in range(1, 8)],
}

_DUMMY_ROADMAP = {
    "roadmap": [{"day": i, "topic": f"Topic {i}", "task": f"Task {i}"} for i in range(1, 8)]
}


# ===========================================================================
# Utility Endpoints
# ===========================================================================
class TestRootAndHealth(unittest.TestCase):
    def test_root_returns_online(self):
        resp = client.get("/")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["status"], "online")

    def test_health_returns_ok(self):
        resp = client.get("/api/health")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["status"], "ok")
        self.assertIn("groq_configured", data)
        self.assertIn("aws_configured", data)
        self.assertIn("version", data)


# ===========================================================================
# Process Resume
# ===========================================================================
class TestProcessResume(unittest.TestCase):
    @patch("backend.app.main.upload_pdf_to_s3", return_value="https://s3.example.com/resume.pdf")
    @patch("backend.app.main.extract_text_from_pdf_bytes", return_value="John Doe - Python Developer")
    @patch("backend.app.main.analyze_resume", return_value=_DUMMY_RESUME)
    @patch("backend.app.main.generate_interview_plan", return_value=_DUMMY_PLAN)
    def test_success(self, mock_plan, mock_analyze, mock_extract, mock_s3):
        pdf_content = b"%PDF-1.4 fake content"
        resp = client.post(
            "/api/process-resume",
            files={"file": ("resume.pdf", io.BytesIO(pdf_content), "application/pdf")},
            data={"company": "Google", "role": "SWE", "jd": ""},
        )
        self.assertEqual(resp.status_code, 200)
        body = resp.json()
        self.assertEqual(body["status"], "success")
        self.assertIn("resume_analysis", body)
        self.assertIn("interview_plan", body)

    def test_empty_file_returns_400(self):
        resp = client.post(
            "/api/process-resume",
            files={"file": ("empty.pdf", io.BytesIO(b""), "application/pdf")},
            data={"company": "Google", "role": "SWE"},
        )
        self.assertEqual(resp.status_code, 400)

    @patch("backend.app.main.upload_pdf_to_s3", return_value="s3_upload_skipped")
    @patch("backend.app.main.extract_text_from_pdf_bytes", return_value="")
    def test_unreadable_pdf_returns_422(self, mock_extract, mock_s3):
        resp = client.post(
            "/api/process-resume",
            files={"file": ("corrupt.pdf", io.BytesIO(b"bad bytes"), "application/pdf")},
            data={"company": "Google", "role": "SWE"},
        )
        self.assertEqual(resp.status_code, 422)


# ===========================================================================
# Start Interview
# ===========================================================================
class TestStartInterview(unittest.TestCase):
    @patch("backend.app.main.get_interviewer_response", return_value="Tell me about your FastAPI project.")
    def test_returns_opening_question(self, mock_resp):
        payload = {
            "target_role": "Backend Engineer",
            "target_company": "Stripe",
            "resume_analysis": _DUMMY_RESUME,
            "interview_plan": _DUMMY_PLAN,
        }
        resp = client.post("/api/start-interview", json=payload)
        self.assertEqual(resp.status_code, 200)
        body = resp.json()
        self.assertEqual(body["status"], "success")
        self.assertIn("opening_question", body)
        self.assertIn("session_context", body)
        self.assertEqual(body["session_context"]["target_company"], "Stripe")


# ===========================================================================
# Interview Turn
# ===========================================================================
class TestInterviewTurn(unittest.TestCase):
    @patch("backend.app.main.get_interviewer_response", return_value="Can you walk me through the time complexity?")
    def test_basic_turn(self, mock_resp):
        payload = {
            "history": [{"sender": "assistant", "text": "How would you reverse a string?"}],
            "current_focus": "Algorithms",
            "candidate_answer": "Using a two-pointer approach.",
        }
        resp = client.post("/api/interview-turn", json=payload)
        self.assertEqual(resp.status_code, 200)
        body = resp.json()
        self.assertEqual(body["status"], "success")
        self.assertIn("time complexity", body["interviewer_response"].lower())

    @patch("backend.app.main.get_interviewer_response", return_value="First question.")
    def test_empty_history_allowed(self, mock_resp):
        payload = {"history": [], "current_focus": "Introduction", "candidate_answer": ""}
        resp = client.post("/api/interview-turn", json=payload)
        self.assertEqual(resp.status_code, 200)


# ===========================================================================
# Evaluate
# ===========================================================================
class TestEvaluate(unittest.TestCase):
    @patch("backend.app.main.evaluate_interview", return_value=_DUMMY_EVAL)
    def test_returns_scores_and_roadmap(self, mock_eval):
        payload = {
            "transcript": [
                {"sender": "assistant", "text": "Explain your caching strategy."},
                {"sender": "user", "text": "I used Redis with TTL-based expiry."},
            ],
            "target_role": "Backend Engineer",
            "target_company": "Meta",
        }
        resp = client.post("/api/evaluate", json=payload)
        self.assertEqual(resp.status_code, 200)
        body = resp.json()
        self.assertEqual(body["status"], "success")
        eval_obj = body["evaluation"]
        self.assertIn("scores", eval_obj)
        self.assertEqual(eval_obj["scores"]["overall"], 80)
        self.assertEqual(len(eval_obj["roadmap"]), 7)
        self.assertIn("detailed_feedback", eval_obj)

    def test_missing_target_role_returns_422(self):
        resp = client.post("/api/evaluate", json={"transcript": []})
        self.assertEqual(resp.status_code, 422)


# ===========================================================================
# Generate Roadmap
# ===========================================================================
class TestGenerateRoadmap(unittest.TestCase):
    @patch("backend.app.main.generate_7day_roadmap", return_value=_DUMMY_ROADMAP["roadmap"])
    def test_returns_7_items(self, mock_roadmap):
        payload = {
            "target_role": "ML Engineer",
            "weaknesses": ["Needs more system design", "Backpropagation gaps"],
        }
        resp = client.post("/api/generate-roadmap", json=payload)
        self.assertEqual(resp.status_code, 200)
        body = resp.json()
        self.assertEqual(body["status"], "success")
        self.assertEqual(len(body["roadmap"]), 7)

    def test_empty_weaknesses_returns_422(self):
        resp = client.post("/api/generate-roadmap", json={"target_role": "SWE", "weaknesses": []})
        self.assertEqual(resp.status_code, 422)


if __name__ == "__main__":
    unittest.main()
