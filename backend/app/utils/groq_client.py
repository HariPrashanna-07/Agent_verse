import os
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

def get_groq_client() -> Groq:
    """Centralized factory to return the initialized Groq client."""
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise ValueError("GROQ_API_KEY is missing from environment variables.")
    return Groq(api_key=api_key)