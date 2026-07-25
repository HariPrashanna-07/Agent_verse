import json
import re
from utils.groq_client import get_groq_client


def evaluate_interview(history: list, target_role: str, target_company: str) -> dict:
    client = get_groq_client()

    prompt = f"""
    You are an expert interviewer evaluating a candidate for the position of {target_role} at {target_company}.

    Review the following interview transcript:
    {json.dumps(history, indent=2)}

    Provide a detailed evaluation and study roadmap in raw JSON format (no markdown code blocks, no trailing text):
    {{
      "scores": {{
        "overall": 85,
        "technical_accuracy": 80,
        "communication": 85,
        "problem_solving": 90
      }},
      "feedback": {{
        "strengths": ["Clear explanation of algorithms", "Good problem approach"],
        "weaknesses": ["Could optimize space complexity further", "Needs deeper explanation on trade-offs"],
        "missing_concepts": ["In-place string mutation", "Time complexity analysis"]
      }},
      "learning_roadmap": {{
        "focus_areas": ["Two Pointer Approach", "Space-Time Tradeoffs"],
        "recommended_leetcode": ["242. Valid Anagram", "344. Reverse String", "125. Valid Palindrome"],
        "7_day_plan": [
          "Day 1-2: Master Two-Pointer string manipulation",
          "Day 3-4: Practice System Design basics",
          "Day 5-7: Mock behavioral practice (STAR format)"
        ]
      }}
    }}
    """

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.2
    )

    raw_output = response.choices[0].message.content

    # Clean potential markdown formatting
    match = re.search(r'```(?:json)?\s*([\s\S]*?)\s*```', raw_output)
    if match:
        raw_output = match.group(1)

    return json.loads(raw_output.strip())