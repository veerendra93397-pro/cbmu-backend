# CBMU Campus Assistant

An interactive campus assistant web application for Mangalore University students, rewritten in React, TypeScript, and Vite from the original Flutter application.

## Key Features

- **Bilingual Campus Chatbot**: Intelligent assistant supporting both English and Kannada (`kn`) with real-time toggle. Provides verified facts for departments, official phone contacts, course fee structures, hostels, library timings, and campus amenities.
- **Embedded & Interactive Maps**: Integrated Leaflet map with CartoDB Dark Matter basemap tiles matching the original dark/teal design. Supports campus center navigation, building pins, and walking navigation handoff to Google Maps.
- **Notices & Circulars Portal**: Displays announcements categorized by type (`exam`, `fee`, `admission`, `holiday`, `event`, `general`) with unread badge tracking.
- **Academic Calendar**: Direct guidance and access to official university notifications.
- **Campus Directory (Contact Us)**: One-tap calling for Vice Chancellor, Registrar, Examination Section, Finance, International Students Centre, Library, and Hostels.
- **Feedback & Rating**: In-app 5-star rating and message submission.
- **Staff / Admin Portal**: Authenticated admin dashboard with statistics and CRUD management for:
  - Departments & offices (contact, floor plan, timings, in-charge)
  - Chairperson directory
  - Course fee notifications and circular PDFs (MCA, MBA, UG, Ph.D, etc.)
  - Campus buildings & location assignments
  - Notice publishing and deletion
- **Appearance & Theming**: Dark mode, light mode, and system preference support.

## Getting Started

```bash
# Install dependencies
npm install

# Start development server on port 3000
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## Render Deployment (Zero-Config)

This repository includes a ready-to-deploy `render.yaml` Blueprint file and supports both **Node.js** (Default & Recommended) and **Python (FastAPI)** runtimes on Render.

### Fix for Render Error: `Could not open requirements file: [Errno 2] No such file or directory: 'requirements.txt'`

If you connect this repository to Render via GitHub and encounter:
```text
ERROR: Could not open requirements file: [Errno 2] No such file or directory: 'requirements.txt'
```
This happens because Render automatically selected or was configured with the **Python** environment instead of **Node.js**, or `requirements.txt` was missing. Here is how to resolve it:

#### Option A: Deploy as Node.js (Recommended - Runs Full Web App + Groq AI)
1. In your [Render Dashboard](https://dashboard.render.com), go to your Web Service **Settings**.
2. Set the following fields:
   - **Environment / Runtime**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Root Directory**: (Leave blank)
3. Under **Environment Variables**, add:
   - `GROQ_API_KEY`: Your key from [Groq Console](https://console.groq.com/keys)
   - `NODE_ENV`: `production`
4. Click **Save Changes** and **Manual Deploy > Clear build cache & deploy**.

#### Option B: Deploy as Python Web Service (FastAPI Backend)
If you specifically want Render to run the Python backend (`main.py`):
1. Both `requirements.txt` and `backend/requirements.txt` are included in this repository.
2. In your Render Web Service **Settings**:
   - **Environment / Runtime**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
   - **Root Directory**: (Leave blank or `backend` if pointing directly)
3. Under **Environment Variables**, add:
   - `GROQ_API_KEY`: Your key from [Groq Console](https://console.groq.com/keys)

#### Option C: Render Blueprint (Automatic 1-Click)
1. In the [Render Dashboard](https://dashboard.render.com), click **New +** > **Blueprint**.
2. Connect your GitHub repository.
3. Render reads `render.yaml` automatically and configures all build and start commands without manual entry.

## Groq AI Server Activation

The backend uses the official `groq-sdk` with `llama-3.3-70b-versatile` and automatic failover to `llama-3.1-8b-instant`:
- On Render: Add `GROQ_API_KEY` to Environment Variables.
- Locally: Add `GROQ_API_KEY=gsk_your_key` in `.env`.
- In the app: Navigate to **Settings > Backend Server & AI Engine** to test the connection and see live status.
