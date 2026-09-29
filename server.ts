import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import path from 'path';
import fs from 'fs';
import { DEFAULT_CAMPUS_DATA, DEFAULT_COURSE_FEES, DEFAULT_NOTICES } from './src/data/campusData';

const app = express();
const port = 3000;

app.use(express.json());

// Persistent backend data storage directory
const DATA_DIR = path.resolve('data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DEPARTMENTS_FILE = path.join(DATA_DIR, 'departments.json');
const FEES_FILE = path.join(DATA_DIR, 'fees.json');
const NOTICES_FILE = path.join(DATA_DIR, 'notices.json');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');

const DEFAULT_SETTINGS = {
  backgroundTheme: 'default',
  campusName: 'Mangalore University',
};

// Helper functions to read and write backend data
function readBackendData<T>(filePath: string, defaultData: T): T {
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(content) as T;
    }
  } catch (err) {
    console.error(`Error reading ${filePath}:`, err);
  }
  // Initialize file with default data if not present
  try {
    fs.writeFileSync(filePath, JSON.stringify(defaultData, null, 2), 'utf-8');
  } catch (err) {
    console.error(`Error writing initial ${filePath}:`, err);
  }
  return defaultData;
}

function writeBackendData<T>(filePath: string, data: T): void {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error(`Error writing to ${filePath}:`, err);
  }
}

// Initialize backend stores
let backendDepartments = readBackendData(DEPARTMENTS_FILE, DEFAULT_CAMPUS_DATA);
let backendFees = readBackendData(FEES_FILE, DEFAULT_COURSE_FEES);
let backendNotices = readBackendData(NOTICES_FILE, DEFAULT_NOTICES);
let backendSettings = readBackendData(SETTINGS_FILE, DEFAULT_SETTINGS);

// Initialize Gemini SDK with User-Agent telemetry
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Build dynamic campus context from latest backend data
function getDynamicSystemInstruction(): string {
  const deptsSummary = Object.values(backendDepartments)
    .slice(0, 30)
    .map(d => {
      const person = d.chairperson || d.person || '';
      return `- ${d.name} (${d.key}): Location: ${d.location || 'Campus'}, Chairperson/Head: ${person}, Contact: ${d.contact || 'N/A'}`;
    })
    .join('\n');

  const feesSummary = Object.values(backendFees)
    .map(f => `- ${f.label} (${f.key}): Year ${f.year}, PDF: ${f.pdf}`)
    .join('\n');

  return `
You are the official AI Assistant for Mangalore University (CBMU / ಮಂಗಳೂರು ವಿಶ್ವವಿದ್ಯಾಲಯ), located at Mangalagangotri, Konaje, Mangaluru, Karnataka 574199.
You help students, faculty, applicants, and visitors with:
1. Campus navigation, buildings (Science Block, Humanities Block, MBA Old/New Blocks, Administration Block, Central Library, Examination Section, Vice Chancellor's Secretariat).
2. Courses & fee structures (MCA, MBA, MSc Computer Science, Physics, Chemistry, Applied Botany, Commerce, Kannada, Physical Education, PhD programs).
3. Student facilities (Men's & Women's Hostels, Health Centre, SBI & Canara Bank ATMs/Branches, Post Office, Indoor Stadium).
4. Academic rules, examination portals (UUCMS, mangaloreuniversity.ac.in), results checking procedures, revaluation, migration certificates, ragging helplines, campus discipline.
5. Study tips, academic drafting, career guidance, and syllabus advice.

LATEST LIVE CAMPUS DIRECTORY:
${deptsSummary}

LATEST LIVE FEE STRUCTURES:
${feesSummary}

Tone: Helpful, polite, knowledgeable, academic, and encouraging.
Language: Answer in the language the student asks in (English or Kannada - ಕನ್ನಡ). If language is 'kn', provide fluent, respectful Kannada text.
Formatting: Use clear Markdown with headings, bullet points, and emojis. Keep responses concise and directly helpful.
If you know relevant coordinates, append "__LOCATION__:lat,lng" on a new line (e.g. Science Block: 12.8184, 74.9288, Library: 12.8153, 74.9248, Admin Block: 12.8160, 74.9255).
`;
}

