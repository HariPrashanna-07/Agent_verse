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

_TIER1_COMPANIES = {
    "google", "meta", "facebook", "amazon", "apple", "microsoft", "netflix",
    "openai", "deepmind", "stripe", "airbnb", "uber", "lyft", "twitter",
    "linkedin", "salesforce", "nvidia", "bytedance", "tiktok", "snap",
    "palantir", "databricks", "confluent", "figma", "notion",
}


def _detect_role_type(target_role: str) -> str:
    role_lower = target_role.lower()
    for kw in _SOFTWARE_KEYWORDS:
        if kw in role_lower:
            return "software"
    return "core"


def _company_tier(target_company: str) -> str:
    if any(t in target_company.lower() for t in _TIER1_COMPANIES):
        return "tier1"
    return "standard"


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def get_interviewer_response(
    history: list,
    current_focus: str,
    candidate_answer: str,
    target_company: str = "",
    target_role: str = "",
    resume_context: dict | None = None,
    interview_plan: dict | None = None,
) -> str:
    """
    Generate the next interviewer question using conversation history and
    rich role-type / company-difficulty context.

    Uses meta-llama/llama-4-scout-17b-16e-instruct:
    - Superior multi-turn instruction following for real-time interview turns
    - Better at maintaining persona and question ordering than 8B models
    - Still fast enough for sub-second live interview responses
    """
    client = get_groq_client()

    role_type = _detect_role_type(target_role or current_focus)
    tier = _company_tier(target_company)

    # ── Difficulty calibration block ─────────────────────────────────────────
    if tier == "tier1":
        difficulty_block = (
            f"{target_company} is a FAANG / Tier-1 company. "
            "All questions must be VERY HARD and technically rigorous. "
            "For software roles: only use multi-step DSA (graph traversal, DP, segment trees, etc.), "
            "distributed systems design, or deep concurrency/OS questions. "
            "For core roles: probe deep domain expertise, complex failure analyses, "
            "advanced materials science, regulatory compliance edge cases, or multi-system integration scenarios."
        )
    else:
        difficulty_block = (
            f"{target_company} is a mid-tier / standard company. "
            "Questions should be solid and practical at Medium difficulty. "
            "For software roles: use clear, well-scoped DSA problems or practical system design. "
            "For core roles: use applied domain scenarios and best-practice methodology questions."
        )

    # ── Role-type behavioural instructions ────────────────────────────────────
    if role_type == "software":
        role_instructions = (
            "ROLE TYPE: SOFTWARE ENGINEERING\n"
            "- Focus areas: data structures, algorithms, time/space complexity, system design, scalability, "
            "API design, concurrency, distributed systems, databases.\n"
            "- When asking a DSA or coding question, you MUST include the exact tag [REQUIRES_CODE] "
            "at the very end of your response so the code editor opens for the candidate.\n"
            "- After the candidate answers a coding question, ALWAYS follow up asking for "
            "time complexity, space complexity, or to optimise their solution.\n"
            "- When asking system design questions, probe for: capacity estimation, data models, "
            "API contracts, component breakdown, and failure handling.\n"
            "- NEVER ask domain-specific questions from non-software fields (no thermodynamics, finance formulas, etc.)."
        )
    else:
        role_instructions = (
            "ROLE TYPE: CORE / NON-SOFTWARE ENGINEERING\n"
            f"- This is a core domain role: {target_role}. Ask only domain-relevant questions.\n"
            "- Focus areas (pick the most relevant): thermodynamics, mechanics, materials science, "
            "circuit design, financial modelling, project costing, regulatory standards (ISO, ASME, IEEE, GAAP, etc.), "
            "supply chain, risk management, or any other domain concept relevant to the role.\n"
            "- NEVER ask DSA or coding-style questions (no 'write a BFS', no 'what is a hash map').\n"
            "- For technical questions, ask about real-world scenarios: component failures, material selection "
            "trade-offs, financial statement analysis, process optimisation, safety compliance, etc.\n"
            "- After the candidate answers a scenario question, probe for: why they chose a specific approach, "
            "what trade-offs they considered, and how they would handle constraints or failures.\n"
            "- If the question involves calculation or a written analysis, append [REQUIRES_CODE] "
            "at the end only if you want the candidate to write equations, sketches, or structured analysis."
        )

    # ── Candidate & plan context ──────────────────────────────────────────────
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
            f"{item.get('focus', '')} — {item.get('sample_question', '')[:80]}"
            for item in plan_items
        )
        context_block += (
            f"\n\nINTERVIEW PLAN (follow this question order strictly):\n{plan_summary}\n"
            f"Difficulty: {interview_plan.get('difficulty', 'Medium')}"
        )

    # ── System prompt assembly ────────────────────────────────────────────────
    system_prompt = (
        f"You are an expert technical interviewer conducting a real job interview at {target_company or 'a top company'} "
        f"for the position of {target_role or 'Software Engineer'}.\n\n"
        "GENERAL RULES:\n"
        "- Conduct a natural, rigorous, human-sounding interview.\n"
        "- Ask exactly ONE focused question per turn — never bundle multiple questions.\n"
        "- Briefly acknowledge the candidate's answer in ONE sentence before moving to your next question "
        "(e.g. 'Good point on the trade-offs.' or 'Interesting approach.').\n"
        "- Do NOT output scores, ratings, or internal evaluation notes — speak directly to the candidate.\n"
        "- If the candidate asks you to repeat a question, rephrase it clearly.\n"
        "- Follow the interview plan's question order as closely as possible.\n"
        "- Always align your question with the [Current Focus] specified below.\n\n"
        f"COMPANY DIFFICULTY: {difficulty_block}\n\n"
        f"{role_instructions}"
        + context_block
        + (f"\n\nTARGET COMPANY: {target_company}" if target_company else "")
        + (f"\nTARGET ROLE: {target_role}" if target_role else "")
    )

    # ── Message chain ─────────────────────────────────────────────────────────
    formatted_messages = [{"role": "system", "content": system_prompt}]

    for item in history:
        if isinstance(item, dict):
            content = item.get("text") or item.get("content") or ""
            raw_role = item.get("sender") or item.get("role") or "user"
            role = "assistant" if raw_role in ("assistant", "interviewer") else "user"
            if content:
                formatted_messages.append({"role": role, "content": content})

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
            max_tokens=600,
        )
        return response.choices[0].message.content.strip()

    except Exception as exc:
        logger.error("Interview agent failed: %s", exc)
        return "I apologize, I'm having a technical issue. Could you please repeat your answer?"