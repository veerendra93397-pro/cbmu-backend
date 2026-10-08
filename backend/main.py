import os
import json
import logging
from typing import Optional, List, Dict, Any
from pathlib import Path

from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

# Initialize FastAPI app
app = FastAPI(title="CBMU Campus Assistant Backend", version="1.0.0")

# Enable CORS for external frontends or local dev
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DATA_DIR = Path("data")
DATA_DIR.mkdir(parents=True, exist_ok=True)
DEPARTMENTS_FILE = DATA_DIR / "departments.json"
FEES_FILE = DATA_DIR / "fees.json"
NOTICES_FILE = DATA_DIR / "notices.json"
SETTINGS_FILE = DATA_DIR / "settings.json"

def read_json_file(path: Path, default_val: Any) -> Any:
    try:
        if path.exists():
            with open(path, "r", encoding="utf-8") as f:
                return json.load(f)
    except Exception as e:
        logging.error(f"Error reading {path}: {e}")
    return default_val

def write_json_file(path: Path, data: Any):
    try:
        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
    except Exception as e:
        logging.error(f"Error writing {path}: {e}")

backend_departments = read_json_file(DEPARTMENTS_FILE, {})
backend_fees = read_json_file(FEES_FILE, {})
backend_notices = read_json_file(NOTICES_FILE, [])
backend_settings = read_json_file(SETTINGS_FILE, {"backgroundTheme": "default", "campusName": "Mangalore University"})

# Groq client helper
is_groq_key_valid = None

def get_groq_client():
    global is_groq_key_valid
    api_key = os.getenv("GROQ_API_KEY", "").strip().strip('"').strip("'")
    if not api_key:
        return None
    if is_groq_key_valid is False:
        return None
    try:
        from groq import Groq
        return Groq(api_key=api_key)
    except Exception as e:
        logging.error(f"Error initializing Groq: {e}")
        return None

def is_groq_configured() -> bool:
    api_key = os.getenv("GROQ_API_KEY", "").strip().strip('"').strip("'")
    return bool(api_key and is_groq_key_valid is not False)

class ChatRequest(BaseModel):
    message: str
    lang: Optional[str] = "en"
    history: Optional[List[Dict[str, Any]]] = []

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

# Fallback responder
def generate_campus_fallback(query: str, lang: str = "en") -> str:
    lower = query.strip().lower()
    is_kn = lang == "kn"

    if any(k in lower for k in ["chatbot rply", "chatbot reply", "reply", "can you reply", "test", "hi", "hello", "hey"]):
        if is_kn:
            return "### ನಮಸ್ಕಾರ! CBMU ಕ್ಯಾಂಪಸ್ ಸಹಾಯಕ ಸಕ್ರಿಯವಾಗಿದೆ ✨\n\nನಾನು ಮಂಗಳೂರು ವಿಶ್ವವಿದ್ಯಾಲಯದ ಅಧಿಕೃತ AI ಚಾಟ್‌ಬಾಟ್. ನೀವು ವಿಭಾಗಗಳು, ಶುಲ್ಕ, ಹಾಸ್ಟೆಲ್ ಅಥವಾ ಅಧಿಕಾರಿಗಳ ಬಗ್ಗೆ ಕೇಳಬಹುದು."
        return f"### Hello! CBMU Campus Assistant is Online & Ready 🎓✨\n\nI am the official campus AI assistant for Mangalore University (Konaje, Mangalagangotri).\n\n• **Campus Locations:** 'Where is Science Block?', 'Show me the Central Library'\n• **Fees & Courses:** 'MCA fee structure', 'MBA fees'\n• **Academics:** 'How to check exam results?', 'UUCMS portal'\n• **Hostels & Facilities:** 'Hostel timings and mess', 'Bank & ATM'"

    if "vice chancellor" in lower or "vc" in lower:
        return "### 🏛️ Office of the Vice Chancellor (CBMU)\n\n👤 **Hon'ble Vice Chancellor:** **Prof. P. L. Dharma**\n📍 **Office:** First Floor, Administration Block, Mangalagangotri, Konaje - 574199\n📞 **Phone:** 0824-2287230\n\n__LOCATION__:12.8160,74.9255"

    if "registrar" in lower:
        return "### 🏛️ Registrar Secretariat\n\n• **Registrar (Administration):** Sri K. Raju Mogaveera, KAS (0824-2287276)\n• **Registrar (Evaluation):** Prof. Devendrappa H (0824-2287227)\n📍 Administration Block, Mangalagangotri\n\n__LOCATION__:12.8160,74.9255"

    if "hostel" in lower:
        return "### 🏠 Student Hostels (Mangalagangotri)\n\n• **Men's Hostel:** Behind Science Complex (In-time: 8:00 PM)\n• **Women's Hostels (Gangotri & Kaveri):** Near Library (In-time: 7:30 PM)\n📞 **Hostel Office:** 0824-2287281\n\n__LOCATION__:12.8190,74.9270"

    if "science" in lower:
        return "### Science Block (Faculty of Science & Technology)\n\n📍 **Location:** Science Complex, Mangalagangotri\n🏢 Houses Computer Science (MCA), Physics, Chemistry, Mathematics and Biosciences.\n\n__LOCATION__:12.8184,74.9288"

    if "library" in lower:
        return "### 📚 Central University Library\n\n📍 Opposite Administration Block\n⏰ Open Mon-Sat: 8:00 AM – 8:00 PM\n👤 Librarian: Dr. M. Purushotham Gowda (0824-2287234)\n\n__LOCATION__:12.8153,74.9248"

    return f"### 🎓 Mangalore University Campus Guide: '{query}'\n\nI can assist you with campus locations, official fees, hostel procedures, and exams.\nTry asking: *'Science Block'*, *'MCA fee'*, *'Central Library'*, or *'Exam results'*."

