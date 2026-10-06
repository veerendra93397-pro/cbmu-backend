import { Language } from '../types';

export interface StudyAssistResponse {
  result?: string;
  error?: string;
}

export interface NoticeSummaryResponse {
  summary?: string;
  error?: string;
}

export interface ProviderStatus {
  activeProvider: 'groq' | 'gemini' | 'academic_engine';
  groqConfigured: boolean;
  geminiConfigured: boolean;
  modelName: string;
}

export const aiService = {
  /**
   * Check active server AI provider and Groq connection status
   */
  async getProviderStatus(): Promise<ProviderStatus> {
    try {
      const res = await fetch('/api/ai/provider-status');
      if (res.ok) {
        return await res.json();
      }
    } catch {}
    return {
      activeProvider: 'academic_engine',
      groqConfigured: false,
      geminiConfigured: false,
      modelName: 'CBMU Academic Engine',
    };
  },

  /**
   * Test Groq connection
   */
  async testGroqConnection(key?: string): Promise<{ success: boolean; message: string; reply?: string }> {
    try {
      const res = await fetch('/api/ai/test-groq', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key }),
      });
      return await res.json();
    } catch (err: any) {
      return { success: false, message: err?.message || 'Server connection failed' };
    }
  },

  /**
   * Send a query to the server-side AI chat endpoint (Groq / Gemini)
   */
  async chatWithGemini(message: string, lang: Language, history: { text: string; isUser: boolean }[] = []): Promise<string | null> {
    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, lang, history }),
      });

      if (!res.ok) {
        return null;
      }

      const data = await res.json();
      return data.answer || null;
    } catch {
      return null;
    }
  },

  /**
   * Request study assistance, concept explanation, or quiz generation
   */
  async getStudyHelp(topic: string, mode: 'explain' | 'quiz' | 'exam_prep' | 'summary', lang: Language): Promise<string> {
    try {
      const res = await fetch('/api/ai/study-assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, mode, lang }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate study assistance');
      }
      return data.result || 'No response generated.';
    } catch (err: any) {
      throw new Error(err.message || 'Error connecting to AI study assistant.');
    }
  },

  /**
   * Summarize an official university circular or announcement
   */
  async summarizeNotice(title: string, body: string, lang: Language): Promise<string> {
    try {
      const res = await fetch('/api/ai/summarize-notice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, body, lang }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Notice summarization unavailable');
      }
      return data.summary || 'Summary unavailable.';
    } catch (err: any) {
      throw new Error(err.message || 'Notice summarization failed');
    }
  }
};
