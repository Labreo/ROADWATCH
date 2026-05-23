import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageSquare, 
  Send, 
  X, 
  RefreshCw, 
  Sparkles, 
  Maximize2, 
  Minimize2,
  Navigation,
  FileSpreadsheet,
  AlertTriangle,
  ArrowRight,
  HelpCircle,
  Plus
} from 'lucide-react';
import { useStore } from '@/store/useStore';
import CitationRenderer, { Citation } from './CitationRenderer';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  citations?: Citation[];
  suggestedActions?: { type: string; target_id: number; label: string }[];
}

interface ChatPanelProps {
  onSelectContractor?: (id: number) => void;
}

export default function ChatPanel({ onSelectContractor }: ChatPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "Hello! I am **ROADWATCH AI**, your civic transparency assistant. Ask me questions about road relaying projects, contractor scores, budgets, or report routing boundaries.\n\n*Try asking: 'Why is S.V. Road damaged again?' or 'Is Omega Infrastructure blacklisted?'*"
    }
  ]);
  const [suggestedPrompts, setSuggestedPrompts] = useState<string[]>([
    "Why is S.V. Road damaged again?",
    "Who is the contractor for SV Road?",
    "Is Omega Infrastructure blacklisted?"
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [isBackendOnline, setIsBackendOnline] = useState(false);
  
  // Persist session ID
  const sessionIdRef = useRef('');
  useEffect(() => {
    sessionIdRef.current = 'sess_' + Math.random().toString(36).substring(2, 11);
  }, []);

  const { 
    setSelectedRoadId, 
    setSelectedComplaintId, 
    setActiveView,
    setIsReporting
  } = useStore();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Ping backend to check if online
  useEffect(() => {
    const checkBackend = async () => {
      try {
        const res = await fetch("http://localhost:8000/");
        if (res.ok) {
          setIsBackendOnline(true);
        } else {
          setIsBackendOnline(false);
        }
      } catch (err) {
        setIsBackendOnline(false);
      }
    };
    
    checkBackend();
    const interval = setInterval(checkBackend, 15000);
    return () => clearInterval(interval);
  }, []);

  // Handle Suggested Action Clicking
  const handleActionClick = (action: { type: string; target_id: number; label: string }) => {
    if (action.type === 'navigate_to_road' || action.type === 'navigate_to_road_detail') {
      setSelectedRoadId(action.target_id);
      setActiveView('roads');
      setIsOpen(false);
    } else if (action.type === 'navigate_to_contractor') {
      setSelectedRoadId(null);
      onSelectContractor?.(action.target_id);
      setActiveView('contractors');
      setIsOpen(false);
    } else if (action.type === 'report_complaint_on_road') {
      setSelectedRoadId(action.target_id);
      setIsReporting(true);
      setIsOpen(false);
    }
  };

  // Submit query to FastAPI stream
  const handleSubmit = async (textToSend: string) => {
    if (!textToSend.trim() || isLoading) return;

    setInput('');
    setIsLoading(true);
    
    // Add user message
    setMessages(prev => [...prev, { role: 'user', content: textToSend }]);
    
    // Add temporary empty assistant message to stream into
    setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

    let userLat: number | undefined;
    let userLon: number | undefined;

    // Try to get GPS coordinates
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 3000 });
      });
      userLat = position.coords.latitude;
      userLon = position.coords.longitude;
    } catch (e) {
      // GPS not available or rejected
    }

    try {
      const response = await fetch("http://localhost:8000/api/v1/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          message: textToSend,
          session_id: sessionIdRef.current,
          latitude: userLat,
          longitude: userLon
        })
      });

      if (!response.body) {
        throw new Error("No response body received");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        
        // Save last item in case it is incomplete
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.trim()) {
            try {
              const data = JSON.parse(line);
              
              if (data.type === 'content') {
                setMessages(prev => {
                  const updated = [...prev];
                  const last = updated[updated.length - 1];
                  if (last && last.role === 'assistant') {
                    last.content += data.content;
                  }
                  return updated;
                });
              } else if (data.type === 'metadata') {
                setMessages(prev => {
                  const updated = [...prev];
                  const last = updated[updated.length - 1];
                  if (last && last.role === 'assistant') {
                    last.citations = data.citations;
                    last.suggestedActions = data.suggested_actions;
                  }
                  return updated;
                });
                
                if (data.suggested_prompts && data.suggested_prompts.length > 0) {
                  setSuggestedPrompts(data.suggested_prompts);
                }
              }
            } catch (err) {
              console.error("Failed to parse stream chunk:", line, err);
            }
          }
        }
      }
    } catch (error) {
      console.error("Failed to stream chat:", error);
      // Format a direct error warning in the message bubble
      setMessages(prev => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last && last.role === 'assistant') {
          last.content = "⚠️ Sorry, I could not connect to the accountability engine. Please check if the local server is running.";
        }
        return updated;
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Helper to render markdown bolding and bullet list styling
  const renderMessageContent = (content: string) => {
    if (!content) return null;
    
    return content.split('\n').map((line, idx) => {
      // Bold rendering (simple ** regex substitution)
      let element: React.ReactNode = line;
      const boldRegex = /\*\*(.*?)\*\*/g;
      
      // Basic markdown bolding parsing
      const parts = [];
      let lastIndex = 0;
      let match;
      while ((match = boldRegex.exec(line)) !== null) {
        parts.push(line.substring(lastIndex, match.index));
        parts.push(<strong key={match.index} className="text-cyan-400 font-extrabold">{match[1]}</strong>);
        lastIndex = boldRegex.lastIndex;
      }
      if (lastIndex > 0) {
        parts.push(line.substring(lastIndex));
        element = <>{parts}</>;
      }

      // Check list prefix
      if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
        return (
          <li key={idx} className="ml-4 list-disc text-slate-300 pl-1 text-[11px] leading-relaxed my-0.5">
            {element.toString().substring(2)}
          </li>
        );
      }
      return (
        <p key={idx} className="text-[11px] leading-relaxed my-1 font-medium text-slate-350">
          {element}
        </p>
      );
    });
  };

  return (
    <>
      {/* Floating Toggle Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <motion.button
          onClick={() => setIsOpen(!isOpen)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="relative group p-4 rounded-full bg-gradient-to-tr from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-slate-950 font-black shadow-lg shadow-cyan-500/20 focus:outline-none flex items-center justify-center cursor-pointer border border-cyan-400/40"
        >
          {/* Pulsating Ring */}
          <span className="absolute inset-0 rounded-full bg-cyan-400/30 animate-ping opacity-75 scale-105" />
          
          <AnimatePresence mode="wait">
            {isOpen ? (
              <motion.div
                key="close-icon"
                initial={{ rotate: -90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: 90, opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <X className="w-6 h-6 text-slate-950" />
              </motion.div>
            ) : (
              <motion.div
                key="chat-icon"
                initial={{ rotate: 90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: -90, opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="flex items-center gap-1.5"
              >
                <MessageSquare className="w-5 h-5 text-slate-950" />
                <span className="text-[10px] uppercase font-black tracking-widest max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 whitespace-nowrap pr-0 group-hover:pr-1">
                  Ask AI
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.button>
      </div>

      {/* Chat Window Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 50, x: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 50, x: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 260 }}
            className={`fixed bottom-24 right-6 rounded-2xl border border-border/80 bg-slate-950/90 backdrop-blur-xl shadow-2xl flex flex-col overflow-hidden z-50 transition-all duration-200 ${
              isMaximized 
                ? 'w-[500px] h-[700px] max-w-[calc(100vw-32px)] max-h-[calc(100vh-120px)]' 
                : 'w-96 h-[550px] max-w-[calc(100vw-32px)] max-h-[calc(100vh-120px)]'
            }`}
          >
            {/* Header */}
            <div className="px-4 py-3 bg-gradient-to-r from-slate-900/60 via-cyan-950/20 to-indigo-950/20 border-b border-border/60 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1 rounded-lg bg-cyan-950/60 border border-cyan-800/40 text-cyan-400">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-xs font-black uppercase text-slate-100 tracking-wider">
                      ROADWATCH AI
                    </h3>
                    <span className={`w-1.5 h-1.5 rounded-full ${isBackendOnline ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                  </div>
                  <p className="text-[9px] text-muted-foreground font-semibold">
                    {isBackendOnline ? 'Accredited Records Engine' : 'Connection Throttled (Local Fallback)'}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1">
                <button 
                  onClick={() => setIsMaximized(!isMaximized)}
                  className="p-1.5 rounded-lg border border-border/60 hover:bg-slate-900 text-muted-foreground hover:text-foreground transition-all shrink-0 cursor-pointer hidden sm:block"
                >
                  {isMaximized ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
                </button>
                <button 
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-lg border border-border/60 hover:bg-slate-900 text-muted-foreground hover:text-foreground transition-all shrink-0 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Messages Box */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
              {messages.map((msg, index) => {
                const isAI = msg.role === 'assistant';
                return (
                  <div 
                    key={index}
                    className={`flex items-start gap-2.5 ${isAI ? 'justify-start' : 'justify-end'}`}
                  >
                    {isAI && (
                      <div className="p-1 rounded-lg bg-cyan-950/60 border border-cyan-850 text-cyan-400 shrink-0 mt-0.5">
                        <Sparkles className="w-3 h-3" />
                      </div>
                    )}
                    <div className={`flex flex-col max-w-[82%] ${isAI ? 'items-start' : 'items-end'}`}>
                      <div className={`p-3 rounded-2xl text-[11px] font-medium leading-relaxed border ${
                        isAI 
                          ? 'bg-slate-900/60 border-border/50 text-slate-100 rounded-tl-sm' 
                          : 'bg-gradient-to-tr from-cyan-600/90 to-indigo-600/90 border-cyan-500/20 text-slate-950 font-semibold rounded-tr-sm'
                      }`}>
                        {isAI ? (
                          msg.content === '' ? (
                            <div className="flex items-center gap-1 py-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce delay-75" />
                              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce delay-150" />
                              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce delay-225" />
                            </div>
                          ) : (
                            renderMessageContent(msg.content)
                          )
                        ) : (
                          <p className="whitespace-pre-wrap">{msg.content}</p>
                        )}
                      </div>

                      {/* Citation cards (Roads/Contractors/Authorities) */}
                      {isAI && msg.citations && msg.citations.length > 0 && (
                        <div className="w-full">
                          <CitationRenderer 
                            citations={msg.citations} 
                            onSelectRoad={(id) => {
                              setSelectedRoadId(id);
                              setActiveView('roads');
                              setIsOpen(false);
                            }}
                            onSelectContractor={(id) => {
                              setSelectedRoadId(null);
                              onSelectContractor?.(id);
                              setActiveView('contractors');
                              setIsOpen(false);
                            }}
                          />
                        </div>
                      )}

                      {/* Suggested Quick Actions */}
                      {isAI && msg.suggestedActions && msg.suggestedActions.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {msg.suggestedActions.map((act, actIdx) => (
                            <button
                              key={actIdx}
                              onClick={() => handleActionClick(act)}
                              className="text-[9px] font-bold px-2.5 py-1.5 bg-cyan-950/50 border border-cyan-850 hover:border-cyan-500 text-cyan-400 rounded-xl transition-all cursor-pointer flex items-center gap-1 active:scale-95 shadow-sm"
                            >
                              {act.type === 'report_complaint_on_road' && <Plus className="w-3 h-3" />}
                              {act.type === 'navigate_to_road' && <Navigation className="w-3 h-3" />}
                              {act.type === 'navigate_to_contractor' && <FileSpreadsheet className="w-3 h-3" />}
                              {act.label}
                              <ArrowRight className="w-2.5 h-2.5" />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Bottom Actions & Input */}
            <div className="bg-slate-900/35 border-t border-border/60 py-3 space-y-2">
              
              {/* Suggested Prompts scroll container */}
              {suggestedPrompts.length > 0 && (
                <div className="flex gap-1.5 overflow-x-auto px-4 pb-1 scrollbar-none select-none">
                  {suggestedPrompts.map((prompt, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSubmit(prompt)}
                      className="shrink-0 text-[9px] font-bold px-2.5 py-1.5 bg-slate-900 border border-border/80 hover:border-cyan-500/50 text-slate-300 hover:text-cyan-400 rounded-xl transition-all cursor-pointer whitespace-nowrap active:scale-95"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              )}

              {/* Chat Input Field */}
              <div className="px-4">
                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSubmit(input);
                  }}
                  className="flex gap-2 relative bg-slate-900 border border-border/80 focus-within:border-cyan-500 rounded-xl px-2 py-1.5 transition-all items-center"
                >
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask about repairs, budgets, audits..."
                    className="flex-1 bg-transparent border-0 focus:outline-none text-[11px] text-slate-200 placeholder-muted-foreground pl-1.5"
                    disabled={isLoading}
                  />
                  <button
                    type="submit"
                    disabled={!input.trim() || isLoading}
                    className={`p-1.5 rounded-lg bg-gradient-to-tr from-cyan-600 to-indigo-600 text-slate-950 font-bold hover:opacity-90 active:scale-95 transition-all shrink-0 cursor-pointer ${
                      (!input.trim() || isLoading) ? 'opacity-40 cursor-not-allowed' : ''
                    }`}
                  >
                    <Send className="w-3.5 h-3.5 text-slate-950" />
                  </button>
                </form>
              </div>
            </div>

          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
