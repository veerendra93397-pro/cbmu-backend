import { storage } from './storage';
import { Language, CampusEntity, CourseFee } from '../types';

export interface ChatResponse {
  answer: string;
  source: 'remote' | 'local' | 'gemini';
}

function calculateSimilarity(s1: string, s2: string): number {
  const longer = s1.length > s2.length ? s1 : s2;
  const longerLength = longer.length;
  if (longerLength === 0) return 1.0;

  // Edit distance
  const costs: number[] = [];
  for (let i = 0; i <= s1.length; i++) {
    let lastValue = i;
    for (let j = 0; j <= s2.length; j++) {
      if (i === 0) {
        costs[j] = j;
      } else if (j > 0) {
        let newValue = costs[j - 1];
        if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
          newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
        }
        costs[j - 1] = lastValue;
        lastValue = newValue;
      }
    }
    if (i > 0) costs[s2.length] = lastValue;
  }
  return (longerLength - costs[s2.length]) / longerLength;
}

export async function processChatMessage(
  message: string, 
  lang: Language, 
  history: { text: string; isUser: boolean }[] = []
): Promise<ChatResponse> {
  const trimmed = message.trim();
  const lower = trimmed.toLowerCase();

  // 1. Try server-side AI (Groq or Gemini)
  let serverFallbackAnswer: string | null = null;
  try {
    const aiRes = await fetch("/api/ai/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: trimmed, lang, history }),
    });

    if (aiRes.ok) {
      const data = await aiRes.json();
      if (data && data.answer) {
        // Return immediately if answered by active LLM (Groq or Gemini)
        if (data.source === 'groq' || data.source === 'gemini') {
          return { answer: data.answer, source: data.source };
        }
        serverFallbackAnswer = data.answer;
      }
    }
  } catch {
    // If server AI route fails or is starting up, proceed with robust local campus engine
  }

  // 2. Local knowledge engine matching with latest admin-edited data
  const departments = storage.getDepartments();
  const fees = storage.getFees();

  // 1. Greetings
  const greetings = ['hi', 'hello', 'hey', 'namaste', 'namaskara', 'namaskar', 'good morning', 'good afternoon', 'good evening', 'good night'];
  if (greetings.some(g => lower === g || lower.startsWith(g + ' ') || lower.startsWith(g + '!'))) {
    const hour = new Date().getHours();
    let timeGreeting = "Good day";
    let timeGreetingKn = "ಶುಭ ದಿನ";
    if (hour < 12) {
      timeGreeting = "Good morning 🌅";
      timeGreetingKn = "ಶುಭೋದಯ 🌅";
    } else if (hour < 17) {
      timeGreeting = "Good afternoon ☀️";
      timeGreetingKn = "ಶುಭ ಮಧ್ಯಾಹ್ನ ☀️";
    } else if (hour < 21) {
      timeGreeting = "Good evening";
      timeGreetingKn = "ಶುಭ ಸಂಜೆ";
    } else {
      timeGreeting = "Good night 🌙";
      timeGreetingKn = "ಶುಭ ರಾತ್ರಿ 🌙";
    }

    if (lang === 'kn') {
      return {
        answer: `${timeGreetingKn}! ನಾನು ಮಂಗಳೂರು ವಿಶ್ವವಿದ್ಯಾಲಯ (CBMU) ಕ್ಯಾಂಪಸ್ ಸಹಾಯಕ. ನೀವು ವಿಭಾಗಗಳು, ಶುಲ್ಕ, ಹಾಸ್ಟೆಲ್ ಅಥವಾ ಅಧಿಕಾರಿಗಳ ಬಗ್ಗೆ ಕೇಳಬಹುದು.`,
        source: 'local'
      };
    }
    return {
      answer: `${timeGreeting}! I am your CBMU Campus Assistant. You can ask me about departments, office contacts, fee structures, hostels, or campus facilities.`,
      source: 'local'
    };
  }

  // 2. Thank you
  if (lower.includes('thank') || lower.includes('dhanyavada') || lower.includes('dhanyavad')) {
    if (lang === 'kn') {
      return { answer: "ನಿಮಗೆ ಸ್ವಾಗತ! ಬೇರೆ ಏನಾದರೂ ಸಹಾಯ ಬೇಕಿದ್ದರೆ ತಿಳಿಸಿ.", source: 'local' };
    }
    return { answer: "You're very welcome! Let me know if there's anything else about CBMU I can help you with.", source: 'local' };
  }

  // 3. Fees query
  if (lower.includes('fee') || lower.includes('fees') || lower.includes('structure') || lower.includes('shulka')) {
    let matchedFee: CourseFee | null = null;

    if (lower.includes('mca')) matchedFee = fees['mca'];
    else if (lower.includes('mba')) matchedFee = fees['mba'];
    else if (lower.includes('phd') || lower.includes('ph.d') || lower.includes('doctorate')) matchedFee = fees['phd'];
    else if (lower.includes('ug') || lower.includes('bachelor') || lower.includes('degree') || lower.includes('bca') || lower.includes('bsc') || lower.includes('bcom') || lower.includes('ba')) matchedFee = fees['ug'];
    else if (lower.includes('government') || lower.includes('govt')) matchedFee = fees['pg_government'];
    else if (lower.includes('affiliated') || lower.includes('autonomous')) matchedFee = fees['pg_affiliated'];

    if (matchedFee) {
      if (lang === 'kn') {
        let text = `### ${matchedFee.label} ಶುಲ್ಕ ವಿವರ (${matchedFee.year})\n\n`;
        text += `ಅಧಿಕೃತ ಶುಲ್ಕ ಅಧಿಸೂಚನೆ PDF:\n[${matchedFee.pdf_label}](${matchedFee.pdf})\n\n`;
        if (matchedFee.note) text += `*ಗಮನಿಸಿ:* ${matchedFee.note}\n\n`;
        text += `ಎಲ್ಲಾ ಕೋರ್ಸ್‌ಗಳ ವಿವರಗಳಿಗಾಗಿ [ಶುಲ್ಕ ವಿವರಗಳ ಪುಟವನ್ನು ತೆರೆಯಿರಿ](https://mangaloreuniversity.ac.in/fee-details-1.html).`;
        return { answer: text, source: 'local' };
      }

      let text = `### ${matchedFee.label} Fee Structure (${matchedFee.year})\n\n`;
      text += `Official Notification PDF:\n[${matchedFee.pdf_label}](${matchedFee.pdf})\n\n`;
      if (matchedFee.note) text += `*Note:* ${matchedFee.note}\n\n`;
      text += `Browse the complete official list on the [University Fee Details Page](https://mangaloreuniversity.ac.in/fee-details-1.html).`;
      return { answer: text, source: 'local' };
    }

    // General fees overview
    if (lang === 'kn') {
      let text = `### ಮಂಗಳೂರು ವಿಶ್ವವಿದ್ಯಾಲಯ ಶುಲ್ಕ ವಿವರಗಳು\n\n`;
      Object.values(fees).forEach(f => {
        text += `• **${f.label}** (${f.year}): [${f.pdf_label}](${f.pdf})\n`;
      });
      text += `\nಹೆಚ್ಚಿನ ವಿವರಗಳಿಗಾಗಿ [ವಿಶ್ವವಿದ್ಯಾಲಯ ಶುಲ್ಕ ಪುಟವನ್ನು ಭೇಟಿ ಮಾಡಿ](https://mangaloreuniversity.ac.in/fee-details-1.html).`;
      return { answer: text, source: 'local' };
    }

    let text = `### Mangalore University Fee Structures\n\n`;
    Object.values(fees).forEach(f => {
      text += `• **${f.label}** (${f.year}): [${f.pdf_label}](${f.pdf})\n`;
    });
    text += `\nFor specific programs, ask e.g. *"MCA fee"*, *"MBA fee"*, or *"UG fees"*, or check the [Official Fee Page](https://mangaloreuniversity.ac.in/fee-details-1.html).`;
    return { answer: text, source: 'local' };
  }

  // 4. Quick Actions: Results, Library Hours, Campus Rules
  if (lower.includes('result') || lower.includes('marks') || lower.includes('phalaamsha')) {
    if (lang === 'kn') {
      return {
        answer: `### 🎓 ಪರೀಕ್ಷಾ ಫಲಿತಾಂಶಗಳು (Exam Results)\n\nಮಂಗಳೂರು ವಿಶ್ವವಿದ್ಯಾಲಯದ ಎಲ್ಲಾ ಪದವಿ (UG) ಮತ್ತು ಸ್ನಾತಕೋತ್ತರ (PG) ಪರೀಕ್ಷಾ ಫಲಿತಾಂಶಗಳನ್ನು ಅಧಿಕೃತ ಪರೀಕ್ಷಾ ಪೋರ್ಟಲ್‌ನಲ್ಲಿ ವೀಕ್ಷಿಸಬಹುದು:\n\n• **ಫಲಿತಾಂಶ ಪೋರ್ಟಲ್:** [ಮಂಗಳೂರು ವಿಶ್ವವಿದ್ಯಾಲಯ ಫಲಿತಾಂಶ ಲಿಂಕ್](https://mangaloreuniversity.ac.in/exam-results)\n• **UUCMS ಪೋರ್ಟಲ್:** [UUCMS ಕರ್ನಾಟಕ ಲಾಗಿನ್](https://uucms.karnataka.gov.in)\n• **ಪರೀಕ್ಷಾ ವಿಭಾಗ ಸಂಪರ್ಕ:** 0824-2287227 / 2287282\n\nನಿಮ್ಮ ರಿಜಿಸ್ಟರ್ ನಂಬರ್ (Register Number) ಮತ್ತು ಹುಟ್ಟಿದ ದಿನಾಂಕದೊಂದಿಗೆ ಫಲಿತಾಂಶ ವೀಕ್ಷಿಸಿ.`,
        source: 'local'
      };
    }
    return {
      answer: `### 🎓 Examination Results\n\nYou can access the latest undergraduate (UG) and postgraduate (PG) semester exam results directly on the official Mangalore University portals:\n\n• **Official Results Portal:** [Check MU Results](https://mangaloreuniversity.ac.in/exam-results)\n• **UUCMS Unified Portal:** [UUCMS Karnataka Student Login](https://uucms.karnataka.gov.in)\n• **Registrar (Evaluation) Helpdesk:** 0824-2287227 / 2287282\n\nPlease keep your university register/roll number ready to check your grade card.`,
      source: 'local'
    };
  }

  if (lower.includes('library location') || lower.includes('where is the library') || lower.includes('show me the library') || (lower.includes('library') && (lower.includes('location') || lower.includes('where') || lower.includes('map') || lower.includes('reach') || lower.includes('elli')))) {
    if (lang === 'kn') {
      return {
        answer: `### 📚 ಮಂಗಳೂರು ವಿಶ್ವವಿದ್ಯಾಲಯ ಕೇಂದ್ರ ಗ್ರಂಥಾಲಯ (Central Library)\n\n📍 **ಸ್ಥಳ:** ಮುಖ್ಯ ಆಡಳಿತ ಸೌಧದ (Admin Block) ಮುಂಭಾಗದಲ್ಲಿ, ಮಂಗಳಗಂಗೋತ್ರಿ ಕ್ಯಾಂಪಸ್, ಕೊಣಾಜೆ.\n⏰ **ಸಮಯ:** ಸೋಮವಾರ - ಶನಿವಾರ: 9:00 AM – 5:30 PM (ಓದುವ ಕೊಠಡಿಗಳು ಬೆಳಗ್ಗೆ 8 ರಿಂದ ರಾತ್ರಿ 8 ರವರೆಗೆ ತೆರೆದಿರುತ್ತವೆ)\n👤 **ಗ್ರಂಥಪಾಲಕರು:** Dr. M. Purushotham Gowda (ಮೊಬೈಲ್: 9449450671)\n\n__LOCATION__:12.8153,74.9248`,
        source: 'local'
      };
    }
    return {
      answer: `### 📚 Central University Library Location\n\n📍 **Location:** Opposite Administration Block, Mangalagangotri Campus, Konaje (Mangaluru - 574199).\n⏰ **Timings:** Monday to Saturday: 9:00 AM – 5:30 PM (Reading halls open 8:00 AM – 8:00 PM on weekdays).\n👤 **In-Charge Librarian:** Dr. M. Purushotham Gowda (Mobile: 9449450671)\n\n__LOCATION__:12.8153,74.9248`,
      source: 'local'
    };
  }

  if (lower.includes('library hour') || lower.includes('library timing') || lower.includes('library time') || (lower.includes('library') && lower.includes('hour'))) {
    if (lang === 'kn') {
      return {
        answer: `### 📚 ಮಂಗಳೂರು ವಿಶ್ವವಿದ್ಯಾಲಯ ಗ್ರಂಥಾಲಯ ಸಮಯ (Library Hours)\n\n• **ಸೋಮವಾರದಿಂದ ಶುಕ್ರವಾರ:** ಬೆಳಗ್ಗೆ 8:00 ರಿಂದ ರಾತ್ರಿ 8:00 ರವರೆಗೆ\n• **ಶನಿವಾರ:** ಬೆಳಗ್ಗೆ 9:00 ರಿಂದ ಸಂಜೆ 5:30 ರವರೆಗೆ\n• **ಭಾನುವಾರ & ರಜಾದಿನಗಳು:** ಬೆಳಗ್ಗೆ 10:00 ರಿಂದ ಸಂಜೆ 4:30 ರವರೆಗೆ (ಪರೀಕ್ಷಾ ಸಮಯದಲ್ಲಿ ಮಾತ್ರ)\n\n📍 **ಸ್ಥಳ:** ಮುಖ್ಯ ಆಡಳಿತ ಕಟ್ಟಡದ ಎದುರು, ಮಂಗಳಗಂಗೋತ್ರಿ\n📞 **ಸಂಪರ್ಕ:** 0824-2287234\n\n__LOCATION__:12.8153,74.9248`,
        source: 'local'
      };
    }
    return {
      answer: `### 📚 University Central Library Hours\n\n• **Monday – Friday:** 8:00 AM – 8:00 PM\n• **Saturday:** 9:00 AM – 5:30 PM\n• **Sunday & Public Holidays:** 10:00 AM – 4:30 PM (Reading halls open during exam schedules)\n• **Circulation Counter:** 9:30 AM – 5:00 PM on working days\n\n📍 **Location:** Opposite Administration Building, Mangalagangotri\n📞 **Librarian Desk:** 0824-2287234\n\n__LOCATION__:12.8153,74.9248`,
      source: 'local'
    };
  }

  if (lower.includes('campus rule') || lower.includes('discipline') || lower.includes('code of conduct') || lower.includes('ragging') || lower.includes('niyama')) {
    if (lang === 'kn') {
      return {
        answer: `### 🏛️ ಕ್ಯಾಂಪಸ್ ನಿಯಮಗಳು ಮತ್ತು ನೀತಿ ಸಂಹಿತೆ (Campus Rules)\n\n1. **ಗುರುತಿನ ಚೀಟಿ (ID Card):** ವಿದ್ಯಾರ್ಥಿಗಳು ಕ್ಯಾಂಪಸ್‌ನಲ್ಲಿ ಯಾವಾಗಲೂ ಗುರುತಿನ ಚೀಟಿಯನ್ನು ಹೊಂದಿರಬೇಕು.\n2. **ರ‍್ಯಾಗಿಂಗ್ ಮುಕ್ತ ಕ್ಯಾಂಪಸ್:** ಯಾವುದೇ ರೀತಿಯ ರ‍್ಯಾಗಿಂಗ್ ಕಾನೂನುಬಾಹಿರ ಮತ್ತು ಕಠಿಣ ಶಿಕ್ಷಾರ್ಹ ಅಪರಾಧ (Zero Tolerance Policy).\n3. **ವಾಹನ ವೇಗ ಮಿತಿ:** ಕ್ಯಾಂಪಸ್ ರಸ್ತೆಗಳಲ್ಲಿ ಗರಿಷ್ಠ ವೇಗ ಮಿತಿ 30 km/h ಮತ್ತು ಹೆಲ್ಮೆಟ್ ಕಡ್ಡಾಯ.\n4. **ಸ್ವಚ್ಛತೆ & ಪರಿಸರ ಸಂರಕ್ಷಣೆ:** ಪ್ಲಾಸ್ಟಿಕ್ ಮುಕ್ತ ಮತ್ತು ಧೂಮಪಾನ/ತಂಬಾಕು ಮುಕ್ತ ಹಸಿರು ಕ್ಯಾಂಪಸ್.\n5. **ಹಾಸ್ಟೆಲ್ ಸಮಯ:** ಹಾಸ್ಟೆಲ್ ವಿದ್ಯಾರ್ಥಿಗಳು ನಿಗದಿತ ಸಂಜೆ 7:30 ರ ಒಳಗೆ ಹಾಸ್ಟೆಲ್‌ಗೆ ಮರಳಬೇಕು.\n\n📞 **ಆ್ಯಂಟಿ-ರ‍್ಯಾಗಿಂಗ್ ಹೆಲ್ಪ್‌ಲೈನ್:** 1800-180-5522`,
        source: 'local'
      };
    }
    return {
      answer: `### 🏛️ Mangalore University Campus Rules & Code of Conduct\n\n1. **Identity Cards:** Students and scholars must carry and display their university ID badge on campus at all times.\n2. **Zero Tolerance for Ragging:** Ragging in any form on campus or hostels is strictly banned by UGC & Supreme Court directives and is punishable by expulsion and criminal action.\n3. **Traffic & Parking:** Maximum vehicle speed limit is **30 km/h**. Helmets and designated parking slots must be followed.\n4. **Green & Eco-friendly Campus:** Plastic-free, smoking-free, and tobacco-free environment. Littering is fined.\n5. **Hostel In-Timings:** Resident students must adhere to the 7:30 PM hostel gate closure policy unless granted prior written leave from the warden.\n\n📞 **National Anti-Ragging Helpline:** 1800-180-5522 | **Campus Security Office:** 0824-2287340`,
      source: 'local'
    };
  }

  // 4. Entity matching across CAMPUS_DATA
  let bestMatch: CampusEntity | null = null;
  let bestScore = 0;

  for (const entity of Object.values(departments)) {
    // Check key match
    if (lower === entity.key.toLowerCase() || lower.includes(entity.key.toLowerCase())) {
      bestMatch = entity;
      bestScore = 1.0;
      break;
    }

    // Check name match
    if (lower === entity.name.toLowerCase() || lower.includes(entity.name.toLowerCase())) {
      bestMatch = entity;
      bestScore = 1.0;
      break;
    }

    // Check aliases
    if (entity.aliases) {
      for (const alias of entity.aliases) {
        const aLower = alias.toLowerCase();
        if (lower === aLower || lower.includes(aLower)) {
          bestMatch = entity;
          bestScore = 0.95;
          break;
        }
        // Substring token match
        const tokens = aLower.split(' ');
        if (tokens.every(t => lower.includes(t))) {
          bestMatch = entity;
          bestScore = 0.9;
          break;
        }
      }
    }

    if (bestScore >= 0.9) break;

    // Fuzzy matching against name & key
    const simKey = calculateSimilarity(lower, entity.key);
    const simName = calculateSimilarity(lower, entity.name.toLowerCase());
    const score = Math.max(simKey, simName);
    if (score > bestScore && score > 0.6) {
      bestScore = score;
      bestMatch = entity;
    }
  }

  if (bestMatch && bestScore >= 0.6) {
    return {
      answer: formatEntityResponse(bestMatch, lang),
      source: 'local'
    };
  }

  // 5. Friendly fallback response (use server synthesis if available, else local guide)
  if (serverFallbackAnswer) {
    return {
      answer: serverFallbackAnswer,
      source: 'remote'
    };
  }

  if (lang === 'kn') {
    return {
      answer: `ನನಗೆ "${trimmed}" ಬಗ್ಗೆ ನಿಖರವಾದ ಮಾಹಿತಿ ಸಿಗಲಿಲ್ಲ. \n\nನೀವು ಇವುಗಳ ಬಗ್ಗೆ ಕೇಳಬಹುದು:\n• **ವಿಭಾಗಗಳು**: ವಿಜ್ಞಾನ ಬ್ಲಾಕ್ (Science Block), ಗಣಕ ವಿಜ್ಞಾನ (CS/MCA), ಭೌತಶಾಸ್ತ್ರ, ರಸಾಯನಶಾಸ್ತ್ರ, ಎಂಬಿಎ\n• **ಶುಲ್ಕ**: "MCA fee", "MBA fee", "UG fee"\n• **ಕಚೇರಿಗಳು**: ಕುಲಪತಿಗಳ ಕಚೇರಿ (VC), ಕುಲಸಚಿವರು, ಪರೀಕ್ಷಾ ವಿಭಾಗ\n• **ಸೌಲಭ್ಯಗಳು**: ಪುರುಷರ ಹಾಸ್ಟೆಲ್, ಮಹಿಳೆಯರ ಹಾಸ್ಟೆಲ್, ಗ್ರಂಥಾಲಯ, ಬ್ಯಾಂಕ್`,
      source: 'local'
    };
  }

  return {
    answer: `I couldn't find a direct record matching "${trimmed}".\n\nTry asking about:\n• **Departments & Buildings**: Science Block, Computer Science (MCA), Physics, Chemistry, MBA\n• **Fee Structures**: "MCA fee", "MBA fee", "UG fee", "PG fees"\n• **Administration**: Vice Chancellor, Registrar, Examination Section, Migration Certificate\n• **Campus Facilities**: Men's Hostel, Women's Hostel, Central Library, Health Centre`,
    source: 'local'
  };
}

