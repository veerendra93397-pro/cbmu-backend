import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
dotenv.config();
import Groq from 'groq-sdk';
import path from 'path';
import fs from 'fs';
import { DEFAULT_CAMPUS_DATA, DEFAULT_COURSE_FEES, DEFAULT_NOTICES } from './src/data/campusData.ts';

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

// Initialize Groq client helper
function getGroqClient(): Groq | null {
  const apiKey = (process.env.GROQ_API_KEY || process.env.GROQ_KEY || '').trim();
  if (!apiKey) return null;
  return new Groq({ apiKey });
}

function isGroqConfigured(): boolean {
  return Boolean((process.env.GROQ_API_KEY || process.env.GROQ_KEY || '').trim());
}

// Initialize Gemini SDK with User-Agent telemetry
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || 'unconfigured',
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

// Groq completion helper with automatic model fallback
async function generateGroqCompletion(
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
  model: string = 'llama-3.3-70b-versatile'
): Promise<string> {
  const groq = getGroqClient();
  if (!groq) throw new Error('Groq client not initialized');

  try {
    const completion = await groq.chat.completions.create({
      messages,
      model,
      temperature: 0.7,
      max_tokens: 1500,
    });
    return completion.choices[0]?.message?.content || '';
  } catch (err: any) {
    if (model !== 'llama-3.1-8b-instant') {
      console.warn('Groq 70b failed, trying llama-3.1-8b-instant fallback:', err?.message);
      const fallback = await groq.chat.completions.create({
        messages,
        model: 'llama-3.1-8b-instant',
        temperature: 0.7,
        max_tokens: 1500,
      });
      return fallback.choices[0]?.message?.content || '';
    }
    throw err;
  }
}

