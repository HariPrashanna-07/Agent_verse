import json
import logging
import re
from backend.app.utils.groq_client import get_groq_client

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Role-type helper
# ---------------------------------------------------------------------------

_SOFTWARE_KEYWORDS = {
    "software", "swe", "backend", "front end", "frontend", "full stack", "fullstack",
    "web", "mobile", "android", "ios", "cloud", "devops", "sre", "platform",
    "data engineer", "data scientist", "data science", "machine learning", "ml engineer",
    "ai engineer", "deep learning", "nlp", "computer vision", "site reliability",
    "firmware", "embedded", "game", "security engineer", "cybersecurity",
    "blockchain", "database", "dba", "qa engineer", "test engineer",
}


def _detect_role_type(target_role: str) -> str:
    role_lower = target_role.lower()
    for kw in _SOFTWARE_KEYWORDS:
        if kw in role_lower:
            return "software"
    return "core"


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
    scores = payload.get("scores", {})
    if isinstance(scores, dict):
        scores = _normalize_score_keys(scores)

    feedback = payload.get("feedback", {})
    strengths = payload.get("strengths") or feedback.get("strengths", [])
    weaknesses = payload.get("weaknesses") or feedback.get("weaknesses", [])
    detailed_feedback = payload.get("detailed_feedback", [])

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
        role_type = _detect_role_type(target_role)

        company_line = f"Target Company: {target_company}" if target_company else ""

        if role_type == "software":
            role_type_guidance = (
                "ROLE TYPE: SOFTWARE ENGINEERING\n"
                "Evaluate the candidate on:\n"
                "- Correctness and efficiency of their code/algorithm solutions\n"
                "- Time and space complexity analysis — did they proactively discuss it?\n"
                "- System design thinking: component breakdown, scalability, trade-offs\n"
                "- Understanding of CS fundamentals: data structures, OOP, concurrency\n"
                "- Code quality: edge cases, clean logic, optimal approach\n"
                "Penalise heavily if the candidate:\n"
                "  - Gave a brute-force solution without discussing optimisation\n"
                "  - Could not explain the complexity of their solution\n"
                "  - Made logical errors in their code or algorithm\n"
                "  - Could not describe system components or API design adequately"
            )
        else:
            role_type_guidance = (
                f"ROLE TYPE: CORE / NON-SOFTWARE — {target_role}\n"
                "Evaluate the candidate on:\n"
                "- Depth of domain knowledge: relevant theories, standards, methodologies\n"
                "- Real-world applicability: did they tie concepts to practical scenarios?\n"
                "- Accuracy of technical details: material properties, financial formulas, regulations, etc.\n"
                "- Problem-solving approach: systematic reasoning, constraint handling, safety/compliance awareness\n"
                "- Communication of complex concepts clearly and professionally\n"
                "Penalise heavily if the candidate:\n"
                "  - Gave vague or textbook-only answers without real-world grounding\n"
                "  - Missed key domain standards or regulatory requirements\n"
                "  - Could not reason through a scenario or trade-off\n"
                "  - Lacked specificity in technical details"
            )

        prompt = f"""You are an expert interview evaluator.
{company_line}
Target Role: {target_role}

{role_type_guidance}

Carefully review every exchange in the following transcript and produce a comprehensive, constructively critical evaluation.

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
    "Q1: Candidate correctly identified the problem but missed discussing edge cases.",
    "Q2: Strong explanation with real-world grounding and specific examples.",
    "Q3: Answer was too brief — could have provided more depth on trade-offs."
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
- INCOMPLETE INTERVIEWS: If the transcript is extremely short (e.g., fewer than 2 back-and-forth exchanges or the candidate just introduced themselves and exited), DO NOT penalise them harshly for missing technical content. Instead, set all scores to 0, and in the `strengths`, `weaknesses`, and `detailed_feedback`, politely mention that the interview was too short to evaluate their skills fully. Provide a generic, easy `roadmap` aimed at starting interview prep.
- STRICT SCORING: For complete interviews, be strictly objective and constructive. Do not inflate scores.
  - 0–40: Very poor — fundamental gaps, could not answer basic questions
  - 40–60: Below average — significant weaknesses, superficial answers
  - 60–75: Average — adequate but lacks depth, missed key points
  - 75–85: Good — solid answers with most key points covered
  - 85–95: Excellent — deep, well-reasoned answers with strong domain/technical mastery
  - 95–100: Exceptional — near-perfect, every answer was insightful and complete
- All scores must be integers between 0 and 100.
- `detailed_feedback` must have one item per interviewer question referencing the candidate's specific answer.
  Point out flaws, omissions, and lack of depth objectively.
- `roadmap` must have exactly 7 items (day 1–7), targeted squarely at the identified weaknesses.
- Roadmap tasks for software roles should reference LeetCode, system design resources, etc.
- Roadmap tasks for core roles should reference domain standards, textbooks, or professional certifications.
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