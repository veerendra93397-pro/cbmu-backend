from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import difflib
import re

app = FastAPI(title="CBMU Chatbot API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    message: str

# ============================================================
#  CAMPUS_DATA
#
#  Each department entry can include:
#    name            - display name
#    location        - building/floor (fill in your real campus location)
#    directions      - text directions from the main gate
#    lat / lng       - GPS coords for the "Open in Maps" button
#                      (placeholder here — replace with a real pin,
#                       e.g. long-press the spot in Google Maps app)
#    aliases         - words a student might type
#    chairperson     - current department head (VERIFY PERIODICALLY —
#                       these rotate every 1-2 years at most Indian
#                       universities and this data WILL go stale)
#    chairperson_source - official page to re-verify against
#    contact         - phone / email for the department office
#    fee_note        - fees vary by year/degree-level/college-type;
#                      point to the live fee page rather than a number
#    last_verified   - date you last checked this entry against the
#                      university site
# ============================================================

FEE_PAGE_URL = "https://mangaloreuniversity.ac.in/fee-details-1.html"

# ============================================================
#  COURSE_FEES
#
#  Per-program fee notifications, pulled from the university's own
#  Fee Details page (mangaloreuniversity.ac.in/fee-details-1.html).
#  Mangalore University does NOT publish one number per department —
#  fees are grouped by PROGRAM CATEGORY and change every academic year.
#  So instead of a rupee figure (which would go stale within months),
#  each entry links straight to the current official PDF for that
#  category. When a newer year's fee page is published, update the
#  "year" and "pdf" fields here — nothing else needs to change.
# ============================================================

COURSE_FEES = {
    "mca": {
        "label": "MCA (Master of Computer Applications)",
        "year": "2025-26",
        "pdf": "https://www.mangaloreuniversity.ac.in/upload/2025/ACC/Fees/PG-Programmes-University-Campus-Constituent-Colleges.pdf",
        "pdf_label": "PG Fee Structure 2025-26 — University Campus & Constituent Colleges",
        "note": "MCA is run at the University Campus, so it falls under this category. "
                "Older years (2022-23 and before) published a separate combined MBA/MCA PDF; "
                "that split isn't present in the current 2025-26 notification.",
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
        "note": "Use this if you're at an affiliated or autonomous college, not the main University Campus.",
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
        "note": "No newer Ph.D-specific fee PDF was found on the site as of the last check — "
                "confirm with the Registrar's office that this hasn't been superseded.",
    },
}

CAMPUS_DATA = {
    "library": {
        "name": "CBMU Central Library",
        "location": "Main Academic Block, 2nd Floor",
        "directions": "From Main Gate: Walk straight 200m, turn left.",
        "lat": 12.81654, "lng": 74.92276,
        "aliases": ["libary", "librery", "lib", "library", "book"],
        "timings": "Mon-Sat: 8AM-8PM",
    },
    "canteen": {
        "name": "CBMU Canteen",
        "location": "Near Main Academic Block",
        "directions": "From Main Gate: Walk straight 150m, left side.",
        "lat": 12.81621, "lng": 74.92295,
        "aliases": ["canten", "canteen", "food court", "mess", "eat"],
        "timings": "Breakfast: 8-10AM, Lunch: 12-3PM",
    },
    "mba department": {
        "name": "MBA Department (Business Administration)",
        "location": "Management Block",
        "directions": "From Main Gate: Walk 250m, turn right.",
        "lat": 12.81673, "lng": 74.92417,
        "aliases": ["mba", "management", "business school", "business administration"],
        # CONFLICTING SOURCES — the university's own site has two different
        # pages both claiming to show the current chairperson:
        #   https://mangaloreuniversity.ac.in/chairperson-10.html -> Dr. Sheker Naik
        #   https://mangaloreuniversity.ac.in/chairperson-8.html  -> Dr. Preethi Keerthi D'Souza
        # Don't surface either as fact until confirmed by phone with the department.
        "chairperson": "Unconfirmed — conflicting official sources, call to verify",
        "chairperson_source": "https://mangaloreuniversity.ac.in/chairperson-10.html and https://mangaloreuniversity.ac.in/chairperson-8.html",
        "contact": "Phone: 9740841002 · Office: 0824-2287209",
        "fee_note": f"Fees depend on the year, degree level, and college type — see the official fee page: {FEE_PAGE_URL}",
        "last_verified": "2026-07-22",
    },
    "computer science department": {
        "name": "Department of Computer Science",
        "location": "Science Block",
        "directions": "From Main Gate: Walk 200m, turn left.",
        "lat": 12.81654, "lng": 74.92276,
        "aliases": ["computer science", "cs department", "cs dept", "mca"],
        "chairperson": "Dr. B.H. Shekar",
        "chairperson_source": "https://mangaloreuniversity.ac.in/chairperson-14.html",
        "contact": "See department contact page (link below) — not independently verified.",
        "fee_note": f"Fees depend on the year, degree level, and college type — see the official fee page: {FEE_PAGE_URL}",
        "last_verified": "2026-07-22",
    },
    "physics department": {
        "name": "Department of Physics",
        "location": "Science Block, 1st Floor",
        "directions": "From Main Gate: Walk 200m, turn left.",
        "lat": 12.81654, "lng": 74.92276,
        "aliases": ["physics", "physics department", "physics dept"],
        "chairperson": "Dr. Yerol Narayana",
        "chairperson_source": "https://mangaloreuniversity.ac.in/chairperson-department.html",
        "contact": "See department contact page (link below) — not independently verified.",
        "fee_note": f"Fees depend on the year, degree level, and college type — see the official fee page: {FEE_PAGE_URL}",
        "last_verified": "2026-07-22",
    },
    "chemistry department": {
        "name": "Department of Chemistry",
        "location": "Science Block, Ground Floor",
        "directions": "From Main Gate: Walk 200m, turn left.",
        "lat": 12.81654, "lng": 74.92276,
        "aliases": ["chemistry", "chemistry department", "chemistry dept"],
        "chairperson": "Prof. Boja Poojary",
        "chairperson_source": "https://www.mangaloreuniversity.ac.in/chairperson-15.html",
        "contact": "See department contact page (link below) — not independently verified.",
        "fee_note": f"Fees depend on the year, degree level, and college type — see the official fee page: {FEE_PAGE_URL}",
        "last_verified": "2026-07-22",
    },
    "mathematics department": {
        "name": "Department of Mathematics",
        "location": "Science Block, Ground Floor",
        "directions": "From Main Gate: Walk 200m, turn left.",
        "lat": 12.81654, "lng": 74.92276,
        "aliases": ["mathematics", "maths", "mathematics department", "maths department"],
        "chairperson": "Dr. Kishori P. Narayankar",
        "chairperson_source": "https://www.mangaloreuniversity.ac.in/chairperson-2.html",
        "contact": "See department contact page (link below) — not independently verified.",
        "fee_note": f"Fees depend on the year, degree level, and college type — see the official fee page: {FEE_PAGE_URL}",
        "last_verified": "2026-07-22",
    },
    "science block": {
        "name": "Science Block",
        "location": "Multi-floor Academic Building",
        "directions": "From Main Gate: Walk 200m, turn left.",
        "lat": 12.81654, "lng": 74.92276,
        "aliases": ["science", "sci block"],
        "floors": {
            "2nd floor": ["Computer Science", "Library"],
            "1st floor": ["Physics"],
            "Ground floor": ["Chemistry", "Mathematics"],
        },
    },
    "admin block": {
        "name": "Administrative Block",
        "location": "Main Admin Building",
        "directions": "From Main Gate: Walk 400m, turn left.",
        "lat": 12.81856, "lng": 74.91686,
        "aliases": ["administration", "admin", "principal", "exam", "registrar"],
    },
}

def clean_text(text):
    return re.sub(r'[^\w\s]', '', text.lower().strip())

def find_course_fee(query):
    """Match a specific course keyword for fee questions (checked before
    the generic department matcher so 'mca fee' doesn't fall through to
    the Computer Science department card)."""
    q = clean_text(query)
    keyword_map = {
        "mca": "mca",
        "mba": "mba",
        "ug": "ug",
        "undergraduate": "ug",
        "b sc": "ug",
        "bsc": "ug",
        "ba": "ug",
        "bcom": "ug",
        "phd": "phd",
        "ph d": "phd",
        "affiliated": "pg_affiliated",
        "autonomous": "pg_affiliated",
        "government college": "pg_government",
        "govt college": "pg_government",
    }
    for kw, course_key in keyword_map.items():
        if kw in q:
            return course_key
    return None

def format_course_fee(course_key):
    c = COURSE_FEES[course_key]
    response = f"**{c['label']} — Fee Structure ({c['year']})**\n\n"
    if c["note"]:
        response += f"ℹ️ {c['note']}\n\n"
    response += f"[📄 {c['pdf_label']}]({c['pdf']})\n\n"
    response += f"For any other category, see the full [Fee Details page]({FEE_PAGE_URL})."
    return response

def find_best_match(query):
    query = clean_text(query)
    for key, data in CAMPUS_DATA.items():
        if key in query or query in key:
            return key
        if "aliases" in data:
            for alias in data["aliases"]:
                if alias in query or query in alias:
                    return key
    matches = difflib.get_close_matches(query, list(CAMPUS_DATA.keys()), n=1, cutoff=0.6)
    return matches[0] if matches else None

def get_maps_url(lat, lng):
    return f"https://www.google.com/maps/search/?api=1&query={lat},{lng}"

@app.get("/")
def root():
    return {"message": "CBMU Chatbot API is LIVE! 🚀"}

@app.post("/chat")
def chat(request: ChatRequest):
    query = request.message.lower().strip()

    if query in ['hi', 'hello', 'hey', 'hii']:
        return {"answer": "Hello! 👋 Welcome to CBMU Assistant. How can I help you today?"}
    if query in ['bye', 'goodbye', 'see you']:
        return {"answer": "Goodbye! 👋 See you again soon!"}
    if query in ['thanks', 'thank you']:
        return {"answer": "You're welcome! 😊"}
    if query in ['good morning', 'good afternoon', 'good evening']:
        return {"answer": f"{query.capitalize()}!  How can I help you with CBMU today?"}

    # Fee questions: check for a NAMED course first (e.g. "mca fee",
    # "mba fee structure") so the answer is scoped to just that course,
    # not the whole department card or the whole fee page.
    if any(w in query for w in ["fee", "fees", "tuition", "payment"]):
        course_key = find_course_fee(query)
        if course_key:
            return {"answer": format_course_fee(course_key)}
        # Fee question but no specific course named — show the category
        # list so the person can pick, instead of dumping everything.
        return {"answer": (
            "Which fee category do you need?\n\n"
            "• **MCA** — try \"MCA fee\"\n"
            "• **MBA** — try \"MBA fee\"\n"
            "• **UG programmes** — try \"UG fee\"\n"
            "• **PG at an affiliated/autonomous college** — try \"affiliated college fee\"\n"
            "• **PG at a government college** — try \"government college fee\"\n"
            "• **Ph.D** — try \"PhD fee\"\n\n"
            f"Or browse everything on the [Fee Details page]({FEE_PAGE_URL})."
        )}

    building_key = find_best_match(query)

    if building_key:
        data = CAMPUS_DATA[building_key]
        maps_link = get_maps_url(data["lat"], data["lng"])

        response = f"**{data['name']}**\n\n"
        response += f"📍 {data['location']}\n"
        response += f"🚶 {data['directions']}\n\n"

        if "timings" in data:
            response += f"⏰ {data['timings']}\n"

        if "chairperson" in data:
            response += f"\n👤 **Chairperson:** {data['chairperson']}"
            if "last_verified" in data:
                response += f" _(as of {data['last_verified']})_"
            response += "\n"

        if "contact" in data:
            response += f"📞 {data['contact']}\n"

        if "fee_note" in data:
            response += f"\n💰 {data['fee_note']}\n"

        if "floors" in data:
            response += "\n**Floors:**\n"
            for floor, depts in data["floors"].items():
                response += f"• {floor}: {', '.join(depts)}\n"

        response += f"\n[🗺️ Open in Google Maps]({maps_link})"
        return {"answer": response}

    return {"answer": "I didn't understand that. Try asking:\n• Where is the library?\n• MBA department\n• Computer Science chairperson\n• Fee details"}