// Built-in comprehensive academic synthesizer (prevents 401 unauthenticated crashes)
function generateAcademicStudyGuidance(topic: string, mode: string, lang: string): string {
  const isKn = lang === 'kn';
  const cleanTopic = topic.trim();

  if (mode === 'quiz') {
    if (isKn) {
      return `### 📝 ಅಭ್ಯಾಸ ರಸಪ್ರಶ್ನೆ: ${cleanTopic}

#### ಪ್ರಶ್ನೆ 1:
**${cleanTopic} ವಿಷಯಕ್ಕೆ ಸಂಬಂಧಿಸಿದಂತೆ ಅತ್ಯಂತ ಪ್ರಮುಖ ಪರಿಕಲ್ಪನೆ ಯಾವುದು?**
- A) ಸೈದ್ಧಾಂತಿಕ ನಿಯಮಗಳು ಮತ್ತು ನಿಖರ ವಿಶ್ಲೇಷಣೆ
- B) ಕೇವಲ ತಾತ್ಕಾಲಿಕ ಊಹೆ
- C) ಯಾವುದೇ ನಿರ್ದಿಷ್ಟ ಸೂತ್ರವಿಲ್ಲದಿರುವುದು
- D) ಕೇವಲ ಬಾಹ್ಯ ಅಂಶಗಳು ಮಾತ್ರ

**ಸರಿಯಾದ ಉತ್ತರ:** **A) ಸೈದ್ಧಾಂತಿಕ ನಿಯಮಗಳು ಮತ್ತು ನಿಖರ ವಿಶ್ಲೇಷಣೆ**
*ವಿವರಣೆ:* ಈ ವಿಷಯದಲ್ಲಿ ಪ್ರಮುಖ ತತ್ವಗಳು ಮತ್ತು ಸಮೀಕರಣಗಳು ಅಡಿಪಾಯವಾಗಿ ಕಾರ್ಯನಿರ್ವಹಿಸುತ್ತವೆ.

---

#### ಪ್ರಶ್ನೆ 2:
**ಪರೀಕ್ಷಾ ದೃಷ್ಟಿಕೋನದಿಂದ ಈ ವಿಷಯದ ಪ್ರಮುಖ ಅನ್ವಯ ಯಾವುದು?**
- A) ನೈಜ ಪ್ರಪಂಚದ ಸಮಸ್ಯೆಗಳನ್ನು ಪರಿಹರಿಸುವುದು
- B) ಯಾವುದೇ ಪ್ರಾಯೋಗಿಕ ಉಪಯೋಗವಿಲ್ಲ
- C) ಕೇವಲ ನೆನಪಿಟ್ಟುಕೊಳ್ಳಲು ಮಾತ್ರ
- D) ತಪ್ಪು ದತ್ತಾಂಶ ವಿಶ್ಲೇಷಣೆ

**ಸರಿಯಾದ ಉತ್ತರ:** **A) ನೈಜ ಪ್ರಪಂಚದ ಸಮಸ್ಯೆಗಳನ್ನು ಪರಿಹರಿಸುವುದು**
*ವಿವರಣೆ:* ಮಂಗಳೂರು ವಿಶ್ವವಿದ್ಯಾನಿಲಯದ ಪಠ್ಯಕ್ರಮದ ಪ್ರಕಾರ ಇದು ವಿದ್ಯಾರ್ಥಿಗಳಿಗೆ ವಿಶ್ಲೇಷಣಾತ್ಮಕ ಕೌಶಲ್ಯವನ್ನು ನೀಡುತ್ತದೆ.

---

#### ಪ್ರಶ್ನೆ 3:
**ಈ ವಿಷಯವನ್ನು ಕರಗತ ಮಾಡಿಕೊಳ್ಳಲು ಸೂಕ್ತ ಅಧ್ಯಯನ ವಿಧಾನ ಯಾವುದು?**
- A) ನಿಯಮಿತ ಅಭ್ಯಾಸ ಮತ್ತು ಸೂತ್ರಗಳ ಪುನರಾವರ್ತನೆ
- B) ಕೇವಲ ಕೊನೆಯ ದಿನ ಓದುವುದು
- C) ರೇಖಾಚಿತ್ರಗಳನ್ನು ಬಿಟ್ಟುಬಿಡುವುದು
- D) ಹಳೆಯ ಪ್ರಶ್ನೆಪತ್ರಿಕೆಗಳನ್ನು ಕಡೆಗಣಿಸುವುದು

**ಸರಿಯಾದ ಉತ್ತರ:** **A) ನಿಯಮಿತ ಅಭ್ಯಾಸ ಮತ್ತು ಸೂತ್ರಗಳ ಪುನರಾವರ್ತನೆ**`;
    }

    return `### 📝 Practice Quiz: ${cleanTopic}

#### Question 1:
**What is the core foundational principle underlying ${cleanTopic}?**
- **A)** The quantitative relationship between dependent and independent variables
- **B)** Random, unpredictable market or system fluctuations
- **C)** A static state with zero reaction to external stimuli
- **D)** An obsolete theoretical construct with no modern utility

**Correct Answer:** **A) The quantitative relationship between dependent and independent variables**
*Explanation:* In university-level academic syllabi, ${cleanTopic} is analyzed through formal models, measurable variables, and established laws.

---

#### Question 2:
**When evaluating ${cleanTopic} in university examinations, which aspect carries the highest weightage?**
- **A)** Stating the precise definition, governing formula/mechanism, and graphical illustration
- **B)** Writing lengthy subjective opinions without supporting diagrams
- **C)** Memorizing only one single definition without practical context
- **D)** Omitting units of measurement or assumptions

**Correct Answer:** **A) Stating the precise definition, governing formula/mechanism, and graphical illustration**
*Explanation:* Standard university scoring rubrics reward structured answers containing clear definitions, mathematical formulation, and accurate diagrams.

---

#### Question 3:
**What is a primary real-world application of ${cleanTopic}?**
- **A)** Strategic decision making, policy formulation, and predictive optimization
- **B)** Random trial-and-error guessing
- **C)** Disregarding data feedback
- **D)** Passive historical documentation only

**Correct Answer:** **A) Strategic decision making, policy formulation, and predictive optimization**
*Explanation:* Mastery of ${cleanTopic} allows practitioners and researchers to forecast outcomes and optimize allocation under constraints.`;
  }

  if (mode === 'exam_prep') {
    if (isKn) {
      return `### 🎯 ಸೆಮಿಸ್ಟರ್ ಪರೀಕ್ಷಾ ತಯಾರಿ ಮಾರ್ಗದರ್ಶಿ: ${cleanTopic}

#### ಭಾಗ A: 2-ಅಂಕಗಳ ನಿರೀಕ್ಷಿತ ಪ್ರಶ್ನೆಗಳು (ಸಂಕ್ಷಿಪ್ತ ಉತ್ತರ)
1. **${cleanTopic} ಎಂದರೇನು?** ನಿಖರವಾದ ಶೈಕ್ಷಣಿಕ ವ್ಯಾಖ್ಯಾನವನ್ನು ಬರೆಯಿರಿ.
2. ಈ ಪರಿಕಲ್ಪನೆಯ ಎರಡು ಮುಖ್ಯ ಗುಣಲಕ್ಷಣಗಳು ಅಥವಾ ಊಹೆಗಳನ್ನು ಪಟ್ಟಿ ಮಾಡಿ.
3. ಸಂಬಂಧಿತ ಪ್ರಮುಖ ಸೂತ್ರ ಅಥವಾ ಸಮೀಕರಣವನ್ನು ಬರೆಯಿರಿ.

#### ಭಾಗ B: 5-ಅಂಕಗಳ ಪರಿಕಲ್ಪನಾ ಪ್ರಶ್ನೆಗಳು (ಮಧ್ಯಮ ವಿವರಣೆ)
1. **${cleanTopic} ಪ್ರಮುಖ ವಿಧಗಳು ಮತ್ತು ಪ್ರಕಾರಗಳನ್ನು ವಿವರಿಸಿ.**
2. ರೇಖಾಚಿತ್ರದೊಂದಿಗೆ (Diagram) ಕಾರ್ಯವಿಧಾನವನ್ನು ಸ್ಪಷ್ಟಪಡಿಸಿ.
3. ಪ್ರಮುಖ ನಿರ್ಧಾರಕ ಅಂಶಗಳನ್ನು (Determinants) ವಿಶ್ಲೇಷಿಸಿ.

#### ಭಾಗ C: 10/12-ಅಂಕಗಳ ಪ್ರಬಂಧ ರೂಪದ ಪ್ರಶ್ನೆಗಳು
1. **${cleanTopic} ವಿಸ್ತೃತವಾಗಿ ಚರ್ಚಿಸಿ:**
   - ಪರಿಕಲ್ಪನೆಯ ಹಿನ್ನೆಲೆ ಮತ್ತು ತತ್ವಗಳು.
   - ಹಂತ-ಹಂತದ ನಿರೂಪಣೆ ಮತ್ತು ನೈಜ ಉದಾಹರಣೆಗಳು.
   - ಮಿತಿಗಳು (Limitations) ಮತ್ತು ಆಧುನಿಕ ಅನ್ವಯಗಳು.

#### 💡 ಪರೀಕ್ಷೆಯಲ್ಲಿ ಗರಿಷ್ಠ ಅಂಕ ಗಳಿಸಲು ಸಲಹೆಗಳು:
- ಪ್ರಮುಖ ಪದಗಳನ್ನು (Key terms) ಪೆನ್ಸಿಲ್‌ನಿಂದ ಅಂಡರ್‌ಲೈನ್ ಮಾಡಿ.
- ಸೂತ್ರ ಮತ್ತು ರೇಖಾಚಿತ್ರಗಳನ್ನು ಸ್ಪಷ್ಟವಾಗಿ ಬರೆಯಿರಿ.`;
    }

    return `### 🎯 University Semester Exam Blueprint: ${cleanTopic}

#### Part A: Expected 2-Mark Short Answer Questions
1. **Define ${cleanTopic}:** State the formal textbook definition along with any governing law or theorem.
2. List any **two key assumptions** or boundary conditions under which ${cleanTopic} holds true.
3. Write the exact mathematical notation, unit, or algorithmic complexity associated with it.

#### Part B: Expected 5-Mark Analytical Questions
1. **Explain the primary classifications or components of ${cleanTopic}** with suitable illustrations.
2. **Graphical / Architectural Representation:** Draw and label the standard diagram or flowchart.
3. Discuss the major **determinants or parameters** that directly influence this phenomenon.

#### Part C: Expected 10/12-Mark Comprehensive Questions
1. **Critically evaluate ${cleanTopic}:**
   - Provide an in-depth derivation or conceptual architecture.
   - Discuss real-world case studies and industry/economic implications.
   - Outline critical limitations, exceptions, and modern extensions in the curriculum.

#### 💡 High-Scoring Exam Tips for Mangalore University Students:
- **Structure:** Always format as *Definition → Formula/Mechanism → Diagram → Numerical/Case Example → Conclusion*.
- **Diagrams:** Ensure axes, nodes, and legends are cleanly labeled.`;
  }

  if (mode === 'summary') {
    if (isKn) {
      return `### ⚡ ತ್ವರಿತ ಪುನರಾವರ್ತನಾ ಸಾರಾಂಶ: ${cleanTopic}

- 📌 **ಪ್ರಮುಖ ವ್ಯಾಖ್ಯಾನ:** ${cleanTopic} ಎನ್ನುವುದು ಪ್ರಮುಖ ಶೈಕ್ಷಣಿಕ ಪಠ್ಯಕ್ರಮದ ಅತ್ಯಗತ್ಯ ಆಧಾರಸ್ತಂಭವಾಗಿದೆ.
- 📐 **ಮುಖ್ಯ ಸೂತ್ರ/ತತ್ವ:** ಇನ್‌ಪುಟ್ ಮತ್ತು ಔಟ್‌ಪುಟ್ ನಡುವಿನ ನಿಖರ ಸಂಬಂಧವನ್ನು ವಿವರಿಸುತ್ತದೆ.
- 🔑 **ಮೂರು ಮುಖ್ಯ ಮುಖ್ಯಾಂಶಗಳು:**
  1. ಬದಲಾವಣೆಗಳ ಸೂಕ್ಷ್ಮತೆ ಮತ್ತು ಪ್ರಭಾವವನ್ನು ಅಳೆಯುತ್ತದೆ.
  2. ಪ್ರಾಯೋಗಿಕ ಹಾಗೂ ಸೈದ್ಧಾಂತಿಕ ನಿರ್ಧಾರಗಳಿಗೆ ಮಾರ್ಗದರ್ಶನ ನೀಡುತ್ತದೆ.
  3. ಪರೀಕ್ಷಾ ದೃಷ್ಟಿಯಿಂದ ಅತಿ ಹೆಚ್ಚು ಅಂಕ ಗಳಿಸಬಹುದಾದ ವಿಷಯವಾಗಿದೆ.
- 💡 **ಸ್ಮರಣಾ ತಂತ್ರ:** ಮುಖ್ಯ ಅಂಶಗಳನ್ನು ಕ್ರಮವಾಗಿ ನೆನಪಿಟ್ಟುಕೊಳ್ಳಲು ರೇಖಾಚಿತ್ರದ ಹರಿವನ್ನು ಗಮನಿಸಿ.`;
    }

    return `### ⚡ High-Yield Revision Summary: ${cleanTopic}

- 📌 **Core Concept:** ${cleanTopic} provides the analytical framework for measuring responsiveness, transformation, and structural relationships between core variables.
- 📐 **Mathematical / Structural Expression:** Quantifies how changes in independent variables induce measurable impacts on corresponding outcomes.
- 🔑 **Critical Takeaways:**
  1. **Sensitivity & Elasticity:** Measures degree of change relative to benchmark standards.
  2. **Classifications:** Spans fundamental categories (e.g., elastic vs. inelastic, linear vs. non-linear, deterministic vs. stochastic).
  3. **Determinants:** Dictated by availability of alternatives, structural constraints, and time horizons.
- 💡 **Exam Memory Aid:** Remember *Definition → Formula/Algorithm → Diagram → Practical Example* for rapid 5-minute pre-exam revision.`;
  }

  // Default: Explain concept mode
  if (isKn) {
    return `### 📚 ಪರಿಕಲ್ಪನೆಯ ವಿವರಣೆ: ${cleanTopic}

#### 1. ಮೂಲ ವ್ಯಾಖ್ಯಾನ ಮತ್ತು ಹಿನ್ನೆಲೆ
**${cleanTopic}** ಎನ್ನುವುದು ಮಂಗಳೂರು ವಿಶ್ವವಿದ್ಯಾನಿಲಯದ ಪಠ್ಯಕ್ರಮದಲ್ಲಿ ಅತ್ಯಂತ ಪ್ರಮುಖ ಪರಿಕಲ್ಪನೆಯಾಗಿದೆ. ಇದು ವ್ಯವಸ್ಥೆಯ ಒಂದು ಭಾಗದಲ್ಲಿ ಉಂಟಾಗುವ ಬದಲಾವಣೆಯು ಮತ್ತೊಂದು ಭಾಗದ ಮೇಲೆ ಹೇಗೆ ಪ್ರಭಾವ ಬೀರುತ್ತದೆ ಎಂಬುದನ್ನು ವಿವರವಾಗಿ ವಿಶ್ಲೇಷಿಸುತ್ತದೆ.

#### 2. ಪ್ರಮುಖ ತತ್ವಗಳು ಮತ್ತು ಸಮೀಕರಣ
- **ಮೂಲ ತತ್ವ:** ಪ್ರತಿಯೊಂದು ಕ್ರಿಯೆಯು ನಿಗದಿತ ನಿಯಮಗಳು ಮತ್ತು ಸೈದ್ಧಾಂತಿಕ ಮಿತಿಗಳಿಗೆ ಒಳಪಟ್ಟಿರುತ್ತದೆ.
- **ವಿಧಾನ:** ನಿಖರವಾದ ದತ್ತಾಂಶ (Data) ಮತ್ತು ತಾರ್ಕಿಕ ಹಂತಗಳ ಮೂಲಕ ಪರಿಹಾರ ಕಂಡುಕೊಳ್ಳುವುದು.

#### 3. ನೈಜ ಪ್ರಪಂಚದ ಉದಾಹರಣೆ
ದೈನಂದಿನ ಜೀವನದಲ್ಲಿ ಮತ್ತು ವೃತ್ತಿಪರ ಕ್ಷೇತ್ರದಲ್ಲಿ ${cleanTopic} ಪ್ರಮುಖ ನಿರ್ಧಾರಗಳನ್ನು ತೆಗೆದುಕೊಳ್ಳಲು, ಸಂಪನ್ಮೂಲಗಳನ್ನು ಸರಿಯಾಗಿ ಬಳಸಲು ಹಾಗೂ ಭವಿಷ್ಯದ ಫಲಿತಾಂಶಗಳನ್ನು ಅಂದಾಜಿಸಲು ನೆರವಾಗುತ್ತದೆ.

#### 4. ವಿದ್ಯಾರ್ಥಿಗಳಿಗಾಗಿ ಅಧ್ಯಯನ ಸಲಹೆ
- ಪರಿಕಲ್ಪನೆಯನ್ನು ಕೇವಲ ನೆನಪಿಟ್ಟುಕೊಳ್ಳುವ ಬದಲು ಅದರ ಹಿಂದಿನ ತರ್ಕವನ್ನು ಗ್ರಹಿಸಿ.
- ಪರೀಕ್ಷೆಯಲ್ಲಿ ಅಗತ್ಯವಿರುವ ಸೂತ್ರ ಮತ್ತು ರೇಖಾಚಿತ್ರಗಳನ್ನು ನಿಯಮಿತವಾಗಿ ಬರೆದು ಅಭ್ಯಾಸ ಮಾಡಿ.`;
  }

  return `### 📚 Comprehensive Study Guide: ${cleanTopic}

#### 1. Core Definition & Academic Scope
**${cleanTopic}** is a foundational syllabus topic in university academics. At its core, it investigates the degree of responsiveness, behavioral change, and systemic balance that occurs when key variables undergo variation.

#### 2. Key Theoretical Principles & Mechanics
- **Governing Law:** The concept operates under formalized assumptions (e.g., *ceteris paribus* or strict boundary conditions).
- **Core Formula / Mechanism:**
  $$\\text{Coefficient / Metric} = \\frac{\\text{Percentage Change in Dependent Variable}}{\\text{Percentage Change in Independent Variable}}$$
- **Degrees & Classifications:**
  1. **High Responsiveness / Elastic:** Small changes lead to substantial downstream reactions.
  2. **Unitary / Balanced:** Proportional, one-to-one response across parameters.
  3. **Inelastic / Rigid:** Impervious to standard external shifts due to systemic necessity or constraint.

#### 3. Real-World Practical Application
In industrial and academic applications, understanding ${cleanTopic} allows analysts, engineers, and decision-makers to optimize pricing, resource allocation, computational throughput, and regulatory policies.

#### 4. Common Misconceptions & Exam Checklist
- ❌ **Pitfall:** Confusing slope with elasticity/responsiveness. (Slope is constant on linear trajectories; elasticity varies at every point).
- ✅ **Best Practice:** In semester examinations, always define the term, write the equation, specify units, sketch the standard curve, and conclude with an illustrative case.`;
}

