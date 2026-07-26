import json
import logging
from backend.app.utils.groq_client import get_groq_client

logger = logging.getLogger(__name__)

_FALLBACK_PLAN = {
    "role_type": "software",
    "plan": [],
    "question_count": 5,
    "difficulty": "Medium",
    "estimated_duration_minutes": 30,
}

# ---------------------------------------------------------------------------
# Role-type detection
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
    """Return 'software' or 'core' based on the target role string."""
    role_lower = target_role.lower()
    for kw in _SOFTWARE_KEYWORDS:
        if kw in role_lower:
            return "software"
    return "core"


def _company_difficulty_hint(target_company: str) -> str:
    """Return a difficulty hint sentence based on company tier."""
    tier1 = {
        "google", "meta", "facebook", "amazon", "apple", "microsoft", "netflix",
        "openai", "deepmind", "stripe", "airbnb", "uber", "lyft", "twitter",
        "linkedin", "salesforce", "nvidia", "bytedance", "tiktok", "snap",
        "palantir", "databricks", "confluent", "figma", "notion",
    }
    company_lower = target_company.lower()
    if any(t in company_lower for t in tier1):
        return (
            f"{target_company} is a Tier-1 / FAANG-level company. "
            "Set difficulty to 'Hard'. Questions must be extremely rigorous: "
            "multi-step DSA, complex system design at scale, or deep domain mastery."
        )
    return (
        f"Set difficulty to 'Medium'. Questions should be solid and practical "
        f"but not as extreme as FAANG-level interviews."
    )


def generate_interview_plan(
    resume_data: dict,
    target_company: str,
    target_role: str,
    jd_text: str = "",
) -> dict:
    """
    Build a strategic 5-question interview plan tailored to the candidate,
    company, and role type (software vs core).

    Returns a plan dict with question breakdown, difficulty, and estimated duration.
    """
    client = get_groq_client()

    role_type = _detect_role_type(target_role)
    jd_section = f"Job Description:\n{jd_text}" if jd_text.strip() else "No JD provided."
    skills_str = ", ".join(resume_data.get("technical_skills", [])) or "Not specified"
    projects_str = json.dumps(resume_data.get("projects", []), indent=2) or "[]"
    exp_level = resume_data.get("experience_level", "Fresher")
    difficulty_hint = _company_difficulty_hint(target_company)

    if role_type == "software":
        strategy = f"""Question Allocation Strategy — SOFTWARE ENGINEERING ROLE (5 questions total):
- Q1 [Introduction]: Ask the candidate to introduce themselves and summarise their engineering background.
- Q2 [CS/Programming Fundamentals]: Ask a focused conceptual question (e.g., OOP principles, data structures, recursion, memory management, concurrency, or language-specific internals) relevant to {target_role}.
- Q3 [DSA Coding Problem]: Pose a hands-on coding problem (arrays, strings, trees, graphs, DP, sorting, etc.) appropriate to the difficulty level. Candidate MUST write code.
- Q4 [System Design / Architecture]: Ask a system design or architecture question (e.g., design a URL shortener, design a rate limiter, scalability trade-offs) relevant to {target_role}.
- Q5 [Behavioral]: Culture-fit and situational judgment question for {target_company}."""
    else:
        strategy = f"""Question Allocation Strategy — CORE / NON-SOFTWARE ROLE (5 questions total):
- Q1 [Introduction]: Ask the candidate to introduce themselves and summarise their domain experience.
- Q2 [Domain Fundamentals]: Ask a foundational conceptual question testing core domain knowledge of {target_role} (e.g., thermodynamics for mechanical, circuit theory for electrical, financial modelling for finance, etc.).
- Q3 [Real-World Scenario / Case Study]: Present a practical, real-world scenario or problem in the domain of {target_role}. Ask how the candidate would approach and solve it.
- Q4 [Advanced Domain Technical]: Ask an advanced technical question about tools, standards, regulations, methodologies, or best practices specific to {target_role} and the industry context of {target_company}.
- Q5 [Behavioral]: Culture-fit and situational judgment question for {target_company}."""

    prompt = f"""You are a senior recruiter at {target_company}.
Design a focused 5-question interview plan for a {exp_level}-level candidate applying for: {target_role}.

Candidate Profile:
- Skills: {skills_str}
- Experience Level: {exp_level}
- Projects: {projects_str}

{jd_section}

DIFFICULTY GUIDANCE: {difficulty_hint}

{strategy}

Return ONLY a valid raw JSON object matching exactly this schema:
{{
    "question_count": 5,
    "difficulty": "Medium",
    "estimated_duration_minutes": 30,
    "role_type": "{role_type}",
    "plan": [
        {{
            "question_number": 1,
            "category": "Introduction",
            "focus": "Candidate background & experience overview",
            "sample_question": "Could you walk me through your background and what led you to apply for this role?"
        }},
        {{
            "question_number": 2,
            "category": "Fundamentals",
            "focus": "Core technical or domain concept",
            "sample_question": "Example question text"
        }},
        {{
            "question_number": 3,
            "category": "{'DSA / Coding' if role_type == 'software' else 'Scenario / Case Study'}",
            "focus": "{'Specific algorithm or data structure' if role_type == 'software' else 'Real-world domain problem'}",
            "sample_question": "Example question text"
        }},
        {{
            "question_number": 4,
            "category": "{'System Design' if role_type == 'software' else 'Advanced Domain'}",
            "focus": "{'Architecture or scalability' if role_type == 'software' else 'Standards, methodologies, or advanced technique'}",
            "sample_question": "Example question text"
        }},
        {{
            "question_number": 5,
            "category": "Behavioral",
            "focus": "Culture and situational judgment",
            "sample_question": "Example opening question"
        }}
    ]
}}

Rules:
- difficulty must be one of: Easy, Medium, Hard
- estimated_duration_minutes must be a number (e.g., 30)
- Tailor EVERY sample_question to be specific to {target_company} and {target_role}
- {difficulty_hint}
"""

    try:
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {
                    "role": "system",
                    "content": "You output strictly valid JSON. No markdown, no backticks, no prose.",
                },
                {"role": "user", "content": prompt},
            ],
            temperature=0.3,
            response_format={"type": "json_object"},
        )

        raw = response.choices[0].message.content.strip()
        parsed = json.loads(raw)

        return {
            "role_type": parsed.get("role_type", role_type),
            "plan": parsed.get("plan", []),
            "question_count": parsed.get("question_count", 5),
            "difficulty": parsed.get("difficulty", "Medium"),
            "estimated_duration_minutes": parsed.get("estimated_duration_minutes", 30),
        }

    except json.JSONDecodeError as exc:
        logger.error("Planner agent JSON parse error: %s", exc)
        return {**_FALLBACK_PLAN.copy(), "role_type": role_type}
    except Exception as exc:
        logger.error("Planner agent failed: %s", exc)
        return {**_FALLBACK_PLAN.copy(), "role_type": role_type}