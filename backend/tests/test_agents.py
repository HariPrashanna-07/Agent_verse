"""
Unit tests for all 5 AgentVerse agents using mocked Groq clients.
No real API calls are made.
"""
import json
import unittest
from unittest.mock import MagicMock, patch


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_groq_response(content: str):
    """Build a mock Groq completion object that returns `content`."""
    msg = MagicMock()
    msg.content = content
    choice = MagicMock()
    choice.message = msg
    completion = MagicMock()
    completion.choices = [choice]
    return completion


# ===========================================================================
# resume_agent
# ===========================================================================
class TestResumeAgent(unittest.TestCase):
    _VALID_PAYLOAD = {
        "technical_skills": ["Python", "FastAPI"],
        "work_experience": [],
        "projects": [{"title": "AgentVerse", "tech_stack": ["FastAPI"], "summary": "AI mock interviewer"}],
        "domains": ["AI/ML"],
        "experience_level": "Junior",
    }

    @patch("backend.app.agents.resume_agent.get_groq_client")
    def test_parses_valid_json(self, mock_client):
        mock_client.return_value.chat.completions.create.return_value = _make_groq_response(
            json.dumps(self._VALID_PAYLOAD)
        )
        from backend.app.agents.resume_agent import analyze_resume
        result = analyze_resume("John Doe, Python Developer")
        self.assertEqual(result["experience_level"], "Junior")
        self.assertIn("Python", result["technical_skills"])

    @patch("backend.app.agents.resume_agent.get_groq_client")
    def test_returns_fallback_on_bad_json(self, mock_client):
        mock_client.return_value.chat.completions.create.return_value = _make_groq_response("not json")
        from backend.app.agents.resume_agent import analyze_resume
        result = analyze_resume("some text")
        self.assertEqual(result["technical_skills"], [])

    def test_returns_fallback_on_empty_text(self):
        from backend.app.agents.resume_agent import analyze_resume
        result = analyze_resume("")
        self.assertEqual(result["projects"], [])


# ===========================================================================
# planner_agent
# ===========================================================================
class TestPlannerAgent(unittest.TestCase):
    _VALID_PLAN = {
        "question_count": 5,
        "difficulty": "Hard",
        "estimated_duration_minutes": 45,
        "plan": [
            {"question_number": 1, "category": "Resume", "focus": "ML pipeline", "sample_question": "Tell me about it."},
        ],
    }

    @patch("backend.app.agents.planner_agent.get_groq_client")
    def test_parses_valid_plan(self, mock_client):
        mock_client.return_value.chat.completions.create.return_value = _make_groq_response(
            json.dumps(self._VALID_PLAN)
        )
        from backend.app.agents.planner_agent import generate_interview_plan
        result = generate_interview_plan({}, "Google", "ML Engineer")
        self.assertEqual(result["difficulty"], "Hard")
        self.assertEqual(result["question_count"], 5)
        self.assertEqual(len(result["plan"]), 1)

    @patch("backend.app.agents.planner_agent.get_groq_client")
    def test_returns_fallback_on_failure(self, mock_client):
        mock_client.return_value.chat.completions.create.side_effect = RuntimeError("timeout")
        from backend.app.agents.planner_agent import generate_interview_plan
        result = generate_interview_plan({}, "Google", "ML Engineer")
        self.assertEqual(result["plan"], [])


# ===========================================================================
# interview_agent
# ===========================================================================
class TestInterviewAgent(unittest.TestCase):
    @patch("backend.app.agents.interview_agent.get_groq_client")
    def test_returns_response_text(self, mock_client):
        mock_client.return_value.chat.completions.create.return_value = _make_groq_response(
            "Can you explain your approach to dynamic programming?"
        )
        from backend.app.agents.interview_agent import get_interviewer_response
        result = get_interviewer_response(
            history=[{"sender": "assistant", "text": "How would you reverse a string?"}],
            current_focus="Algorithms",
            candidate_answer="Using a two-pointer approach.",
        )
        self.assertIn("dynamic programming", result.lower())

    @patch("backend.app.agents.interview_agent.get_groq_client")
    def test_includes_resume_context_in_messages(self, mock_client):
        mock_client.return_value.chat.completions.create.return_value = _make_groq_response("Next question.")
        from backend.app.agents.interview_agent import get_interviewer_response
        get_interviewer_response(
            history=[],
            current_focus="Projects",
            candidate_answer="",
            resume_context={"technical_skills": ["PyTorch"], "experience_level": "Mid", "projects": []},
        )
        call_args = mock_client.return_value.chat.completions.create.call_args
        system_content = call_args[1]["messages"][0]["content"]
        self.assertIn("PyTorch", system_content)

    @patch("backend.app.agents.interview_agent.get_groq_client")
    def test_returns_fallback_on_llm_error(self, mock_client):
        mock_client.return_value.chat.completions.create.side_effect = RuntimeError("API error")
        from backend.app.agents.interview_agent import get_interviewer_response
        result = get_interviewer_response([], "Topic", "answer")
        self.assertIn("technical issue", result.lower())