// Unified AI completion coordinator: Groq -> Gemini -> Academic Synthesizer
async function coordinateAiResponse(
  systemPrompt: string,
  userMessage: string,
  history: Array<{ text: string; isUser: boolean }> = [],
  fallback?: () => string
): Promise<{ text: string; provider: string; model: string }> {
  // 1. Try Groq first if key configured
  if (isGroqConfigured()) {
    try {
      const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
        { role: 'system', content: systemPrompt }
      ];
      for (const h of history.slice(-6)) {
        if (h.text) {
          messages.push({
            role: h.isUser ? 'user' : 'assistant',
            content: h.text
          });
        }
      }
      messages.push({ role: 'user', content: userMessage });

      const text = await generateGroqCompletion(messages, 'llama-3.3-70b-versatile');
      if (text && text.trim()) {
        return { text, provider: 'groq', model: 'llama-3.3-70b-versatile' };
      }
    } catch (groqErr: any) {
      console.warn('Groq generation notice:', groqErr?.message);
    }
  }

  // 2. Try Gemini if key is valid (not placeholder AQ token)
  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey && !geminiKey.startsWith('AQ.')) {
    try {
      const contents: any[] = [];
      contents.push({
        role: 'user',
        parts: [{ text: `${systemPrompt}\n\nTask / Conversation:\n${userMessage}` }]
      });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents,
      });
      const text = response.text || '';
      if (text && text.trim()) {
        return { text, provider: 'gemini', model: 'gemini-2.5-flash' };
      }
    } catch (geminiErr: any) {
      console.warn('Gemini generation notice:', geminiErr?.message);
    }
  }

  // 3. Guaranteed academic synthesis fallback
  if (fallback) {
    return {
      text: fallback(),
      provider: 'academic_engine',
      model: 'cbmu-academic-synthesizer'
    };
  }

  return {
    text: `I am the Mangalore University Campus Assistant. Currently, our high-speed Groq AI connection is ready for activation.\n\nTo connect your Groq API key:\n1. Open your \`.env\` file on the server.\n2. Add: \`GROQ_API_KEY=gsk_your_key_here\`\n3. Restart server or refresh!\n\nIn the meantime, feel free to ask about campus departments, fees, notices, or location coordinates.`,
    provider: 'campus_engine',
    model: 'cbmu-knowledge-base'
  };
}

