import os
import json
import logging
from pathlib import Path
from typing import Optional, List, Dict, Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from dotenv import load_dotenv

load_dotenv()

# Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Groq configuration
MODEL_NAME = "openai/gpt-oss-120b"


# FastAPI application
app = FastAPI(
    title="CBMU Campus Assistant Backend",
    version="1.0.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Data paths
BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"

DEPARTMENTS_FILE = DATA_DIR / "departments.json"
FEES_FILE = DATA_DIR / "fees.json"
NOTICES_FILE = DATA_DIR / "notices.json"
SETTINGS_FILE = DATA_DIR / "settings.json"

try:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
except OSError:
    logger.exception("Could not create data directory")


# JSON helpers
def read_json_file(path: Path, default_val: Any) -> Any:
    try:
        if path.exists():
            with path.open("r", encoding="utf-8") as file:
                return json.load(file)
    except Exception:
        logger.exception("Could not read JSON file: %s", path.name)

    return default_val


def write_json_file(path: Path, data: Any) -> bool:
    try:
        DATA_DIR.mkdir(parents=True, exist_ok=True)

        with path.open("w", encoding="utf-8") as file:
            json.dump(data, file, indent=2, ensure_ascii=False)

        return True

    except Exception:
        logger.exception("Could not write JSON file: %s", path.name)
        return False


backend_departments = read_json_file(DEPARTMENTS_FILE, {})
backend_fees = read_json_file(FEES_FILE, {})
backend_notices = read_json_file(NOTICES_FILE, [])

backend_settings = read_json_file(
    SETTINGS_FILE,
    {
        "backgroundTheme": "default",
        "campusName": "Mangalore University"
    }
)


# Request models
class ChatRequest(BaseModel):
    message: str
    lang: Optional[str] = "en"
    history: List[Dict[str, Any]] = Field(default_factory=list)


class StudyAssistRequest(BaseModel):
    topic: str
    mode: Optional[str] = "explain"
    lang: Optional[str] = "en"


class NoticeSummaryRequest(BaseModel):
    title: Optional[str] = ""
    body: Optional[str] = ""
    lang: Optional[str] = "en"


class TestGroqRequest(BaseModel):
    key: Optional[str] = None


# Groq helpers
def get_groq_api_key() -> str:
    return (
        os.getenv("GROQ_API_KEY", "")
        .strip()
        .strip('"')
        .strip("'")
    )


def is_groq_configured() -> bool:
    return bool(get_groq_api_key())


def get_groq_client(api_key: Optional[str] = None):
    key = api_key or get_groq_api_key()

    if not key:
        logger.error("GROQ_API_KEY is missing or empty")
        return None

    try:
        from groq import Groq
        return Groq(api_key=key)
    except Exception:
        logger.exception("Could not initialize Groq client")
        return None


def groq_chat(messages, max_tokens=1000):
    client = get_groq_client()

    if client is None:
        raise RuntimeError("GROQ_API_KEY is missing or client unavailable")

    return client.chat.completions.create(
        model=MODEL_NAME,
        messages=messages,
        temperature=0.7,
        max_tokens=max_tokens
    )


# Campus fallback responder
def generate_campus_fallback(query: str, lang: str = "en") -> str:
    lower = query.strip().lower()
    is_kn = (lang or "en").lower().startswith("kn")

    if any(k in lower for k in [
        "chatbot reply", "reply", "can you reply",
        "test", "hi", "hello", "hey"
    ]):
        if is_kn:
            return (
                "### ನಮಸ್ಕಾರ! CBMU ಕ್ಯಾಂಪಸ್ ಸಹಾಯಕ ಸಕ್ರಿಯವಾಗಿದೆ ✨\n\n"
                "ನಾನು ಮಂಗಳೂರು ವಿಶ್ವವಿದ್ಯಾಲಯದ ಕ್ಯಾಂಪಸ್ ಸಹಾಯಕ. "
                "ವಿಭಾಗಗಳು, ಶುಲ್ಕ, ಹಾಸ್ಟೆಲ್ ಅಥವಾ ಕ್ಯಾಂಪಸ್ ಸ್ಥಳಗಳ ಬಗ್ಗೆ ಕೇಳಿ."
            )

        return (
            "### Hello! CBMU Campus Assistant is Online 🎓✨\n\n"
            "I can help with Mangalore University campus information.\n\n"
            "- **Campus Locations:** Science Block, Central Library\n"
            "- **Fees & Courses:** MCA fee structure, MBA fees\n"
            "- **Academics:** Exam results, UUCMS portal\n"
            "- **Facilities:** Hostels, bank and ATM"
        )

    if "vice chancellor" in lower or lower.strip() == "vc":
        return (
            "### Office of the Vice Chancellor\n\n"
            "📍 Administration Block, Mangalagangotri, Konaje.\n\n"
            "__LOCATION__:12.8160,74.9255"
        )

    if "registrar" in lower:
        return (
            "### Registrar Secretariat\n\n"
            "📍 Administration Block, Mangalagangotri, Konaje.\n\n"
            "__LOCATION__:12.8160,74.9255"
        )

    if "hostel" in lower:
        return (
            "### Student Hostels\n\n"
            "Please confirm hostel availability and current rules "
            "with the university hostel office.\n\n"
            "__LOCATION__:12.8190,74.9270"
        )

    if "science" in lower:
        return (
            "### Science Block\n\n"
            "📍 Science Complex, Mangalagangotri.\n\n"
            "__LOCATION__:12.8184,74.9288"
        )

    if "library" in lower:
        return (
            "### Central University Library\n\n"
            "📍 Opposite Science Block, Mangalagangotri.\n\n"
            "__LOCATION__:12.8153,74.9248"
        )

    return (
        f"### CBMU Campus Guide: '{query}'\n\n"
        "I can help with campus locations, departments, courses, fees, "
        "hostels and examination information.\n\n"
        "Try asking about the Science Block, Central Library or MCA course."
    )


# Health
@app.get("/api/health")
def health():
    groq_ok = is_groq_configured()

    return {
        "status": "ok",
        "environment": os.getenv("NODE_ENV", "production"),
        "runtime": "python-fastapi",
        "platform": "vercel" if os.getenv("VERCEL") else "self-hosted",
        "activeProvider": "groq" if groq_ok else "campus_engine",
        "groqConfigured": groq_ok,
        "model": MODEL_NAME if groq_ok else "cbmu-knowledge-base"
    }


@app.get("/api/render-info")
def render_info():
    return {
        "isRender": bool(
            os.getenv("RENDER") or os.getenv("RENDER_SERVICE_ID")
        ),
        "groqConfigured": is_groq_configured()
    }


@app.get("/api/ai/provider-status")
def provider_status():
    groq_ok = is_groq_configured()

    return {
        "activeProvider": "groq" if groq_ok else "campus_engine",
        "groqConfigured": groq_ok,
        "geminiConfigured": bool(os.getenv("GEMINI_API_KEY")),
        "modelName": MODEL_NAME if groq_ok else "CBMU Campus Engine"
    }


# Test Groq
@app.post("/api/ai/test-groq")
def test_groq(req: TestGroqRequest):
    key = (req.key or get_groq_api_key()).strip()

    if not key:
        raise HTTPException(
            status_code=400,
            detail="GROQ_API_KEY is missing."
        )

    try:
        client = get_groq_client(key)

        if client is None:
            raise RuntimeError("Could not initialize Groq client")

        response = client.chat.completions.create(
            model=MODEL_NAME,
            messages=[
                {
                    "role": "user",
                    "content": "Reply in one sentence: Groq connection successful."
                }
            ],
            max_tokens=100
        )

        return {
            "success": True,
            "message": "Groq server connected successfully!",
            "reply": response.choices[0].message.content,
            "model": MODEL_NAME
        }

    except Exception:
        logger.exception("Groq connection test failed")
        raise HTTPException(
            status_code=502,
            detail="Groq request failed. Check Vercel runtime logs and API configuration."
        )


# Main chatbot
@app.post("/api/ai/chat")
def chat(req: ChatRequest):
    groq = get_groq_client()

    if groq is not None:
        try:
            system_prompt = (
                "You are the CBMU Campus Assistant for Mangalore University "
                "at Mangalagangotri, Konaje, Karnataka. Answer helpfully and "
                "concisely in the user's requested language. Do not invent "
                "official fees, contact details or policies. When you know "
                "a campus building's coordinates, append __LOCATION__:lat,lng."
            )

            messages = [
                {"role": "system", "content": system_prompt}
            ]

            for item in (req.history or [])[-6:]:
                text = item.get("text", "")

                if not isinstance(text, str) or not text.strip():
                    continue

                role = "user" if item.get("isUser") else "assistant"
                messages.append({
                    "role": role,
                    "content": text
                })

            messages.append({
                "role": "user",
                "content": req.message
            })

            response = groq.chat.completions.create(
                model=MODEL_NAME,
                messages=messages,
                temperature=0.7,
                max_tokens=1000
            )

            answer = response.choices[0].message.content

            if answer:
                return {
                    "answer": answer,
                    "source": "groq",
                    "model": MODEL_NAME
                }

            logger.error("Groq returned an empty answer")

        except Exception:
            logger.exception("Groq chat request failed")

    answer = generate_campus_fallback(
        req.message,
        req.lang or "en"
    )

    return {
        "answer": answer,
        "source": "remote",
        "model": "cbmu-knowledge-base"
    }


# Study assistance
@app.post("/api/ai/study-assist")
def study_assist(req: StudyAssistRequest):
    try:
        response = groq_chat(
            [
                {
                    "role": "system",
                    "content": (
                        "You are a university study assistant. Explain topics "
                        "clearly, provide revision notes, and do not invent facts."
                    )
                },
                {
                    "role": "user",
                    "content": (
                        f"Topic: {req.topic}\n"
                        f"Mode: {req.mode}\n"
                        f"Language: {req.lang}"
                    )
                }
            ],
            max_tokens=1200
        )

        return {
            "result": response.choices[0].message.content,
            "provider": "groq",
            "model": MODEL_NAME
        }

    except Exception:
        logger.exception("Groq study assistance failed")

    return {
        "result": (
            f"### Academic Study Guide: {req.topic}\n\n"
            "1. **Core Concept:** Review the topic's foundational ideas.\n"
            "2. **Key Concepts:** Review definitions, examples and formulas.\n"
            "3. **Exam Tips:** Practise explaining the topic with examples."
        ),
        "provider": "academic_engine"
    }


# Departments
@app.get("/api/departments")
def get_departments():
    return backend_departments


@app.post("/api/departments")
def save_departments(data: Dict[str, Any]):
    global backend_departments

    backend_departments = data
    saved = write_json_file(DEPARTMENTS_FILE, backend_departments)

    return {
        "success": saved,
        "data": backend_departments
    }


# Fees
@app.get("/api/fees")
def get_fees():
    return backend_fees


# Notices
@app.get("/api/notices")
def get_notices():
    return backend_notices


# Settings
@app.get("/api/settings")
def get_settings():
    return backend_settings


# Optional frontend static files
dist_path = BASE_DIR / "dist"

if dist_path.is_dir():
    app.mount(
        "/",
        StaticFiles(directory=str(dist_path), html=True),
        name="static"
    )


if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", "3000"))
    uvicorn.run(app, host="0.0.0.0", port=port)
    