@app.get("/api/health")
def health():
    groq_ok = is_groq_configured()
    port = int(os.getenv("PORT", 3000))
    return {
        "status": "ok",
        "environment": os.getenv("NODE_ENV", "production"),
        "runtime": "python-fastapi",
        "port": port,
        "platform": "render" if os.getenv("RENDER") else "self-hosted",
        "activeProvider": "groq" if groq_ok else "campus_engine",
        "groqConfigured": groq_ok,
        "model": "llama-3.3-70b-versatile" if groq_ok else "cbmu-knowledge-base"
    }

@app.get("/api/render-info")
def render_info():
    return {
        "isRender": bool(os.getenv("RENDER") or os.getenv("RENDER_SERVICE_ID")),
        "renderServiceId": os.getenv("RENDER_SERVICE_ID"),
        "port": int(os.getenv("PORT", 3000)),
        "groqConfigured": is_groq_configured()
    }

@app.get("/api/ai/provider-status")
def provider_status():
    groq_ok = is_groq_configured()
    return {
        "activeProvider": "groq" if groq_ok else "academic_engine",
        "groqConfigured": groq_ok,
        "geminiConfigured": bool(os.getenv("GEMINI_API_KEY")),
        "modelName": "Groq (LLaMA 3.3 70B Versatile)" if groq_ok else "CBMU Campus Engine"
    }

@app.post("/api/ai/test-groq")
def test_groq(req: TestGroqRequest):
    key = req.key or os.getenv("GROQ_API_KEY", "")
    if not key:
        raise HTTPException(status_code=400, detail="No Groq key provided or configured.")
    try:
        from groq import Groq
        client = Groq(api_key=key.strip())
        res = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[{"role": "user", "content": "Say: Groq server connected successfully in 1 sentence."}],
            max_tokens=30
        )
        return {"success": True, "message": "Groq server connected successfully!", "reply": res.choices[0].message.content}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/ai/chat")
def chat(req: ChatRequest):
    groq = get_groq_client()
    if groq:
        try:
            sys_prompt = "You are the official AI Assistant for Mangalore University (CBMU), located in Mangalagangotri, Konaje, Karnataka. Provide concise, helpful responses in English or Kannada as requested. Append __LOCATION__:lat,lng when mentioning campus buildings."
            messages = [{"role": "system", "content": sys_prompt}]
            for h in (req.history or [])[-6:]:
                messages.append({"role": "user" if h.get("isUser") else "assistant", "content": h.get("text", "")})
            messages.append({"role": "user", "content": req.message})

            resp = groq.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=messages,
                temperature=0.7,
                max_tokens=1000
            )
            answer = resp.choices[0].message.content
            return {"answer": answer, "source": "groq", "model": "llama-3.3-70b-versatile"}
        except Exception as e:
            if "401" in str(e) or "invalid_api_key" in str(e):
                global is_groq_key_valid
                is_groq_key_valid = False
            logging.info(f"Groq unavailable ({e}), using verified campus knowledge engine")

    # Fallback
    answer = generate_campus_fallback(req.message, req.lang or "en")
    return {"answer": answer, "source": "remote", "model": "cbmu-knowledge-base"}

@app.post("/api/ai/study-assist")
def study_assist(req: StudyAssistRequest):
    groq = get_groq_client()
    if groq:
        try:
            resp = groq.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[
                    {"role": "system", "content": "You are a university academic professor. Provide detailed exam study guidance and revision notes."},
                    {"role": "user", "content": f"Topic: {req.topic}, Mode: {req.mode}, Language: {req.lang}"}
                ],
                max_tokens=1200
            )
            return {"result": resp.choices[0].message.content, "provider": "groq"}
        except Exception as e:
            logging.warn(f"Groq study assist failed: {e}")

    return {
        "result": f"### Academic Study Guide: {req.topic}\n\n1. **Core Concept:** Foundational topic in university syllabus.\n2. **Key Formulas & Theorems:** Review governing principles.\n3. **Exam Tips:** Always write formal definition, illustrate with diagrams, and list real-world applications.",
        "provider": "academic_engine"
    }

@app.get("/api/departments")
def get_departments():
    return backend_departments

@app.post("/api/departments")
def save_departments(data: Dict[str, Any]):
    global backend_departments
    backend_departments = data
    write_json_file(DEPARTMENTS_FILE, backend_departments)
    return {"success": True}

@app.get("/api/fees")
def get_fees():
    return backend_fees

@app.get("/api/notices")
def get_notices():
    return backend_notices

@app.get("/api/settings")
def get_settings():
    return backend_settings

# Mount static dist files if compiled
dist_path = Path("dist")
if dist_path.exists():
    app.mount("/", StaticFiles(directory="dist", html=True), name="static")

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 3000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)