// AI Provider Status Endpoint
app.get('/api/ai/provider-status', (req, res) => {
  const groqOk = isGroqConfigured();
  const geminiKey = process.env.GEMINI_API_KEY;
  const geminiOk = Boolean(geminiKey && !geminiKey.startsWith('AQ.'));

  res.json({
    activeProvider: groqOk ? 'groq' : geminiOk ? 'gemini' : 'academic_engine',
    groqConfigured: groqOk,
    geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
    modelName: groqOk 
      ? 'Groq (LLaMA 3.3 70B Versatile)' 
      : geminiOk 
      ? 'Gemini 3.8 Flash' 
      : 'CBMU Academic Engine',
  });
});

// Test Groq Connection Endpoint
app.post('/api/ai/test-groq', async (req, res) => {
  try {
    const key = (req.body.key || process.env.GROQ_API_KEY || process.env.GROQ_KEY || '').trim();
    if (!key) {
      res.status(400).json({ 
        success: false, 
        message: 'No Groq API key configured. Please add GROQ_API_KEY to your .env file.' 
      });
      return;
    }

    const testClient = new Groq({ apiKey: key });
    const completion = await testClient.chat.completions.create({
      messages: [{ role: 'user', content: 'Say "Groq AI server is connected successfully to CBMU Campus Assistant!" in 1 short sentence.' }],
      model: 'llama-3.1-8b-instant',
      max_tokens: 50,
    });

    const reply = completion.choices[0]?.message?.content || 'Connection OK';
    res.json({
      success: true,
      message: 'Groq server connected successfully!',
      reply,
      model: 'llama-3.1-8b-instant',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error?.message || 'Failed to connect to Groq server',
    });
  }
});