function formatEntityResponse(entity: CampusEntity, lang: Language): string {
  const isKn = lang === 'kn';
  const displayName = (isKn && entity.name_kn) ? `${entity.name} (${entity.name_kn})` : entity.name;
  let text = `### ${displayName}\n\n`;

  if (entity.location) {
    text += `📍 **${isKn ? 'ಸ್ಥಳ' : 'Location'}:** ${entity.location}\n\n`;
  }

  const person = entity.chairperson || entity.person;
  if (person) {
    text += `👤 **${isKn ? 'ಮುಖ್ಯಸ್ಥರು / ಅಧಿಕಾರಿ' : 'In-Charge / Chairperson'}:** ${person}\n\n`;
  }

  if (entity.contact) {
    text += `📞 **${isKn ? 'ಸಂಪರ್ಕ' : 'Contact'}:** ${entity.contact}\n\n`;
  }

  if (entity.timings) {
    text += `⏰ **${isKn ? 'ಸಮಯ' : 'Timings'}:** ${entity.timings}\n\n`;
  }

  if (entity.directions) {
    text += `🧭 **${isKn ? 'ಮಾರ್ಗಸೂಚಿ' : 'Directions'}:** ${entity.directions}\n\n`;
  }

  if (entity.fee_note) {
    text += `💳 **${isKn ? 'ಶುಲ್ಕ ಮಾಹಿತಿ' : 'Fee Information'}:** ${entity.fee_note}\n\n`;
  }

  if (entity.departments_here && entity.departments_here.length > 0) {
    text += `🏢 **${isKn ? 'ಇಲ್ಲಿರುವ ವಿಭಾಗಗಳು' : 'Departments Located Here'}:**\n`;
    text += entity.departments_here.map(d => `• ${d}`).join('\n') + `\n\n`;
  }

  if (entity.note) {
    text += `ℹ️ *${entity.note}*\n\n`;
  }

  // Location marker if coordinates exist
  if (entity.lat != null && entity.lng != null) {
    text += `\n__LOCATION__:${entity.lat},${entity.lng}\n`;
  }

  // Image marker if image is attached
  if (entity.image_url) {
    text += `\n__IMAGE__:${entity.image_url}|${entity.image_attribution || ''}\n`;
  }

  return text.trim();
}
