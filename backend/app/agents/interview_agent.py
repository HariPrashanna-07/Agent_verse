from utils.groq_client import get_groq_client


def get_interviewer_response(history: list, current_focus: str, candidate_answer: str) -> str:
    client = get_groq_client()

    system_prompt = (
        "You are an expert technical interviewer for top tech companies . "
        "Your goal is to conduct a natural, rigorous technical interview. "
        "Ask clear, concise questions based on the candidate's previous responses and current focus topic. "
        "Do not output internal evaluation notes; speak directly to the candidate."
    )

    formatted_messages = [{"role": "system", "content": system_prompt}]

    # Safely convert history regardless of key naming (sender/text vs role/content)
    for item in history:
        if isinstance(item, dict):
            # Extract content/text
            content = item.get("text") or item.get("content") or ""

            # Extract role
            raw_role = item.get("sender") or item.get("role") or "user"
            role = "assistant" if raw_role in ["assistant", "interviewer"] else "user"

            if content:
                formatted_messages.append({"role": role, "content": content})

    # Append current context & candidate input
    formatted_messages.append({
        "role": "user",
        "content": f"[Focus Topic: {current_focus}]\nCandidate Response: {candidate_answer}"
    })

    response = client.chat.completions.create(
        model="llama-3.1-8b-instant",  # Blazing fast sub-second latency for live chat
        messages=formatted_messages,
        temperature=0.7
    )

    return response.choices[0].message.content