import importlib
import sys
import types
import unittest
from pathlib import Path


class BackendImportTests(unittest.TestCase):
    def test_resume_agent_imports_from_backend_package(self):
        repo_root = Path(__file__).resolve().parents[1]
        sys.path.insert(0, str(repo_root.parent))

        groq_mod = types.ModuleType("groq")
        class DummyGroq:
            def __init__(self, *args, **kwargs):
                pass
        groq_mod.Groq = DummyGroq
        dotenv_mod = types.ModuleType("dotenv")
        dotenv_mod.load_dotenv = lambda *args, **kwargs: None

        sys.modules["groq"] = groq_mod
        sys.modules["dotenv"] = dotenv_mod
        sys.modules.pop("backend.app.agents.resume_agent", None)

        module = importlib.import_module("backend.app.agents.resume_agent")
        self.assertTrue(hasattr(module, "analyze_resume"))


if __name__ == "__main__":
    unittest.main()
