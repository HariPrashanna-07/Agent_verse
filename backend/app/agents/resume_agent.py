import json
from utils.groq_client import get_groq_client


def analyze_resume(resume_text: str) -> dict:
    """Parses raw resume text into structured JSON skills and experience."""
    client = get_groq_client()

    prompt = f"""
    You are an expert technical resume parser. Extract key candidate details from the text below.

    RESUME TEXT:
    {resume_text}

    Return ONLY a valid raw JSON object matching this schema (no markdown formatting, no commentary):
    {{
        "technical_skills": ["Skill1", "Skill2"],
        "projects": [
            {{"title": "Project Name", "tech_stack": ["Tech1"], "summary": "Brief summary"}}
        ],
        "domains": ["Web Dev", "AI/ML", "Embedded Systems"]
    }}
    """

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "system", "content": "You output strictly raw, valid JSON. No markdown backticks or commentary."},
            {"role": "user", "content": prompt}
        ],
        temperature=0.1
    )

    raw_content = response.choices[0].message.content.strip()
    if raw_content.startswith("```json"):
        raw_content = raw_content[7:-3].strip()
    elif raw_content.startswith("```"):
        raw_content = raw_content[3:-3].strip()

    return json.loads(raw_content)