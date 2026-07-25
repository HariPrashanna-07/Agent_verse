import json
from utils.groq_client import get_groq_client


def generate_interview_plan(resume_data: dict, target_company: str, target_role: str, jd_text: str = "") -> dict:
    """Creates a structured question allocation matrix tailored to candidate & target role."""
    client = get_groq_client()

    prompt = f"""
    Create a 5-question interview plan for a candidate applying for:
    Company: {target_company}
    Role: {target_role}
    Job Description (Optional): {jd_text or 'N/A'}

    Candidate Skills: {resume_data.get('technical_skills', [])}
    Candidate Projects: {resume_data.get('projects', [])}

    Question Breakdown (5 Questions Total):
    - Question 1 & 2: Resume Deep Dive (Projects/Tech Stack)
    - Question 3 & 4: Core Technical / Problem Solving / CS Fundamentals
    - Question 5: Behavioral or Company-Specific Cultural Alignment ({target_company})

    Return ONLY a valid raw JSON object matching this schema:
    {{
        "plan": [
            {{"category": "Resume", "focus": "Topic/Project focus"}},
            {{"category": "Technical", "focus": "Topic focus"}},
            {{"category": "Behavioral", "focus": "Topic focus"}}
        ]
    }}
    """

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "system", "content": "You output strictly raw, valid JSON. No markdown formatting."},
            {"role": "user", "content": prompt}
        ],
        temperature=0.3
    )

    raw_content = response.choices[0].message.content.strip()
    if raw_content.startswith("```json"):
        raw_content = raw_content[7:-3].strip()
    return json.loads(raw_content)