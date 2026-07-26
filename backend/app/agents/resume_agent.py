import json
import logging
from backend.app.utils.groq_client import get_groq_client

logger = logging.getLogger(__name__)

_FALLBACK = {
    "is_resume": False,
    "technical_skills": [],
    "work_experience": [],
    "projects": [],
    "domains": [],
    "experience_level": "Unknown",
}


# ---------------------------------------------------------------------------
# Internal helper — classify document before full parsing
# ---------------------------------------------------------------------------

def _is_resume(text: str) -> bool:
    """
    Quick LLM classification: does this document look like a professional resume?
    Uses the fast 8b model for low latency. Returns True if it is a resume.
    """
    client = get_groq_client()
    try:
        resp = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are a document classifier. "
                        "Reply with exactly one word: 'yes' if the document is a professional resume or CV, "
                        "or 'no' if it is anything else (article, report, random text, letter, invoice, etc.). "
                        "No other words, no punctuation."
                    ),
                },
                {
                    "role": "user",
                    "content": f"Document (first 1500 chars):\n{text[:1500]}",
                },
            ],
            temperature=0.0,
            max_tokens=3,
        )
        answer = resp.choices[0].message.content.strip().lower()
        return answer.startswith("yes")
    except Exception as exc:
        logger.warning("Resume classification failed (defaulting to yes): %s", exc)
        # Fail open so a real resume is never rejected due to a transient API error
        return True


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def analyze_resume(resume_text: str) -> dict:
    """
    Parse raw resume text into a structured JSON profile.

    First classifies the document to confirm it is actually a resume.
    Returns fields: is_resume, technical_skills, work_experience, projects,
                    domains, experience_level.
    Falls back to empty defaults on any LLM or parse failure.
    """
    if not resume_text.strip():
        logger.warning("Empty resume text provided to resume_agent.")
        return _FALLBACK.copy()

    # ── Step 1: gate on document type ────────────────────────────────────────
    if not _is_resume(resume_text):
        logger.info("Uploaded document classified as non-resume.")
        return {**_FALLBACK.copy(), "is_resume": False}

    # ── Step 2: full structured extraction ───────────────────────────────────
    client = get_groq_client()

    prompt = f"""You are an expert technical resume parser.
Extract and structure the following resume into a precise JSON profile.

RESUME TEXT:
{resume_text}

Return ONLY a valid raw JSON object matching exactly this schema:
{{
    "technical_skills": ["Python", "FastAPI", "React"],
    "work_experience": [
        {{
            "company": "Company Name",
            "role": "Job Title",
            "duration": "Jan 2023 – Present",
            "highlights": ["Key achievement or responsibility"]
        }}
    ],
    "projects": [
        {{
            "title": "Project Name",
            "tech_stack": ["Tech1", "Tech2"],
            "summary": "One-line description of the project and its impact"
        }}
    ],
    "domains": ["Web Development", "AI/ML"],
    "experience_level": "Fresher"
}}

Rules:
- experience_level must be one of: Fresher, Junior, Mid, Senior
- If work_experience is absent, set it to []
- Escape all special characters properly in JSON strings
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
            temperature=0.1,
            response_format={"type": "json_object"},
        )

        raw = response.choices[0].message.content.strip()
        parsed = json.loads(raw)

        return {
            "is_resume": True,
            "technical_skills": parsed.get("technical_skills", []),
            "work_experience": parsed.get("work_experience", []),
            "projects": parsed.get("projects", []),
            "domains": parsed.get("domains", []),
            "experience_level": parsed.get("experience_level", "Fresher"),
        }

    except json.JSONDecodeError as exc:
        logger.error("Resume agent JSON parse error: %s", exc)
        return {**_FALLBACK.copy(), "is_resume": True}   # parsing failed but doc IS resume
    except Exception as exc:
        logger.error("Resume agent failed: %s", exc)
        return {**_FALLBACK.copy(), "is_resume": True}