import json
import logging
from backend.app.utils.groq_client import get_groq_client

logger = logging.getLogger(__name__)

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


def generate_7day_roadmap(target_role: str, weaknesses: list) -> list:
    """
    Generate a standalone actionable 7-day study plan focused on the
    candidate's identified weaknesses for a target role.

    Returns a list of 7 dicts: {day, topic, task, resources}.
    Falls back to an empty list on failure.
    """
    if not weaknesses:
        logger.warning("No weaknesses provided to roadmap_agent — returning empty roadmap.")
        return []

    client = get_groq_client()
    role_type = _detect_role_type(target_role)
    weaknesses_str = json.dumps(weaknesses, indent=2)

    if role_type == "software":
        resource_guidance = (
            "Resources should be role-appropriate for a software engineer:\n"
            "- LeetCode problems (link to specific problem or tag page)\n"
            "- System design references (e.g., 'Designing Data-Intensive Applications' by Kleppmann)\n"
            "- Official documentation (MDN, Python docs, AWS docs, etc.)\n"
            "- High-quality tutorial links (e.g., CS50, MIT OpenCourseWare, neetcode.io)"
        )
        day7_task = "Full mock coding interview: pick 2 LeetCode hard problems + 1 system design question and time yourself"
    else:
        resource_guidance = (
            f"Resources should be role-appropriate for a {target_role}:\n"
            "- Industry standards documents (e.g., ASME, ISO, IEEE, GAAP, CFA Institute materials)\n"
            "- Domain textbooks (e.g., 'Fundamentals of Engineering' for mechanical, 'Principles of Corporate Finance' for finance)\n"
            "- Professional certification prep materials (PE exam, CFA, CPA, PMP, etc.)\n"
            "- Reputable domain-specific tutorial or simulator links"
        )
        day7_task = f"Full mock domain interview: answer practice questions across all weak areas, time yourself, then review against standards"

    prompt = f"""You are a technical career coach building a personalized 7-day study plan.

Target Role: {target_role}
Role Type: {role_type}

The candidate struggled with the following specific areas:
{weaknesses_str}

Create a focused, day-by-day remediation plan that directly addresses each weakness.
Prioritise the most critical weaknesses in days 1–3.
Day 6 is always behavioral/soft-skills polish using the STAR method.
Day 7 is always a full mock interview/review day.

{resource_guidance}

Return ONLY a valid raw JSON object with a single key "roadmap" containing an array of exactly 7 items:
{{
    "roadmap": [
        {{"day": 1, "topic": "Topic Name", "task": "Concrete task tied to a weakness", "resources": ["https://url-1.com", "Book or resource title"]}},
        {{"day": 2, "topic": "Topic Name", "task": "Concrete task tied to a weakness", "resources": ["https://url-1.com"]}},
        {{"day": 3, "topic": "Topic Name", "task": "Concrete task tied to a weakness", "resources": []}},
        {{"day": 4, "topic": "Topic Name", "task": "Concrete task tied to a weakness", "resources": []}},
        {{"day": 5, "topic": "Topic Name", "task": "Concrete task tied to a weakness", "resources": []}},
        {{"day": 6, "topic": "Behavioral Polish", "task": "Write out STAR-method stories for your top 3 weaknesses and practice saying them aloud", "resources": []}},
        {{"day": 7, "topic": "Mock Interview", "task": "{day7_task}", "resources": []}}
    ]
}}

Rules:
- Each task in days 1–5 must directly address one of the identified weaknesses — be specific.
- IMPORTANT: Provide at least 1–2 high-quality, role-appropriate learning resources for each of the first 5 days.
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

        roadmap = parsed.get("roadmap", parsed) if isinstance(parsed, dict) else parsed
        if not isinstance(roadmap, list):
            logger.error("Roadmap agent returned unexpected shape: %s", type(roadmap))
            return []

        return [
            {
                "day": item.get("day", idx + 1),
                "topic": item.get("topic", ""),
                "task": item.get("task", ""),
                "resources": item.get("resources", []),
            }
            for idx, item in enumerate(roadmap)
        ]

    except json.JSONDecodeError as exc:
        logger.error("Roadmap agent JSON parse error: %s", exc)
        return []
    except Exception as exc:
        logger.error("Roadmap agent failed: %s", exc)
        return []