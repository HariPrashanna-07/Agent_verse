import json
import logging
from backend.app.utils.groq_client import get_groq_client

logger = logging.getLogger(__name__)


def generate_7day_roadmap(target_role: str, weaknesses: list) -> list:
    """
    Generate a standalone actionable 7-day study plan focused on the
    candidate's identified weaknesses for a target role.

    Returns a list of 7 dicts: {day, topic, task}.
    Falls back to an empty list on failure.
    """
    if not weaknesses:
        logger.warning("No weaknesses provided to roadmap_agent — returning empty roadmap.")
        return []

    client = get_groq_client()

    weaknesses_str = json.dumps(weaknesses, indent=2)

    prompt = f"""You are a technical career coach building a personalized 7-day study plan.

Target Role: {target_role}

The candidate struggled with the following specific areas:
{weaknesses_str}

Create a focused, day-by-day remediation plan that directly addresses each weakness.
Day 7 must always be a full mock interview / final review day.

Return ONLY a valid raw JSON object with a single key "roadmap" containing an array of 7 items:
{{
    "roadmap": [
        {{"day": 1, "topic": "Topic Name", "task": "Concrete task", "resources": ["https://url-1.com", "O'Reilly Book Title"]}},
        {{"day": 2, "topic": "Topic Name", "task": "Concrete task", "resources": ["https://url-1.com"]}},
        {{"day": 3, "topic": "Topic Name", "task": "Concrete task", "resources": []}},
        {{"day": 4, "topic": "Topic Name", "task": "Concrete task", "resources": []}},
        {{"day": 5, "topic": "Topic Name", "task": "Concrete task", "resources": []}},
        {{"day": 6, "topic": "Behavioral Polish", "task": "Practice STAR-method storytelling", "resources": []}},
        {{"day": 7, "topic": "Mock Interview", "task": "Full mock interview", "resources": []}}
    ]
}}

Rules:
- Each task must be specific and directly tied to one of the identified weaknesses.
- Prioritize the most critical weaknesses in days 1–3.
- IMPORTANT: You MUST provide at least 1-2 high-quality learning resources (official documentation, reputable tutorial links, or specific book chapters) for each day in the `resources` array.
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

        # Support both wrapped {"roadmap": [...]} and raw array responses
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