# ===========================================================================
# evaluation_agent
# ===========================================================================
class TestEvaluationAgent(unittest.TestCase):
    _VALID_EVAL = {
        "scores": {"overall": 90, "technical_accuracy": 88, "communication": 92, "problem_solving": 90},
        "strengths": ["Good problem decomposition"],
        "weaknesses": ["Missed edge cases"],
        "detailed_feedback": ["Q1: Good answer."],
        "roadmap": [
            {"day": i, "topic": f"Topic {i}", "task": f"Task {i}"}
            for i in range(1, 8)
        ],
    }

    @patch("backend.app.agents.evaluation_agent.get_groq_client")
    def test_parses_valid_evaluation(self, mock_client):
        mock_client.return_value.chat.completions.create.return_value = _make_groq_response(
            json.dumps(self._VALID_EVAL)
        )
        from backend.app.agents.evaluation_agent import evaluate_interview
        result = evaluate_interview([{"sender": "user", "text": "Hello"}], "Software Engineer", "Google")
        self.assertEqual(result["scores"]["overall"], 90)
        self.assertEqual(result["strengths"], ["Good problem decomposition"])
        self.assertEqual(len(result["roadmap"]), 7)
        self.assertEqual(result["detailed_feedback"], ["Q1: Good answer."])

    @patch("backend.app.agents.evaluation_agent.get_groq_client")
    def test_fallback_on_groq_failure(self, mock_client):
        mock_client.side_effect = ValueError("missing api key")
        from backend.app.agents.evaluation_agent import evaluate_interview
        result = evaluate_interview([{"sender": "user", "text": "hi"}], "SWE")
        self.assertEqual(result["scores"]["overall"], 0)
        self.assertEqual(result["roadmap"], [])

    @patch("backend.app.agents.evaluation_agent.get_groq_client")
    def test_normalizes_camel_case_score_keys(self, mock_client):
        payload = {
            "scores": {"overall": 75, "technicalAccuracy": 80, "communication": 70, "problemSolving": 75},
            "strengths": [], "weaknesses": [], "detailed_feedback": [], "roadmap": [],
        }
        mock_client.return_value.chat.completions.create.return_value = _make_groq_response(json.dumps(payload))
        from backend.app.agents.evaluation_agent import evaluate_interview
        result = evaluate_interview([{"sender": "user", "text": "hi"}], "SWE")
        self.assertEqual(result["scores"]["technical_accuracy"], 80)
        self.assertEqual(result["scores"]["problem_solving"], 75)


# ===========================================================================
# roadmap_agent
# ===========================================================================
class TestRoadmapAgent(unittest.TestCase):
    _VALID_ROADMAP = {
        "roadmap": [
            {"day": i, "topic": f"Topic {i}", "task": f"Task {i}"}
            for i in range(1, 8)
        ]
    }

    @patch("backend.app.agents.roadmap_agent.get_groq_client")
    def test_returns_7_day_roadmap(self, mock_client):
        mock_client.return_value.chat.completions.create.return_value = _make_groq_response(
            json.dumps(self._VALID_ROADMAP)
        )
        from backend.app.agents.roadmap_agent import generate_7day_roadmap
        result = generate_7day_roadmap("ML Engineer", ["Weak on backprop", "Needs more system design"])
        self.assertEqual(len(result), 7)
        self.assertIn("day", result[0])
        self.assertIn("topic", result[0])

    def test_returns_empty_on_no_weaknesses(self):
        from backend.app.agents.roadmap_agent import generate_7day_roadmap
        result = generate_7day_roadmap("ML Engineer", [])
        self.assertEqual(result, [])

    @patch("backend.app.agents.roadmap_agent.get_groq_client")
    def test_returns_empty_on_llm_failure(self, mock_client):
        mock_client.return_value.chat.completions.create.side_effect = RuntimeError("timeout")
        from backend.app.agents.roadmap_agent import generate_7day_roadmap
        result = generate_7day_roadmap("SWE", ["weak area"])
        self.assertEqual(result, [])


if __name__ == "__main__":
    unittest.main()
