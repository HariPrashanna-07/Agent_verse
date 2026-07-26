import json
import logging
from backend.app.utils.groq_client import get_groq_client

logger = logging.getLogger(__name__)


def get_interviewer_response(
    history: list,
    current_focus: str,
    candidate_answer: str,
    resume_context: dict | None = None,
    interview_plan: dict | None = None,
) -> str:
    """
    Generate the next interviewer turn using conversation history and optional
    resume/plan context for highly targeted, candidate-specific questions.

    Uses llama-3.1-8b-instant for sub-second latency.
    """
    client = get_groq_client()

    # Build rich system prompt with optional context injection
    context_block = ""
    if resume_context:
        skills = ", ".join(resume_context.get("technical_skills", []))
        exp_level = resume_context.get("experience_level", "")
        projects = json.dumps(resume_context.get("projects", []), indent=2)
        context_block += (
            f"\n\nCANDIDATE PROFILE:\n"
            f"- Experience Level: {exp_level}\n"
            f"- Skills: {skills}\n"
            f"- Projects:\n{projects}"
        )

    if interview_plan:
        plan_items = interview_plan.get("plan", [])
        plan_summary = "\n".join(
            f"  Q{item.get('question_number', '?')}: [{item.get('category', '')}] "
            f"{item.get('focus', '')}"
            for item in plan_items
        )
        context_block += (
            f"\n\nINTERVIEW PLAN (follow this question order):\n{plan_summary}\n"
            f"Difficulty: {interview_plan.get('difficulty', 'Medium')}"
        )

    system_prompt = (
        "You are an expert technical interviewer at a top tech company. "
        "Conduct a natural, rigorous, and human-sounding interview. "
        "Ask exactly ONE focused question per turn. "
        "Base your next question on the candidate's latest answer if relevant. "
        "Probe for depth: For software roles, ask for time complexity or trade-offs. "
        "For core engineering or non-software roles (e.g. Mechanical, Electrical, Finance, Data), "
        "probe deeply into domain-specific methodologies, strict standards, safety/compliance, or real-world practical scenarios. "
        "Do NOT output evaluation scores or internal notes — speak directly and naturally to the candidate. "
        "If the candidate asks you to repeat a question, rephrase it clearly. "
        "If your question requires the candidate to write code, algorithms, or snippets, you MUST include the exact tag [REQUIRES_CODE] at the very end of your response. "
        "Always align your question with the [Current Focus] specified by the system."
        + context_block
    )

    # Build message chain
    formatted_messages = [{"role": "system", "content": system_prompt}]

    for item in history:
        if isinstance(item, dict):
            content = item.get("text") or item.get("content") or ""
            raw_role = item.get("sender") or item.get("role") or "user"
            role = "assistant" if raw_role in ("assistant", "interviewer") else "user"
            if content:
                formatted_messages.append({"role": role, "content": content})

    # Append current candidate answer with focus context
    formatted_messages.append({
        "role": "user",
        "content": (
            f"[Current Focus: {current_focus}]\n"
            f"Candidate: {candidate_answer}"
        ),
    })

    try:
        response = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=formatted_messages,
            temperature=0.7,
            max_tokens=512,
        )
        return response.choices[0].message.content.strip()

    except Exception as exc:
        logger.error("Interview agent failed: %s", exc)
        return "I apologize, I'm having a technical issue. Could you please repeat your answer?"