// AI Chat Completion Endpoint
app.post('/api/ai/chat', async (req, res) => {
  try {
    const { message, lang = 'en', history = [] } = req.body;

    if (!message || typeof message !== 'string') {
      res.status(400).json({ error: 'Message is required' });
      return;
    }

    // Check if API key is present
    if (!process.env.GEMINI_API_KEY) {
      res.status(503).json({ 
        error: 'Gemini API Key is not configured on the server',
        fallbackAvailable: true
      });
      return;
    }

    // Build context with history
    const contents: any[] = [];
    
    // Provide system context with live backend campus knowledge
    contents.push({
      role: 'user',
      parts: [{ text: `${getDynamicSystemInstruction()}\n\nUser preferred language: ${lang === 'kn' ? 'Kannada (ಕನ್ನಡ)' : 'English'}.` }]
    });
    contents.push({
      role: 'model',
      parts: [{ text: lang === 'kn' 
        ? 'ಖಂಡಿತ! ನಾನು ಮಂಗಳೂರು ವಿಶ್ವವಿದ್ಯಾನಿಲಯದ (CBMU) ಅಧಿಕೃತ AI ಸಹಾಯಕನಾಗಿ ನಿಮಗೆ ಸಹಾಯ ಮಾಡಲು ಸಿದ್ಧನಿದ್ದೇನೆ. ನೀವು ಏನು ತಿಳಿಯಲು ಬಯಸುತ್ತೀರಿ?'
        : 'Understood. I am ready to assist students and visitors with Mangalore University information, academics, locations, and procedures.' 
      }]
    });

    // Append recent turns
    if (Array.isArray(history)) {
      for (const h of history.slice(-6)) {
        if (h.text) {
          contents.push({
            role: h.isUser ? 'user' : 'model',
            parts: [{ text: h.text }]
          });
        }
      }
    }

    // Current query
    contents.push({
      role: 'user',
      parts: [{ text: message }]
    });

    let response;
    try {
      response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: contents,
      });
    } catch (modelErr: any) {
      // Fallback model if experiencing temporary high demand
      console.warn('Retrying with gemini-flash-latest fallback:', modelErr?.message);
      response = await ai.models.generateContent({
        model: 'gemini-flash-latest',
        contents: contents,
      });
    }

    const text = response.text || '';
    res.json({ answer: text, source: 'gemini' });
  } catch (error: any) {
    console.error('Gemini chat error:', error);
    res.status(500).json({ 
      error: error?.message || 'Failed to generate AI response',
      fallbackAvailable: true
    });
  }
});

// AI Study Assistant & Explainer Endpoint
app.post('/api/ai/study-assist', async (req, res) => {
  try {
    const { topic, mode = 'explain', lang = 'en' } = req.body;
    
    if (!topic || typeof topic !== 'string') {
      res.status(400).json({ error: 'Topic or query is required' });
      return;
    }

    if (!process.env.GEMINI_API_KEY) {
      res.status(503).json({ error: 'Gemini API Key is not configured' });
      return;
    }

    let prompt = '';
    if (mode === 'explain') {
      prompt = `Explain the following topic simply for a university student with key points, examples, and study summary:\nTopic: "${topic}"`;
    } else if (mode === 'quiz') {
      prompt = `Generate 3 practice multiple-choice questions with answers and short explanations on the topic:\n"${topic}"`;
    } else if (mode === 'exam_prep') {
      prompt = `Provide an exam preparation outline and top 5 expected questions on:\n"${topic}"`;
    } else {
      prompt = `Summarize and provide key takeaways for students on:\n"${topic}"`;
    }

    if (lang === 'kn') {
      prompt += `\nPlease write the entire response in Kannada (ಕನ್ನಡ).`;
    }

    let response;
    try {
      response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
      });
    } catch {
      response = await ai.models.generateContent({
        model: 'gemini-flash-latest',
        contents: prompt,
      });
    }

    res.json({ result: response.text });
  } catch (error: any) {
    console.error('Study assist error:', error);
    res.status(500).json({ error: error?.message || 'Study assistant failed' });
  }
});

// AI Notice Summarizer Endpoint
app.post('/api/ai/summarize-notice', async (req, res) => {
  try {
    const { title, body, lang = 'en' } = req.body;
    if (!title && !body) {
      res.status(400).json({ error: 'Notice content is required' });
      return;
    }

    if (!process.env.GEMINI_API_KEY) {
      res.status(503).json({ error: 'Gemini API Key is not configured' });
      return;
    }

    const prompt = `You are an academic summarizer for Mangalore University students. Summarize this official notice into 3 bullet points highlighting: Action Required, Key Dates/Deadlines, and Who it applies to.
Title: ${title}
Content: ${body}
Language: ${lang === 'kn' ? 'Kannada (ಕನ್ನಡ)' : 'English'}`;

    let response;
    try {
      response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
      });
    } catch {
      response = await ai.models.generateContent({
        model: 'gemini-flash-latest',
        contents: prompt,
      });
    }

    res.json({ summary: response.text });
  } catch (error: any) {
    console.error('Notice summarize error:', error);
    res.status(500).json({ error: error?.message || 'Summarization failed' });
  }
});

// ==========================================
// Admin Live Backend Data Persistence Endpoints
// ==========================================

// 1. Departments & Entities
app.get('/api/departments', (req, res) => {
  res.json(backendDepartments);
});

app.post('/api/departments', (req, res) => {
  try {
    const updated = req.body;
    if (updated && typeof updated === 'object') {
      backendDepartments = updated;
      writeBackendData(DEPARTMENTS_FILE, backendDepartments);
      res.json({ success: true, count: Object.keys(backendDepartments).length });
      return;
    }
    res.status(400).json({ error: 'Invalid departments data' });
  } catch (error: any) {
    res.status(500).json({ error: error?.message || 'Failed to save departments' });
  }
});

