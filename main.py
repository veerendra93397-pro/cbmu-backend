from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import difflib
import re

app = FastAPI(title="Mangalore University Assistant API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    message: str

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
        "name": "Department of Computer Science",
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
        "name": "Department of Physics",
        "location": "Science Block",
        "directions": "Within the Science Block — see Science Block entry.",
        "aliases": ["physics", "physics department", "physics dept"],
        "chairperson": "Dr. Yerol Narayana",
        "chairperson_source": "https://mangaloreuniversity.ac.in/chairperson-department.html",
        "last_verified": "2026-07-22",
        "verified": True,
    },
    "chemistry department": {
        "name": "Department of Chemistry",
        "location": "Science Block",
        "directions": "Within the Science Block — see Science Block entry.",
        "aliases": ["chemistry", "chemistry department", "chemistry dept"],
        "chairperson": "Prof. Boja Poojary",
        "chairperson_source": "https://www.mangaloreuniversity.ac.in/chairperson-15.html",
        "last_verified": "2026-07-22",
        "verified": True,
    },
    "mathematics department": {
        "name": "Department of Mathematics",
        "location": "Science Block",
        "directions": "Within the Science Block — see Science Block entry.",
        "aliases": ["mathematics", "maths", "mathematics department", "maths department"],
        "chairperson": "Dr. Kishori P. Narayankar",
        "chairperson_source": "https://www.mangaloreuniversity.ac.in/chairperson-2.html",
        "last_verified": "2026-07-22",
        "verified": True,
    },
    "mba department": {
        "name": "MBA Department (Business Administration)",
        "location": "Faculty of Commerce",
        "directions": "See Main Gate entry for the campus-wide reference point (exact walking route not yet confirmed).",
        "aliases": ["mba", "management", "business school", "business administration"],
        # The site has two different pages both claiming to be the current
        # chairperson (chairperson-10.html -> Dr. Sheker Naik vs.
        # chairperson-8.html -> Dr. Preethi Keerthi D'Souza). Don't assert
        # either without a phone confirmation.
        "chairperson": "Unconfirmed — two official pages disagree, call 0824-2287209 to verify",
        "contact": "Phone: 9740841002 · Office: 0824-2287209",
        "last_verified": "2026-07-22",
        "verified": True,
    },
    "science block": {
        "name": "Science Block",
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

    # ---------------- Administration ----------------
    "vice chancellor office": {
        "name": "Vice Chancellor's Office",
        "location": "Administration",
        "person": "Prof. P.L. Dharma (Vice Chancellor)",
        "contact": "Office: 0824-2287347",
        "aliases": ["vice chancellor", "vc office", "vc"],
        "verified": True,
        "last_verified": "2026-07-22",
    },
    "registrar office": {
        "name": "Registrar's Office",
        "location": "Administration",
        "person": "Dr. Ganesh Sanjeev (Registrar)",
        "contact": "Office: 0824-2287276",
        "aliases": ["registrar", "registrar office", "administrative office", "admin office"],
        "verified": True,
        "last_verified": "2026-07-22",
    },
    "examination section": {
        "name": "Examination Section — Registrar (Evaluation)",
        "location": "Administration",
        "person": "Dr. H Devendrappa (Registrar, Evaluation)",
        "contact": "Office: 0824-2287327 · Exam/marks-card queries: +91-948-160-8909",
        "aliases": ["examination section", "exam section", "exam office", "results", "marks card"],
        "verified": True,
        "last_verified": "2026-07-22",
        "note": "Migration certificates are also handled through this office (see 'migration certificate' below).",
    },
    "migration certificate": {
        "name": "Migration Certificate",
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
        "name": "Finance Officer's Section",
        "location": "Administration",
        "person": "Sri Panchalingaswamy S. (Finance Officer)",
        "contact": "Office: 0824-2287376",
        "aliases": ["finance section", "finance office", "accounts office"],
        "verified": True,
        "last_verified": "2026-07-22",
    },
    "international student office": {
        "name": "International Students Centre",
        "location": "Administration",
        "person": "Dr. B.H. Shekar (Director, also CS Department Chairperson)",
        "contact": "Mobile: 9480146921",
        "aliases": ["international student", "international students centre", "foreign student office"],
        "verified": True,
        "last_verified": "2026-07-22",
    },
    "library": {
        "name": "University Library",
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
        "name": "University Hostel for Men",
        "location": "On campus (exact building/GPS not yet confirmed)",
        "person": "Dr. Ramesh H.N. (Faculty Advisor)",
        "contact": "Office: 0824-2287206",
        "aliases": ["boys hostel", "men hostel", "hostel for men"],
        "verified": True,
        "last_verified": "2026-07-22",
    },
    "ladies hostel": {
        "name": "University Hostel for Women",
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
        "name": "\"Kuvempu Bhavan\"",
        "location": "UNCONFIRMED",
        "aliases": ["kuvempu bhavan"],
        "verified": False,
        "note": "This exact name did not turn up on the official Mangalore University site. There IS a "
                "'Mangala Auditorium' (used for university functions) and a 'Kuvempu Gallery' — one of "
                "these may be what's meant. Confirm on campus, then fill in the real name/location here.",
    },
    "auditorium": {
        "name": "Mangala Auditorium",
        "location": "UNCONFIRMED exact location",
        "aliases": ["auditorium", "mangala auditorium"],
        "verified": False,
        "note": "Name confirmed to exist (used for university felicitations/events) but exact GPS/building "
                "position not confirmed from public sources — add the real pin here.",
    },
    "guest house": {
        "name": "University Guest House",
        "location": "UNCONFIRMED",
        "aliases": ["guest house", "guesthouse"],
        "verified": False,
        "note": "Not documented with a specific location on the public site — confirm on campus and fill in.",
    },
    "parking area": {
        "name": "Parking Area",
        "location": "UNCONFIRMED",
        "aliases": ["parking", "parking area", "vehicle parking"],
        "verified": False,
        "note": "Contact the Estate Officer (Dr. Parameshwara) for campus infrastructure questions like this "
                "if it isn't obvious on-site.",
    },
    "main gate": {
        "name": "Main Gate",
        "location": "UNCONFIRMED exact GPS",
        "aliases": ["main gate", "entrance", "campus gate"],
        "verified": False,
        "note": "Every direction in this bot should be relative to this point — get its real GPS pin first, "
                "since all other 'directions' entries depend on it.",
    },
    "atm": {
        "name": "ATM",
        "location": "UNCONFIRMED",
        "aliases": ["atm", "cash machine", "sbi", "sbi bank", "bank"],
        "verified": False,
        "note": "Presence/brand of an on-campus ATM or SBI branch not confirmed from public sources.",
    },
    "medical center": {
        "name": "Medical Officer / Health Centre",
        "location": "UNCONFIRMED",
        "aliases": ["medical center", "medical centre", "health center", "clinic", "first aid"],
        "verified": True,
        "note": "The Officers page confirms a 'Medical Officer (In Charge)' post exists, but the name field "
                "was blank at last check (post may be vacant or in flux) — call the Registrar's office "
                "(0824-2287276) to find the current contact.",
        "last_verified": "2026-07-22",
    },
    "canteen": {
        "name": "Canteen",
        "location": "UNCONFIRMED exact location",
        "aliases": ["canten", "canteen", "food court", "mess", "eat", "food"],
        "verified": False,
        "note": "Existence assumed typical for a residential campus of this size, but not independently "
                "confirmed with a specific building/GPS from public sources.",
    },
    "washroom": {
        "name": "Washroom",
        "location": "UNCONFIRMED — varies by building",
        "aliases": ["washroom", "restroom", "toilet"],
        "verified": False,
        "note": "Nearest washroom depends on which building you're in — not something a static bot can "
                "answer without knowing the user's current location (see Find_Nearest note below).",
    },
    "xerox": {
        "name": "Xerox / Printing",
        "location": "UNCONFIRMED",
        "aliases": ["xerox", "photocopy", "print", "printout"],
        "verified": False,
        "note": "Not documented publicly — likely near the library or a stationery shop close to campus; confirm on-site.",
    },
}

