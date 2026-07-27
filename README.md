# Agent_verse

AgentVerse is an AI-powered interview platform. 

## Agents and Models

The platform uses a suite of specialised AI agents to facilitate the interview process. These are powered by Llama models via the Groq API for low latency and high quality.

| Agent | File | Primary Function | Model Used (via Groq) |
|---|---|---|---|
| **Planner Agent** | `planner_agent.py` | Designs the interview plan based on the candidate's resume and target role. | `llama-3.3-70b-versatile` |
| **Interview Agent** | `interview_agent.py` | Acts as the real-time technical interviewer, asking challenging context-aware questions. | `llama-3.1-8b-instant` |
| **Evaluation Agent** | `evaluation_agent.py` | Comprehensively evaluates the transcript and scores candidate skills. | `llama-3.3-70b-versatile` |
| **Resume Agent** | `resume_agent.py` | Quickly classifies documents and extracts structured professional profiles. | `llama-3.1-8b-instant` & `llama-3.3-70b-versatile` |
| **Roadmap Agent** | `roadmap_agent.py` | Generates a personalised 7-day study plan to address identified weaknesses. | `llama-3.3-70b-versatile` |