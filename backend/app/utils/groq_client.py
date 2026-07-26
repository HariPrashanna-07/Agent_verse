from groq import Groq
from backend.app.config import settings

# Module-level singleton — created once, reused across all requests
_groq_client: Groq | None = None


def get_groq_client() -> Groq:
    """Return the shared Groq client singleton."""
    global _groq_client
    if _groq_client is None:
        if not settings.groq_configured:
            raise ValueError("GROQ_API_KEY is missing from environment variables.")
        _groq_client = Groq(api_key=settings.GROQ_API_KEY)
    return _groq_client