def clean_text(text):
    return re.sub(r'[^\w\s]', '', text.lower().strip())

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
        for alias in data.get("aliases", []):
            if alias in query or query in alias:
                return key
    matches = difflib.get_close_matches(query, list(CAMPUS_DATA.keys()), n=1, cutoff=0.6)
    return matches[0] if matches else None

def format_entry(key):
    data = CAMPUS_DATA[key]
    lines = [f"**{data['name']}**"]

    if not data.get("verified", True):
        lines.append("⚠️ _Not independently confirmed from the official university site — see note below._")

    lines.append(f"📍 {data['location']}")

    if "directions" in data:
        lines.append(f"🚶 {data['directions']}")

    if "person" in data:
        lines.append(f"👤 {data['person']}")
    if "chairperson" in data:
        cp_line = f"👤 **Chairperson:** {data['chairperson']}"
        if "last_verified" in data:
            cp_line += f" _(as of {data['last_verified']})_"
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

    return "\n".join(lines)

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

def classify_intent(query):
    q = clean_text(query)

    if any(w in q for w in GOODBYE_WORDS):
        return "Goodbye"
    if any(w in q for w in GREETING_WORDS):
        return "Greeting"
    if any(w in q for w in CLARIFICATION_WORDS):
        return "Clarification"
    if any(w in q for w in DIRECTION_WORDS):
        return "Get_Directions"
    if any(w in q for w in DISTANCE_WORDS):
        return "Get_Distance"
    if any(w in q for w in NEAREST_WORDS):
        return "Find_Nearest"
    if any(w in q for w in TIMING_WORDS):
        return "Get_Timings"
    if any(w in q for w in ["fee", "fees", "tuition", "payment"]):
        return "Get_Info"  # fee questions are a subtype of Get_Info
    if any(w in q for w in ["course", "hod", "chairperson", "who is", "which department",
                              "which block", "what facilities"]):
        return "Get_Info"
    if "where is" in q or "where can i" in q or "where" in q:
        return "Find_Location"
    if "show all" in q or "list all" in q or "show academic" in q:
        return "Get_Info"

    # If nothing matched but an entity IS recognizable, still treat as location.
    if find_best_match(q):
        return "Find_Location"

    return "Clarification"

