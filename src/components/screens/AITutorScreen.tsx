import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Sparkles, 
  BookOpen, 
  HelpCircle, 
  GraduationCap, 
  FileText, 
  Send, 
  Copy, 
  Check, 
  RotateCw,
  Lightbulb,
  Zap
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Language } from '../../types';
import { aiService, ProviderStatus } from '../../services/aiService';

interface AITutorScreenProps {
  onBack: () => void;
  lang: Language;
}

type Mode = 'explain' | 'quiz' | 'exam_prep' | 'summary';

export const AITutorScreen: React.FC<AITutorScreenProps> = ({ onBack, lang }) => {
  const [topic, setTopic] = useState('');
  const [selectedMode, setSelectedMode] = useState<Mode>('explain');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [providerStatus, setProviderStatus] = useState<ProviderStatus | null>(null);

  useEffect(() => {
    aiService.getProviderStatus().then(setProviderStatus).catch(() => {});
  }, []);

  const sampleTopics = [
    { label: 'Relational Database Normalization', mode: 'explain' as Mode },
    { label: 'Operating Systems Scheduling Quiz', mode: 'quiz' as Mode },
    { label: 'Cloud Computing Exam Key Questions', mode: 'exam_prep' as Mode },
    { label: 'Microeconomics Demand Elasticity', mode: 'summary' as Mode },
    { label: 'Data Structures Trees & Graphs', mode: 'explain' as Mode },
  ];

  const handleGenerate = async (queryTopic?: string, modeOverride?: Mode) => {
    const q = (queryTopic ?? topic).trim();
    const mode = modeOverride ?? selectedMode;
    if (!q || loading) return;

    if (queryTopic) setTopic(queryTopic);
    if (modeOverride) setSelectedMode(modeOverride);

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await aiService.getStudyHelp(q, mode, lang);
      setResult(res);
    } catch (err: any) {
      setError(err?.message || 'Failed to generate study guidance. Please check server connection.');
    } finally {
      setLoading(false);
    }
  };

  const copyResult = () => {
    if (!result) return;
    navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col h-full w-full bg-transparent text-white">
      {/* Header */}
      <header className="h-14 px-4 bg-[#1A1A1A] border-b border-[#2A2A2A] flex items-center justify-between shrink-0 z-10">
        <div className="flex items-center gap-3">
          <button 
            onClick={onBack}
            className="p-2 -ml-2 rounded-lg hover:bg-[#2A2A2A] text-neutral-300 hover:text-white transition-colors"
            title="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-b from-[#10A37F] to-[#1A7F64] flex items-center justify-center shadow-xs">
              <Sparkles className="w-4.5 h-4.5 text-white" />
            </div>
            <div>
              <h1 className="font-semibold text-base tracking-tight leading-tight">
                {lang === 'kn' ? 'AI ಅಧ್ಯಯನ ಸಹಾಯಕ' : 'AI Study Tutor'}
              </h1>
              <p className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
                <Zap className="w-2.5 h-2.5" />
                <span>Powered by {providerStatus?.modelName || 'Groq & Campus AI'}</span>
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 max-w-3xl mx-auto w-full space-y-5">
        {/* Mode Selector */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <button
            onClick={() => setSelectedMode('explain')}
            className={`p-3 rounded-xl border text-left transition-all flex flex-col gap-1.5 ${
              selectedMode === 'explain'
                ? 'bg-emerald-950/40 border-emerald-500/50 text-white shadow-xs'
                : 'bg-[#1E1E1E] border-[#2A2A2A] text-neutral-300 hover:bg-[#252525]'
            }`}
          >
            <div className="flex items-center gap-2">
              <BookOpen className={`w-4 h-4 ${selectedMode === 'explain' ? 'text-emerald-400' : 'text-neutral-400'}`} />
              <span className="text-xs font-semibold">Explain Concept</span>
            </div>
            <span className="text-[11px] text-neutral-400 line-clamp-1">Simplified breakdown</span>
          </button>

          <button
            onClick={() => setSelectedMode('quiz')}
            className={`p-3 rounded-xl border text-left transition-all flex flex-col gap-1.5 ${
              selectedMode === 'quiz'
                ? 'bg-amber-950/40 border-amber-500/50 text-white shadow-xs'
                : 'bg-[#1E1E1E] border-[#2A2A2A] text-neutral-300 hover:bg-[#252525]'
            }`}
          >
            <div className="flex items-center gap-2">
              <HelpCircle className={`w-4 h-4 ${selectedMode === 'quiz' ? 'text-amber-400' : 'text-neutral-400'}`} />
              <span className="text-xs font-semibold">Generate Quiz</span>
            </div>
            <span className="text-[11px] text-neutral-400 line-clamp-1">Practice MCQs & keys</span>
          </button>

          <button
            onClick={() => setSelectedMode('exam_prep')}
            className={`p-3 rounded-xl border text-left transition-all flex flex-col gap-1.5 ${
              selectedMode === 'exam_prep'
                ? 'bg-cyan-950/40 border-cyan-500/50 text-white shadow-xs'
                : 'bg-[#1E1E1E] border-[#2A2A2A] text-neutral-300 hover:bg-[#252525]'
            }`}
          >
            <div className="flex items-center gap-2">
              <GraduationCap className={`w-4 h-4 ${selectedMode === 'exam_prep' ? 'text-cyan-400' : 'text-neutral-400'}`} />
              <span className="text-xs font-semibold">Exam Outline</span>
            </div>
            <span className="text-[11px] text-neutral-400 line-clamp-1">Top expected questions</span>
          </button>

          <button
            onClick={() => setSelectedMode('summary')}
            className={`p-3 rounded-xl border text-left transition-all flex flex-col gap-1.5 ${
              selectedMode === 'summary'
                ? 'bg-purple-950/40 border-purple-500/50 text-white shadow-xs'
                : 'bg-[#1E1E1E] border-[#2A2A2A] text-neutral-300 hover:bg-[#252525]'
            }`}
          >
            <div className="flex items-center gap-2">
              <FileText className={`w-4 h-4 ${selectedMode === 'summary' ? 'text-purple-400' : 'text-neutral-400'}`} />
              <span className="text-xs font-semibold">Quick Summary</span>
            </div>
            <span className="text-[11px] text-neutral-400 line-clamp-1">Key revision bullets</span>
          </button>
        </div>

        {/* Input Form */}
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-4 space-y-3">
          <label className="text-xs font-semibold text-neutral-300 flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-amber-400" />
            <span>Enter topic, chapter, or question from your syllabus:</span>
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
              placeholder="e.g. Binary Search Trees, Indian Constitution Articles, DBMS Normal Forms..."
              className="flex-1 bg-[#242424] border border-[#333333] focus:border-[#10A37F] rounded-xl px-4 py-2.5 text-sm text-white placeholder-neutral-400 focus:outline-hidden transition-colors"
            />
            <button
              onClick={() => handleGenerate()}
              disabled={loading || !topic.trim()}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#10A37F] to-[#1A7F64] hover:opacity-90 disabled:opacity-50 text-white font-semibold text-sm flex items-center gap-2 transition-all active:scale-95 shadow-md shadow-[#10A37F]/20 shrink-0"
            >
              {loading ? (
                <RotateCw className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              <span className="hidden sm:inline">Ask AI</span>
            </button>
          </div>

          {/* Suggested Quick Topics */}
          <div className="pt-2">
            <span className="text-[11px] font-medium text-neutral-400 block mb-2">Popular syllabus prompts:</span>
            <div className="flex flex-wrap gap-1.5">
              {sampleTopics.map((sample, idx) => (
                <button
                  key={idx}
                  onClick={() => handleGenerate(sample.label, sample.mode)}
                  className="px-2.5 py-1 rounded-lg bg-[#252525] hover:bg-[#303030] text-[11px] text-neutral-300 hover:text-white border border-[#333333] transition-colors"
                >
                  {sample.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Loading State with Typing Indicator */}
        {loading && (
          <div className="p-8 rounded-2xl bg-[#1A1A1A] border border-[#2A2A2A] text-center space-y-3 animate-in fade-in duration-200">
            <div className="w-12 h-12 rounded-xl bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 mx-auto flex items-center justify-center animate-pulse">
              <Sparkles className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-semibold text-white">Generating AI Study Notes...</h3>
            <p className="text-xs text-neutral-400 max-w-sm mx-auto">
              Analyzing topic against Mangalore University curriculum standards and synthesizing response.
            </p>
            <div className="flex justify-center gap-1.5 pt-2">
              <span className="w-2 h-2 rounded-full bg-[#10A37F] animate-bounce [animation-delay:-0.3s]" />
              <span className="w-2 h-2 rounded-full bg-[#10A37F] animate-bounce [animation-delay:-0.15s]" />
              <span className="w-2 h-2 rounded-full bg-[#10A37F] animate-bounce" />
            </div>
          </div>
        )}

        {/* Error Notification */}
        {error && (
          <div className="p-4 rounded-xl bg-red-950/40 border border-red-800/60 text-red-200 text-xs">
            <p className="font-semibold mb-1">⚠️ Generation Error</p>
            <p>{error}</p>
          </div>
        )}

        {/* Result Area */}
        {result && (
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl overflow-hidden shadow-lg animate-in fade-in slide-in-from-bottom-3 duration-200">
            <div className="px-4 py-3 bg-[#242424] border-b border-[#2E2E2E] flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
                <Sparkles className="w-4 h-4" />
                <span>AI Study Guide & Explanation</span>
              </div>
              <button
                onClick={copyResult}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#303030] hover:bg-[#3D3D3D] text-xs text-neutral-200 hover:text-white transition-colors"
                title="Copy output"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>

            <div className="p-5 text-sm leading-relaxed prose prose-invert prose-emerald max-w-none prose-headings:font-bold prose-headings:text-white prose-p:text-neutral-200">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {result}
              </ReactMarkdown>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
