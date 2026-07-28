# PrepAI

**PrepAI** is a high-fidelity, role-aware, AI-powered interview simulator. It leverages a multi-agent architectural pipeline to conduct real-time, dynamic technical and behavioral interviews tailored to a candidate's specific background and the target company's difficulty tier.

## Core Features

- **Resume Validation & Parsing**: Extracts skills, experiences, and technical projects to contextually ground the interview.
- **Dynamic Interview Planning**: Generates customized 5-question interview flows (spanning introductions, fundamentals, coding/scenario, deep domain, and behavioral), adapted for Software vs. Core non-software roles.
- **Real-Time Interactive Interviews**: Voice-first or text-based conversation experience. A strict behavioral system prompt forces the AI into an objective, professional interviewer persona. 
- **Context-Aware Code Editor**: Automatically pops up a code editor for DSA or technical system design questions.
- **Comprehensive Evaluation**: Analyzes the transcript to grade the candidate on overall performance, technical accuracy, communication, and problem-solving.
- **Personalized 7-Day Roadmap**: Generates a day-by-day actionable study plan based directly on the candidate's weaknesses surfaced during the interview.

## Tech Stack

### Frontend
- **Framework**: Next.js (React)
- **Styling**: Tailwind CSS
- **Voice/Audio**: Real-time STT/TTS integration for voice-first interactions.

### Backend
- **Framework**: FastAPI (Python)
- **AI / LLM**: Groq API (Llama 3 family of models)
- **Database**: AWS DynamoDB (`agentverse-users`, `agentverse-scorecards`)
- **Storage**: AWS S3 (for interview data and resumes)
- **Authentication**: JWT-based auth

---

## AI Agents and Models

The platform uses a suite of specialized AI agents to orchestrate the interview lifecycle. These are powered by open-source **Llama** models run on the **Groq API** for low latency and high-quality inference.

| Agent | File Location | Primary Function | Model Used (via Groq) |
|---|---|---|---|
| **Resume Agent** | `backend/app/agents/resume_agent.py` | Quickly classifies documents and extracts structured professional profiles. | `llama-3.1-8b-instant` & `llama-3.3-70b-versatile` |
| **Planner Agent** | `backend/app/agents/planner_agent.py` | Designs a custom 5-question interview strategy considering the resume, target role, and company difficulty tier. | `llama-3.3-70b-versatile` |
| **Interview Agent** | `backend/app/agents/interview_agent.py` | Acts as the real-time technical interviewer, actively questioning and pushing back contextually. | `llama-3.1-8b-instant` |
| **Evaluation Agent** | `backend/app/agents/evaluation_agent.py` | Deeply evaluates the entire interview transcript, grading multiple dimensions and finding weaknesses. | `llama-3.3-70b-versatile` |
| **Roadmap Agent** | `backend/app/agents/roadmap_agent.py` | Synthesizes a 7-day actionable study guide focused precisely on the candidate's failures. | `llama-3.3-70b-versatile` |
| **Chatbot Agent** | `backend/app/agents/chatbot_agent.py` | Embedded study and interview prep assistant. | `llama-3.1-8b-instant` |
| **Reviewer Agent** | `backend/app/agents/reviewer_agent.py` | Analyzes code snippets or system/architecture descriptions, evaluating time/space complexity and missing edge cases. | `llama-3.3-70b-versatile` |

---

## Getting Started

### Prerequisites
- Node.js (v18+)
- Python (v3.10+)
- AWS Account (S3 and DynamoDB configured)
- Groq API Key

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create a virtual environment and install dependencies:
   ```bash
   python -m venv .venv
   source .venv/bin/activate  # On Windows: .venv\Scripts\activate
   pip install -r requirements.txt
   ```
3. Set up your `.env` file based on `.env.example`:
   ```bash
   GROQ_API_KEY=your_groq_key
   AWS_ACCESS_KEY_ID=your_aws_key
   AWS_SECRET_ACCESS_KEY=your_aws_secret
   ```
4. Run the development server:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies (e.g. using npm, yarn, or pnpm):
   ```bash
   npm install
   ```
3. Create your `.env.local` to point to the backend (or run locally):
   ```bash
   NEXT_PUBLIC_API_URL=http://localhost:8000
   ```
4. Run the development server:
   ```bash
   npm run dev
   ```

## Deployment
PrepAI is configured as a monorepo explicitly supporting **Vercel** multi-service routing via `vercel.json`. 