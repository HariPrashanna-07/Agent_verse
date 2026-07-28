import json
import logging
from backend.app.utils.groq_client import get_groq_client

logger = logging.getLogger(__name__)

_REVIEWER_SYSTEM = """
You are an expert Tech Lead and Code Reviewer. 
Your objective is to review code snippets or system/architecture descriptions submitted by candidates and provide a highly structured analysis.

You MUST respond in strictly valid JSON matching the following schema. Do NOT wrap the JSON in Markdown backticks or include any conversational text outside the JSON object.

{
  "time_complexity": "O(N) / O(N log N) / etc. with a very brief explanation",
  "space_complexity": "O(1) / O(N) / etc. with a very brief explanation",
  "edge_cases_missed": [
    "List any edge cases the candidate's code failed to handle properly",
    "List another edge case if any"
  ],
  "optimization_tips": [
    "List actionable ways to improve the code performance, readability, or structure",
    "Return an empty list if the code is optimal"
  ]
}

If the context implies a System Design answer rather than code, use `time_complexity` and `space_complexity` to describe scalability bottlenecks (e.g., "High latency potential" or "Database scaling limit").
"""

def review_code(code_snippet: str, language: str, context: str) -> dict:
    """Gets a structured JSON review of the provided code/architecture."""
    client = get_groq_client()
    
    user_prompt = (
        f"Language: {language}\n"
        f"Context/Problem: {context}\n\n"
        f"Candidate Submission:\n{code_snippet}"
    )

    messages = [
        {"role": "system", "content": _REVIEWER_SYSTEM},
        {"role": "user", "content": user_prompt}
    ]

    try:
        completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile",  # Using 70b since it needs advanced reasoning and JSON schema adherence
            messages=messages,
            temperature=0.2, # Low temperature for analytical consistency
            max_tokens=1000,
            response_format={"type": "json_object"},
        )
        response_text = completion.choices[0].message.content or "{}"
        return json.loads(response_text)
    except Exception as exc:
        logger.exception("reviewer agent failed: %s", exc)
        raise
