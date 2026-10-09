import { storage } from './storage';
import { Language, CampusEntity, CourseFee } from '../types';
// import { getApiUrl } from './apiConfig';
import { aiService } from './aiService';
export interface ChatResponse {
  answer: string;
  source: 'remote' | 'local' | 'gemini' | 'groq';
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

function isGenericFallback(text: string): boolean {
  if (!text || typeof text !== 'string') return true;
  const t = text.toLowerCase();
  if (t.includes('campus guide:') && (t.includes('try asking') || t.includes('i can assist you with campus locations'))) {
    return true;
  }
  if (t.includes("couldn't find a direct record matching") || t.includes('ನಿಖರವಾದ ಮಾಹಿತಿ ಸಿಗಲಿಲ್ಲ')) {
    return true;
  }
  return false;
}

export async function processChatMessage(
  message: string, 
  lang: Language, 
  history: { text: string; isUser: boolean }[] = []
): Promise<ChatResponse> {
  const trimmed = message.trim();
  const lower = trimmed.toLowerCase();
  const isKn = lang === 'kn';

  // 1. Direct High-Confidence Intent Matchers (Instant & Accurate)
  
  // A. Greetings
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
      timeGreeting = "Good evening 🌆";
      timeGreetingKn = "ಶುಭ ಸಂಜೆ 🌆";
    } else {
      timeGreeting = "Good night 🌙";
      timeGreetingKn = "ಶುಭ ರಾತ್ರಿ 🌙";
    }

