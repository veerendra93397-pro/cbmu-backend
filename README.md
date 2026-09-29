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
```