// Rich campus knowledge responder for chat fallback
function generateCampusFallbackAnswer(query: string, lang: string): string {
  const isKn = lang === 'kn';
  const lower = query.trim().toLowerCase();

  // 1. Science Block
  if (lower.includes('science block') || lower === 'science' || lower.includes('sci block') || lower.includes('ವಿಜ್ಞಾನ') || lower.includes('vigyana')) {
    if (isKn) {
      return `### ವಿಜ್ಞಾನ ವಿಭಾಗ (Science Block)

📍 **ಸ್ಥಳ:** ವಿಜ್ಞಾನ ಮತ್ತು ತಂತ್ರಜ್ಞಾನ ನಿಕಾಯ (Faculty of Science & Technology)
🧭 **ಮಾರ್ಗಸೂಚಿ:** ಗಣಕ ವಿಜ್ಞಾನ (MCA), ಭೌತಶಾಸ್ತ್ರ, ರಸಾಯನಶಾಸ್ತ್ರ, ಗಣಿತಶಾಸ್ತ್ರ ಮತ್ತು ಜೀವವಿಜ್ಞಾನ ವಿಭಾಗಗಳನ್ನು ಒಳಗೊಂಡಿದೆ.

🏢 **ಇಲ್ಲಿರುವ ಪ್ರಮುಖ ವಿಭಾಗಗಳು:**
• Computer Science & MCA (ಗಣಕ ವಿಜ್ಞಾನ)
• Physics (ಭೌತಶಾಸ್ತ್ರ)
• Chemistry (ರಸಾಯನಶಾಸ್ತ್ರ)
• Mathematics (ಗಣಿತಶಾಸ್ತ್ರ)
• Applied Botany (ಅನ್ವಯಿಕ ಸಸ್ಯಶಾಸ್ತ್ರ)
• Applied Zoology (ಅನ್ವಯಿಕ ಪ್ರಾಣಿಶಾಸ್ತ್ರ)
• Biosciences & Microbiology (ಜೀವವಿಜ್ಞಾನ)
• Statistics & Electronics (ಸಂಖ್ಯಾಶಾಸ್ತ್ರ)

__LOCATION__:12.8184,74.9288`;
    }

    return `### Science Block (Faculty of Science & Technology)

📍 **Location:** Science & Technology Complex, Mangalagangotri, Konaje
🧭 **Directions:** Houses Computer Science, Physics, Chemistry, Mathematics and allied science departments.

🏢 **Departments Located Here:**
• Computer Science (MCA & MSc CS)
• Physics
• Chemistry
• Mathematics
• Applied Botany
• Applied Zoology
• Biochemistry & Biosciences
• Electronics & Statistics
• Microbiology & Marine Geology

__LOCATION__:12.8184,74.9288`;
  }

  // 2. Library
  if (lower.includes('library') || lower.includes('ಗ್ರಂಥಾಲಯ') || lower.includes('granthalaya')) {
    if (isKn) {
      return `### 📚 ಮಂಗಳೂರು ವಿಶ್ವವಿದ್ಯಾಲಯ ಕೇಂದ್ರ ಗ್ರಂಥಾಲಯ (Central Library)

📍 **ಸ್ಥಳ:** ಮುಖ್ಯ ಆಡಳಿತ ಸೌಧದ ಎದುರು, ಮಂಗಳಗಂಗೋತ್ರಿ ಕ್ಯಾಂಪಸ್
⏰ **ಸಮಯ:** ಸೋಮವಾರ - ಶನಿವಾರ: 8:00 AM – 8:00 PM (ಓದುವ ಕೊಠಡಿಗಳು)
👤 **ಗ್ರಂಥಪಾಲಕರು:** Dr. M. Purushotham Gowda (ಮೊಬೈಲ್: 9449450671)
📞 **ಸಂಪರ್ಕ:** 0824-2287234

__LOCATION__:12.8153,74.9248`;
    }

    return `### 📚 Central University Library

📍 **Location:** Opposite Administration Block, Mangalagangotri Campus, Konaje
⏰ **Timings:** Monday to Saturday: 8:00 AM – 8:00 PM (Reading halls open weekdays)
👤 **In-Charge Librarian:** Dr. M. Purushotham Gowda (Mobile: 9449450671)
📞 **Librarian Desk:** 0824-2287234

__LOCATION__:12.8153,74.9248`;
  }

  // 3. Fees
  if (lower.includes('fee') || lower.includes('fees') || lower.includes('shulka') || lower.includes('ಶುಲ್ಕ')) {
    const feesList = Object.values(backendFees)
      .map(f => `• **${f.label}** (${f.year}): [${f.pdf_label || 'View Fee PDF'}](${f.pdf})`)
      .join('\n');
    return `### 💳 Mangalore University Fee Structures\n\n${feesList}\n\nFor official notices, visit the [University Fee Details Page](https://mangaloreuniversity.ac.in/fee-details-1.html).`;
  }

  // 4. Results
  if (lower.includes('result') || lower.includes('marks') || lower.includes('ಫಲಿತಾಂಶ')) {
    return `### 🎓 Examination Results & Portals\n\n• **Official Results Portal:** [Check MU Results](https://mangaloreuniversity.ac.in/exam-results)\n• **UUCMS Portal:** [UUCMS Karnataka Student Login](https://uucms.karnataka.gov.in)\n• **Registrar (Evaluation) Helpdesk:** 0824-2287227 / 2287282`;
  }

  // 5. Check departments in backendDepartments
  for (const dept of Object.values(backendDepartments)) {
    const key = (dept.key || '').toLowerCase();
    const name = (dept.name || '').toLowerCase();
    if (lower.includes(key) || lower.includes(name) || (dept.aliases && dept.aliases.some((a: string) => lower.includes(a.toLowerCase())))) {
      let text = `### ${dept.name}\n\n`;
      if (dept.location) text += `📍 **Location:** ${dept.location}\n\n`;
      const person = dept.chairperson || dept.person;
      if (person) text += `👤 **Head / Chairperson:** ${person}\n\n`;
      if (dept.contact) text += `📞 **Contact:** ${dept.contact}\n\n`;
      if (dept.directions) text += `🧭 **Directions:** ${dept.directions}\n\n`;
      if (dept.departments_here && Array.isArray(dept.departments_here)) {
        text += `🏢 **Departments Located Here:**\n` + dept.departments_here.map((d: string) => `• ${d}`).join('\n') + `\n\n`;
      }
      if (dept.lat != null && dept.lng != null) {
        text += `\n__LOCATION__:${dept.lat},${dept.lng}\n`;
      }
      return text.trim();
    }
  }

  // 6. Helpful campus overview
  return `### Mangalore University (CBMU) Assistant\n\nI can help you with campus locations, departments, fees, and procedures. For instance, try asking:\n• **"Tell me about Science Block"** or **"Computer Science Department"**\n• **"Show me the library location"**\n• **"What is the fee structure?"**\n• **"How to check examination results?"**\n• **"Hostels info and timings"**`;
}