@app.get("/")
def root():
    return {"message": "Mangalore University Assistant API is LIVE! 🚀"}

@app.post("/chat")
def chat(request: ChatRequest):
    query = request.message.lower().strip()
    intent = classify_intent(query)

    if intent == "Greeting":
        return {"intent": intent, "answer": (
            "Hello! 👋 I'm the Mangalore University Assistant. I can help with department info, "
            "office locations, timings, and fees. What do you need?"
        )}

    if intent == "Goodbye":
        if "thank" in query:
            return {"intent": intent, "answer": "You're welcome! 😊"}
        return {"intent": intent, "answer": "Goodbye! 👋 See you again soon!"}

    if intent == "Clarification":
        return {"intent": intent, "answer": (
            "No worries — tell me what you're looking for and I'll do my best. For example:\n"
            "• \"Where is the library?\"\n"
            "• \"Who is the HOD of Computer Science?\"\n"
            "• \"MCA fee\"\n"
            "• \"Registrar office contact\""
        )}

    # Fee sub-routing (still under Get_Info)
    course_key = find_course_fee(query)
    if course_key and any(w in query for w in ["fee", "fees", "tuition", "payment"]):
        return {"intent": intent, "answer": format_course_fee(course_key)}
    if any(w in query for w in ["fee", "fees", "tuition", "payment"]):
        return {"intent": intent, "answer": (
            "Which fee category do you need?\n\n"
            "• **MCA** — try \"MCA fee\"\n"
            "• **MBA** — try \"MBA fee\"\n"
            "• **UG programmes** — try \"UG fee\"\n"
            "• **Affiliated/autonomous college PG** — try \"affiliated college fee\"\n"
            "• **Government college PG** — try \"government college fee\"\n"
            "• **Ph.D** — try \"PhD fee\"\n\n"
            f"Or browse everything on the [Fee Details page]({FEE_PAGE_URL})."
        )}

    entry_key = find_best_match(query)

    if intent == "Get_Directions":
        if entry_key:
            data = CAMPUS_DATA[entry_key]
            answer = f"**Directions to {data['name']}**\n\n{data.get('directions', 'Route not yet documented — see note below.')}"
            if data.get("note"):
                answer += f"\n\nℹ️ {data['note']}"
            return {"intent": intent, "answer": answer}
        return {"intent": intent, "answer": "Which building or office do you need directions to?"}

    if intent == "Get_Distance":
        return {"intent": intent, "answer": (
            "I can't calculate live walking distance/time yet — that needs a maps routing API "
            "plus your current GPS position, which this text-only backend doesn't have wired up. "
            "For now I can tell you the relative direction from the Main Gate if you ask "
            "\"how do I reach X\" instead."
        )}

    if intent == "Find_Nearest":
        return {"intent": intent, "answer": (
            "Finding the *nearest* facility to you specifically requires your live location, which "
            "this backend doesn't receive yet. If your app can send GPS coordinates with the request, "
            "I can be upgraded to calculate nearest-facility properly — for now, tell me which specific "
            "place you mean (e.g. \"canteen\") and I'll share what's documented about it."
        )}

    if intent == "Get_Timings":
        if entry_key and "timings" in CAMPUS_DATA[entry_key]:
            return {"intent": intent, "answer": format_entry(entry_key)}
        if entry_key:
            return {"intent": intent, "answer": (
                f"Specific hours for {CAMPUS_DATA[entry_key]['name']} aren't published on the official "
                "site — call the contact below to confirm.\n\n" + format_entry(entry_key)
            )}
        return {"intent": intent, "answer": "Which place's timings do you need — library, canteen, admin office?"}

    if intent in ("Find_Location", "Get_Info"):
        if entry_key:
            return {"intent": intent, "answer": format_entry(entry_key)}
        if "show all" in query or "list all" in query:
            names = ", ".join(v["name"] for v in CAMPUS_DATA.values())
            return {"intent": intent, "answer": f"Here's everything I have on file:\n\n{names}"}
        return {"intent": intent, "answer": (
            "I couldn't match that to anything in my database yet. Try naming the department, "
            "office, or facility directly — e.g. \"Computer Science department\" or \"boys hostel\"."
        )}

    return {"intent": "FAQ", "answer": (
        "I didn't fully understand that. Try asking about a department, office, hostel, or fees — "
        "or say \"help\" to see what I can do."
    )}