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

    # ---------------- Remaining PG departments ----------------
    # Sourced from the official 2022 "MU Diary" staff directory PDF.
    # NOT individually re-verified against a 2025/2026 department page like
    # CS/Physics/Chemistry/Mathematics/MBA above — treat the chairperson
    # name as a few years old and possibly rotated since. Good enough for
    # "which department handles X" and a real contact number, but call
    # ahead if the exact current chairperson's name matters.
    "applied botany department": {
        "name": "Department of Applied Botany", "location": "Science Block",
        "aliases": ["applied botany", "botany"],
        "chairperson": "Prof. Krishnakumar G. (as of 2022 Diary — verify)",
        "contact": "Office: 2287272 · Mobile: 9449330901",
        "verified": True, "last_verified": "2022 (MU Diary)",
    },
    "applied zoology department": {
        "name": "Department of Applied Zoology", "location": "Science Block",
        "aliases": ["applied zoology", "zoology"],
        "chairperson": "Prof. Sreepada K.S. (as of 2022 Diary — verify)",
        "contact": "Office: 2287373 · Mobile: 9481015395",
        "verified": True, "last_verified": "2022 (MU Diary)",
    },
    "biosciences department": {
        "name": "Department of Biosciences", "location": "Science Block",
        "aliases": ["biosciences", "biotechnology", "environment science", "food science", "microbiology"],
        "chairperson": "Prof. Monika Sadananda (as of 2022 Diary — verify)",
        "contact": "Office: 2287261 · Mobile: 9448869719",
        "note": "Also coordinates Biotechnology, Environment Science, Food Science & Nutrition, and Microbiology PG courses under the same office.",
        "verified": True, "last_verified": "2022 (MU Diary)",
    },
    "economics department": {
        "name": "Department of Economics", "location": "Faculty of Arts",
        "aliases": ["economics"],
        "chairperson": "Prof. Vishwanatha (as of 2022 Diary — verify)",
        "contact": "Office: 2287372 · Mobile: 9448503417",
        "verified": True, "last_verified": "2022 (MU Diary)",
    },
    "electronics department": {
        "name": "Department of Electronics", "location": "Science Block",
        "aliases": ["electronics"],
        "chairperson": "Prof. A.M. Khan (as of 2022 Diary — verify)",
        "contact": "Office: 2287437 · Mobile: 9901752373",
        "verified": True, "last_verified": "2022 (MU Diary)",
    },
    "english department": {
        "name": "Department of English", "location": "Faculty of Arts",
        "aliases": ["english"],
        "chairperson": "Prof. Kishori Nayak K. (as of 2022 Diary — verify)",
        "contact": "Office: 2287381 · Mobile: 9342035991",
        "verified": True, "last_verified": "2022 (MU Diary)",
    },
    "history department": {
        "name": "Department of History", "location": "Faculty of Arts",
        "aliases": ["history"],
        "chairperson": "Prof. B. Udaya (as of 2022 Diary — verify)",
        "contact": "Office: 2287294 · Mobile: 9448331284",
        "verified": True, "last_verified": "2022 (MU Diary)",
    },
    "yogic sciences department": {
        "name": "Department of Human Consciousness & Yogic Sciences", "location": "On campus",
        "aliases": ["yogic science", "human consciousness"],
        "chairperson": "Prof. K. Krishna Sharma (as of 2022 Diary — verify)",
        "contact": "Office: 2287435 · Mobile: 9448241005",
        "verified": True, "last_verified": "2022 (MU Diary)",
    },
    "kannada department": {
        "name": "Department of Kannada", "location": "Faculty of Arts",
        "aliases": ["kannada"],
        "chairperson": "Prof. Somanna (as of 2022 Diary — verify)",
        "contact": "Office: 2287360 · Mobile: 9886165134",
        "verified": True, "last_verified": "2022 (MU Diary)",
    },
    "library science department": {
        "name": "Department of Library & Information Science", "location": "Science Block",
        "aliases": ["library and information science", "library science"],
        "chairperson": "Prof. Manjaiah D.H. (i/c, as of 2022 Diary — verify)",
        "contact": "Office: 2287316 · Mobile: 9449444638",
        "verified": True, "last_verified": "2022 (MU Diary)",
        "note": "Distinct from the University Library itself — see 'library' entry for the librarian/building.",
    },
    "marine geology department": {
        "name": "Department of Marine Geology", "location": "Science Block",
        "aliases": ["marine geology", "geo-informatics", "geography"],
        "chairperson": "Prof. K.S. Jayappa (as of 2022 Diary — verify)",
        "contact": "Office: 2287389 · Mobile: 9945370876",
        "note": "Also coordinates Geo-informatics and Geography PG courses.",
        "verified": True, "last_verified": "2022 (MU Diary)",
    },
    "journalism department": {
        "name": "Department of Mass Communication & Journalism", "location": "Faculty of Arts",
        "aliases": ["mass communication", "journalism", "mcj"],
        "chairperson": "Sri M.P. Umeshchandra (as of 2022 Diary — verify)",
        "contact": "Office: 2287382 · Mobile: 9845848598",
        "verified": True, "last_verified": "2022 (MU Diary)",
    },
    "materials science department": {
        "name": "Department of Materials Science", "location": "Science Block",
        "aliases": ["materials science"],
        "chairperson": "Prof. Manjunatha Pattabi (as of 2022 Diary — verify)",
        "contact": "Office: 2287249 · Mobile: 9448260563",
        "verified": True, "last_verified": "2022 (MU Diary)",
    },
    "physical education department": {
        "name": "Department of Physical Education", "location": "Sports/DPE block",
        "aliases": ["physical education", "sports department"],
        "chairperson": "Dr. Gerald Santhosh D'Souza (as of 2022 Diary — verify)",
        "contact": "Office: 2287204 · Mobile: 9343572023",
        "verified": True, "last_verified": "2022 (MU Diary)",
    },
    "political science department": {
        "name": "Department of Political Science", "location": "Faculty of Arts",
        "aliases": ["political science"],
        "chairperson": "Prof. Jayaraj Amin (as of 2022 Diary — verify)",
        "contact": "Office: 2287364 · Mobile: 9448296840",
        "verified": True, "last_verified": "2022 (MU Diary)",
    },
    "sociology department": {
        "name": "Department of Sociology", "location": "Faculty of Arts",
        "aliases": ["sociology"],
        "chairperson": "Prof. Vinay Rajath D. (as of 2022 Diary — verify)",
        "contact": "Office: 2287374 · Mobile: 9448815520",
        "verified": True, "last_verified": "2022 (MU Diary)",
    },
    "social work department": {
        "name": "Department of Social Work", "location": "Faculty of Arts",
        "aliases": ["social work", "msw"],
        "chairperson": "Prof. P.G. Aquinas (as of 2022 Diary — verify)",
        "contact": "Office: 2287621 · Mobile: 9448109870",
        "verified": True, "last_verified": "2022 (MU Diary)",
    },
    "statistics department": {
        "name": "Department of Statistics", "location": "Science Block",
        "aliases": ["statistics"],
        "chairperson": "Prof. Ishwara P. (i/c, as of 2022 Diary — verify)",
        "contact": "Office: 2287358 · Mobile: 7411735203",
        "verified": True, "last_verified": "2022 (MU Diary)",
    },
    "commerce department": {
        "name": "Department of Commerce", "location": "Faculty of Commerce",
        "aliases": ["commerce", "m.com", "mcom"],
        "chairperson": "Dr. Parameshwara (as of 2022 Diary — verify)",
        "contact": "Office: 2287263 · Mobile: 9482249259",
        "verified": True, "last_verified": "2022 (MU Diary)",
    },
    "industrial chemistry department": {
        "name": "Department of Industrial Chemistry", "location": "Science Block",
        "aliases": ["industrial chemistry", "biochemistry"],
        "chairperson": "Dr. Ramesh Sabu Gani (as of 2022 Diary — verify)",
        "contact": "Office: 2287847 · Mobile: 8277346847",
        "note": "Biochemistry PG runs as a coordinated course under the same office (Prof. Boja Poojary, i/c in 2022).",
        "verified": True, "last_verified": "2022 (MU Diary)",
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
        "name": "Parking Area",
        "location": "UNCONFIRMED",
        "aliases": ["parking", "parking area", "vehicle parking"],
        "verified": False,
        "note": "Contact the Estate Officer (Dr. Parameshwara, 9482249259) for campus infrastructure "
                "questions like this if it isn't obvious on-site.",
    },
    "main gate": {
        "name": "Main Gate",
        "location": "UNCONFIRMED exact GPS",
        "aliases": ["main gate", "entrance", "campus gate"],
        "verified": False,
        "lat": None,  # <-- fill this in first; every other "directions" entry is relative to this point
        "lng": None,
        "note": "Every direction in this bot should be relative to this point — get its real GPS pin first, "
                "since all other 'directions' entries depend on it.",
    },
    "atm": {
        "name": "State Bank of India (on/near campus)",
        "location": "Mangalagangotri campus area",
        "contact": "SBI: 0824-2449320 · Bank of Baroda: 0824-2287280",
        "aliases": ["atm", "cash machine", "sbi", "sbi bank", "bank", "bank of baroda"],
        "verified": True,
        "last_verified": "2022 (MU Diary)",
        "note": "Confirmed from the official campus amenities directory — exact building location not yet pinned.",
    },
    "security": {
        "name": "Security Control Room",
        "location": "On campus",
        "contact": "Supervisor: 9241266183",
        "aliases": ["security", "security office", "watchman", "guard"],
        "verified": True,
        "last_verified": "2022 (MU Diary)",
    },
    "post office": {
        "name": "Post Office",
        "location": "On campus",
        "contact": "0824-2287282",
        "aliases": ["post office", "postal"],
        "verified": True,
        "last_verified": "2022 (MU Diary)",
    },
    "medical center": {
        "name": "University Health Centre",
        "location": "On campus",
        "contact": "0824-2287590",
        "person": "In-charge as of 2022 Diary: Prof. Raju Krishna Chalannavar — verify current",
        "aliases": ["medical center", "medical centre", "health center", "health centre", "clinic", "first aid"],
        "verified": True,
        "note": "Confirmed to exist with a real office number — the specific in-charge name is a few years old, verify by phone.",
        "last_verified": "2022 (MU Diary)",
    },
    "canteen": {
        "name": "Canteen",
        "location": "UNCONFIRMED exact location",
        "aliases": ["canten", "canteen", "food court", "mess", "eat", "food"],
        "verified": False,
        "note": "Not found in official sources checked so far (department directory and amenities list don't "
                "mention one by name) — confirm on-site whether/where one operates.",
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

    lines.append(_navigation_block(data))

    return "\n".join(lines)

def _navigation_block(data):
    """Returns a maps link + the Flutter app's location marker.
    Uses the entry's own lat/lng if set (exact pin); otherwise falls back
    to the real campus-center coordinate, clearly labeled as approximate."""
    lat, lng = data.get("lat"), data.get("lng")
    if lat is not None and lng is not None:
        return f"\n[🗺️ Open in Google Maps]({get_maps_url(lat, lng)})\n{location_marker(lat, lng)}"
    return (
        f"\n📍 _Exact GPS not yet set for this specific spot — pin below goes to the "
        f"general campus location instead._\n"
        f"[🗺️ Open Campus in Google Maps]({get_maps_url(CAMPUS_CENTER_LAT, CAMPUS_CENTER_LNG)})\n"
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
            answer += "\n" + _navigation_block(data)
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
        if "show all" in query or "list all" in query:
            names = ", ".join(v["name"] for v in CAMPUS_DATA.values())
            return {"intent": intent, "answer": f"Here's everything I have on file:\n\n{names}"}
        if entry_key:
            return {"intent": intent, "answer": format_entry(entry_key)}
        return {"intent": intent, "answer": (
            "I couldn't match that to anything in my database yet. Try naming the department, "
            "office, or facility directly — e.g. \"Computer Science department\" or \"boys hostel\"."
        )}

    return {"intent": "FAQ", "answer": (
        "I didn't fully understand that. Try asking about a department, office, hostel, or fees — "
        "or say \"help\" to see what I can do."
    )}