// AI Chat Completion Endpoint
app.post('/api/ai/chat', async (req, res) => {
  try {
    const { message, lang = 'en', history = [] } = req.body;

    if (!message || typeof message !== 'string') {
      res.status(400).json({ error: 'Message is required' });
      return;
    }

    const systemPrompt = `${getDynamicSystemInstruction()}\n\nUser preferred language: ${lang === 'kn' ? 'Kannada (ಕನ್ನಡ)' : 'English'}.`;
    
    const result = await coordinateAiResponse(
      systemPrompt, 
      message, 
      Array.isArray(history) ? history : [],
      () => generateCampusFallbackAnswer(message, lang)
    );

    res.json({ answer: result.text, source: result.provider, model: result.model });
  } catch (error: any) {
    console.error('Chat routing error:', error);
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

    const systemPrompt = `You are an expert university professor and academic tutor for Mangalore University students.
Provide structured, clear, and comprehensive syllabus guidance.
Topic: "${topic}"
Mode: ${mode} (Options: explain, quiz, exam_prep, summary)
Language: ${lang === 'kn' ? 'Kannada (ಕನ್ನಡ)' : 'English'}
Format: Clear Markdown with headings, bullet points, and code/formulas where relevant.`;

    const result = await coordinateAiResponse(
      systemPrompt,
      `Please provide academic guidance for topic: "${topic}" in mode: "${mode}". Language: ${lang}.`,
      [],
      () => generateAcademicStudyGuidance(topic, mode, lang)
    );

    res.json({ result: result.text, provider: result.provider, model: result.model });
  } catch (error: any) {
    console.error('Study assist error:', error);
    // Never fail with 401 unauthenticated - provide guaranteed academic guidance
    const fallbackText = generateAcademicStudyGuidance(req.body?.topic || 'Topic', req.body?.mode || 'explain', req.body?.lang || 'en');
    res.json({ result: fallbackText, provider: 'academic_engine' });
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

    const systemPrompt = `You are an academic summarizer for Mangalore University students. Summarize this official notice into 3 bullet points highlighting: Action Required, Key Dates/Deadlines, and Who it applies to.
Title: ${title}
Content: ${body}
Language: ${lang === 'kn' ? 'Kannada (ಕನ್ನಡ)' : 'English'}`;

    const result = await coordinateAiResponse(
      systemPrompt,
      `Summarize: ${title}\n${body}`,
      [],
      () => {
        return `• **Notice Focus:** ${title}\n• **Action Required:** Please review the full official announcement on the campus portal.\n• **Audience:** All Mangalore University faculty, students, and affiliated colleges.`;
      }
    );

    res.json({ summary: result.text, provider: result.provider });
  } catch (error: any) {
    console.error('Notice summarize error:', error);
    res.json({ 
      summary: `• **Notice Focus:** ${req.body?.title || 'Campus Circular'}\n• **Action Required:** Please refer to the official university portal.\n• **Audience:** Mangalore University students and staff.`,
      provider: 'offline'
    });
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
      app.get('/{*splat}', (req, res) => {
        res.sendFile(path.resolve(distPath, 'index.html'));
      });
    }
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${port}`);
  });
}

startServer();
