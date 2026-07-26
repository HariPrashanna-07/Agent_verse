"""
Updated evaluation agent tests — aligned to the fixed evaluate_interview signature
which now accepts target_company as a third argument and returns detailed_feedback.
"""
import json
import unittest
from unittest.mock import MagicMock, patch


def _make_groq_response(content: str):
    msg = MagicMock()
    msg.content = content
    choice = MagicMock()
    choice.message = msg
    completion = MagicMock()
    completion.choices = [choice]
    return completion


class EvaluationAgentTests(unittest.TestCase):

    def test_returns_fallback_payload_when_groq_unavailable(self):
        """Fallback zeros when get_groq_client raises on missing API key."""
        with patch(
            "backend.app.agents.evaluation_agent.get_groq_client",
            side_effect=ValueError("missing api key"),
        ):
            from backend.app.agents.evaluation_agent import evaluate_interview
            result = evaluate_interview(
                [{"sender": "user", "text": "hello"}],
                "Software Engineer",
                "Google",
            )

        self.assertEqual(result["scores"]["overall"], 0)
        self.assertEqual(result["strengths"], [])
        self.assertEqual(result["weaknesses"], [])
        self.assertEqual(result["roadmap"], [])
        self.assertEqual(result["detailed_feedback"], [])

    def test_normalizes_camel_case_score_keys(self):
        """technicalAccuracy → technical_accuracy, problemSolving → problem_solving."""
        payload = {
            "scores": {
                "overall": 75,
                "technicalAccuracy": 80,
                "communication": 70,
                "problemSolving": 75,
            },
            "strengths": ["Clear explanation"],
            "weaknesses": ["Needs more depth"],
            "detailed_feedback": [],
            "roadmap": [],
        }
        with patch("backend.app.agents.evaluation_agent.get_groq_client") as mock_client:
            mock_client.return_value.chat.completions.create.return_value = _make_groq_response(
                json.dumps(payload)
            )
            from backend.app.agents.evaluation_agent import evaluate_interview
            result = evaluate_interview(
                [{"sender": "user", "text": "hello"}], "Software Engineer"
            )

        self.assertEqual(result["scores"]["technical_accuracy"], 80)
        self.assertEqual(result["scores"]["problem_solving"], 75)

    def test_normalizes_nested_feedback_and_roadmap(self):
        """strengths/weaknesses nested under 'feedback', roadmap as list of strings."""
        payload = {
            "scores": {
                "overall": 85,
                "technical_accuracy": 80,
                "communication": 85,
                "problem_solving": 90,
            },
            "feedback": {
                "strengths": ["Clear explanation"],
                "weaknesses": ["Needs more details"],
            },
            "detailed_feedback": ["Q1: Good answer."],
            "roadmap": ["Day 1: Study basics - Read chapter 3", "Day 2: Practice - Solve 5 LeetCode problems"],
        }

        with patch("backend.app.agents.evaluation_agent.get_groq_client") as mock_client:
            mock_client.return_value.chat.completions.create.return_value = _make_groq_response(
                json.dumps(payload)
            )
            from backend.app.agents.evaluation_agent import evaluate_interview
            result = evaluate_interview(
                [{"sender": "user", "text": "hello"}], "Software Engineer"
            )

        self.assertEqual(result["scores"]["overall"], 85)
        self.assertEqual(result["strengths"], ["Clear explanation"])
        self.assertEqual(result["weaknesses"], ["Needs more details"])
        self.assertEqual(len(result["roadmap"]), 2)
        self.assertEqual(result["detailed_feedback"], ["Q1: Good answer."])

    def test_accepts_target_company_param(self):
        """evaluate_interview must accept & use target_company without error."""
        payload = {
            "scores": {"overall": 70, "technical_accuracy": 65, "communication": 75, "problem_solving": 70},
            "strengths": [],
            "weaknesses": [],
            "detailed_feedback": [],
            "roadmap": [],
        }
        with patch("backend.app.agents.evaluation_agent.get_groq_client") as mock_client:
            mock_client.return_value.chat.completions.create.return_value = _make_groq_response(
                json.dumps(payload)
            )
            from backend.app.agents.evaluation_agent import evaluate_interview
            result = evaluate_interview(
                [{"sender": "user", "text": "hi"}], "Backend Engineer", "Amazon"
            )
        self.assertEqual(result["scores"]["overall"], 70)


if __name__ == "__main__":
    unittest.main()