// Single department update/add
app.put('/api/departments/:key', (req, res) => {
  try {
    const key = req.params.key.toLowerCase().trim();
    const entity = req.body;
    if (!key || !entity) {
      res.status(400).json({ error: 'Key and entity body are required' });
      return;
    }
    backendDepartments[key] = {
      ...entity,
      key,
      last_verified: entity.last_verified || 'admin-edited',
    };
    writeBackendData(DEPARTMENTS_FILE, backendDepartments);
    res.json({ success: true, department: backendDepartments[key] });
  } catch (error: any) {
    res.status(500).json({ error: error?.message || 'Failed to update department' });
  }
});

app.delete('/api/departments/:key', (req, res) => {
  try {
    const key = req.params.key.toLowerCase().trim();
    if (backendDepartments[key]) {
      delete backendDepartments[key];
      writeBackendData(DEPARTMENTS_FILE, backendDepartments);
      res.json({ success: true, key });
      return;
    }
    res.status(404).json({ error: 'Department key not found' });
  } catch (error: any) {
    res.status(500).json({ error: error?.message || 'Failed to delete department' });
  }
});

// 2. Course Fees
app.get('/api/fees', (req, res) => {
  res.json(backendFees);
});

app.post('/api/fees', (req, res) => {
  try {
    const updated = req.body;
    if (updated && typeof updated === 'object') {
      backendFees = updated;
      writeBackendData(FEES_FILE, backendFees);
      res.json({ success: true, count: Object.keys(backendFees).length });
      return;
    }
    res.status(400).json({ error: 'Invalid fees data' });
  } catch (error: any) {
    res.status(500).json({ error: error?.message || 'Failed to save fees' });
  }
});

// Single fee update/add
app.put('/api/fees/:key', (req, res) => {
  try {
    const key = req.params.key.toLowerCase().trim();
    const fee = req.body;
    if (!key || !fee) {
      res.status(400).json({ error: 'Key and fee body are required' });
      return;
    }
    backendFees[key] = { ...fee, key };
    writeBackendData(FEES_FILE, backendFees);
    res.json({ success: true, fee: backendFees[key] });
  } catch (error: any) {
    res.status(500).json({ error: error?.message || 'Failed to update fee' });
  }
});

app.delete('/api/fees/:key', (req, res) => {
  try {
    const key = req.params.key.toLowerCase().trim();
    if (backendFees[key]) {
      delete backendFees[key];
      writeBackendData(FEES_FILE, backendFees);
      res.json({ success: true, key });
      return;
    }
    res.status(404).json({ error: 'Fee key not found' });
  } catch (error: any) {
    res.status(500).json({ error: error?.message || 'Failed to delete fee' });
  }
});

// 3. Notices
app.get('/api/notices', (req, res) => {
  res.json(backendNotices);
});

app.post('/api/notices', (req, res) => {
  try {
    const updated = req.body;
    if (Array.isArray(updated)) {
      backendNotices = updated;
      writeBackendData(NOTICES_FILE, backendNotices);
      res.json({ success: true, count: backendNotices.length });
      return;
    }
    res.status(400).json({ error: 'Invalid notices array' });
  } catch (error: any) {
    res.status(500).json({ error: error?.message || 'Failed to save notices' });
  }
});

app.post('/api/notices/add', (req, res) => {
  try {
    const newNotice = req.body;
    if (!newNotice || !newNotice.title) {
      res.status(400).json({ error: 'Title is required for notice' });
      return;
    }
    backendNotices = [newNotice, ...backendNotices];
    writeBackendData(NOTICES_FILE, backendNotices);
    res.json({ success: true, notice: newNotice });
  } catch (error: any) {
    res.status(500).json({ error: error?.message || 'Failed to add notice' });
  }
});

app.delete('/api/notices/:id', (req, res) => {
  try {
    const id = req.params.id;
    const initialLen = backendNotices.length;
    backendNotices = backendNotices.filter((n: any) => n.id !== id);
    if (backendNotices.length !== initialLen) {
      writeBackendData(NOTICES_FILE, backendNotices);
      res.json({ success: true, id });
      return;
    }
    res.status(404).json({ error: 'Notice ID not found' });
  } catch (error: any) {
    res.status(500).json({ error: error?.message || 'Failed to delete notice' });
  }
});

// 4. App Settings & Background Theme
app.get('/api/settings', (req, res) => {
  res.json(backendSettings);
});

app.post('/api/settings', (req, res) => {
  try {
    const updated = req.body;
    if (updated && typeof updated === 'object') {
      backendSettings = { ...backendSettings, ...updated };
      writeBackendData(SETTINGS_FILE, backendSettings);
      res.json({ success: true, settings: backendSettings });
      return;
    }
    res.status(400).json({ error: 'Invalid settings object' });
  } catch (error: any) {
    res.status(500).json({ error: error?.message || 'Failed to save settings' });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
    model: 'gemini-3.8-flash',
    departmentsCount: Object.keys(backendDepartments).length,
    feesCount: Object.keys(backendFees).length,
    noticesCount: backendNotices.length,
    backgroundTheme: backendSettings.backgroundTheme,
  });
});

async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    // Vite middleware for development
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    const distPath = path.resolve('dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (req, res) => {
        res.sendFile(path.resolve(distPath, 'index.html'));
      });
    }
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${port}`);
  });
}

startServer();