    if (isKn) {
      return {
        answer: `${timeGreetingKn}! ನಾನು ಮಂಗಳೂರು ವಿಶ್ವವಿದ್ಯಾಲಯ (CBMU) ಕ್ಯಾಂಪಸ್ ಸಹಾಯಕ ✨.\n\nನೀವು ವಿಭಾಗಗಳು, ಶುಲ್ಕ ವಿವರಗಳು, ಪರೀಕ್ಷಾ ಫಲಿತಾಂಶಗಳು, ಹಾಸ್ಟೆಲ್ ಅಥವಾ ಬಸ್ ಮಾರ್ಗಗಳ ಬಗ್ಗೆ ಕೇಳಬಹುದು.`,
        source: 'local'
      };
    }
    return {
      answer: `${timeGreeting}! I am your CBMU Campus Assistant 🎓✨.\n\nYou can ask me about fee structures, exam results, departments, hostel timings, bus routes, or university officials.`,
      source: 'local'
    };
  }

  // B. Thank you
  if (lower.includes('thank') || lower.includes('dhanyavada') || lower.includes('dhanyavad')) {
    if (isKn) {
      return { answer: "ನಿಮಗೆ ಹೃತ್ಪೂರ್ವಕ ಸ್ವಾಗತ! ಬೇರೆ ಏನಾದರೂ ಮಾಹಿತಿ ಅಥವಾ ಸಹಾಯ ಬೇಕಿದ್ದರೆ ತಿಳಿಸಿ. 😊", source: 'local' };
    }
    return { answer: "You're very welcome! Let me know if there's anything else about Mangalore University I can help you with. 😊", source: 'local' };
  }

  // C. Fees query (e.g. "What is the fee structure?", "MCA fee", "PG fees", etc.)
  if (lower.includes('fee') || lower.includes('fees') || lower.includes('structure') || lower.includes('shulka') || lower.includes('ಶುಲ್ಕ')) {
    const fees = storage.getFees();
    let matchedFee: CourseFee | null = null;

    if (lower.includes('mca')) matchedFee = fees['mca'];
    else if (lower.includes('mba')) matchedFee = fees['mba'];
    else if (lower.includes('phd') || lower.includes('ph.d') || lower.includes('doctorate')) matchedFee = fees['phd'];
    else if (lower.includes('ug') || lower.includes('bachelor') || lower.includes('degree') || lower.includes('bca') || lower.includes('bsc') || lower.includes('bcom') || lower.includes('ba')) matchedFee = fees['ug'];
    else if (lower.includes('government') || lower.includes('govt')) matchedFee = fees['pg_government'];
    else if (lower.includes('affiliated') || lower.includes('autonomous')) matchedFee = fees['pg_affiliated'];

    if (matchedFee) {
      if (isKn) {
        let text = `### 💳 ${matchedFee.label} ಶುಲ್ಕ ವಿವರ (${matchedFee.year})\n\n`;
        text += `📄 **ಅಧಿಕೃತ ಶುಲ್ಕ ಅಧಿಸೂಚನೆ PDF:**\n[${matchedFee.pdf_label || 'PDF ಡೌನ್‌ಲೋಡ್ ಮಾಡಿ'}](${matchedFee.pdf})\n\n`;
        if (matchedFee.note) text += `ℹ️ *ಗಮನಿಸಿ:* ${matchedFee.note}\n\n`;
        text += `ಎಲ್ಲಾ ಕೋರ್ಸ್‌ಗಳ ವಿವರಗಳಿಗಾಗಿ [ಶುಲ್ಕ ವಿವರಗಳ ಪುಟವನ್ನು ತೆರೆಯಿರಿ](https://mangaloreuniversity.ac.in/fee-details-1.html).`;
        return { answer: text, source: 'local' };
      }

      let text = `### 💳 ${matchedFee.label} Fee Structure (${matchedFee.year})\n\n`;
      text += `📄 **Official Notification PDF:**\n[${matchedFee.pdf_label || 'Download Official PDF'}](${matchedFee.pdf})\n\n`;
      if (matchedFee.note) text += `ℹ️ *Note:* ${matchedFee.note}\n\n`;
      text += `Browse the complete official list on the [University Fee Details Page](https://mangaloreuniversity.ac.in/fee-details-1.html).`;
      return { answer: text, source: 'local' };
    }

    // General fees overview
    if (isKn) {
      let text = `### 💳 ಮಂಗಳೂರು ವಿಶ್ವವಿದ್ಯಾಲಯ ಶುಲ್ಕ ವಿವರಗಳು (Fee Structures)\n\n`;
      Object.values(fees).forEach(f => {
        text += `• **${f.label}** (${f.year}): [${f.pdf_label || 'ಅಧಿಕೃತ PDF'}](${f.pdf})\n`;
      });
      text += `\nಹೆಚ್ಚಿನ ವಿವರಗಳಿಗಾಗಿ [ವಿಶ್ವವಿದ್ಯಾಲಯ ಶುಲ್ಕ ಪುಟವನ್ನು ಭೇಟಿ ಮಾಡಿ](https://mangaloreuniversity.ac.in/fee-details-1.html).`;
      return { answer: text, source: 'local' };
    }

    let text = `### 💳 Mangalore University Fee Structures\n\n`;
    Object.values(fees).forEach(f => {
      text += `• **${f.label}** (${f.year}): [${f.pdf_label || 'View Fee PDF'}](${f.pdf})\n`;
    });
    text += `\n💡 *Tip:* For specific courses, ask e.g. *"MCA fee"*, *"MBA fee"*, or *"UG fees"*, or browse the [Official Fee Details Page](https://mangaloreuniversity.ac.in/fee-details-1.html).`;
    return { answer: text, source: 'local' };
  }

  // D. Results & Examination
  if (lower.includes('result') || lower.includes('marks') || lower.includes('phalaamsha') || lower.includes('ಫಲಿತಾಂಶ') || lower.includes('exam mark')) {
    if (isKn) {
      return {
        answer: `### 🎓 ಪರೀಕ್ಷಾ ಫಲಿತಾಂಶಗಳು (Exam Results)\n\nಮಂಗಳೂರು ವಿಶ್ವವಿದ್ಯಾಲಯದ ಎಲ್ಲಾ ಪದವಿ (UG) ಮತ್ತು ಸ್ನಾತಕೋತ್ತರ (PG) ಪರೀಕ್ಷಾ ಫಲಿತಾಂಶಗಳನ್ನು ಅಧಿಕೃತ ಪೋರ್ಟಲ್‌ನಲ್ಲಿ ವೀಕ್ಷಿಸಬಹುದು:\n\n• **ಫಲಿತಾಂಶ ಪೋರ್ಟಲ್:** [ಮಂಗಳೂರು ವಿಶ್ವವಿದ್ಯಾಲಯ ಫಲಿತಾಂಶ ಲಿಂಕ್](https://mangaloreuniversity.ac.in/exam-results)\n• **UUCMS ಪೋರ್ಟಲ್:** [UUCMS ಕರ್ನಾಟಕ ವಿದ್ಯಾರ್ಥಿ ಲಾಗಿನ್](https://uucms.karnataka.gov.in)\n• **ಕುಲಸಚಿವರು (ಮೌಲ್ಯಮಾಪನ) ಸಹಾಯವಾಣಿ:** 0824-2287227 / 2287282\n\nನಿಮ್ಮ ರಿಜಿಸ್ಟರ್ ನಂಬರ್ (Register Number) ನಮೂದಿಸಿ ಫಲಿತಾಂಶ ಪರಿಶೀಲಿಸಿ.`,
        source: 'local'
      };
    }
    return {
      answer: `### 🎓 Examination Results & Mark Sheets\n\nYou can access undergraduate (UG) and postgraduate (PG) semester exam results directly on official university portals:\n\n• **Official Results Portal:** [Check MU Results Online](https://mangaloreuniversity.ac.in/exam-results)\n• **UUCMS Karnataka Portal:** [UUCMS Student Login](https://uucms.karnataka.gov.in)\n• **Registrar (Evaluation) Helpdesk:** 0824-2287227 / 2287282\n\n📌 Please keep your university register number ready to view your semester grades.`,
      source: 'local'
    };
  }

  // E. How to reach campus / Bus routes
  if (lower.includes('bus') || lower.includes('reach') || lower.includes('route') || lower.includes('distance') || lower.includes('train') || lower.includes('airport') || lower.includes('ಹೇಗೆ ಹೋಗುವುದು') || lower.includes('ಬಸ್')) {
    if (isKn) {
      return {
        answer: `### 🚌 ಮಂಗಳೂರು ವಿಶ್ವವಿದ್ಯಾಲಯ ಕ್ಯಾಂಪಸ್ ತಲುಪುವುದು ಹೇಗೆ?
\n📍 **ವಿಳಾಸ:** ಮಂಗಳಗಂಗೋತ್ರಿ, ಕೊಣಾಜೆ, ಮಂಗಳೂರು - 574199 (ಮಂಗಳೂರು ನಗರ ಕೇಂದ್ರದಿಂದ ~20 ಕಿ.ಮೀ).
\n🚍 **ನಗರ ಬಸ್ ಮಾರ್ಗಗಳು (State Bank ನಿಲ್ದಾಣದಿಂದ):**
• **ಬಸ್ ಸಂಖ್ಯೆಗಳು:** **Route No. 51, 51A, 51B, 51E**
• **ಮಾರ್ಗ:** State Bank → ಕಂಕನಾಡಿ → ಪಂಪ್‌ವೆಲ್ → ತೊಕ್ಕೊಟ್ಟು → ದೇರಳಕಟ್ಟೆ → ಕೊಣಾಜೆ (ಕ್ಯಾಂಪಸ್ ಗೇಟ್).
• **ಪ್ರಯಾಣ ಸಮಯ:** 45 - 55 ನಿಮಿಷಗಳು (ಪ್ರತಿ 10-15 ನಿಮಿಷಕ್ಕೊಮ್ಮೆ ಬಸ್ ಲಭ್ಯ).
\n🚆 **ಹತ್ತಿರದ ರೈಲ್ವೆ ನಿಲ್ದಾಣಗಳು:** Mangalore Central (MAQ) & Mangalore Junction (MAJN).
✈️ **ವಿಮಾನ ನಿಲ್ದಾಣ:** ಮಂಗಳೂರು ಅಂತಾರಾಷ್ಟ್ರೀಯ ವಿಮಾನ ನಿಲ್ದಾಣ (Bajpe, ~32 ಕಿ.ಮೀ).
\n__LOCATION__:12.8160,74.9255`,
        source: 'local'
      };
    }
    return {
      answer: `### 🚌 How to Reach Mangalore University Campus (Mangalagangotri, Konaje)
\n📍 **Campus Address:** Mangalagangotri, Konaje, Mangaluru, Karnataka - 574199 (~20 km from Mangalore city center).
\n🚍 **City Bus Routes from State Bank Terminus:**
• **Bus Route Numbers:** **51, 51A, 51B, 51E**
• **Route:** State Bank → Kankanady → Pumpwell Circle → Thokkottu Overbridge → Deralakatte Medical Hub → Konaje Campus Gate.
• **Frequency:** Every 10 to 15 minutes during academic hours.
• **Travel Time:** Approx. 45–55 minutes.
\n🚆 **Nearest Railway Stations:** Mangalore Central (MAQ, ~20 km) & Mangalore Junction (MAJN, ~18 km). Auto-rickshaws and app cabs available.
✈️ **Nearest Airport:** Mangalore International Airport (IXE, ~32 km).
\n__LOCATION__:12.8160,74.9255`,
      source: 'local'
    };
  }

  // F. Vice Chancellor & Registrar
  if (lower.includes('vice chancellor') || lower.includes('vc') || lower.includes('chancellor') || lower.includes('kulapati') || lower.includes('ಕುಲಪತಿ')) {
    if (isKn) {
      return {
        answer: `### 🏛️ ಮಾನ್ಯ ಕುಲಪತಿಗಳು (Vice Chancellor) - ಮಂಗಳೂರು ವಿಶ್ವವಿದ್ಯಾಲಯ
\n👤 **ಕುಲಪತಿಗಳು:** **ಪ್ರೊ. ಪಿ. ಎಲ್. ಧರ್ಮ** (Prof. P. L. Dharma)
📍 **ಕಚೇರಿ:** ಕುಲಪತಿಗಳ ಸಚಿವಾಲಯ, ಮೊದಲ ಮಹಡಿ, ಆಡಳಿತ ಸೌಧ, ಮಂಗಳಗಂಗೋತ್ರಿ, ಕೊಣಾಜೆ
📞 **ದೂರವಾಣಿ:** 0824-2287230 / 2287231
✉️ **ಇಮೇಲ್:** vc@mangaloreuniversity.ac.in
🧭 **ಭೇಟಿಯ ಸಮಯ:** ಮಧ್ಯಾಹ್ನ 3:00 ರಿಂದ ಸಂಜೆ 5:00 ರವರೆಗೆ (ಪೂರ್ವಾನುಮತಿಯೊಂದಿಗೆ)
\n__LOCATION__:12.8160,74.9255`,
        source: 'local'
      };
    }
    return {
      answer: `### 🏛️ Office of the Vice Chancellor (CBMU)
\n👤 **Hon'ble Vice Chancellor:** **Prof. P. L. Dharma**
📍 **Office:** Vice Chancellor's Secretariat, First Floor, Administration Block, Mangalagangotri, Konaje - 574199
📞 **Phone:** 0824-2287230 / 2287231
✉️ **Email:** vc@mangaloreuniversity.ac.in
🧭 **Visiting Hours:** 3:00 PM – 5:00 PM (by prior appointment with PS to VC)
\n__LOCATION__:12.8160,74.9255`,
      source: 'local'
    };
  }

  if (lower.includes('registrar') || lower.includes('kulasachiva') || lower.includes('ಕುಲಸಚಿವ')) {
    if (isKn) {
      return {
        answer: `### 🏛️ ಕುಲಸಚಿವರು (Registrar Administration & Evaluation)
\n1. **ಕುಲಸಚಿವರು (ಆಡಳಿತ):**
• **ಅಧಿಕಾರಿ:** ಶ್ರೀ ಕೆ. ರಾಜು ಮೊಗವೀರ, KAS (Sri K. Raju Mogaveera, KAS)
• 📍 **ಸ್ಥಳ:** ಆಡಳಿತ ಸೌಧ, ಮಂಗಳಗಂಗೋತ್ರಿ
• 📞 **ದೂರವಾಣಿ:** 0824-2287276
\n2. **ಕುಲಸಚಿವರು (ಮೌಲ್ಯಮಾಪನ / ಪರೀಕ್ಷೆ):**
• **ಅಧಿಕಾರಿ:** ಪ್ರೊ. ದೇವೇಂದ್ರಪ್ಪ ಹೆಚ್ (Prof. Devendrappa H)
• 📍 **ಸ್ಥಳ:** ಪರೀಕ್ಷಾ ಭವನ (Pareeksha Bhavan)
• 📞 **ದೂರವಾಣಿ:** 0824-2287227 / 2287282
\n__LOCATION__:12.8160,74.9255`,
        source: 'local'
      };
    }
    return {
      answer: `### 🏛️ Registrar Secretariat & Examination Branch
\n1. **Registrar (Administration):**
• **Officer:** Sri K. Raju Mogaveera, KAS
• 📍 **Office:** Administration Block, Mangalagangotri Campus
• 📞 **Phone:** 0824-2287276 | ✉️ **Email:** registrar@mangaloreuniversity.ac.in
\n2. **Registrar (Evaluation / Examinations):**
• **Officer:** Prof. Devendrappa H
• 📍 **Office:** Pareeksha Bhavan (Examination Block)
• 📞 **Phone:** 0824-2287227 / 2287282
\n__LOCATION__:12.8160,74.9255`,
      source: 'local'
    };
  }

  // G. Hostels
  if (lower.includes('hostel') || lower.includes('ಹಾಸ್ಟೆಲ್') || lower.includes('ವಸತಿ ನಿಲಯ')) {
    if (isKn) {
      return {
        answer: `### 🏢 ಮಂಗಳೂರು ವಿಶ್ವವಿದ್ಯಾಲಯ ವಿದ್ಯಾರ್ಥಿ ನಿಲಯಗಳು (Hostels)
\n1. **ಪುರುಷರ ಹಾಸ್ಟೆಲ್ (Men's Hostel):**
• **ಬ್ಲಾಕ್‌ಗಳು:** ಕಾವೇರಿ ಮತ್ತು ನೇತ್ರಾವತಿ ಬ್ಲಾಕ್
• 📍 ಸ್ಥಳ: ದಕ್ಷಿಣ ಕ್ಯಾಂಪಸ್, ಕ್ರೀಡಾಂಗಣದ ಹತ್ತಿರ
• ⏰ ಗೇಟ್ ಮುಚ್ಚುವ ಸಮಯ: ರಾತ್ರಿ 8:30
\n2. **ಮಹಿಳೆಯರ ಹಾಸ್ಟೆಲ್ (Women's Hostel):**
• **ಬ್ಲಾಕ್‌ಗಳು:** ಗಂಗೋತ್ರಿ ಮಹಿಳಾ ನಿಲಯ
• 📍 ಸ್ಥಳ: ಉತ್ತರ ಕ್ಯಾಂಪಸ್, ಅತಿಥಿ ಗೃಹದ ಹತ್ತಿರ
• ⏰ ಗೇಟ್ ಮುಚ್ಚುವ ಸಮಯ: ಸಂಜೆ 7:30
\n🍲 **ಸೌಲಭ್ಯಗಳು:** ಶುದ್ಧ ಕುಡಿಯುವ ನೀರು, ವೈ-ಫೈ, ಡೈನಿಂಗ್ ಹಾಲ್, 24/7 ಭದ್ರತೆ.
📞 **ವಾರ್ಡನ್ ಸಂಪರ್ಕ:** 0824-2287242
\n__LOCATION__:12.8180,74.9240`,
        source: 'local'
      };
    }
    return {
      answer: `### 🏢 University Hostels & Residential Facilities
\n1. **Men's Post Graduate Hostel:**
• **Blocks:** Kaveri & Netravathi Halls of Residence
• 📍 **Location:** South Campus, near University Sports Pavilion
• ⏰ **In-Timings:** 8:30 PM
\n2. **Women's Post Graduate Hostel:**
• **Blocks:** Gangotri Working Women & Students Complex
• 📍 **Location:** North Campus, adjacent to University Guest House
• ⏰ **In-Timings:** 7:30 PM strict policy
\n🍲 **Amenities:** Modern mess facilities, Wi-Fi connectivity, RO water, and round-the-clock security.
📞 **Hostel Warden Desk:** 0824-2287242
\n__LOCATION__:12.8180,74.9240`,
      source: 'local'
    };
  }

  // H. Central Library
  if (lower.includes('library') || lower.includes('ಗ್ರಂಥಾಲಯ') || lower.includes('granthalaya')) {
    if (isKn) {
      return {
        answer: `### 📚 ಮಂಗಳೂರು ವಿಶ್ವವಿದ್ಯಾಲಯ ಕೇಂದ್ರ ಗ್ರಂಥಾಲಯ (Central Library)
\n📍 **ಸ್ಥಳ:** ಮುಖ್ಯ ಆಡಳಿತ ಸೌಧದ ಎದುರು, ಮಂಗಳಗಂಗೋತ್ರಿ ಕ್ಯಾಂಪಸ್, ಕೊಣಾಜೆ
⏰ **ಸಮಯ:** ಸೋಮವಾರ - ಶನಿವಾರ: 8:00 AM – 8:00 PM (ಓದುವ ಕೊಠಡಿಗಳು)
👤 **ಗ್ರಂಥಪಾಲಕರು:** Dr. M. Purushotham Gowda (ಮೊಬೈಲ್: 9449450671)
📞 **ಸಂಪರ್ಕ:** 0824-2287234
\n__LOCATION__:12.81661,74.92405`,
        source: 'local'
      };
    }
    return {
      answer: `### 📚 Central University Library
\n📍 **Location:** Opposite Administration Block, Mangalagangotri Campus, Konaje
⏰ **Timings:** Monday to Friday: 8:00 AM – 8:00 PM | Saturday: 9:00 AM – 5:30 PM
👤 **In-Charge Librarian:** Dr. M. Purushotham Gowda (Mobile: 9449450671)
📞 **Librarian Desk:** 0824-2287234
\n__LOCATION__:12.81661,74.92405`,
      source: 'local'
    };
  }

  // I. Banks & ATM
  if (lower.includes('atm') || lower.includes('bank') || lower.includes('sbi') || lower.includes('canara') || lower.includes('ಬ್ಯಾಂಕ್')) {
    return {
      answer: `### 🏦 Banks & ATM Facilities on Campus
\n1. **State Bank of India (SBI) - Mangalagangotri Branch & 24/7 ATM:**
• 📍 **Location:** Adjacent to Administrative Block
• ⏰ **Branch Timings:** 10:00 AM – 4:00 PM (Monday–Saturday)
• 🏧 **ATM:** 24/7 Cash withdrawal & deposit kiosk.
\n2. **Canara Bank ATM:**
• 📍 **Location:** Shopping Complex, Main Arch Entrance Gate.
• 🏧 24/7 ATM facility.
\n__LOCATION__:12.8163,74.9252`,
      source: 'local'
    };
  }

  // J. Health Centre
  if (lower.includes('health') || lower.includes('hospital') || lower.includes('doctor') || lower.includes('medical') || lower.includes('ಆಸ್ಪತ್ರೆ')) {
    return {
      answer: `### 🏥 University Health Centre (Medical Facilities)
\n📍 **Location:** Near North Campus / Women's Hostel, Mangalagangotri
⏰ **Timings:** 9:00 AM – 5:30 PM (Medical staff on emergency call)
👨‍⚕️ **Services:**
• Free general medical consultation and basic medicines for students & staff.
• On-campus ambulance service for emergencies.
📞 **Emergency Contact:** 0824-2287590 / 2287340
\n__LOCATION__:12.8186,74.92436`,
      source: 'local'
    };
  }

  // K. Check direct department entity match
  const departments = storage.getDepartments();
  for (const entity of Object.values(departments)) {
    const key = (entity.key || '').toLowerCase();
    const name = (entity.name || '').toLowerCase();
    if (lower === key || lower === name || (entity.aliases && entity.aliases.some(a => lower === a.toLowerCase()))) {
      return {
        answer: formatEntityResponse(entity, lang),
        source: 'local'
      };
    }
  }


  // 2. Try Server-Side AI (Groq / Gemini / Unified coordinator)
  try {
    const aiAnswer = await aiService.chatWithGemini(
      trimmed,
      lang,
      history
    );

    if (aiAnswer && !isGenericFallback(aiAnswer)) {
      return {
        answer: aiAnswer,
        source: 'remote'
      };
    }
  } catch (err) {
    console.warn(
      'Backend chat route unreachable, checking local campus engine:',
      err
    );
  }
  // // 2. Try Server-Side AI (Groq / Gemini / Unified coordinator)
  // try {
  //   const aiRes = await fetch(getApiUrl("/api/ai/chat"), {
  //     method: "POST",
  //     headers: { "Content-Type": "application/json" },
  //     body: JSON.stringify({ message: trimmed, lang, history }),
  //   });

  //   if (aiRes.ok) {
  //     const data = await aiRes.json();
  //     if (data && data.answer && typeof data.answer === 'string') {
  //       // If the answer is an actual intelligent answer (not a generic canned non-response)
  //       if (!isGenericFallback(data.answer)) {
  //         return {
  //           answer: data.answer,
  //           source: (data.source === 'groq' || data.source === 'gemini') ? data.source : 'remote'
  //         };
  //       }
  //     }
  //   }
  // } catch (err) {
  //   console.warn('Backend chat route unreachable, checking local campus engine:', err);
  // }

  // 3. Fallback Entity Matching across CAMPUS_DATA
  let bestMatch: CampusEntity | null = null;
  let bestScore = 0;

  for (const entity of Object.values(departments)) {
    // Check substring match
    if (lower.includes(entity.key.toLowerCase()) || lower.includes(entity.name.toLowerCase())) {
      bestMatch = entity;
      bestScore = 1.0;
      break;
    }

    if (entity.aliases) {
      for (const alias of entity.aliases) {
        const aLower = alias.toLowerCase();
        if (lower.includes(aLower)) {
          bestMatch = entity;
          bestScore = 0.95;
          break;
        }
        const tokens = aLower.split(' ');
        if (tokens.every(t => lower.includes(t))) {
          bestMatch = entity;
          bestScore = 0.9;
          break;
        }
      }
    }

    if (bestScore >= 0.9) break;

    // Fuzzy matching against name & key only if query length is comparable
    const lenDiffKey = Math.abs(lower.length - entity.key.length);
    const lenDiffName = Math.abs(lower.length - entity.name.length);
    if (lenDiffKey <= 3 || lenDiffName <= 4) {
      const simKey = calculateSimilarity(lower, entity.key);
      const simName = calculateSimilarity(lower, entity.name.toLowerCase());
      const score = Math.max(simKey, simName);
      if (score > bestScore && score >= 0.78) {
        bestScore = score;
        bestMatch = entity;
      }
    }
  }

  if (bestMatch && bestScore >= 0.78) {
    return {
      answer: formatEntityResponse(bestMatch, lang),
      source: 'local'
    };
  }

  // 4. Helpful Bilingual Campus Guide Response
  if (isKn) {
    return {
      answer: `ನನಗೆ "${trimmed}" ಬಗ್ಗೆ ನಿಖರವಾದ ದಾಖಲೆ ಸಿಗಲಿಲ್ಲ.\n\n📌 **ನೀವು ಹೀಗೆ ಕೇಳಬಹುದು:**\n• **ಶುಲ್ಕ ವಿವರಗಳು:** "MCA ಶುಲ್ಕ", "MBA ಶುಲ್ಕ", "ಪದವಿ ಶುಲ್ಕ"\n• **ಪರೀಕ್ಷಾ ಫಲಿತಾಂಶ:** "ಪರೀಕ್ಷಾ ಫಲಿತಾಂಶಗಳು", "UUCMS ಲಿಂಕ್"\n• **ವಿಭಾಗಗಳು & ಸ್ಥಳಗಳು:** "ವಿಜ್ಞಾನ ಬ್ಲಾಕ್", "ಗಣಕ ವಿಜ್ಞಾನ (MCA)", "ಕೇಂದ್ರ ಗ್ರಂಥಾಲಯ"\n• **ಸೌಲಭ್ಯಗಳು:** "ಹಾಸ್ಟೆಲ್ ಸಮಯ", "ಬಸ್ ಮಾರ್ಗ 51", "ಆಸ್ಪತ್ರೆ", "ಬ್ಯಾಂಕ್ ATM"\n• **ಕಚೇರಿಗಳು:** "ಕುಲಪತಿಗಳು (VC)", "ಕುಲಸಚಿವರು"`,
      source: 'local'
    };
  }

  return {
    answer: `I couldn't find a direct campus match for "${trimmed}".\n\n📌 **Here are quick topics you can ask me right now:**\n• **Fee Structures:** *"What is the fee structure?"*, *"MCA course fee"*, *"MBA fee"*\n• **Examinations:** *"How to check exam results?"*, *"UUCMS portal link"*\n• **Locations & Blocks:** *"Where is Science Block?"*, *"Central Library"*, *"Computer Science"*\n• **Facilities & Travel:** *"Bus route to campus"*, *"Men's & Women's Hostel"*, *"SBI ATM"*\n• **Administration:** *"Who is the Vice Chancellor?"*, *"Registrar contact number"*\n\n💡 *Tip:* Check out the **AI Study Tutor** in the menu for instant syllabus exam notes!`,
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
