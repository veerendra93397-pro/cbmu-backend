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
        "name": "MBA Department",
        "location": "Management Block",
        "directions": "From Main Gate: Walk 250m, turn right.",
        "lat": 12.81673, "lng": 74.92417,
        "aliases": ["mba", "management", "business school"],
    },
    "science block": {
        "name": "Science Block",
        "location": "Multi-floor Academic Building",
        "directions": "From Main Gate: Walk 200m, turn left.",
        "lat": 12.81654, "lng": 74.92276,
        "aliases": ["science", "sci block", "physics", "chemistry"],
        "floors": {
            "2nd floor": ["Computer Science", "Library"],
            "1st floor": ["Physics"],
            "Ground floor": ["Chemistry", "Maths"],
        },
    },
    "admin block": {
        "name": "Administrative Block",
        "location": "Main Admin Building",
        "directions": "From Main Gate: Walk 400m, turn left.",
        "lat": 12.81856, "lng": 74.91686,
        "aliases": ["administration", "admin", "principal", "exam"],
    },
}

def clean_text(text):
    return re.sub(r'[^\w\s]', '', text.lower().strip())

def find_best_match(query):
    query = clean_text(query)
    for key, data in CAMPUS_DATA.items():
        if key in query or query in key: return key
        if "aliases" in data:
            for alias in data["aliases"]:
                if alias in query or query in alias: return key
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

    building_key = find_best_match(query)
    
    if building_key:
        data = CAMPUS_DATA[building_key]
        maps_link = get_maps_url(data["lat"], data["lng"])
        
        response = f"**{data['name']}**\n\n"
        response += f"📍 {data['location']}\n"
        response += f"🚶 {data['directions']}\n\n"
        
        if "timings" in data: response += f"⏰ {data['timings']}\n"
        if "floors" in data:
            response += "\n**Floors:**\n"
            for floor, depts in data["floors"].items():
                response += f"• {floor}: {', '.join(depts)}\n"
                
        response += f"\n[🗺️ Open in Google Maps]({maps_link})"
        return {"answer": response}
    
    return {"answer": "I didn't understand that. Try asking:\n• Where is the library?\n• MBA department\n• Canteen timings"}