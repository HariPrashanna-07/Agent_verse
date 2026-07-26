import json
import logging
import re
from backend.app.utils.groq_client import get_groq_client

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Internal normalization helpers
# ---------------------------------------------------------------------------

def _normalize_score_keys(scores: dict) -> dict:
    """Map camelCase score keys to snake_case."""
    mapping = {
        "technicalAccuracy": "technical_accuracy",
        "problemSolving": "problem_solving",
        "overallScore": "overall",
    }
    return {mapping.get(k, k): v for k, v in scores.items()}


def _normalize_roadmap_items(roadmap) -> list:
    """Coerce any roadmap shape (list of str or dict) into canonical dicts."""
    normalized = []
    for index, item in enumerate(roadmap, start=1):
        if isinstance(item, str):
            day = index
            topic = task = item.strip()
            if ":" in item:
                prefix, remainder = item.split(":", 1)
                if prefix.strip().lower().startswith("day"):
                    m = re.search(r"\d+", prefix)
                    day = int(m.group()) if m else index
                remainder = remainder.strip()
                if " - " in remainder:
                    topic, task = [p.strip() for p in remainder.split(" - ", 1)]
                else:
                    topic = task = remainder
            normalized.append({"day": day, "topic": topic, "task": task})
        elif isinstance(item, dict):
            normalized.append({
                "day": item.get("day", index),
                "topic": item.get("topic", item.get("title", "")),
                "task": item.get("task", item.get("description", "")),
            })
    return normalized


def _normalize_payload(payload: dict) -> dict:
    """Normalise LLM output into the canonical EvaluationOutput shape."""
    # Scores
    scores = payload.get("scores", {})
    if isinstance(scores, dict):
        scores = _normalize_score_keys(scores)

    # Strengths / weaknesses — may be nested under "feedback"
    feedback = payload.get("feedback", {})
    strengths = payload.get("strengths") or feedback.get("strengths", [])
    weaknesses = payload.get("weaknesses") or feedback.get("weaknesses", [])

    # Detailed per-question feedback
    detailed_feedback = payload.get("detailed_feedback", [])

    # Roadmap — may be nested under various keys
    roadmap = payload.get("roadmap") or payload.get("learning_roadmap", [])
    if isinstance(roadmap, dict):
        roadmap = roadmap.get("7_day_plan", [])
    roadmap = _normalize_roadmap_items(roadmap)

    return {
        "scores": {
            "overall": scores.get("overall", 0),
            "technical_accuracy": scores.get("technical_accuracy", 0),
            "communication": scores.get("communication", 0),
            "problem_solving": scores.get("problem_solving", 0),
        },
        "strengths": strengths or [],
        "weaknesses": weaknesses or [],
        "detailed_feedback": detailed_feedback or [],
        "roadmap": roadmap,
    }


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def evaluate_interview(
    transcript: list,
    target_role: str,
    target_company: str = "",
) -> dict:
    """
    Score the full interview transcript across 4 dimensions and generate a
    7-day remediation roadmap.

    Returns a normalized dict ready for the EvaluationOutput Pydantic schema.
    Falls back to zero scores on any LLM or parse failure.
    """
    try:
        client = get_groq_client()

        company_line = f"Target Company: {target_company}" if target_company else ""

        prompt = f"""You are an expert technical interview evaluator.
{company_line}
Target Role: {target_role}

Carefully review every exchange in the following transcript and produce a comprehensive evaluation.

TRANSCRIPT:
{json.dumps(transcript, indent=2)}

Return ONLY a valid raw JSON object matching exactly this schema:
{{
  "scores": {{
    "overall": 85,
    "technical_accuracy": 88,
    "communication": 82,
    "problem_solving": 85
  }},
  "strengths": [
    "Specific strength demonstrated in the interview"
  ],
  "weaknesses": [
    "Specific area that needs improvement"
  ],
  "detailed_feedback": [
    "Q1: (If Software) Candidate correctly identified the O(n) time complexity but missed space complexity analysis.",
    "Q2: (If Non-Software) Strong explanation of industry safety standards and material stress testing trade-offs.",
    "Q3: Answer was too brief — could have provided a specific real-world example."
  ],
  "roadmap": [
    {{"day": 1, "topic": "Topic Name", "task": "Concrete study or practice task"}},
    {{"day": 2, "topic": "Topic Name", "task": "Concrete study or practice task"}},
    {{"day": 3, "topic": "Topic Name", "task": "Concrete study or practice task"}},
    {{"day": 4, "topic": "Topic Name", "task": "Concrete study or practice task"}},
    {{"day": 5, "topic": "Topic Name", "task": "Concrete study or practice task"}},
    {{"day": 6, "topic": "Behavioral Polish", "task": "Practice STAR-method storytelling for top 3 weaknesses"}},
    {{"day": 7, "topic": "Mock Interview", "task": "Full re-run mock interview covering all weak areas"}}
  ]
}}

Rules:
- STRICT SCORING: You must be extremely strict and critical. Do not inflate scores. A typical candidate who gives average or brief answers should score 40-60, not 80-90. Only award 90+ for truly exceptional, highly detailed answers.
- All scores must be integers between 0 and 100.
- `detailed_feedback` must have one item per interviewer question referencing the candidate's specific answer. Point out flaws, omissions, and lack of depth strictly.
- `roadmap` must have exactly 7 items (day 1–7), targeted at the identified weaknesses.
"""

        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {
                    "role": "system",
                    "content": "You are a JSON evaluation engine. Output strictly valid JSON with no markdown or prose.",
                },
                {"role": "user", "content": prompt},
            ],
            temperature=0.1,
            response_format={"type": "json_object"},
        )

        raw_output = response.choices[0].message.content
        payload = json.loads(raw_output)
        return _normalize_payload(payload)

    except json.JSONDecodeError as exc:
        logger.error("Evaluation agent JSON parse error: %s", exc)
    except Exception as exc:
        logger.error("Evaluation agent failed: %s", exc)

    # ------------------------------------------------------------------
    # Fallback response — never crash the API endpoint
    # ------------------------------------------------------------------
    return {
        "scores": {
            "overall": 0,
            "technical_accuracy": 0,
            "communication": 0,
            "problem_solving": 0,
        },
        "strengths": [],
        "weaknesses": [],
        "detailed_feedback": [],
        "roadmap": [],
    }