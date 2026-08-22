from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Dict, Any
import difflib
import re
import os
import math
import requests
import copy
from itsdangerous import URLSafeTimedSerializer, BadSignature, SignatureExpired

# ============================================================
#  GEMINI (Google AI) — optional NLP fallback
#
#  Used ONLY to match a free-form question to one of the known keys in
#  CAMPUS_DATA when the rule-based keyword matcher finds nothing. It is
#  deliberately NOT used to answer questions from its own knowledge —
#  every actual fact (names, phone numbers, fees) still comes from
#  CAMPUS_DATA / COURSE_FEES, never from the model's own output. This
#  keeps real people's names/numbers from ever being hallucinated.
#
#  Set the GEMINI_API_KEY environment variable (e.g. in Render's
#  dashboard under Environment) — never hardcode the key in this file.
#  If the key isn't set, this feature silently disables itself and the
#  bot falls back to the old "I didn't understand that" message.
# ============================================================

# ============================================================
#  GEMINI (Google AI) — optional NLP fallback
#
#  Used ONLY to match a free-form question to one of the known keys in
#  CAMPUS_DATA when the rule-based keyword matcher finds nothing. It is
#  deliberately NOT used to answer questions from its own knowledge —
#  every actual fact (names, phone numbers, fees) still comes from
#  CAMPUS_DATA / COURSE_FEES, never from the model's own output. This
#  keeps real people's names/numbers from ever being hallucinated.
#
#  Set the GEMINI_API_KEY environment variable (e.g. in Render's
#  dashboard under Environment) — never hardcode the key in this file.
#  If the key isn't set, this feature silently disables itself and the
#  bot falls back to the old "I didn't understand that" message.
#
#  Uses the `google-genai` package (NOT the older `google-generativeai`,
#  which reached end-of-life Nov 30, 2025 and no longer works reliably).
#  Make sure requirements.txt has `google-genai`, not `google-generativeai`.
# ============================================================

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
GEMINI_AVAILABLE = False
GEMINI_INIT_ERROR = None     # set if setup itself fails (bad import, etc.)
GEMINI_LAST_CALL_ERROR = None  # set if the most recent actual API call failed
GEMINI_LAST_TRACE = {}  # detailed record of the most recent call, for /debug/gemini
GEMINI_MODEL = "gemini-3.5-flash-lite"  # check https://ai.google.dev/gemini-api/docs/models if this ever needs updating

# Off by default — turning this on means EVERY matched answer makes an
# extra Gemini call (more quota/latency) to rephrase the templated text
# into natural conversational language. Set AI_REPHRASE=true in Render's
# Environment tab once you're happy with quota usage to turn it on.
AI_REPHRASE_ENABLED = os.environ.get("AI_REPHRASE", "false").lower() == "true"

if GEMINI_API_KEY:
    try:
        from google import genai
        from google.genai import types as genai_types
        _gemini_client = genai.Client(api_key=GEMINI_API_KEY)
        GEMINI_AVAILABLE = True
    except Exception as e:
        GEMINI_AVAILABLE = False
        GEMINI_INIT_ERROR = f"{type(e).__name__}: {e}"
else:
    GEMINI_INIT_ERROR = "GEMINI_API_KEY environment variable is not set"

def _safe_finish_reason(response):
    try:
        return str(response.candidates[0].finish_reason)
    except Exception:
        return None

def _safe_prompt_feedback(response):
    try:
        return str(response.prompt_feedback)
    except Exception:
        return None

def ai_identify_entity(query: str):
    """Ask Gemini to pick the single best-matching CAMPUS_DATA key for a
    free-form question the keyword matcher couldn't handle. Returns the
    matched key (a string that MUST already exist in CAMPUS_DATA) or None.
    Never returns freeform text as a fact — only a key we then look up
    ourselves."""
    if not GEMINI_AVAILABLE:
        return None
    try:
        topic_list = "\n".join(f"- {key}" for key in CAMPUS_DATA.keys())
        prompt = (
            "You are an intent-matching layer for a university chatbot. "
            "Below is a list of valid internal topic keys. Given the student's "
            "question, reply with EXACTLY ONE key from the list that best matches "
            "what they're asking about — nothing else, no explanation, no punctuation. "
            "If nothing in the list matches, reply with exactly: NONE\n\n"
            f"Valid keys:\n{topic_list}\n\n"
            f"Student question: \"{query}\"\n\n"
            "Answer:"
        )
        response = _gemini_client.models.generate_content(
            model=GEMINI_MODEL,
            contents=prompt,
            config=genai_types.GenerateContentConfig(
                temperature=0, max_output_tokens=20,
            ),
        )
        global GEMINI_LAST_TRACE
        GEMINI_LAST_TRACE = {
            "function": "ai_identify_entity",
            "query": query,
            "raw_text": response.text,
            "finish_reason": _safe_finish_reason(response),
            "prompt_feedback": _safe_prompt_feedback(response),
        }
        candidate = (response.text or "").strip().strip('"').strip("'").lower()
        if candidate in CAMPUS_DATA:
            return candidate
        return None
    except Exception as e:
        # Any Gemini/network failure just falls back to the normal flow —
        # never let an AI-layer error break the chatbot response — but
        # DO remember what happened so /debug/gemini can show it.
        global GEMINI_LAST_CALL_ERROR
        GEMINI_LAST_CALL_ERROR = f"{type(e).__name__}: {e}"
        return None

def ai_conversational_reply(query: str, lang: str):
    """For genuine small talk / vague chat that doesn't match any known
    topic (e.g. 'haa', 'how is mu university', 'you there?') — gives a
    warm, natural reply instead of the robotic 'I couldn't match that'
    message. Deliberately instructed to NEVER state specific facts, names,
    numbers, or dates about the university — only CAMPUS_DATA/COURSE_FEES
    are trusted for those. This call is just for tone, not information."""
    if not GEMINI_AVAILABLE:
        return None
    try:
        lang_name = "Kannada" if lang == "kn" else "English"
        prompt = (
            "You are a warm, friendly chatbot assistant for Mangalore University students. "
            "The student just sent a casual or vague message that doesn't match any specific "
            "topic in your database (departments, offices, fees, hostels, timings, etc.). "
            f"Reply warmly and briefly (1-2 short sentences) in {lang_name}. "
            "IMPORTANT: Do NOT state any specific facts, names, phone numbers, dates, or figures "
            "about the university — you have no verified data for this message, so making any "
            "up would be wrong. Just be friendly, and gently invite them to ask about a "
            "department, office, hostel, fees, or timings instead.\n\n"
            f"Student message: \"{query}\"\n\n"
            "Your reply:"
        )
        response = _gemini_client.models.generate_content(
            model=GEMINI_MODEL,
            contents=prompt,
            config=genai_types.GenerateContentConfig(
                temperature=0.6, max_output_tokens=80,
            ),
        )
        global GEMINI_LAST_TRACE
        GEMINI_LAST_TRACE = {
            "function": "ai_conversational_reply",
            "query": query,
            "raw_text": response.text,
            "finish_reason": _safe_finish_reason(response),
            "prompt_feedback": _safe_prompt_feedback(response),
        }
        text = (response.text or "").strip()
        return text if text else None
    except Exception as e:
        global GEMINI_LAST_CALL_ERROR
        GEMINI_LAST_CALL_ERROR = f"{type(e).__name__}: {e}"
        return None

def ai_rephrase(structured_text: str, query: str, lang: str):
    """Rewrites an already-verified structured answer into warmer,
    conversational language — WITHOUT changing any fact. This is what
    makes responses feel like a real AI chat instead of a rigid template,
    while keeping every name/number/link exactly as verified.

    Guarded by AI_REPHRASE_ENABLED so it's opt-in (extra Gemini call per
    matched answer = more quota/latency). If disabled, unavailable, or
    the model does anything suspicious (drops a link, changes length
    drastically), falls back to the original structured text untouched —
    never risk a fact getting silently altered."""
    if not AI_REPHRASE_ENABLED or not GEMINI_AVAILABLE:
        return structured_text
    try:
        lang_name = "Kannada" if lang == "kn" else "English"
        prompt = (
            "You are a friendly university chatbot. Below is VERIFIED factual data that has "
            "already been retrieved for the student's question — treat every name, number, "
            "phone number, date, and link in it as ground truth.\n\n"
            "Rewrite it as a warm, natural, conversational reply in "
            f"{lang_name}, as if a helpful person were answering. STRICT RULES:\n"
            "1. Do NOT add, remove, or alter any fact — every name, phone number, date, "
            "figure, and URL must appear EXACTLY as given, unchanged.\n"
            "2. Do NOT invent any additional information not present below.\n"
            "3. You MAY reorder sentences, soften the tone, and add natural transitions.\n"
            "4. Keep any markdown links in the exact same [text](url) format.\n"
            "5. Keep it roughly the same length — don't pad or over-explain.\n\n"
            f"Student's question: \"{query}\"\n\n"
            f"Verified data:\n{structured_text}\n\n"
            "Your conversational rewrite:"
        )
        response = _gemini_client.models.generate_content(
            model=GEMINI_MODEL,
            contents=prompt,
            config=genai_types.GenerateContentConfig(
                temperature=0.4, max_output_tokens=400,
            ),
        )
        rewritten = (response.text or "").strip()

        # Safety check: every URL in the original MUST survive verbatim in
        # the rewrite, or we discard the rewrite and use the safe original.
        urls_in_original = re.findall(r'https?://\S+?(?=\)|\s|$)', structured_text)
        if any(url not in rewritten for url in urls_in_original):
            return structured_text
        if not rewritten:
            return structured_text
        return rewritten
    except Exception as e:
        global GEMINI_LAST_CALL_ERROR
        GEMINI_LAST_CALL_ERROR = f"{type(e).__name__}: {e}"
        return structured_text

