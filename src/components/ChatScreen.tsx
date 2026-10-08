import React, { useState, useEffect, useRef } from 'react';
import { 
  Menu, 
  Trash2, 
  Languages, 
  ArrowUp, 
  GraduationCap, 
  Bot, 
  RotateCw, 
  Map, 
  MapPin, 
  Check, 
  Copy,
  ExternalLink,
  Sparkles,
  Mic,
  MicOff,
  Award,
  Clock,
  ShieldAlert,
  Search,
  X,
  Download,
  FileText,
  Printer,
  Zap,
  ShieldCheck
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Message, Language } from '../types';
import { kStrings } from '../data/campusData';
import { storage } from '../services/storage';
import { processChatMessage } from '../services/chatEngine';
import { aiService, ProviderStatus } from '../services/aiService';

// Browser Web Speech API type declaration
declare global {
  interface Window {
    SpeechRecognition?: any;
    webkitSpeechRecognition?: any;
  }
}

interface ChatScreenProps {
  onOpenDrawer: () => void;
  onOpenLocationMap: (lat: number, lng: number, name: string) => void;
  lang: Language;
  onToggleLang: () => void;
  onOpenAdmin?: () => void;
}

export const ChatScreen: React.FC<ChatScreenProps> = ({
  onOpenDrawer,
  onOpenLocationMap,
  lang,
  onToggleLang,
  onOpenAdmin,
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [providerStatus, setProviderStatus] = useState<ProviderStatus | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  const t = (key: keyof typeof kStrings['en']) => {
    return kStrings[lang]?.[key] || kStrings['en'][key];
  };

  // Setup Web Speech API speech recognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      recognitionRef.current = null;
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      // Set recognition language matching user's selected language
      recognition.lang = lang === 'kn' ? 'kn-IN' : 'en-IN';

      recognition.onstart = () => {
        setIsListening(true);
        setSpeechError(null);
      };

      recognition.onresult = (event: any) => {
        let currentInterim = '';
        let finalChunk = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalChunk += transcript + ' ';
          } else {
            currentInterim += transcript;
          }
        }

        if (finalChunk) {
          setInputText((prev) => (prev ? prev + ' ' : '') + finalChunk.trim());
          setInterimTranscript('');
        } else {
          setInterimTranscript(currentInterim);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        if (event.error === 'not-allowed') {
          setSpeechError(t('voicePermissionDenied') || 'Microphone access denied');
        } else if (event.error !== 'no-speech') {
          setSpeechError(`Voice error: ${event.error}`);
        }
        setIsListening(false);
        setInterimTranscript('');
      };

      recognition.onend = () => {
        setIsListening(false);
        setInterimTranscript('');
      };

      recognitionRef.current = recognition;
    } catch (e) {
      console.error('Failed to initialize SpeechRecognition:', e);
      recognitionRef.current = null;
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
      }
    };
  }, [lang]);

  const toggleVoiceRecording = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSpeechError(t('voiceUnsupported') || 'Voice input is not supported in this browser.');
      setTimeout(() => setSpeechError(null), 4000);
      return;
    }

    if (isListening) {
      try {
        recognitionRef.current?.stop();
      } catch {
        // ignore
      }
      setIsListening(false);
      setInterimTranscript('');
    } else {
      setSpeechError(null);
      try {
        if (recognitionRef.current) {
          recognitionRef.current.lang = lang === 'kn' ? 'kn-IN' : 'en-IN';
          recognitionRef.current.start();
        }
      } catch (err: any) {
        console.error('Error starting recognition:', err);
        // If already started, stop then restart
        try {
          recognitionRef.current?.stop();
        } catch {}
      }
    }
  };

  // Load chat history or show initial welcome on mount and sync with storage
  useEffect(() => {
    const history = storage.getChatHistory();
    if (history.length > 0) {
      setMessages(history);
    } else {
      showWelcomeMessage();
    }
    aiService.getProviderStatus().then(setProviderStatus).catch(() => {});
  }, []);

  // Update welcome message language only if user hasn't sent any messages yet
  useEffect(() => {
    const history = storage.getChatHistory();
    if (history.length === 0 || (messages.length === 1 && messages[0].id.startsWith('welcome-'))) {
      showWelcomeMessage();
    }
  }, [lang]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const scrollToBottom = () => {
    if (!isSearching) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleToggleSearch = () => {
    if (isSearching) {
      setIsSearching(false);
      setSearchQuery('');
    } else {
      setIsSearching(true);
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  };

  // Close export menu on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setShowExportMenu(false);
      }
    };
    if (showExportMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showExportMenu]);

  const handleExportText = () => {
    setShowExportMenu(false);
    const dateStr = new Date().toISOString().split('T')[0];
    let fileContent = `=================================================\n`;
    fileContent += `Mangalore University Campus Assistant (CBMU)\n`;
    fileContent += `Chat Conversation Export - ${new Date().toLocaleString()}\n`;
    fileContent += `=================================================\n\n`;

    messages.forEach((msg, idx) => {
      const { cleanText } = parseMessageData(msg.text);
      const sender = msg.isUser ? 'Student / User' : 'CBMU Assistant';
      const time = new Date(msg.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      fileContent += `[${idx + 1}] ${sender} (${time}):\n`;
      fileContent += `${cleanText}\n\n`;
      fileContent += `-------------------------------------------------\n`;
    });

    const blob = new Blob([fileContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `CBMU_Chat_History_${dateStr}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportPDF = () => {
    setShowExportMenu(false);
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      // Fallback to text export if popup is blocked
      handleExportText();
      return;
    }

    const title = 'CBMU Campus Assistant - Chat Export';
    const dateStr = new Date().toLocaleDateString();
    
    let htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${title}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 24px; color: #111; max-width: 800px; margin: 0 auto; line-height: 1.5; }
          .header { border-bottom: 2px solid #10A37F; padding-bottom: 12px; margin-bottom: 20px; }
          .title { font-size: 20px; font-weight: bold; color: #0d8264; margin: 0 0 4px 0; }
          .meta { font-size: 12px; color: #666; }
          .msg { margin-bottom: 16px; padding: 12px 16px; border-radius: 8px; font-size: 14px; page-break-inside: avoid; }
          .msg-user { background: #f0fdf4; border-left: 4px solid #10a37f; }
          .msg-bot { background: #f8fafc; border-left: 4px solid #64748b; }
          .sender { font-weight: 600; font-size: 12px; margin-bottom: 4px; color: #334155; }
          .time { font-weight: normal; color: #94a3b8; font-size: 11px; margin-left: 6px; }
          .text { white-space: pre-wrap; word-break: break-word; }
          @media print {
            body { padding: 0; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1 class="title">🎓 Mangalore University Campus Assistant (CBMU)</h1>
          <div class="meta">Exported on ${dateStr} • Total messages: ${messages.length}</div>
        </div>
    `;

    messages.forEach((msg) => {
      const { cleanText } = parseMessageData(msg.text);
      const sender = msg.isUser ? 'You (Student)' : 'CBMU Assistant';
      const time = new Date(msg.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const cls = msg.isUser ? 'msg msg-user' : 'msg msg-bot';
      htmlContent += `
        <div class="${cls}">
          <div class="sender">${sender}<span class="time">${time}</span></div>
          <div class="text">${cleanText.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
        </div>
      `;
    });

    htmlContent += `
        <script>
          window.onload = function() {
            window.print();
          }
        </script>
      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  // Filter messages based on search query if searching
  const filteredMessages = isSearching && searchQuery.trim()
    ? messages.filter((m) => {
        const query = searchQuery.trim().toLowerCase();
        const clean = m.text
          .replace(/__LOCATION__:[^\n]+/g, '')
          .replace(/__IMAGE__:[^\n]+/g, '')
          .toLowerCase();
        return clean.includes(query);
      })
    : messages;

  const showWelcomeMessage = () => {
    const hour = new Date().getHours();
    const greeting = hour < 12
      ? t('goodMorning')
      : hour < 17
      ? t('goodAfternoon')
      : hour < 21
      ? t('goodEvening')
      : t('goodNight');

    const welcomeMsg: Message = {
      id: 'welcome-' + Date.now(),
      text: `${greeting}!\n\n${t('welcomeSuffix')}`,
      isUser: false,
      time: new Date().toISOString(),
    };

    setMessages([welcomeMsg]);
  };

  const handleSendMessage = async (overrideText?: string) => {
    // If speech recognition is actively recording, stop it
    if (isListening) {
      try {
        recognitionRef.current?.stop();
      } catch {}
      setIsListening(false);
      setInterimTranscript('');
    }

    const textToSend = (overrideText ?? inputText).trim();
    if (!textToSend || isLoading) return;

    let updatedMessages = [...messages];
    if (!overrideText) {
      const userMsg: Message = {
        id: 'msg-' + Date.now(),
        text: textToSend,
        isUser: true,
        time: new Date().toISOString(),
      };
      updatedMessages = [...updatedMessages, userMsg];
      setMessages(updatedMessages);
      storage.saveChatHistory(updatedMessages);
    }

    setInputText('');
    setIsLoading(true);

    try {
      const historyContext = updatedMessages.slice(-6).map(m => ({ text: m.text, isUser: m.isUser }));
      const response = await processChatMessage(textToSend, lang, historyContext);
      const botMsg: Message = {
        id: 'bot-' + Date.now(),
        text: response.answer,
        isUser: false,
        time: new Date().toISOString(),
      };
      const finalMessages = [...updatedMessages, botMsg];
      setMessages(finalMessages);
      storage.saveChatHistory(finalMessages);
    } catch {
      const errorMsg: Message = {
        id: 'err-' + Date.now(),
        text: t('connectionError'),
        isUser: false,
        time: new Date().toISOString(),
        isError: true,
      };
      const finalMessages = [...updatedMessages, errorMsg];
      setMessages(finalMessages);
      storage.saveChatHistory(finalMessages);
    } finally {
      setIsLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const handleClearChat = () => {
    setMessages([]);
    storage.clearChatHistory();
    setShowClearConfirm(false);
    showWelcomeMessage();
  };

  const copyToClipboard = (text: string, id: string) => {
    // Strip special markers
    const clean = text
      .replace(/__LOCATION__:[^\n]+/g, '')
      .replace(/__IMAGE__:[^\n]+/g, '')
      .trim();
    navigator.clipboard.writeText(clean);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const parseMessageData = (rawText: string) => {
    const locationMatch = rawText.match(/__LOCATION__:(-?\d+\.\d+),(-?\d+\.\d+)/);
    const imageMatch = rawText.match(/__IMAGE__:(\S+)\|([^\n]*)/);

    let cleanText = rawText
      .replace(/__LOCATION__:[^\n]+/g, '')
      .replace(/__IMAGE__:[^\n]+/g, '')
      .trim();

    return {
      cleanText,
      lat: locationMatch ? parseFloat(locationMatch[1]) : null,
      lng: locationMatch ? parseFloat(locationMatch[2]) : null,
      imageUrl: imageMatch ? imageMatch[1] : null,
      imageAttribution: imageMatch ? imageMatch[2] : null,
    };
  };

  const handleOpenGoogleMaps = (lat: number, lng: number) => {
    const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const suggestedPromptChips = lang === 'kn' ? [
    { label: "ಶುಲ್ಕ ವಿವರಗಳು", query: "ಶುಲ್ಕ ರಚನೆ ಏನು? (What is the fee structure?)" },
    { label: "ಗ್ರಂಥಾಲಯ ಸ್ಥಳ", query: "ಗ್ರಂಥಾಲಯ ಎಲ್ಲಿದೆ? (Show me the library location)" },
    { label: "ಪರೀಕ್ಷಾ ಫಲಿತಾಂಶ", query: "ಪರೀಕ್ಷಾ ಫಲಿತಾಂಶಗಳು ಎಲ್ಲಿ ಸಿಗುತ್ತವೆ?" },
    { label: "ಕ್ಯಾಂಪಸ್ ನಿಯಮಗಳು", query: "ಕ್ಯಾಂಪಸ್ ನಿಯಮಗಳು ಮತ್ತು ಶಿಸ್ತು" },
    { label: "ಹಾಸ್ಟೆಲ್ ವಿವರ", query: "ಹಾಸ್ಟೆಲ್ ವಸತಿ ಮಾಹಿತಿ" },
    { label: "ಕುಲಸಚಿವರ ಕಚೇರಿ", query: "ಕುಲಸಚಿವರ ಕಚೇರಿ ಸಂಪರ್ಕ ವಿವರ" },
  ] : [
    { label: "What is the fee structure?", query: "What is the fee structure?" },
    { label: "Show me the library location", query: "Show me the library location" },
    { label: "Check Results", query: "How to check examination results?" },
    { label: "Campus Rules", query: "Campus rules and discipline policies" },
    { label: "Science Block", query: "Tell me about Science Block" },
    { label: "Hostels Info", query: "University hostels contact and timings" },
  ];

  return (
    <div className="flex flex-col h-full w-full bg-transparent text-slate-900 dark:text-white transition-colors duration-200">
      {/* AppBar */}
      <header className="px-3 bg-white/95 dark:bg-[#1A1A1A]/95 backdrop-blur-md border-b border-slate-200 dark:border-[#2A2A2A] z-20 shrink-0">
        <div className="h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <button
              onClick={onOpenDrawer}
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-[#2A2A2A] text-slate-600 dark:text-neutral-300 hover:text-slate-900 dark:hover:text-white transition-colors"
              title="Menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-b from-[#10A37F] to-[#1A7F64] flex items-center justify-center shadow-xs">
                <GraduationCap className="w-4.5 h-4.5 text-white" />
              </div>
              <div>
                <h1 className="font-semibold text-base tracking-tight text-slate-900 dark:text-white select-none leading-none">
                  {t('appBarTitle')}
                </h1>
                <span 
                  className="inline-flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold tracking-wider uppercase mt-0.5"
                  title={providerStatus?.modelName || 'Campus AI Assistant'}
                >
                  {providerStatus?.groqConfigured ? (
                    <>
                      <Zap className="w-2.5 h-2.5 text-emerald-500 fill-emerald-500" />
                      <span>Groq 70B</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-2.5 h-2.5" />
                      <span>AI Powered</span>
                    </>
                  )}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Search History Toggle Button */}
            <button
              onClick={handleToggleSearch}
              className={`p-2 rounded-lg transition-colors ${
                isSearching
                  ? 'bg-[#10A37F]/20 text-[#10A37F]'
                  : 'hover:bg-slate-100 dark:hover:bg-[#2A2A2A] text-slate-500 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
              }`}
              title={t('searchHistory')}
            >
              <Search className="w-4.5 h-4.5" />
            </button>

            {/* Export Chat Button & Dropdown */}
            <div className="relative" ref={exportMenuRef}>
              <button
                onClick={() => setShowExportMenu(!showExportMenu)}
                className={`p-2 rounded-lg transition-colors ${
                  showExportMenu
                    ? 'bg-[#10A37F]/20 text-[#10A37F]'
                    : 'hover:bg-slate-100 dark:hover:bg-[#2A2A2A] text-slate-500 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
                }`}
                title={t('exportChat')}
              >
                <Download className="w-4.5 h-4.5" />
              </button>

              {showExportMenu && (
                <div className="absolute right-0 mt-1.5 w-52 rounded-xl bg-white dark:bg-[#222222] border border-slate-200 dark:border-[#333333] shadow-xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100 text-slate-800 dark:text-white">
                  <div className="px-3 py-1.5 border-b border-slate-200 dark:border-[#333333] text-[11px] font-semibold text-slate-500 dark:text-neutral-400 uppercase tracking-wider">
                    {t('exportChat')}
                  </div>
                  <button
                    onClick={handleExportText}
                    className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-neutral-200 dark:hover:bg-[#2A2A2A] dark:hover:text-white flex items-center gap-2.5 transition-colors"
                  >
                    <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>{t('exportText')}</span>
                  </button>
                  <button
                    onClick={handleExportPDF}
                    className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-neutral-200 dark:hover:bg-[#2A2A2A] dark:hover:text-white flex items-center gap-2.5 transition-colors"
                  >
                    <Printer className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                    <span>{t('exportPdf')}</span>
                  </button>
                </div>
              )}
            </div>

            {/* Language Toggle Button */}
            <button
              onClick={onToggleLang}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-[#2A2A2A] dark:hover:bg-[#333333] transition-colors text-xs font-semibold text-slate-800 dark:text-white shadow-xs border border-slate-200 dark:border-transparent"
              title="Toggle Language"
            >
              <Languages className="w-3.5 h-3.5 text-[#10A37F]" />
              <span>{lang === 'en' ? 'EN' : 'ಕನ್ನಡ'}</span>
            </button>

            {/* Admin Portal Quick Button */}
            {onOpenAdmin && (
              <button
                onClick={onOpenAdmin}
                className="p-2 rounded-lg hover:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors"
                title="Admin Portal / Dashboard"
              >
                <ShieldCheck className="w-4.5 h-4.5" />
              </button>
            )}

            {/* Clear Chat Button */}
            <button
              onClick={() => setShowClearConfirm(true)}
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-[#2A2A2A] text-slate-500 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white transition-colors"
              title={t('clearTitle')}
            >
              <Trash2 className="w-4.5 h-4.5" />
            </button>
          </div>
        </div>

        {/* Collapsible Search Input Bar */}
        {isSearching && (
          <div className="pb-3 pt-1 border-t border-slate-200 dark:border-[#2A2A2A]/60 flex items-center gap-2 animate-in slide-in-from-top-2 duration-150">
            <div className="flex-1 relative flex items-center">
              <Search className="w-4 h-4 text-neutral-400 absolute left-3 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('searchPlaceholder')}
                className="w-full bg-[#242424] hover:bg-[#2A2A2A] focus:bg-[#2A2A2A] border border-[#333333] focus:border-[#10A37F]/60 rounded-xl pl-9 pr-8 py-1.5 text-xs text-white placeholder-neutral-400 focus:outline-hidden transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 text-neutral-400 hover:text-white p-0.5"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {searchQuery.trim() && (
              <span className="text-[11px] font-medium text-neutral-400 px-2 shrink-0">
                {t('searchResultsCount').replace('{count}', String(filteredMessages.length))}
              </span>
            )}

            <button
              type="button"
              onClick={handleToggleSearch}
              className="text-xs text-neutral-400 hover:text-white px-2 py-1 rounded-md hover:bg-[#2A2A2A] transition-colors"
            >
              {t('cancel')}
            </button>
          </div>
        )}
      </header>

      {/* Messages List Area */}
      <main className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {isSearching && searchQuery.trim() && filteredMessages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 select-none">
            <div className="w-14 h-14 rounded-full bg-[#2A2A2A] flex items-center justify-center mb-3">
              <Search className="w-7 h-7 text-neutral-400" />
            </div>
            <h3 className="text-base font-semibold text-white mb-1">
              {t('noSearchResults').replace('{query}', searchQuery)}
            </h3>
            <p className="text-xs text-neutral-400 max-w-xs mb-4">
              Try searching with different keywords like 'fees', 'hostel', 'results', or department names.
            </p>
            <button
              onClick={() => setSearchQuery('')}
              className="text-xs px-3 py-1.5 rounded-lg bg-[#2A2A2A] hover:bg-[#333333] text-neutral-200 transition-colors"
            >
              Clear Search
            </button>
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 select-none">
            <div className="w-18 h-18 rounded-full bg-gradient-to-b from-[#10A37F] to-[#1A7F64] flex items-center justify-center shadow-lg shadow-[#10A37F]/20 mb-5">
              <GraduationCap className="w-9 h-9 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
              {t('emptyTitle')}
            </h2>
            <p className="text-sm text-slate-500 dark:text-neutral-400 max-w-sm mb-6">
              {t('emptySubtitle')}
            </p>

            {/* Quick chips */}
            <div className="flex flex-wrap gap-2 justify-center max-w-md">
              {suggestedPromptChips.map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(p.query)}
                  className="px-3.5 py-1.5 rounded-full bg-white dark:bg-[#1A1A1A] hover:bg-slate-100 dark:hover:bg-[#2A2A2A] border border-slate-200 dark:border-[#2A2A2A] text-xs font-medium text-slate-700 dark:text-neutral-300 hover:text-slate-900 dark:hover:text-white transition-all active:scale-95 flex items-center gap-1.5 shadow-xs"
                >
                  <Sparkles className="w-3 h-3 text-[#10A37F]" />
                  <span>{p.label}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          filteredMessages.map((msg) => {
            const { cleanText, lat, lng, imageUrl, imageAttribution } = parseMessageData(msg.text);

            return (
              <div
                key={msg.id}
                className={`flex gap-3 max-w-3xl ${msg.isUser ? 'ml-auto justify-end' : 'mr-auto justify-start'}`}
              >
                {/* Bot Avatar */}
                {!msg.isUser && (
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shadow-xs ${
                      msg.isError
                        ? 'bg-gradient-to-b from-red-600 to-red-800'
                        : 'bg-gradient-to-b from-[#10A37F] to-[#1A7F64]'
                    }`}
                  >
                    <Bot className="w-4.5 h-4.5 text-white" />
                  </div>
                )}

                {/* Message Bubble Column */}
                <div className={`flex flex-col ${msg.isUser ? 'items-end' : 'items-start'} max-w-[85%] sm:max-w-[78%]`}>
                  {/* Photo if present */}
                  {imageUrl && (
                    <div className="mb-2 rounded-2xl overflow-hidden border border-slate-200 dark:border-[#2A2A2A] bg-white dark:bg-[#1A1A1A] max-w-[280px]">
                      <img
                        src={imageUrl}
                        alt="Campus location"
                        className="w-full h-40 object-cover"
                        loading="lazy"
                      />
                      {imageAttribution && (
                        <p className="p-2 text-[10px] text-slate-500 dark:text-neutral-400 leading-tight">
                          {imageAttribution}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Main Bubble */}
                  <div
                    className={`relative group rounded-2xl p-4 shadow-sm text-[15px] leading-relaxed break-words ${
                      msg.isUser
                        ? 'bg-[#10A37F] text-white rounded-tr-xs'
                        : msg.isError
                        ? 'bg-red-50 dark:bg-[#3A2222] border border-red-200 dark:border-red-900/60 text-red-900 dark:text-red-100 rounded-tl-xs'
                        : 'bg-white dark:bg-[#2A2A2A] border border-slate-200 dark:border-transparent text-slate-900 dark:text-neutral-100 rounded-tl-xs shadow-xs'
                    }`}
                  >
                    {msg.isUser ? (
                      <p className="whitespace-pre-wrap">{cleanText}</p>
                    ) : (
                      <div className="prose prose-sm dark:prose-invert max-w-none prose-p:leading-relaxed prose-headings:font-bold prose-headings:text-slate-900 dark:prose-headings:text-white prose-a:text-emerald-600 dark:prose-a:text-[#6FE3C4] prose-a:underline hover:prose-a:text-emerald-700">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {cleanText}
                        </ReactMarkdown>
                      </div>
                    )}

                    {/* Copy action icon */}
                    <button
                      onClick={() => copyToClipboard(cleanText, msg.id)}
                      className="absolute right-2 top-2 p-1.5 rounded-lg bg-black/40 hover:bg-black/60 text-white/70 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                      title={copiedId === msg.id ? t('copied') : 'Copy text'}
                    >
                      {copiedId === msg.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>

                  {/* Retry button on error */}
                  {msg.isError && (
                    <button
                      onClick={() => {
                        const lastUser = [...messages].reverse().find(m => m.isUser);
                        if (lastUser) handleSendMessage(lastUser.text);
                      }}
                      className="mt-1.5 flex items-center gap-1.5 text-xs text-[#10A37F] hover:underline font-semibold"
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                      <span>{t('retry')}</span>
                    </button>
                  )}

                  {/* Location Action Buttons (View in App + Open in Google Maps) */}
                  {lat != null && lng != null && (
                    <div className="mt-2.5 flex flex-wrap gap-2">
                      <button
                        onClick={() => {
                          const firstLine = cleanText.split('\n')[0].replace(/[*#]/g, '').trim() || 'Location';
                          onOpenLocationMap(lat, lng, firstLine);
                        }}
                        className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-[#2A2A2A] dark:hover:bg-[#333333] border border-[#10A37F] text-[#10A37F] text-xs font-semibold transition-all active:scale-95"
                      >
                        <Map className="w-4 h-4" />
                        <span>Navigate in App</span>
                      </button>

                      <button
                        onClick={() => handleOpenGoogleMaps(lat, lng)}
                        className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#10A37F] to-[#1A7F64] hover:opacity-95 text-white text-xs font-semibold shadow-md shadow-[#10A37F]/20 transition-all active:scale-95"
                      >
                        <MapPin className="w-4 h-4" />
                        <span>{t('openMaps')}</span>
                        <ExternalLink className="w-3.5 h-3.5 opacity-80" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}

        {/* Bot is Typing Animation */}
        {isLoading && (
          <div className="flex gap-3 max-w-3xl mr-auto justify-start animate-in fade-in slide-in-from-bottom-2 duration-200">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-b from-[#10A37F] to-[#1A7F64] flex items-center justify-center shrink-0 shadow-xs">
              <Bot className="w-4.5 h-4.5 text-white animate-pulse" />
            </div>
            <div className="bg-white dark:bg-[#2A2A2A] rounded-2xl rounded-tl-xs px-4 py-3 border border-slate-200 dark:border-[#333333]/60 flex items-center gap-2.5 shadow-xs">
              <span className="text-xs font-medium text-slate-600 dark:text-neutral-300">
                {t('thinking')}
              </span>
              <div className="flex items-center gap-1.5 py-0.5">
                <span className="w-2 h-2 rounded-full bg-[#10A37F] animate-bounce [animation-delay:-0.3s]" />
                <span className="w-2 h-2 rounded-full bg-[#10A37F] animate-bounce [animation-delay:-0.15s]" />
                <span className="w-2 h-2 rounded-full bg-[#10A37F] animate-bounce" />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </main>

      {/* Input Composer */}
      <footer className="p-3 sm:p-4 bg-white/95 dark:bg-[#1A1A1A] border-t border-slate-200 dark:border-[#2A2A2A] shrink-0 space-y-2">
        {/* Voice listening status banner */}
        {isListening && (
          <div className="max-w-3xl mx-auto flex items-center justify-between px-3 py-1.5 rounded-xl bg-[#10A37F]/10 border border-[#10A37F]/30 animate-pulse text-xs text-[#10A37F]">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#10A37F] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#10A37F]"></span>
              </span>
              <span className="font-medium">
                {t('voiceListening') || 'Listening...'} ({lang === 'kn' ? 'ಕನ್ನಡ' : 'English'})
              </span>
              {interimTranscript && (
                <span className="text-slate-700 dark:text-white/80 italic line-clamp-1 max-w-xs">
                  "{interimTranscript}"
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={toggleVoiceRecording}
              className="text-xs px-2 py-0.5 rounded-md bg-[#10A37F]/20 hover:bg-[#10A37F]/30 text-emerald-800 dark:text-white font-medium transition-colors"
            >
              {t('voiceStop') || 'Stop'}
            </button>
          </div>
        )}

        {/* Speech Error Banner */}
        {speechError && (
          <div className="max-w-3xl mx-auto px-3 py-1.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/40 text-xs text-red-700 dark:text-red-300 flex items-center justify-between">
            <span>{speechError}</span>
            <button
              type="button"
              onClick={() => setSpeechError(null)}
              className="ml-2 text-red-600 dark:text-red-200 hover:text-red-800 font-bold"
            >
              ✕
            </button>
          </div>
        )}

        {/* Suggested Prompt Chips Row above Input Field */}
        <div className="max-w-3xl mx-auto flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
          {suggestedPromptChips.map((chip, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSendMessage(chip.query)}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all active:scale-95 shadow-xs border bg-slate-100 hover:bg-slate-200 dark:bg-[#242424] dark:hover:bg-[#2F2F2F] text-slate-700 dark:text-neutral-300 hover:text-slate-900 dark:hover:text-white border-slate-200 dark:border-[#3A3A3A]"
            >
              {idx === 0 && <Award className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />}
              {idx === 1 && <MapPin className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />}
              {idx === 2 && <Clock className="w-3.5 h-3.5 text-blue-600 dark:text-cyan-400 shrink-0" />}
              {idx === 3 && <ShieldAlert className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 shrink-0" />}
              {idx > 3 && <Sparkles className="w-3 h-3 text-[#10A37F] shrink-0" />}
              <span>{chip.label}</span>
            </button>
          ))}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="max-w-3xl mx-auto flex items-center gap-2"
        >
          {/* Voice to Text button */}
          <button
            type="button"
            onClick={toggleVoiceRecording}
            disabled={isLoading}
            className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 transition-all active:scale-95 ${
              isListening
                ? 'bg-red-600 text-white shadow-lg shadow-red-600/30 animate-pulse'
                : 'bg-slate-100 hover:bg-slate-200 dark:bg-[#2A2A2A] dark:hover:bg-[#333333] text-slate-700 dark:text-neutral-300 hover:text-slate-900 dark:hover:text-white'
            }`}
            title={isListening ? (t('voiceStop') || 'Stop listening') : (t('voiceStart') || 'Voice to text')}
          >
            {isListening ? (
              <MicOff className="w-5 h-5 text-white" />
            ) : (
              <Mic className="w-5 h-5 text-[#10A37F]" />
            )}
          </button>

          <div className="flex-1 bg-slate-100 dark:bg-[#2A2A2A] border border-slate-200 dark:border-transparent rounded-2xl px-4 py-2.5 flex items-center focus-within:ring-2 focus-within:ring-[#10A37F]/50 transition-all shadow-xs">
            <input
              ref={inputRef}
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={isListening ? (t('voiceListening') || 'Listening...') : t('hint')}
              disabled={isLoading}
              className="w-full bg-transparent text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-neutral-400 focus:outline-hidden"
            />
            {interimTranscript && !inputText && (
              <span className="text-sm text-slate-400 dark:text-neutral-400 italic pointer-events-none truncate ml-1">
                {interimTranscript}
              </span>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading || (!inputText.trim() && !interimTranscript.trim())}
            className="w-11 h-11 rounded-full bg-gradient-to-b from-[#10A37F] to-[#1A7F64] hover:opacity-95 disabled:opacity-40 disabled:cursor-not-allowed text-white flex items-center justify-center shrink-0 shadow-md shadow-[#10A37F]/20 active:scale-95 transition-all"
            title="Send"
          >
            <ArrowUp className="w-5 h-5 stroke-[2.5]" />
          </button>
        </form>
      </footer>

      {/* Clear Chat Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#1A1A1A] border border-slate-200 dark:border-[#2A2A2A] rounded-2xl p-5 max-w-xs w-full shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <h3 className="font-bold text-base text-slate-900 dark:text-white">{t('clearTitle')}</h3>
            <p className="text-xs text-slate-600 dark:text-neutral-400 leading-relaxed">{t('clearBody')}</p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-[#2A2A2A] dark:hover:bg-[#333333] text-slate-700 dark:text-neutral-300 text-xs font-semibold"
              >
                {t('cancel')}
              </button>
              <button
                type="button"
                onClick={handleClearChat}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold"
              >
                {t('delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
