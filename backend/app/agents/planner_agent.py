import json
import logging
from backend.app.utils.groq_client import get_groq_client

logger = logging.getLogger(__name__)

_FALLBACK_PLAN = {
    "plan": [],
    "question_count": 5,
    "difficulty": "Medium",
    "estimated_duration_minutes": 30,
}


def generate_interview_plan(
    resume_data: dict,
    target_company: str,
    target_role: str,
    jd_text: str = "",
) -> dict:
    """
    Build a strategic 5-question interview plan tailored to the candidate, company, and role.

    Returns a plan dict with question breakdown, difficulty, and estimated duration.
    """
    client = get_groq_client()

    jd_section = f"Job Description:\n{jd_text}" if jd_text.strip() else "No JD provided."
    skills_str = ", ".join(resume_data.get("technical_skills", [])) or "Not specified"
    projects_str = json.dumps(resume_data.get("projects", []), indent=2) or "[]"
    exp_level = resume_data.get("experience_level", "Fresher")

    prompt = f"""You are a senior technical recruiter at {target_company}.
Design a focused 5-question interview plan for a {exp_level}-level candidate applying for: {target_role}.

Candidate Profile:
- Skills: {skills_str}
- Experience Level: {exp_level}
- Projects: {projects_str}

{jd_section}

Question Allocation Strategy (5 questions total):
- Q1: Introduction & Background — asking the candidate to introduce themselves and broadly review their experience.
- Q2: Core Fundamentals — ask a fundamental, foundational conceptual question based on the core domain of {target_role} to test their basic understanding.
- Q3: Resume Deep Dive — probe specific projects, industry experience, or tool choices.
- Q4: Advanced Domain Technical — deeply technical/advanced questions relevant to {target_role}. (e.g. system design for software, or complex scenario/standard methodologies for non-software).
- Q5: Behavioral — culture fit and situational judgment for {target_company}

Return ONLY a valid raw JSON object matching exactly this schema:
{{
    "question_count": 5,
    "difficulty": "Medium",
    "estimated_duration_minutes": 30,
    "plan": [
        {{
            "question_number": 1,
            "category": "Resume",
            "focus": "Specific topic or project to probe",
            "sample_question": "Example opening question"
        }},
        {{
            "question_number": 2,
            "category": "Resume",
            "focus": "Specific topic or project to probe",
            "sample_question": "Example opening question"
        }},
        {{
            "question_number": 3,
            "category": "Technical",
            "focus": "Algorithm / System Design topic",
            "sample_question": "Example opening question"
        }},
        {{
            "question_number": 4,
            "category": "Technical",
            "focus": "Algorithm / System Design topic",
            "sample_question": "Example opening question"
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
- Tailor every sample_question to be specific to {target_company} and {target_role}
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
            "plan": parsed.get("plan", []),
            "question_count": parsed.get("question_count", 5),
            "difficulty": parsed.get("difficulty", "Medium"),
            "estimated_duration_minutes": parsed.get("estimated_duration_minutes", 30),
        }

    except json.JSONDecodeError as exc:
        logger.error("Planner agent JSON parse error: %s", exc)
        return _FALLBACK_PLAN.copy()
    except Exception as exc:
        logger.error("Planner agent failed: %s", exc)
        return _FALLBACK_PLAN.copy()