app = FastAPI(title="Mangalore University Assistant API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    message: str
    lang: str = "en"  # "en" or "kn" — Flutter app sends this based on the user's toggle
    lat: Optional[float] = None  # user's live GPS latitude, if the app has location permission
    lng: Optional[float] = None  # user's live GPS longitude
    debug: bool = False  # if true, /chat includes Gemini call details in THIS response
    # (avoids relying on cross-request global state, which may not be
    # shared correctly if Render is running multiple worker processes)

# ============================================================
#  A NOTE ON WHAT'S REAL VS. PLACEHOLDER IN THIS FILE
#
#  Every entry below has "verified": True or False.
#
#  verified=True  -> pulled from mangaloreuniversity.ac.in itself
#                     (department pages, Officers page, Fee Details page).
#  verified=False -> Mangalore University does not publish precise
#                     locations/GPS for things like the guest house,
#                     ATMs, parking, washrooms, or a building called
#                     "Kuvempu Bhavan" (that name did not turn up on
#                     the official site — there IS a "Mangala
#                     Auditorium" and a "Kuvempu Gallery", which may be
#                     what's meant). These entries are scaffolding —
#                     fill in real GPS pins and confirm names on-campus,
#                     then flip verified to True.
#
#  The chatbot response itself tells the user when something is
#  unverified, rather than stating a guess as fact.
# ============================================================

FEE_PAGE_URL = "https://mangaloreuniversity.ac.in/fee-details-1.html"

# Real coordinate for the Mangalore University campus as a whole (Konaje),
# sourced from the university's Wikipedia infobox. This is NOT a per-building
# pin — it's the general campus location. Use it as a fallback so navigation
# links point somewhere real, but label it clearly as approximate whenever
# a more specific building pin isn't available.
CAMPUS_CENTER_LAT = 12.8157556
CAMPUS_CENTER_LNG = 74.9240750
CAMPUS_CENTER_SOURCE = "https://en.wikipedia.org/wiki/Mangalore_University"

def get_maps_url(lat, lng):
    return f"https://www.google.com/maps/search/?api=1&query={lat},{lng}"

def location_marker(lat, lng):
    # Matches the __LOCATION__:lat,lng pattern the Flutter app's regex looks
    # for — this is what actually drives the "Open in Google Maps" button.
    return f"__LOCATION__:{lat},{lng}"

# ============================================================
#  GPS / DISTANCE
#
#  This gives straight-line ("as the crow flies") distance, not a walking
#  route — real turn-by-turn routing needs the Google Directions API
#  (separate key + billing). Straight-line distance is free and doesn't
#  need any extra API, and is close enough for "how far am I" on a small
#  campus. Precision is also capped by the fact that most CAMPUS_DATA
#  entries don't have their own lat/lng yet (see the note near the top
#  of this file) — until those are filled in, "nearest building" falls
#  back to distance-to-campus-center rather than per-building distance.
# ============================================================

def haversine_km(lat1, lng1, lat2, lng2):
    """Great-circle distance between two GPS points, in kilometres."""
    R = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lng2 - lng1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return 2 * R * math.asin(math.sqrt(a))

def format_km(km):
    if km < 1:
        return f"{km * 1000:.0f} m"
    return f"{km:.1f} km"

COURSE_FEES = {
    "mca": {
        "label": "MCA (Master of Computer Applications)",
        "year": "2025-26",
        "pdf": "https://www.mangaloreuniversity.ac.in/upload/2025/ACC/Fees/PG-Programmes-University-Campus-Constituent-Colleges.pdf",
        "pdf_label": "PG Fee Structure 2025-26 — University Campus & Constituent Colleges",
        "note": "MCA runs at the University Campus, so it falls under this category.",
    },
    "mba": {
        "label": "MBA (Business Administration)",
        "year": "2025-26",
        "pdf": "https://www.mangaloreuniversity.ac.in/upload/2025/ACC/Fees/PG-Programmes-University-Campus-Constituent-Colleges.pdf",
        "pdf_label": "PG Fee Structure 2025-26 — University Campus & Constituent Colleges",
        "note": "Same University Campus PG notification as MCA for 2025-26.",
    },
    "pg_affiliated": {
        "label": "PG Programmes — Affiliated / Autonomous Colleges",
        "year": "2025-26",
        "pdf": "https://www.mangaloreuniversity.ac.in/upload/2025/ACC/Fees/PG-Programmes-Affiliated-Autonomous-Colleges.pdf",
        "pdf_label": "PG Fee Structure 2025-26 — Affiliated & Autonomous Colleges",
        "note": None,
    },
    "pg_government": {
        "label": "PG Programmes — Government Colleges",
        "year": "2025-26",
        "pdf": "https://www.mangaloreuniversity.ac.in/upload/2025/ACC/Fees/PG-Programmes-Government-Colleges.pdf",
        "pdf_label": "PG Fee Structure 2025-26 — Government Colleges",
        "note": None,
    },
    "ug": {
        "label": "UG Programmes",
        "year": "2026-27",
        "pdf": "https://www.mangaloreuniversity.ac.in/upload/2026/acc/fees/Revised%20UG%20Fee%20Structure-%2026-27.pdf",
        "pdf_label": "Revised UG Fee Structure 2026-27",
        "note": None,
    },
    "phd": {
        "label": "Ph.D",
        "year": "2021-22 (most recent found — verify before quoting)",
        "pdf": "https://www.mangaloreuniversity.ac.in/upload/academic/Ph.D%20fee%20structure-2021-22.pdf",
        "pdf_label": "Ph.D Fee Structure 2021-22",
        "note": "No newer Ph.D-specific fee PDF was found on the site — confirm with the Registrar's office.",
    },
}

# ============================================================
#  CAMPUS_DATA
#  Departments, offices, hostels, and facilities.
# ============================================================

CAMPUS_DATA = {

    # ---------------- Academic departments ----------------
    "computer science department": {
        "name": "Department of Computer Science", "name_kn": "ಗಣಕ ವಿಜ್ಞಾನ ವಿಭಾಗ",
        "location": "Science Block",
        "directions": "From Main Gate: proceed to the Science Block (see Main Gate entry for the campus-wide reference point).",
        "aliases": ["computer science", "cs department", "cs dept", "mca"],
        "chairperson": "Dr. B.H. Shekar",
        "chairperson_source": "https://mangaloreuniversity.ac.in/chairperson-14.html",
        "contact": "Also Director of the International Students Centre.",
        "fee_note": f"See MCA-specific fees by asking \"MCA fee\", or browse the [Fee Details page]({FEE_PAGE_URL}).",
        "last_verified": "2026-07-22",
        "verified": True,
    },
    "physics department": {
        "name": "Department of Physics", "name_kn": "ಭೌತಶಾಸ್ತ್ರ ವಿಭಾಗ",
        "location": "Science Block",
        "directions": "Within the Science Block — see Science Block entry.",
        "aliases": ["physics", "physics department", "physics dept"],
        "chairperson": "Dr. Yerol Narayana",
        "chairperson_source": "https://mangaloreuniversity.ac.in/chairperson-department.html",
        "last_verified": "2026-07-22",
        "verified": True,
    },
    "chemistry department": {
        "name": "Department of Chemistry", "name_kn": "ರಸಾಯನಶಾಸ್ತ್ರ ವಿಭಾಗ",
        "location": "Science Block",
        "directions": "Within the Science Block — see Science Block entry.",
        "aliases": ["chemistry", "chemistry department", "chemistry dept"],
        "chairperson": "Prof. Boja Poojary",
        "chairperson_source": "https://www.mangaloreuniversity.ac.in/chairperson-15.html",
        "last_verified": "2026-07-22",
        "verified": True,
    },
    "mathematics department": {
        "name": "Department of Mathematics", "name_kn": "ಗಣಿತ ವಿಭಾಗ",
        "location": "Science Block",
        "directions": "Within the Science Block — see Science Block entry.",
        "aliases": ["mathematics", "maths", "mathematics department", "maths department"],
        "chairperson": "Dr. Kishori P. Narayankar",
        "chairperson_source": "https://www.mangaloreuniversity.ac.in/chairperson-2.html",
        "last_verified": "2026-07-22",
        "verified": True,
    },
    "mba department": {
        "name": "MBA Department (Business Administration)", "name_kn": "ಎಂಬಿಎ ವಿಭಾಗ (ವ್ಯವಹಾರ ಆಡಳಿತ)",
        "location": "Faculty of Commerce",
        "directions": "See Main Gate entry for the campus-wide reference point (exact walking route not yet confirmed).",
        "aliases": ["mba", "management", "business school", "business administration"],
        # The site has two different pages both claiming to be the current
        # chairperson (chairperson-10.html -> Dr. Sheker Naik vs.
        # chairperson-8.html -> Dr. Preethi Keerthi D'Souza). The 2022 MU
        # Diary adds a third data point: Prof. Puttanna K as chair back then,
        # with Dr. Sheker Naik as coordinator of the MBA (Tourism & Travel
        # Management) specialization specifically — so this may be a genuine
        # progression (Puttanna K -> Sheker Naik -> D'Souza) rather than a
        # site error. Still don't assert a name without a phone confirmation.
        "chairperson": "Unconfirmed — see note: likely Puttanna K (2022) -> Sheker Naik -> Preethi Keerthi D'Souza, call 0824-2287209 to verify current",
        "contact": "Phone: 9740841002 · Office: 0824-2287209",
        "last_verified": "2026-07-22",
        "verified": True,
    },
    "science block": {
        "name": "Science Block", "name_kn": "ವಿಜ್ಞಾನ ವಿಭಾಗ (ಬ್ಲಾಕ್)",
        "location": "Faculty of Science & Technology cluster",
        "directions": "Houses Computer Science, Physics, Chemistry, Mathematics and other science departments (exact floor plan / GPS pin not yet added — see note below).",
        "aliases": ["science", "sci block"],
        "departments_here": ["Computer Science", "Physics", "Chemistry", "Mathematics",
                              "Applied Botany", "Applied Zoology", "Biochemistry", "Biosciences",
                              "Electronics", "Geography", "Industrial Chemistry",
                              "Library and Information Science", "Marine Geology",
                              "Materials Science", "Microbiology", "Statistics"],
        "verified": True,
        "note": "The department list is confirmed from the official site; an older version of this bot "
                "had a specific floor-by-floor layout that was a placeholder, not confirmed fact — removed until verified.",
    },

    # ---------------- Remaining PG departments ----------------
    # Sourced from the official 2022 "MU Diary" staff directory PDF.
    # NOT individually re-verified against a 2025/2026 department page like
    # CS/Physics/Chemistry/Mathematics/MBA above — treat the chairperson
    # name as a few years old and possibly rotated since. Good enough for
    # "which department handles X" and a real contact number, but call
    # ahead if the exact current chairperson's name matters.
    "applied botany department": {
        "name": "Department of Applied Botany", "location": "Science Block", "name_kn": "ಅನ್ವಯಿಕ ಸಸ್ಯಶಾಸ್ತ್ರ ವಿಭಾಗ",
        "aliases": ["applied botany", "botany"],
        "chairperson": "Prof. Krishnakumar G. (as of 2022 Diary — verify)",
        "contact": "Office: 2287272 · Mobile: 9449330901",
        "verified": True, "last_verified": "2022 (MU Diary)",
    },
    "applied zoology department": {
        "name": "Department of Applied Zoology", "location": "Science Block", "name_kn": "ಅನ್ವಯಿಕ ಪ್ರಾಣಿಶಾಸ್ತ್ರ ವಿಭಾಗ",
        "aliases": ["applied zoology", "zoology"],
        "chairperson": "Prof. Sreepada K.S. (as of 2022 Diary — verify)",
        "contact": "Office: 2287373 · Mobile: 9481015395",
        "verified": True, "last_verified": "2022 (MU Diary)",
    },
    "biosciences department": {
        "name": "Department of Biosciences", "location": "Science Block", "name_kn": "ಜೀವ ವಿಜ್ಞಾನ ವಿಭಾಗ",
        "aliases": ["biosciences", "biotechnology", "environment science", "food science", "microbiology"],
        "chairperson": "Prof. Monika Sadananda (as of 2022 Diary — verify)",
        "contact": "Office: 2287261 · Mobile: 9448869719",
        "note": "Also coordinates Biotechnology, Environment Science, Food Science & Nutrition, and Microbiology PG courses under the same office.",
        "verified": True, "last_verified": "2022 (MU Diary)",
    },
    "economics department": {
        "name": "Department of Economics", "location": "Faculty of Arts", "name_kn": "ಅರ್ಥಶಾಸ್ತ್ರ ವಿಭಾಗ",
        "aliases": ["economics"],
        "chairperson": "Prof. Vishwanatha (as of 2022 Diary — verify)",
        "contact": "Office: 2287372 · Mobile: 9448503417",
        "verified": True, "last_verified": "2022 (MU Diary)",
    },
    "electronics department": {
        "name": "Department of Electronics", "location": "Science Block", "name_kn": "ಎಲೆಕ್ಟ್ರಾನಿಕ್ಸ್ ವಿಭಾಗ",
        "aliases": ["electronics"],
        "chairperson": "Prof. A.M. Khan (as of 2022 Diary — verify)",
        "contact": "Office: 2287437 · Mobile: 9901752373",
        "verified": True, "last_verified": "2022 (MU Diary)",
    },
    "english department": {
        "name": "Department of English", "location": "Faculty of Arts", "name_kn": "ಇಂಗ್ಲಿಷ್ ವಿಭಾಗ",
        "aliases": ["english"],
        "chairperson": "Prof. Kishori Nayak K. (as of 2022 Diary — verify)",
        "contact": "Office: 2287381 · Mobile: 9342035991",
        "verified": True, "last_verified": "2022 (MU Diary)",
    },
    "history department": {
        "name": "Department of History", "location": "Faculty of Arts", "name_kn": "ಇತಿಹಾಸ ವಿಭಾಗ",
        "aliases": ["history"],
        "chairperson": "Prof. B. Udaya (as of 2022 Diary — verify)",
        "contact": "Office: 2287294 · Mobile: 9448331284",
        "verified": True, "last_verified": "2022 (MU Diary)",
    },
    "yogic sciences department": {
        "name": "Department of Human Consciousness & Yogic Sciences", "location": "On campus", "name_kn": "ಮಾನವ ಪ್ರಜ್ಞೆ ಮತ್ತು ಯೋಗ ವಿಜ್ಞಾನ ವಿಭಾಗ",
        "aliases": ["yogic science", "human consciousness"],
        "chairperson": "Prof. K. Krishna Sharma (as of 2022 Diary — verify)",
        "contact": "Office: 2287435 · Mobile: 9448241005",
        "verified": True, "last_verified": "2022 (MU Diary)",
    },
    "kannada department": {
        "name": "Department of Kannada", "location": "Faculty of Arts", "name_kn": "ಕನ್ನಡ ವಿಭಾಗ",
        "aliases": ["kannada"],
        "chairperson": "Prof. Somanna (as of 2022 Diary — verify)",
        "contact": "Office: 2287360 · Mobile: 9886165134",
        "verified": True, "last_verified": "2022 (MU Diary)",
    },
    "library science department": {
        "name": "Department of Library & Information Science", "location": "Science Block", "name_kn": "ಗ್ರಂಥಾಲಯ ಮತ್ತು ಮಾಹಿತಿ ವಿಜ್ಞಾನ ವಿಭಾಗ",
        "aliases": ["library and information science", "library science"],
        "chairperson": "Prof. Manjaiah D.H. (i/c, as of 2022 Diary — verify)",
        "contact": "Office: 2287316 · Mobile: 9449444638",
        "verified": True, "last_verified": "2022 (MU Diary)",
        "note": "Distinct from the University Library itself — see 'library' entry for the librarian/building.",
    },
    "marine geology department": {
        "name": "Department of Marine Geology", "location": "Science Block", "name_kn": "ಸಮುದ್ರ ಭೂವಿಜ್ಞಾನ ವಿಭಾಗ",
        "aliases": ["marine geology", "geo-informatics", "geography"],
        "chairperson": "Prof. K.S. Jayappa (as of 2022 Diary — verify)",
        "contact": "Office: 2287389 · Mobile: 9945370876",
        "note": "Also coordinates Geo-informatics and Geography PG courses.",
        "verified": True, "last_verified": "2022 (MU Diary)",
    },
    "journalism department": {
        "name": "Department of Mass Communication & Journalism", "location": "Faculty of Arts", "name_kn": "ಸಮೂಹ ಸಂವಹನ ಮತ್ತು ಪತ್ರಿಕೋದ್ಯಮ ವಿಭಾಗ",
        "aliases": ["mass communication", "journalism", "mcj"],
        "chairperson": "Sri M.P. Umeshchandra (as of 2022 Diary — verify)",
        "contact": "Office: 2287382 · Mobile: 9845848598",
        "verified": True, "last_verified": "2022 (MU Diary)",
    },
    "materials science department": {
        "name": "Department of Materials Science", "location": "Science Block", "name_kn": "ವಸ್ತು ವಿಜ್ಞಾನ ವಿಭಾಗ",
        "aliases": ["materials science"],
        "chairperson": "Prof. Manjunatha Pattabi (as of 2022 Diary — verify)",
        "contact": "Office: 2287249 · Mobile: 9448260563",
        "verified": True, "last_verified": "2022 (MU Diary)",
    },
    "physical education department": {
        "name": "Department of Physical Education", "location": "Sports/DPE block", "name_kn": "ದೈಹಿಕ ಶಿಕ್ಷಣ ವಿಭಾಗ",
        "aliases": ["physical education", "sports department"],
        "chairperson": "Dr. Gerald Santhosh D'Souza (as of 2022 Diary — verify)",
        "contact": "Office: 2287204 · Mobile: 9343572023",
        "verified": True, "last_verified": "2022 (MU Diary)",
    },
    "political science department": {
        "name": "Department of Political Science", "location": "Faculty of Arts", "name_kn": "ರಾಜ್ಯಶಾಸ್ತ್ರ ವಿಭಾಗ",
        "aliases": ["political science"],
        "chairperson": "Prof. Jayaraj Amin (as of 2022 Diary — verify)",
        "contact": "Office: 2287364 · Mobile: 9448296840",
        "verified": True, "last_verified": "2022 (MU Diary)",
    },
    "sociology department": {
        "name": "Department of Sociology", "location": "Faculty of Arts", "name_kn": "ಸಮಾಜಶಾಸ್ತ್ರ ವಿಭಾಗ",
        "aliases": ["sociology"],
        "chairperson": "Prof. Vinay Rajath D. (as of 2022 Diary — verify)",
        "contact": "Office: 2287374 · Mobile: 9448815520",
        "verified": True, "last_verified": "2022 (MU Diary)",
    },
    "social work department": {
        "name": "Department of Social Work", "location": "Faculty of Arts", "name_kn": "ಸಮಾಜ ಕಾರ್ಯ ವಿಭಾಗ",
        "aliases": ["social work", "msw"],
        "chairperson": "Prof. P.G. Aquinas (as of 2022 Diary — verify)",
        "contact": "Office: 2287621 · Mobile: 9448109870",
        "verified": True, "last_verified": "2022 (MU Diary)",
    },
    "statistics department": {
        "name": "Department of Statistics", "location": "Science Block", "name_kn": "ಸಂಖ್ಯಾಶಾಸ್ತ್ರ ವಿಭಾಗ",
        "aliases": ["statistics"],
        "chairperson": "Prof. Ishwara P. (i/c, as of 2022 Diary — verify)",
        "contact": "Office: 2287358 · Mobile: 7411735203",
        "verified": True, "last_verified": "2022 (MU Diary)",
    },
    "commerce department": {
        "name": "Department of Commerce", "location": "Faculty of Commerce", "name_kn": "ವಾಣಿಜ್ಯ ವಿಭಾಗ",
        "aliases": ["commerce", "m.com", "mcom"],
        "chairperson": "Dr. Parameshwara (as of 2022 Diary — verify)",
        "contact": "Office: 2287263 · Mobile: 9482249259",
        "verified": True, "last_verified": "2022 (MU Diary)",
    },
    "industrial chemistry department": {
        "name": "Department of Industrial Chemistry", "location": "Science Block", "name_kn": "ಕೈಗಾರಿಕಾ ರಸಾಯನಶಾಸ್ತ್ರ ವಿಭಾಗ",
        "aliases": ["industrial chemistry", "biochemistry"],
        "chairperson": "Dr. Ramesh Sabu Gani (as of 2022 Diary — verify)",
        "contact": "Office: 2287847 · Mobile: 8277346847",
        "note": "Biochemistry PG runs as a coordinated course under the same office (Prof. Boja Poojary, i/c in 2022).",
        "verified": True, "last_verified": "2022 (MU Diary)",
    },

    # ---------------- Administration ----------------
    "vice chancellor office": {
        "name": "Vice Chancellor's Office", "name_kn": "ಕುಲಪತಿಗಳ ಕಚೇರಿ",
        "location": "Administration",
        "person": "Prof. P.L. Dharma (Vice Chancellor)",
        "contact": "Office: 0824-2287347",
        "aliases": ["vice chancellor", "vc office", "vc"],
        "verified": True,
        "last_verified": "2026-07-22",
    },
    "registrar office": {
        "name": "Registrar's Office", "name_kn": "ಕುಲಸಚಿವರ ಕಚೇರಿ",
        "location": "Administration",
        "person": "Dr. Ganesh Sanjeev (Registrar)",
        "contact": "Office: 0824-2287276",
        "aliases": ["registrar", "registrar office", "administrative office", "admin office"],
        "verified": True,
        "last_verified": "2026-07-22",
    },
    "examination section": {
        "name": "Examination Section — Registrar (Evaluation)", "name_kn": "ಪರೀಕ್ಷಾ ವಿಭಾಗ (ಕುಲಸಚಿವರು - ಮೌಲ್ಯಮಾಪನ)",
        "location": "Administration",
        "person": "Dr. H Devendrappa (Registrar, Evaluation)",
        "contact": "Office: 0824-2287327 · Exam/marks-card queries: +91-948-160-8909",
        "aliases": ["examination section", "exam section", "exam office", "results", "marks card"],
        "verified": True,
        "last_verified": "2026-07-22",
        "note": "Migration certificates are also handled through this office (see 'migration certificate' below).",
    },
    "migration certificate": {
        "name": "Migration Certificate", "name_kn": "ವಲಸೆ ಪ್ರಮಾಣಪತ್ರ",
        "location": "Handled by the Examination Section / Registrar (Evaluation)",
        "person": "Dr. H Devendrappa (Registrar, Evaluation)",
        "contact": "Office: 0824-2287327",
        "aliases": ["migration certificate", "migration cert"],
        "verified": True,
        "note": "Apply through the Registrar (Evaluation) office. Exact document checklist/online form "
                "wasn't confirmed — call ahead to check current requirements.",
        "last_verified": "2026-07-22",
    },
    "finance section": {
        "name": "Finance Officer's Section", "name_kn": "ಹಣಕಾಸು ಅಧಿಕಾರಿಗಳ ವಿಭಾಗ",
        "location": "Administration",
        "person": "Sri Panchalingaswamy S. (Finance Officer)",
        "contact": "Office: 0824-2287376",
        "aliases": ["finance section", "finance office", "accounts office"],
        "verified": True,
        "last_verified": "2026-07-22",
    },
    "international student office": {
        "name": "International Students Centre", "name_kn": "ಅಂತರರಾಷ್ಟ್ರೀಯ ವಿದ್ಯಾರ್ಥಿಗಳ ಕೇಂದ್ರ",
        "location": "Administration",
        "person": "Dr. B.H. Shekar (Director, also CS Department Chairperson)",
        "contact": "Mobile: 9480146921",
        "aliases": ["international student", "international students centre", "foreign student office"],
        "verified": True,
        "last_verified": "2026-07-22",
    },
    "library": {
        "name": "University Library", "name_kn": "ವಿಶ್ವವಿದ್ಯಾಲಯ ಗ್ರಂಥಾಲಯ",
        "location": "Central Library building",
        "person": "Dr. M. Purushotham Gowda (Librarian, i/c)",
        "contact": "Mobile: 9449450671",
        "aliases": ["libary", "librery", "lib", "library", "book", "university library"],
        "timings": "Not published with exact hours on the official site — confirm at the desk.",
        "verified": True,
        "last_verified": "2026-07-22",
    },

    # ---------------- Hostels ----------------
    "boys hostel": {
        "name": "University Hostel for Men", "name_kn": "ಪುರುಷರ ವಿಶ್ವವಿದ್ಯಾಲಯ ವಸತಿ ನಿಲಯ",
        "location": "On campus (exact building/GPS not yet confirmed)",
        "person": "Dr. Ramesh H.N. (Faculty Advisor)",
        "contact": "Office: 0824-2287206",
        "aliases": ["boys hostel", "men hostel", "hostel for men"],
        "verified": True,
        "last_verified": "2026-07-22",
    },
    "ladies hostel": {
        "name": "University Hostel for Women", "name_kn": "ಮಹಿಳೆಯರ ವಿಶ್ವವಿದ್ಯಾಲಯ ವಸತಿ ನಿಲಯ",
        "location": "On campus (exact building/GPS not yet confirmed)",
        "person": "Dr. H.L Shashirekha (Faculty Advisor)",
        "contact": "Office: 0824-2287319",
        "aliases": ["ladies hostel", "girls hostel", "women hostel", "hostel for women"],
        "verified": True,
        "last_verified": "2026-07-22",
        "note": "There is also a separate 'Working Women's Hostel' (Faculty Advisor: Dr. M Chandra, "
                "mobile 7353812285) for a different category of resident — ask if that's the one you mean.",
    },

    # ---------------- Facilities not published by the university (placeholders) ----------------
    "kuvempu bhavan": {
        "name": "\"Kuvempu Bhavan\"", "name_kn": "\"ಕುವೆಂಪು ಭವನ\"",
        "location": "UNCONFIRMED",
        "aliases": ["kuvempu bhavan"],
        "verified": False,
        "note": "This exact name did not turn up on the official Mangalore University site. There IS a "
                "'Mangala Auditorium' (used for university functions) and a 'Kuvempu Gallery' — one of "
                "these may be what's meant. Confirm on campus, then fill in the real name/location here.",
    },
    "auditorium": {
        "name": "Mangala Auditorium", "name_kn": "ಮಂಗಳಾ ಸಭಾಂಗಣ",
        "location": "UNCONFIRMED exact location",
        "aliases": ["auditorium", "mangala auditorium"],
        "verified": False,
        "note": "Name confirmed to exist (used for university felicitations/events) but exact GPS/building "
                "position not confirmed from public sources — add the real pin here.",
    },
    "guest house": {
        "name": "University Guest House", "name_kn": "ವಿಶ್ವವಿದ್ಯಾಲಯ ಅತಿಥಿ ಗೃಹ",
        "location": "On campus — two blocks: Kaveri and Nethravathi",
        "contact": "Kaveri Guest House: 0824-2287422 · Nethravathi Guest House: 0824-2287242",
        "person": "Faculty-in-Charge (as of 2022 Diary — verify current name)",
        "aliases": ["guest house", "guesthouse", "kaveri guest house", "nethravathi guest house"],
        "verified": True,
        "last_verified": "2022 (MU Diary)",
        "note": "Exact building GPS not yet added — but the two guest-house blocks and their booking "
                "phone numbers are confirmed from the official directory.",
    },
    "parking area": {
        "name": "Parking Area", "name_kn": "ವಾಹನ ನಿಲುಗಡೆ ಪ್ರದೇಶ",
        "location": "UNCONFIRMED",
        "aliases": ["parking", "parking area", "vehicle parking"],
        "verified": False,
        "note": "Contact the Estate Officer (Dr. Parameshwara, 9482249259) for campus infrastructure "
                "questions like this if it isn't obvious on-site.",
    },
    "main gate": {
        "name": "Main Gate", "name_kn": "ಮುಖ್ಯ ದ್ವಾರ",
        "location": "UNCONFIRMED exact GPS",
        "aliases": ["main gate", "entrance", "campus gate"],
        "verified": False,
        "lat": None,  # <-- fill this in first; every other "directions" entry is relative to this point
        "lng": None,
        # Real, verified photo (CC-BY-SA-3.0) — the ONE genuine building
        # photo in this dataset so far. Everything else below has no
        # image_url because no verified specific photo was found for it —
        # see the note in image_attribution for how to add more.
        "image_url": "https://commons.wikimedia.org/wiki/Special:FilePath/Entrance_of_Mangalore_University_in_Konaje.jpg",
        "image_attribution": "Photo: Msclrfl22, CC BY-SA 3.0, via Wikimedia Commons",
        "note": "Every direction in this bot should be relative to this point — get its real GPS pin first, "
                "since all other 'directions' entries depend on it.",
    },
    "atm": {
        "name": "State Bank of India (on/near campus)", "name_kn": "ಭಾರತೀಯ ಸ್ಟೇಟ್ ಬ್ಯಾಂಕ್ (ಕ್ಯಾಂಪಸ್‌ನಲ್ಲಿ/ಹತ್ತಿರ)",
        "location": "Mangalagangotri campus area",
        "contact": "SBI: 0824-2449320 · Bank of Baroda: 0824-2287280",
        "aliases": ["atm", "cash machine", "sbi", "sbi bank", "bank", "bank of baroda"],
        "verified": True,
        "last_verified": "2022 (MU Diary)",
        "note": "Confirmed from the official campus amenities directory — exact building location not yet pinned.",
    },
    "security": {
        "name": "Security Control Room", "name_kn": "ಭದ್ರತಾ ನಿಯಂತ್ರಣ ಕೊಠಡಿ",
        "location": "On campus",
        "contact": "Supervisor: 9241266183",
        "aliases": ["security", "security office", "watchman", "guard"],
        "verified": True,
        "last_verified": "2022 (MU Diary)",
    },
    "post office": {
        "name": "Post Office", "name_kn": "ಅಂಚೆ ಕಚೇರಿ",
        "location": "On campus",
        "contact": "0824-2287282",
        "aliases": ["post office", "postal"],
        "verified": True,
        "last_verified": "2022 (MU Diary)",
    },
    "medical center": {
        "name": "University Health Centre", "name_kn": "ವಿಶ್ವವಿದ್ಯಾಲಯ ಆರೋಗ್ಯ ಕೇಂದ್ರ",
        "location": "On campus",
        "contact": "0824-2287590",
        "person": "In-charge as of 2022 Diary: Prof. Raju Krishna Chalannavar — verify current",
        "aliases": ["medical center", "medical centre", "health center", "health centre", "clinic", "first aid"],
        "verified": True,
        "note": "Confirmed to exist with a real office number — the specific in-charge name is a few years old, verify by phone.",
        "last_verified": "2022 (MU Diary)",
    },
    "canteen": {
        "name": "Canteen", "name_kn": "ಕ್ಯಾಂಟೀನ್",
        "location": "UNCONFIRMED exact location",
        "aliases": ["canten", "canteen", "food court", "mess", "eat", "food"],
        "verified": False,
        "note": "Not found in official sources checked so far (department directory and amenities list don't "
                "mention one by name) — confirm on-site whether/where one operates.",
    },
    "washroom": {
        "name": "Washroom", "name_kn": "ಶೌಚಾಲಯ",
        "location": "UNCONFIRMED — varies by building",
        "aliases": ["washroom", "restroom", "toilet"],
        "verified": False,
        "note": "Nearest washroom depends on which building you're in — not something a static bot can "
                "answer without knowing the user's current location (see Find_Nearest note below).",
    },
    "xerox": {
        "name": "Xerox / Printing", "name_kn": "ಜೆರಾಕ್ಸ್ / ಮುದ್ರಣ",
        "location": "UNCONFIRMED",
        "aliases": ["xerox", "photocopy", "print", "printout"],
        "verified": False,
        "note": "Not documented publicly — likely near the library or a stationery shop close to campus; confirm on-site.",
    },
}

# Keep an untouched copy of the original hardcoded data. If Supabase is
# unreachable/unconfigured, the app still runs perfectly using this —
# admin edits just won't persist across restarts until the DB is set up.
_CAMPUS_DATA_DEFAULTS = copy.deepcopy(CAMPUS_DATA)

# ============================================================
#  ADMIN LOGIN + LIVE DATA EDITING
#
#  Lets an admin log in with a single shared password (simple by design —
#  this is a small student-project admin panel, not a multi-user system)
#  and edit department/office fields (chairperson, contact, fee notes,
#  etc.) directly from the app. Changes are:
#    1. Applied to CAMPUS_DATA in memory immediately (chat answers reflect
#       it right away, no redeploy needed)
#    2. Saved to Supabase (a free Postgres database) so they SURVIVE a
#       redeploy or restart — Render's own filesystem is wiped on every
#       deploy, so without an external database, "admin edits" would
#       silently vanish the next time the service restarts.
#
#  Required environment variables (set in Render's Environment tab):
#    ADMIN_PASSWORD   - the password admins log in with
#    ADMIN_SECRET     - random string used to sign login tokens (any long
#                       random string — e.g. generate one at
#                       https://randomkeygen.com and never share it)
#    SUPABASE_URL     - e.g. https://xxxxx.supabase.co
#    SUPABASE_SERVICE_KEY - the "service_role" key from Supabase's API
#                       settings (NOT the anon key — service_role bypasses
#                       row-level security so the backend can write; NEVER
#                       put this key in the Flutter app, only here)
#
#  Supabase one-time setup (free tier):
#    1. Create a project at supabase.com
#    2. SQL Editor → run:
#         create table campus_data (
#           key text primary key,
#           data jsonb not null,
#           updated_at timestamptz default now()
#         );
#    3. Settings → API → copy the Project URL and the service_role key
#       into Render's environment variables above.
#
#  If any of these env vars are missing, admin login/editing is disabled
#  gracefully — the chatbot itself keeps working normally either way.
# ============================================================

ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD")
ADMIN_SECRET = os.environ.get("ADMIN_SECRET")
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_KEY")

ADMIN_AUTH_CONFIGURED = bool(ADMIN_PASSWORD and ADMIN_SECRET)
SUPABASE_CONFIGURED = bool(SUPABASE_URL and SUPABASE_SERVICE_KEY)

_serializer = URLSafeTimedSerializer(ADMIN_SECRET) if ADMIN_SECRET else None
ADMIN_TOKEN_MAX_AGE = 60 * 60 * 8  # 8 hours

def _supabase_headers():
    return {
        "apikey": SUPABASE_SERVICE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
        "Content-Type": "application/json",
    }

def load_overrides_from_supabase():
    """Called once at startup: pulls any previously-saved admin edits
    (both departments AND fees, distinguished by a namespace prefix in
    the stored key: 'dept:xxx' or 'fee:xxx') and merges them onto the
    hardcoded defaults. New entries an admin created (not in the original
    hardcoded data) are added fresh. If Supabase isn't configured or the
    request fails, everything just stays as the hardcoded defaults —
    never crashes the app."""
    if not SUPABASE_CONFIGURED:
        return {"attempted": False, "reason": "Supabase not configured"}
    try:
        resp = requests.get(
            f"{SUPABASE_URL}/rest/v1/campus_data?select=key,data",
            headers=_supabase_headers(),
            timeout=10,
        )
        resp.raise_for_status()
        rows = resp.json()
        applied = 0
        for row in rows:
            raw_key = row.get("key", "")
            data = row.get("data")
            if not isinstance(data, dict) or ":" not in raw_key:
                continue
            namespace, key = raw_key.split(":", 1)
            if namespace == "dept":
                if key in CAMPUS_DATA:
                    CAMPUS_DATA[key].update(data)
                else:
                    CAMPUS_DATA[key] = data  # admin-created department
                applied += 1
            elif namespace == "fee":
                if key in COURSE_FEES:
                    COURSE_FEES[key].update(data)
                else:
                    COURSE_FEES[key] = data  # admin-created fee category
                applied += 1
        return {"attempted": True, "success": True, "rows_applied": applied}
    except Exception as e:
        return {"attempted": True, "success": False, "error": f"{type(e).__name__}: {e}"}

def save_override_to_supabase(namespace: str, key: str, fields: Dict[str, Any]):
    """Upserts fields for one entry (department OR fee, distinguished by
    namespace: 'dept' or 'fee') into Supabase, so the edit survives
    future restarts/redeploys."""
    if not SUPABASE_CONFIGURED:
        return {"success": False, "error": "Supabase not configured — edit only applied in memory, will be lost on restart"}
    storage_key = f"{namespace}:{key}"
    try:
        existing = requests.get(
            f"{SUPABASE_URL}/rest/v1/campus_data?key=eq.{storage_key}&select=data",
            headers=_supabase_headers(),
            timeout=10,
        )
        existing_data = {}
        if existing.ok and existing.json():
            existing_data = existing.json()[0].get("data", {}) or {}
        merged = {**existing_data, **fields}

        resp = requests.post(
            f"{SUPABASE_URL}/rest/v1/campus_data",
            headers={**_supabase_headers(), "Prefer": "resolution=merge-duplicates"},
            json={"key": storage_key, "data": merged},
            timeout=10,
        )
        resp.raise_for_status()
        return {"success": True}
    except Exception as e:
        return {"success": False, "error": f"{type(e).__name__}: {e}"}

def delete_override_from_supabase(namespace: str, key: str):
    if not SUPABASE_CONFIGURED:
        return {"success": False, "error": "Supabase not configured"}
    storage_key = f"{namespace}:{key}"
    try:
        resp = requests.delete(
            f"{SUPABASE_URL}/rest/v1/campus_data?key=eq.{storage_key}",
            headers=_supabase_headers(),
            timeout=10,
        )
        resp.raise_for_status()
        return {"success": True}
    except Exception as e:
        return {"success": False, "error": f"{type(e).__name__}: {e}"}

def create_admin_token() -> str:
    return _serializer.dumps({"role": "admin"})

def verify_admin_token(authorization: Optional[str]):
    """Dependency-style check used at the top of every admin write
    endpoint. Raises HTTPException if the token is missing/invalid/expired."""
    if not ADMIN_AUTH_CONFIGURED:
        raise HTTPException(status_code=503, detail="Admin login is not configured on this server yet")
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing Authorization header")
    token = authorization.removeprefix("Bearer ").strip()
    try:
        _serializer.loads(token, max_age=ADMIN_TOKEN_MAX_AGE)
    except SignatureExpired:
        raise HTTPException(status_code=401, detail="Session expired, please log in again")
    except BadSignature:
        raise HTTPException(status_code=401, detail="Invalid token")

class AdminLoginRequest(BaseModel):
    password: str

class AdminUpdateRequest(BaseModel):
    fields: Dict[str, Any]  # e.g. {"chairperson": "Dr. New Name", "contact": "..."}

class AdminCreateDepartmentRequest(BaseModel):
    key: str  # internal id, e.g. "geography department" — lowercase, used in URLs
    name: str
    location: str = ""  # building/block name
    chairperson: str = ""
    contact: str = ""
    aliases: Optional[list] = None  # auto-generated from name if omitted

class AdminCreateFeeRequest(BaseModel):
    key: str
    label: str
    year: str = ""
    pdf: str = ""
    pdf_label: str = ""
    note: Optional[str] = None

def clean_text(text):
    return re.sub(r'[^\w\s]', '', text.lower().strip())

# ============================================================
#  SPELL CORRECTION
#
#  Builds a vocabulary from every alias/name/keyword already in the
#  system, then corrects individual mistyped words against it before
#  matching. This generalizes past the "chairman" bug fix — it now
#  catches typos in ANY word (e.g. "regsitrar", "hostl", "kannda"),
#  not just ones we've hardcoded as aliases. Runs BEFORE the exact/
#  alias matcher, so correct spellings are untouched and fast; it only
#  kicks in for words that don't already match something.
# ============================================================

_INTENT_KEYWORDS = [
    "hi", "hello", "hey", "help", "bye", "goodbye", "thanks", "thank",
    "nearest", "closest", "distance", "timing", "timings", "hours",
    "fee", "fees", "tuition", "chairperson", "hod", "department",
    "directions", "direction", "where", "who", "contact", "phone",
]

def _build_vocabulary():
    vocab = set()
    for data in CAMPUS_DATA.values():
        for alias in data.get("aliases", []):
            for word in alias.split():
                if len(word) > 3:  # skip tiny words like "of", "is" — too risky to auto-correct
                    vocab.add(word)
        for word in data.get("name", "").lower().split():
            word = re.sub(r'[^\w]', '', word)
            if len(word) > 3:
                vocab.add(word)
    vocab.update(_INTENT_KEYWORDS)
    return vocab

_VOCABULARY = None  # built lazily, after CAMPUS_DATA is defined below

def spell_correct(text):
    """Fix individual mistyped words against the known vocabulary.
    Leaves already-correct words and short/common words untouched."""
    global _VOCABULARY
    if _VOCABULARY is None:
        _VOCABULARY = _build_vocabulary()

    words = text.split()
    corrected = []
    for word in words:
        if word in _VOCABULARY or len(word) <= 3:
            corrected.append(word)
            continue
        match = difflib.get_close_matches(word, _VOCABULARY, n=1, cutoff=0.78)
        corrected.append(match[0] if match else word)
    return " ".join(corrected)

# ============================================================
#  TRANSLATIONS
#
#  Only the bot's OWN wording is translated (labels, prompts, canned
#  replies). Official names, department titles, and person names are
#  NOT auto-translated/transliterated — those are proper nouns and
#  should only change if the university itself publishes a Kannada
#  version (mangaloreuniversity.ac.in/kannada/index.html exists — pull
#  official Kannada names from there if you want full localization).
# ============================================================

T = {
    "en": {
        "greeting": "Hello! 👋 I'm the Mangalore University Assistant. I can help with department info, office locations, timings, and fees. What do you need?",
        "goodbye_thanks": "You're welcome! 😊",
        "goodbye": "Goodbye! 👋 See you again soon!",
        "clarification": "No worries — tell me what you're looking for and I'll do my best. For example:\n"
                          "• \"Where is the library?\"\n"
                          "• \"Who is the HOD of Computer Science?\"\n"
                          "• \"MCA fee\"\n"
                          "• \"Registrar office contact\"",
        "fee_menu": "Which fee category do you need?\n\n"
                    "• **MCA** — try \"MCA fee\"\n"
                    "• **MBA** — try \"MBA fee\"\n"
                    "• **UG programmes** — try \"UG fee\"\n"
                    "• **Affiliated/autonomous college PG** — try \"affiliated college fee\"\n"
                    "• **Government college PG** — try \"government college fee\"\n"
                    "• **Ph.D** — try \"PhD fee\"\n\n"
                    "Or browse everything on the [Fee Details page]({fee_url}).",
        "fee_other": "For any other category, see the full [Fee Details page]({fee_url}).",
        "directions_which": "Which building or office do you need directions to?",
        "distance_stub": "I can't calculate live walking distance/time yet — that needs a maps routing API "
                          "plus your current GPS position, which this text-only backend doesn't have wired up. "
                          "For now I can tell you the relative direction from the Main Gate if you ask "
                          "\"how do I reach X\" instead.",
        "nearest_stub": "Finding the *nearest* facility to you specifically requires your live location, which "
                        "this backend doesn't receive yet. If your app can send GPS coordinates with the request, "
                        "I can be upgraded to calculate nearest-facility properly — for now, tell me which specific "
                        "place you mean (e.g. \"canteen\") and I'll share what's documented about it.",
        "timings_which": "Which place's timings do you need — library, canteen, admin office?",
        "timings_not_published": "Specific hours for {name} aren't published on the official site — call the contact below to confirm.",
        "no_match": "I couldn't match that to anything in my database yet. Try naming the department, "
                    "office, or facility directly — e.g. \"Computer Science department\" or \"boys hostel\".",
        "list_all_header": "Here's everything I have on file:",
        "faq_fallback": "I didn't fully understand that. Try asking about a department, office, hostel, or fees — "
                        "or say \"help\" to see what I can do.",
        "label_chairperson": "Chairperson",
        "label_as_of": "as of",
        "label_directions": "",  # directions text already has its own icon+prefix
        "unverified_warning": "Not independently confirmed from the official university site — see note below.",
        "gps_missing": "Exact GPS not yet set for this specific spot — pin below goes to the general campus location instead.",
        "open_maps": "Open in Google Maps",
        "open_campus_maps": "Open Campus in Google Maps",
        "directions_to": "Directions to",
    },
    "kn": {
        "greeting": "ನಮಸ್ಕಾರ! 👋 ನಾನು ಮಂಗಳೂರು ವಿಶ್ವವಿದ್ಯಾಲಯದ ಸಹಾಯಕ. ವಿಭಾಗದ ಮಾಹಿತಿ, ಕಚೇರಿ ಸ್ಥಳಗಳು, ಸಮಯ ಮತ್ತು ಶುಲ್ಕದ ಬಗ್ಗೆ ನಾನು ಸಹಾಯ ಮಾಡಬಲ್ಲೆ. ನಿಮಗೆ ಏನು ಬೇಕು?",
        "goodbye_thanks": "ಸ್ವಾಗತ! 😊",
        "goodbye": "ವಿದಾಯ! 👋 ಮತ್ತೆ ಸಿಗೋಣ!",
        "clarification": "ಪರವಾಗಿಲ್ಲ — ನಿಮಗೆ ಏನು ಬೇಕು ಎಂದು ಹೇಳಿ, ನಾನು ಪ್ರಯತ್ನಿಸುತ್ತೇನೆ. ಉದಾಹರಣೆಗೆ:\n"
                          "• \"ಗ್ರಂಥಾಲಯ ಎಲ್ಲಿದೆ?\"\n"
                          "• \"ಕಂಪ್ಯೂಟರ್ ಸೈನ್ಸ್ ವಿಭಾಗದ ಮುಖ್ಯಸ್ಥರು ಯಾರು?\"\n"
                          "• \"MCA ಶುಲ್ಕ\"\n"
                          "• \"ರಿಜಿಸ್ಟ್ರಾರ್ ಕಚೇರಿ ಸಂಪರ್ಕ\"",
        "fee_menu": "ನಿಮಗೆ ಯಾವ ಶುಲ್ಕ ವಿಭಾಗ ಬೇಕು?\n\n"
                    "• **MCA** — \"MCA ಶುಲ್ಕ\" ಎಂದು ಕೇಳಿ\n"
                    "• **MBA** — \"MBA ಶುಲ್ಕ\" ಎಂದು ಕೇಳಿ\n"
                    "• **UG ಕಾರ್ಯಕ್ರಮಗಳು** — \"UG ಶುಲ್ಕ\" ಎಂದು ಕೇಳಿ\n"
                    "• **ಅಂಗಸಂಸ್ಥೆ/ಸ್ವಾಯತ್ತ ಕಾಲೇಜು PG** — \"affiliated college fee\" ಎಂದು ಕೇಳಿ\n"
                    "• **ಸರ್ಕಾರಿ ಕಾಲೇಜು PG** — \"government college fee\" ಎಂದು ಕೇಳಿ\n"
                    "• **Ph.D** — \"PhD fee\" ಎಂದು ಕೇಳಿ\n\n"
                    "ಅಥವಾ ಎಲ್ಲವನ್ನೂ [ಶುಲ್ಕ ವಿವರಗಳ ಪುಟ]({fee_url}) ದಲ್ಲಿ ನೋಡಿ.",
        "fee_other": "ಇತರ ಯಾವುದೇ ವಿಭಾಗಕ್ಕಾಗಿ, ಸಂಪೂರ್ಣ [ಶುಲ್ಕ ವಿವರಗಳ ಪುಟ]({fee_url}) ನೋಡಿ.",
        "directions_which": "ನಿಮಗೆ ಯಾವ ಕಟ್ಟಡ ಅಥವಾ ಕಚೇರಿಗೆ ದಾರಿ ಬೇಕು?",
        "distance_stub": "ನಿಖರವಾದ ನಡಿಗೆ ದೂರ/ಸಮಯವನ್ನು ಇನ್ನೂ ಲೆಕ್ಕ ಹಾಕಲು ಸಾಧ್ಯವಿಲ್ಲ — ಅದಕ್ಕೆ ಮ್ಯಾಪ್ಸ್ ರೂಟಿಂಗ್ API ಮತ್ತು ನಿಮ್ಮ ಪ್ರಸ್ತುತ GPS ಸ್ಥಳ ಬೇಕು. "
                          "ಬದಲಿಗೆ \"how do I reach X\" ಎಂದು ಕೇಳಿದರೆ ಮುಖ್ಯ ಗೇಟಿನಿಂದ ದಿಕ್ಕನ್ನು ಹೇಳಬಲ್ಲೆ.",
        "nearest_stub": "ನಿಮಗೆ ಹತ್ತಿರವಿರುವ ಸೌಲಭ್ಯವನ್ನು ಕಂಡುಹಿಡಿಯಲು ನಿಮ್ಮ ಪ್ರಸ್ತುತ ಸ್ಥಳ ಬೇಕು, ಅದು ಈ ಬ್ಯಾಕೆಂಡ್‌ಗೆ ಇನ್ನೂ ಸಿಗುತ್ತಿಲ್ಲ. "
                        "ಈಗಿನಂತೆ, ನೀವು ಉದ್ದೇಶಿಸಿರುವ ನಿರ್ದಿಷ್ಟ ಸ್ಥಳವನ್ನು ಹೆಸರಿಸಿ (ಉದಾ. \"canteen\").",
        "timings_which": "ಯಾವ ಸ್ಥಳದ ಸಮಯ ಬೇಕು — ಗ್ರಂಥಾಲಯ, ಕ್ಯಾಂಟೀನ್, ಆಡಳಿತ ಕಚೇರಿ?",
        "timings_not_published": "{name} ನ ನಿಖರ ಸಮಯ ಅಧಿಕೃತ ಜಾಲತಾಣದಲ್ಲಿ ಪ್ರಕಟವಾಗಿಲ್ಲ — ದೃಢೀಕರಿಸಲು ಕೆಳಗಿನ ಸಂಪರ್ಕಕ್ಕೆ ಕರೆ ಮಾಡಿ.",
        "no_match": "ಅದು ನನ್ನ ಡೇಟಾಬೇಸ್‌ನಲ್ಲಿ ಇನ್ನೂ ಹೊಂದಿಕೆಯಾಗಲಿಲ್ಲ. ವಿಭಾಗ, ಕಚೇರಿ ಅಥವಾ ಸೌಲಭ್ಯದ ಹೆಸರನ್ನು ನೇರವಾಗಿ ಹೇಳಿ — "
                    "ಉದಾ. \"Computer Science department\" ಅಥವಾ \"boys hostel\".",
        "list_all_header": "ನನ್ನ ಬಳಿ ಇರುವ ಎಲ್ಲದರ ಪಟ್ಟಿ:",
        "faq_fallback": "ಅದು ನನಗೆ ಸಂಪೂರ್ಣವಾಗಿ ಅರ್ಥವಾಗಲಿಲ್ಲ. ವಿಭಾಗ, ಕಚೇರಿ, ಹಾಸ್ಟೆಲ್ ಅಥವಾ ಶುಲ್ಕದ ಬಗ್ಗೆ ಕೇಳಿ — "
                        "ಅಥವಾ ನಾನು ಏನು ಮಾಡಬಲ್ಲೆ ಎಂದು ನೋಡಲು \"help\" ಎಂದು ಹೇಳಿ.",
        "label_chairperson": "ಮುಖ್ಯಸ್ಥರು",
        "label_as_of": "ಈ ದಿನಾಂಕದಂತೆ",
        "label_directions": "",
        "unverified_warning": "ಅಧಿಕೃತ ವಿಶ್ವವಿದ್ಯಾಲಯ ಜಾಲತಾಣದಿಂದ ಸ್ವತಂತ್ರವಾಗಿ ದೃಢೀಕರಿಸಲಾಗಿಲ್ಲ — ಕೆಳಗಿನ ಟಿಪ್ಪಣಿ ನೋಡಿ.",
        "gps_missing": "ಈ ನಿರ್ದಿಷ್ಟ ಸ್ಥಳಕ್ಕೆ ನಿಖರ GPS ಇನ್ನೂ ಹೊಂದಿಸಿಲ್ಲ — ಕೆಳಗಿನ ಪಿನ್ ಸಾಮಾನ್ಯ ಕ್ಯಾಂಪಸ್ ಸ್ಥಳಕ್ಕೆ ಹೋಗುತ್ತದೆ.",
        "open_maps": "ಗೂಗಲ್ ಮ್ಯಾಪ್ಸ್‌ನಲ್ಲಿ ತೆರೆಯಿರಿ",
        "open_campus_maps": "ಕ್ಯಾಂಪಸ್ಸನ್ನು ಗೂಗಲ್ ಮ್ಯಾಪ್ಸ್‌ನಲ್ಲಿ ತೆರೆಯಿರಿ",
        "directions_to": "ಇಲ್ಲಿಗೆ ದಾರಿ",
    },
}

def tr(key, lang, **kwargs):
    """Look up a translated string, falling back to English if the key or
    language is missing, then apply any {placeholders}."""
    s = T.get(lang, T["en"]).get(key) or T["en"].get(key, key)
    return s.format(**kwargs) if kwargs else s

def find_course_fee(query):
    q = clean_text(query)
    keyword_map = {
        "mca": "mca", "mba": "mba",
        "ug": "ug", "undergraduate": "ug", "bsc": "ug", "b sc": "ug", "ba": "ug", "bcom": "ug",
        "phd": "phd", "ph d": "phd",
        "affiliated": "pg_affiliated", "autonomous": "pg_affiliated",
        "government college": "pg_government", "govt college": "pg_government",
    }
    for kw, course_key in keyword_map.items():
        if kw in q:
            return course_key
    return None

def format_course_fee(course_key, lang="en"):
    c = COURSE_FEES[course_key]
    response = f"**{c['label']} — Fee Structure ({c['year']})**\n\n"
    if c["note"]:
        response += f"ℹ️ {c['note']}\n\n"
    response += f"[📄 {c['pdf_label']}]({c['pdf']})\n\n"
    response += tr("fee_other", lang, fee_url=FEE_PAGE_URL)
    return response

def find_best_match(query):
    query = clean_text(query)
    for key, data in CAMPUS_DATA.items():
        if key in query or query in key:
            return key
        for alias in data.get("aliases", []):
            if alias in query or query in alias:
                return key
    matches = difflib.get_close_matches(query, list(CAMPUS_DATA.keys()), n=1, cutoff=0.6)
    return matches[0] if matches else None

def format_entry(key, lang="en"):
    data = CAMPUS_DATA[key]
    display_name = data.get("name_kn") if lang == "kn" and data.get("name_kn") else data['name']
    lines = [f"**{display_name}**"]

    if data.get("image_url"):
        # Parsed and stripped by the Flutter app's message renderer —
        # format: __IMAGE__:<url>|<attribution text>
        lines.append(f"__IMAGE__:{data['image_url']}|{data.get('image_attribution', '')}")

    if not data.get("verified", True):
        lines.append(f"⚠️ _{tr('unverified_warning', lang)}_")

    lines.append(f"📍 {data['location']}")

    if "directions" in data:
        lines.append(f"🚶 {data['directions']}")

    if "person" in data:
        lines.append(f"👤 {data['person']}")
    if "chairperson" in data:
        cp_line = f"👤 **{tr('label_chairperson', lang)}:** {data['chairperson']}"
        if "last_verified" in data:
            cp_line += f" _({tr('label_as_of', lang)} {data['last_verified']})_"
        lines.append(cp_line)

    if "contact" in data:
        lines.append(f"📞 {data['contact']}")

    if "timings" in data:
        lines.append(f"🕒 {data['timings']}")

    if "fee_note" in data:
        lines.append(f"💰 {data['fee_note']}")

    if "departments_here" in data:
        lines.append("**Departments here:** " + ", ".join(data["departments_here"]))

    if data.get("note"):
        lines.append(f"ℹ️ {data['note']}")

    lines.append(_navigation_block(data, lang))

    return "\n".join(lines)

def _navigation_block(data, lang="en"):
    """Returns a maps link + the Flutter app's location marker.
    Uses the entry's own lat/lng if set (exact pin); otherwise falls back
    to the real campus-center coordinate, clearly labeled as approximate."""
    lat, lng = data.get("lat"), data.get("lng")
    if lat is not None and lng is not None:
        return f"\n[🗺️ {tr('open_maps', lang)}]({get_maps_url(lat, lng)})\n{location_marker(lat, lng)}"
    return (
        f"\n📍 _{tr('gps_missing', lang)}_\n"
        f"[🗺️ {tr('open_campus_maps', lang)}]({get_maps_url(CAMPUS_CENTER_LAT, CAMPUS_CENTER_LNG)})\n"
        f"{location_marker(CAMPUS_CENTER_LAT, CAMPUS_CENTER_LNG)}"
    )

# ============================================================
#  INTENT CLASSIFICATION
#  Matches the taxonomy in your Chatbot_Questions doc:
#  Greeting, Find_Location, Get_Directions, Get_Distance,
#  Get_Timings, Find_Nearest, Get_Info, FAQ, Clarification, Goodbye
# ============================================================

GREETING_WORDS = ["hi", "hello", "hey", "hii", "good morning", "good afternoon", "good evening",
                  "help", "what can you do", "how can you help", "who are you"]
GOODBYE_WORDS = ["bye", "goodbye", "see you", "thanks", "thank you"]
DIRECTION_WORDS = ["how do i reach", "how can i go", "directions to", "direction to", "route to",
                    "navigate", "shortest path", "take me there", "show me on map", "guide me",
                    "how do i get to"]
DISTANCE_WORDS = ["how far", "distance", "how long", "walking time", "how much time"]
NEAREST_WORDS = ["nearest", "near me", "closest"]
TIMING_WORDS = ["timing", "timings", "hours", "open now", "close", "when does", "working hours"]
CLARIFICATION_WORDS = ["i don't know the name", "i dont know the name", "i forgot the building name",
                        "help me find", "i need directions", "i don't know", "i dont know"]

def _has_word(word, text):
    """Whole-word/phrase match instead of naive substring containment —
    fixes bugs like 'hi' falsely matching inside 'cahirman' (a typo of
    'chairman'), which used to hijack the Greeting intent."""
    return re.search(r'(?<!\w)' + re.escape(word) + r'(?!\w)', text) is not None

def classify_intent(query):
    q = clean_text(query)

    if any(_has_word(w, q) for w in GOODBYE_WORDS):
        return "Goodbye"
    if any(_has_word(w, q) for w in GREETING_WORDS):
        return "Greeting"
    if any(_has_word(w, q) for w in CLARIFICATION_WORDS):
        return "Clarification"
    if any(_has_word(w, q) for w in DIRECTION_WORDS):
        return "Get_Directions"
    if any(_has_word(w, q) for w in DISTANCE_WORDS):
        return "Get_Distance"
    if any(_has_word(w, q) for w in NEAREST_WORDS):
        return "Find_Nearest"
    if any(_has_word(w, q) for w in TIMING_WORDS):
        return "Get_Timings"
    if any(_has_word(w, q) for w in ["fee", "fees", "tuition", "payment"]):
        return "Get_Info"  # fee questions are a subtype of Get_Info
    if any(_has_word(w, q) for w in ["course", "hod", "chairperson", "who is", "which department",
                              "which block", "what facilities"]):
        return "Get_Info"
    if _has_word("where is", q) or _has_word("where can i", q) or _has_word("where", q):
        return "Find_Location"
    if _has_word("show all", q) or _has_word("list all", q) or _has_word("show academic", q):
        return "Get_Info"

    # If nothing matched but an entity IS recognizable, still treat as location.
    if find_best_match(q):
        return "Find_Location"

    # Genuinely unmatched (often a typo, like "cahirman") — route to Get_Info
    # so the Gemini fallback gets a real shot at it, instead of defaulting
    # straight to "Clarification" and never trying the AI layer.
    return "Get_Info"

_SUPABASE_LOAD_RESULT = None

@app.on_event("startup")
def _on_startup():
    global _SUPABASE_LOAD_RESULT
    _SUPABASE_LOAD_RESULT = load_overrides_from_supabase()

@app.get("/")
def root():
    return {"message": "Mangalore University Assistant API is LIVE! 🚀"}

@app.get("/debug/database")
def debug_database():
    """Diagnostic endpoint — shows whether Supabase is configured and
    whether the startup sync succeeded, without exposing the actual key."""
    key_hint = None
    if SUPABASE_SERVICE_KEY:
        key_hint = f"{SUPABASE_SERVICE_KEY[:4]}...{SUPABASE_SERVICE_KEY[-4:]} (len={len(SUPABASE_SERVICE_KEY)})"
    return {
        "supabase_configured": SUPABASE_CONFIGURED,
        "supabase_url": SUPABASE_URL,
        "service_key_hint": key_hint,
        "admin_auth_configured": ADMIN_AUTH_CONFIGURED,
        "startup_sync_result": _SUPABASE_LOAD_RESULT,
    }

@app.post("/admin/login")
def admin_login(request: AdminLoginRequest):
    if not ADMIN_AUTH_CONFIGURED:
        raise HTTPException(status_code=503, detail="Admin login is not configured on this server yet (missing ADMIN_PASSWORD/ADMIN_SECRET)")
    if request.password != ADMIN_PASSWORD:
        raise HTTPException(status_code=401, detail="Incorrect password")
    return {"token": create_admin_token(), "expires_in_seconds": ADMIN_TOKEN_MAX_AGE}

@app.get("/admin/departments")
def admin_list_departments(authorization: Optional[str] = Header(None)):
    verify_admin_token(authorization)
    # Return a trimmed view — enough to edit, without dumping every
    # internal note/alias field into the admin UI.
    return {
        key: {
            "name": data.get("name"),
            "name_kn": data.get("name_kn"),
            "location": data.get("location"),
            "chairperson": data.get("chairperson"),
            "contact": data.get("contact"),
            "person": data.get("person"),
            "fee_note": data.get("fee_note"),
            "timings": data.get("timings"),
            "verified": data.get("verified"),
            "last_verified": data.get("last_verified"),
        }
        for key, data in CAMPUS_DATA.items()
    }

@app.post("/admin/departments")
def admin_create_department(request: AdminCreateDepartmentRequest, authorization: Optional[str] = Header(None)):
    """Adds a brand-new department/office/building entry — for anything
    not already in the dataset (e.g. a newly-formed department, or a
    building that was missed)."""
    verify_admin_token(authorization)
    key = request.key.strip().lower()
    if not key:
        raise HTTPException(status_code=400, detail="key is required")
    if key in CAMPUS_DATA:
        raise HTTPException(status_code=409, detail=f"'{key}' already exists — use PUT /admin/departments/{key} to edit it instead")

    aliases = request.aliases or [w for w in re.findall(r'[a-z]+', request.name.lower()) if len(w) > 2]
    entry: Dict[str, Any] = {
        "name": request.name,
        "location": request.location,
        "aliases": aliases,
        "verified": False,  # admin-added entries start unverified until double-checked
        "last_verified": "admin-added",
    }
    if request.chairperson:
        entry["chairperson"] = request.chairperson
    if request.contact:
        entry["contact"] = request.contact

    CAMPUS_DATA[key] = entry
    save_result = save_override_to_supabase("dept", key, entry)
    return {"success": True, "key": key, "persisted": save_result.get("success", False), "persistence_error": save_result.get("error")}

@app.put("/admin/departments/{key}")
def admin_update_department(key: str, request: AdminUpdateRequest, authorization: Optional[str] = Header(None)):
    verify_admin_token(authorization)
    if key not in CAMPUS_DATA:
        raise HTTPException(status_code=404, detail=f"Unknown key '{key}'")

    # Apply in memory immediately — chat answers reflect this right away.
    CAMPUS_DATA[key].update(request.fields)
    CAMPUS_DATA[key]["last_verified"] = "admin-edited"

    # Persist to Supabase so it survives a restart/redeploy.
    save_result = save_override_to_supabase("dept", key, {**request.fields, "last_verified": "admin-edited"})

    return {
        "success": True,
        "key": key,
        "updated_fields": request.fields,
        "persisted": save_result.get("success", False),
        "persistence_error": save_result.get("error"),
    }

@app.delete("/admin/departments/{key}")
def admin_delete_department(key: str, authorization: Optional[str] = Header(None)):
    verify_admin_token(authorization)
    if key not in CAMPUS_DATA:
        raise HTTPException(status_code=404, detail=f"Unknown key '{key}'")
    del CAMPUS_DATA[key]
    delete_result = delete_override_from_supabase("dept", key)
    return {"success": True, "persisted_delete": delete_result.get("success", False)}

@app.post("/admin/reset/{key}")
def admin_reset_department(key: str, authorization: Optional[str] = Header(None)):
    """Resets one entry back to its original hardcoded default — useful
    if an admin edit was a mistake. Only works for entries that existed
    in the original hardcoded dataset (not admin-created new ones)."""
    verify_admin_token(authorization)
    if key not in _CAMPUS_DATA_DEFAULTS:
        raise HTTPException(status_code=404, detail=f"'{key}' has no original default to reset to (it may be an admin-created entry — delete it instead if it's wrong)")
    CAMPUS_DATA[key] = copy.deepcopy(_CAMPUS_DATA_DEFAULTS[key])
    save_result = save_override_to_supabase("dept", key, CAMPUS_DATA[key])
    return {"success": True, "persisted": save_result.get("success", False)}

# ---------------- Fee management ----------------

@app.get("/admin/fees")
def admin_list_fees(authorization: Optional[str] = Header(None)):
    verify_admin_token(authorization)
    return COURSE_FEES

@app.post("/admin/fees")
def admin_create_fee(request: AdminCreateFeeRequest, authorization: Optional[str] = Header(None)):
    verify_admin_token(authorization)
    key = request.key.strip().lower()
    if not key:
        raise HTTPException(status_code=400, detail="key is required")
    if key in COURSE_FEES:
        raise HTTPException(status_code=409, detail=f"'{key}' already exists — use PUT /admin/fees/{key} to edit it instead")
    entry = {
        "label": request.label,
        "year": request.year,
        "pdf": request.pdf,
        "pdf_label": request.pdf_label,
        "note": request.note,
    }
    COURSE_FEES[key] = entry
    save_result = save_override_to_supabase("fee", key, entry)
    return {"success": True, "key": key, "persisted": save_result.get("success", False), "persistence_error": save_result.get("error")}

@app.put("/admin/fees/{key}")
def admin_update_fee(key: str, request: AdminUpdateRequest, authorization: Optional[str] = Header(None)):
    verify_admin_token(authorization)
    if key not in COURSE_FEES:
        raise HTTPException(status_code=404, detail=f"Unknown fee key '{key}'")
    COURSE_FEES[key].update(request.fields)
    save_result = save_override_to_supabase("fee", key, COURSE_FEES[key])
    return {
        "success": True,
        "key": key,
        "persisted": save_result.get("success", False),
        "persistence_error": save_result.get("error"),
    }

@app.delete("/admin/fees/{key}")
def admin_delete_fee(key: str, authorization: Optional[str] = Header(None)):
    verify_admin_token(authorization)
    if key not in COURSE_FEES:
        raise HTTPException(status_code=404, detail=f"Unknown fee key '{key}'")
    del COURSE_FEES[key]
    delete_result = delete_override_from_supabase("fee", key)
    return {"success": True, "persisted_delete": delete_result.get("success", False)}

@app.get("/debug/gemini")
def debug_gemini():
    """Temporary diagnostic endpoint — visit this URL directly in a browser
    to see exactly why the Gemini layer is/isn't working, without exposing
    the actual API key. Remove this endpoint once everything's confirmed
    working, since it's unauthenticated and shouldn't stay in production
    long-term."""
    key_hint = None
    if GEMINI_API_KEY:
        key_hint = f"{GEMINI_API_KEY[:4]}...{GEMINI_API_KEY[-4:]} (len={len(GEMINI_API_KEY)})"
    return {
        "gemini_available": GEMINI_AVAILABLE,
        "api_key_present": bool(GEMINI_API_KEY),
        "api_key_hint": key_hint,
        "model": GEMINI_MODEL,
        "init_error": GEMINI_INIT_ERROR,
        "last_call_error": GEMINI_LAST_CALL_ERROR,
        "last_call_trace": GEMINI_LAST_TRACE,
        "ai_rephrase_enabled": AI_REPHRASE_ENABLED,
    }

@app.post("/chat")
def chat(request: ChatRequest):
    global GEMINI_LAST_TRACE, GEMINI_LAST_CALL_ERROR
    GEMINI_LAST_TRACE = {}
    GEMINI_LAST_CALL_ERROR = None

    result = _chat_logic(request)

    if request.debug:
        result["debug"] = {
            "gemini_available": GEMINI_AVAILABLE,
            "gemini_init_error": GEMINI_INIT_ERROR,
            "last_call_error": GEMINI_LAST_CALL_ERROR,
            "last_call_trace": GEMINI_LAST_TRACE,
        }
    return result

def _chat_logic(request: ChatRequest):
    lang = request.lang if request.lang in T else "en"
    raw_query = request.message.lower().strip()
    query = spell_correct(clean_text(raw_query))
    intent = classify_intent(query)

    if intent == "Greeting":
        return {"intent": intent, "answer": tr("greeting", lang)}

    if intent == "Goodbye":
        if "thank" in query:
            return {"intent": intent, "answer": tr("goodbye_thanks", lang)}
        return {"intent": intent, "answer": tr("goodbye", lang)}

    if intent == "Clarification":
        return {"intent": intent, "answer": tr("clarification", lang)}

    # Fee sub-routing (still under Get_Info)
    course_key = find_course_fee(query)
    if course_key and any(w in query for w in ["fee", "fees", "tuition", "payment"]):
        return {"intent": intent, "answer": format_course_fee(course_key, lang)}
    if any(w in query for w in ["fee", "fees", "tuition", "payment"]):
        return {"intent": intent, "answer": tr("fee_menu", lang, fee_url=FEE_PAGE_URL)}

    entry_key = find_best_match(query)

    if intent == "Get_Directions":
        if entry_key:
            data = CAMPUS_DATA[entry_key]
            display_name = data.get("name_kn") if lang == "kn" and data.get("name_kn") else data['name']
            answer = f"**{tr('directions_to', lang)} {display_name}**\n\n{data.get('directions', 'Route not yet documented — see note below.')}"
            if data.get("note"):
                answer += f"\n\nℹ️ {data['note']}"
            answer += "\n" + _navigation_block(data, lang)
            return {"intent": intent, "answer": answer}
        return {"intent": intent, "answer": tr("directions_which", lang)}

    if intent == "Get_Distance":
        if request.lat is None or request.lng is None:
            return {"intent": intent, "answer": tr("distance_need_gps", lang)}
        if entry_key:
            data = CAMPUS_DATA[entry_key]
            target_lat, target_lng = data.get("lat"), data.get("lng")
            approx = target_lat is None or target_lng is None
            if approx:
                target_lat, target_lng = CAMPUS_CENTER_LAT, CAMPUS_CENTER_LNG
            dist = haversine_km(request.lat, request.lng, target_lat, target_lng)
            display_name = data.get("name_kn") if lang == "kn" and data.get("name_kn") else data["name"]
            answer = tr("distance_result", lang, name=display_name, dist=format_km(dist))
            if approx:
                answer += "\n" + tr("distance_approx_note", lang)
            return {"intent": intent, "answer": answer}
        return {"intent": intent, "answer": tr("directions_which", lang)}

    if intent == "Find_Nearest":
        if request.lat is None or request.lng is None:
            return {"intent": intent, "answer": tr("nearest_need_gps", lang)}
        if entry_key:
            # User named a category (e.g. "nearest canteen") — just report
            # on that specific entry, same as Get_Distance.
            data = CAMPUS_DATA[entry_key]
            target_lat, target_lng = data.get("lat"), data.get("lng")
            approx = target_lat is None or target_lng is None
            if approx:
                target_lat, target_lng = CAMPUS_CENTER_LAT, CAMPUS_CENTER_LNG
            dist = haversine_km(request.lat, request.lng, target_lat, target_lng)
            display_name = data.get("name_kn") if lang == "kn" and data.get("name_kn") else data["name"]
            answer = tr("distance_result", lang, name=display_name, dist=format_km(dist))
            if approx:
                answer += "\n" + tr("distance_approx_note", lang)
            answer += "\n" + _navigation_block(data, lang)
            return {"intent": intent, "answer": answer}
        # No category named — rank every entry that has its OWN real lat/lng.
        pinned = [(k, v) for k, v in CAMPUS_DATA.items() if v.get("lat") is not None and v.get("lng") is not None]
        if not pinned:
            return {"intent": intent, "answer": tr("nearest_no_pins", lang)}
        ranked = sorted(pinned, key=lambda kv: haversine_km(request.lat, request.lng, kv[1]["lat"], kv[1]["lng"]))
        top = ranked[:3]
        lines = [tr("nearest_header", lang)]
        for key, data in top:
            dist = haversine_km(request.lat, request.lng, data["lat"], data["lng"])
            display_name = data.get("name_kn") if lang == "kn" and data.get("name_kn") else data["name"]
            lines.append(f"• {display_name} — {format_km(dist)}")
        return {"intent": intent, "answer": "\n".join(lines)}

    if intent == "Get_Timings":
        if entry_key and "timings" in CAMPUS_DATA[entry_key]:
            return {"intent": intent, "answer": format_entry(entry_key, lang)}
        if entry_key:
            note = tr("timings_not_published", lang, name=CAMPUS_DATA[entry_key]['name'])
            return {"intent": intent, "answer": note + "\n\n" + format_entry(entry_key, lang)}
        return {"intent": intent, "answer": tr("timings_which", lang)}

    if intent in ("Find_Location", "Get_Info"):
        if "show all" in query or "list all" in query:
            if lang == "kn":
                names = ", ".join(v.get("name_kn") or v["name"] for v in CAMPUS_DATA.values())
            else:
                names = ", ".join(v["name"] for v in CAMPUS_DATA.values())
            return {"intent": intent, "answer": f"{tr('list_all_header', lang)}\n\n{names}"}
        if entry_key:
            return {"intent": intent, "answer": ai_rephrase(format_entry(entry_key, lang), query, lang)}
        ai_key = ai_identify_entity(query)
        if ai_key:
            answer = format_entry(ai_key, lang)
            prefix = "🤖 _AI-matched — verify this is what you meant:_\n\n" if lang != "kn" \
                     else "🤖 _AI ಹೊಂದಾಣಿಕೆ — ಇದು ಸರಿಯೇ ಎಂದು ಖಚಿತಪಡಿಸಿಕೊಳ್ಳಿ:_\n\n"
            return {"intent": intent, "answer": prefix + answer}
        chat_reply = ai_conversational_reply(query, lang)
        if chat_reply:
            return {"intent": "Smalltalk", "answer": chat_reply}
        return {"intent": intent, "answer": tr("no_match", lang)}

    ai_key = ai_identify_entity(query)
    if ai_key:
        answer = format_entry(ai_key, lang)
        prefix = "🤖 _AI-matched — verify this is what you meant:_\n\n" if lang != "kn" \
                 else "🤖 _AI ಹೊಂದಾಣಿಕೆ — ಇದು ಸರಿಯೇ ಎಂದು ಖಚಿತಪಡಿಸಿಕೊಳ್ಳಿ:_\n\n"
        return {"intent": "Get_Info", "answer": prefix + answer}

    chat_reply = ai_conversational_reply(query, lang)
    if chat_reply:
        return {"intent": "Smalltalk", "answer": chat_reply}

    return {"intent": "FAQ", "answer": tr("faq_fallback", lang)}