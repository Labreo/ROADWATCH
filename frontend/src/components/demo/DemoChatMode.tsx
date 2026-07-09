'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play, Pause, SkipForward, SkipBack, X, Sparkles, ChevronDown,
  Navigation, FileSpreadsheet, Plus, ArrowRight, MapPin, Activity,
  Clock, Award, ShieldAlert, AlertTriangle, CheckCircle, Info,
  MessageSquare, BarChart3, HardHat, BookOpen
} from 'lucide-react';
import { useStore } from '@/store/useStore';
import { demoSnippets, DemoSnippet, DemoScene, DemoMessage } from '@/data/demoScripts';
import CitationRenderer from '@/components/chat/CitationRenderer';

// Which criteria each icon maps to
const CRITERIA_LABELS: Record<number, { label: string; icon: React.ReactNode }> = {
  1: { label: 'Root Cause Diagnosis', icon: <Activity className="w-3 h-3" /> },
  2: { label: 'Budget Transparency', icon: <BarChart3 className="w-3 h-3" /> },
  3: { label: 'Contractor Accountability', icon: <HardHat className="w-3 h-3" /> },
  4: { label: 'Citizen Complaint Routing', icon: <MessageSquare className="w-3 h-3" /> },
  5: { label: 'SLA & Dispatch Tracking', icon: <Clock className="w-3 h-3" /> },
};

export default function DemoChatMode() {
  const {
    activeDemoSnippet,
    setActiveDemoSnippet,
    activeDemoScene,
    setActiveDemoScene,
    isDemoAutoPlaying,
    setDemoAutoPlaying,
    demoNarration,
    setDemoNarration,
    setDemoMode,
    setActiveView,
    setSelectedRoadId,
    setSelectedComplaintId,
    setMapViewport,
    dispatchChatAction,
    setIsChatDriven,
    setIsReporting,
    activeView,
  } = useStore();

  const [phase, setPhase] = useState<'select' | 'playing' | 'done'>('select');
  const [currentMessageIndex, setCurrentMessageIndex] = useState(-1);
  const [streamedContent, setStreamedContent] = useState('');
  const [streamingCitations, setStreamingCitations] = useState<any[]>([]);
  const [streamingActions, setStreamingActions] = useState<any[]>([]);
  const [streamingEvidence, setStreamingEvidence] = useState<any[]>([]);
  const [streamingPrompts, setStreamingPrompts] = useState<string[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [showNarration, setShowNarration] = useState(false);
  const [selectedSnippet, setSelectedSnippet] = useState<DemoSnippet | null>(null);
  const [selectingDemo, setSelectingDemo] = useState(false);
  const [expandedEvidenceKey, setExpandedEvidenceKey] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [streamedContent, currentMessageIndex]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  // Build simulated messages array for display
  const displayedMessages: DemoMessage[] = selectedSnippet
    ? selectedSnippet.messages.slice(0, Math.max(currentMessageIndex + 1, 0))
    : [];

  const currentStep = selectedSnippet?.messages[Math.min(currentMessageIndex, selectedSnippet.messages.length - 1)];

  const getCurrentScene = useCallback((): DemoScene | null => {
    if (!selectedSnippet) return null;
    const scenes = selectedSnippet.scenes;
    // Map message index to scene
    // Scenes alternate: scene 0 = before first message, scene 1 = after first response...
    const sceneIdx = Math.min(activeDemoScene, scenes.length - 1);
    return scenes[sceneIdx] || null;
  }, [selectedSnippet, activeDemoScene]);

  // Play the current message from the backend
  const playMessage = useCallback(async (msgIndex: number) => {
    if (!selectedSnippet) return;
    const msg = selectedSnippet.messages[msgIndex];
    if (!msg) return;

    // If it's a user message, just show it
    if (msg.role === 'user') {
      setCurrentMessageIndex(msgIndex);
      setStreamingCitations([]);
      setStreamingActions([]);
      setStreamingEvidence([]);
      setStreamingPrompts([]);
      setStreamedContent('');
      return;
    }

    // It's an assistant message — stream it
    setIsStreaming(true);
    setStreamedContent('');
    setStreamingCitations([]);
    setStreamingActions([]);
    setStreamingEvidence([]);
    setStreamingPrompts([]);

    const words = msg.content.split(' ');
    let current = '';

    for (let i = 0; i < words.length; i++) {
      if (abortRef.current?.signal.aborted) break;
      current += (i === 0 ? '' : ' ') + words[i];
      setStreamedContent(current);
      const delay = Math.max(8, Math.min(40, words[i].length * 2.5));
      await new Promise(r => setTimeout(r, delay));
    }

    // Set metadata
    if (msg.citations) setStreamingCitations(msg.citations);
    if (msg.suggestedActions) setStreamingActions(msg.suggestedActions);
    if (msg.evidence) setStreamingEvidence(msg.evidence);
    if (msg.suggestedPrompts) setStreamingPrompts(msg.suggestedPrompts);

    setIsStreaming(false);
    setCurrentMessageIndex(msgIndex);

    // Dispatch store actions for the current scene
    const scene = selectedSnippet?.scenes[Math.min(
      activeDemoScene,
      (selectedSnippet?.scenes.length || 1) - 1
    )];
    if (scene?.dispatchActions) {
      for (const action of scene.dispatchActions) {
        if (action.type === 'NAVIGATE') {
          dispatchChatAction(action);
        } else {
          dispatchChatAction({ type: action.type, payload: action.payload });
        }
      }
    }

    // Advance scene if we just finished a message pair
    if (msg.role === 'assistant' && selectedSnippet) {
      const nextScene = Math.min(activeDemoScene + 1, selectedSnippet.scenes.length - 1);
      setActiveDemoScene(nextScene);
      const scene = selectedSnippet.scenes[nextScene];
      if (scene) {
        setDemoNarration(scene.narration);
        setShowNarration(true);
      }
    }
  }, [selectedSnippet, activeDemoScene, dispatchChatAction, setActiveDemoScene, setDemoNarration]);

  // Auto-play loop
  useEffect(() => {
    if (!isDemoAutoPlaying || !selectedSnippet || phase !== 'playing') return;
    if (isStreaming) return;

    const nextIndex = currentMessageIndex + 1;
    if (nextIndex >= selectedSnippet.messages.length) {
      setPhase('done');
      setDemoAutoPlaying(false);
      return;
    }

    const timer = setTimeout(() => {
      playMessage(nextIndex);
    }, selectedSnippet.messages[nextIndex].role === 'user' ? 800 : 200);

    return () => clearTimeout(timer);
  }, [isDemoAutoPlaying, selectedSnippet, phase, currentMessageIndex, isStreaming, playMessage]);

  // Select a snippet to play
  const handleSelectSnippet = (snippet: DemoSnippet) => {
    setSelectedSnippet(snippet);
    setActiveDemoSnippet(snippet.id);
    setCurrentMessageIndex(-1);
    setStreamedContent('');
    setStreamingCitations([]);
    setStreamingActions([]);
    setStreamingEvidence([]);
    setPhase('playing');

    // Show first scene narration
    setActiveDemoScene(0);
    const firstScene = snippet.scenes[0];
    if (firstScene) {
      setDemoNarration(firstScene.narration);
      setShowNarration(true);
    }

    // Set chat-driven mode
    setIsChatDriven(true);
    setActiveView('chat');

    // Auto-start after narration
    setTimeout(() => {
      setShowNarration(false);
      setDemoAutoPlaying(true);
      playMessage(0);
    }, 2500);
  };

  const handlePause = () => setDemoAutoPlaying(false);
  const handleResume = () => setDemoAutoPlaying(true);
  const handleSkip = () => {
    if (!selectedSnippet) return;
    const nextMsgIndex = currentMessageIndex + 1;
    if (nextMsgIndex >= selectedSnippet.messages.length) {
      setPhase('done');
      setDemoAutoPlaying(false);
      return;
    }
    playMessage(nextMsgIndex);
  };

  const handleActionClick = (action: { type: string; target_id: number; label: string }) => {
    if (action.type === 'navigate_to_road' || action.type === 'navigate_to_road_detail') {
      setSelectedRoadId(action.target_id);
      setActiveView('roads');
    } else if (action.type === 'navigate_to_contractor') {
      setSelectedRoadId(null);
      if (action.target_id) {
        dispatchChatAction({
          type: 'RENDER_CONTRACTOR_AUDIT',
          payload: { contractorId: action.target_id },
        });
      }
      setActiveView('contractors');
    } else if (action.type === 'report_complaint_on_road') {
      setSelectedRoadId(action.target_id);
      setIsReporting(true);
    }
  };

  const handleExit = () => {
    abortRef.current?.abort();
    setDemoMode('off');
    setActiveDemoSnippet(null);
    setActiveDemoScene(0);
    setDemoNarration('');
    setDemoAutoPlaying(false);
    setSelectedSnippet(null);
    setPhase('select');
    setIsChatDriven(false);
  };

  const handleReplay = () => {
    if (!selectedSnippet) return;
    setCurrentMessageIndex(-1);
    setStreamedContent('');
    setStreamingCitations([]);
    setStreamingActions([]);
    setStreamingEvidence([]);
    setPhase('playing');
    setActiveDemoScene(0);
    setShowNarration(true);
    setDemoNarration(selectedSnippet.scenes[0]?.narration || '');
    setTimeout(() => {
      setShowNarration(false);
      setDemoAutoPlaying(true);
      playMessage(0);
    }, 2000);
  };

  const renderMessageMarkdown = (content: string) => {
    if (!content) return null;
    return content.split('\n').map((line, idx) => {
      const boldRegex = /\*\*(.*?)\*\*/g;
      if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
        const raw = line.trim().substring(2);
        const parts: React.ReactNode[] = [];
        let lastIdx = 0, m;
        while ((m = boldRegex.exec(raw)) !== null) {
          parts.push(raw.substring(lastIdx, m.index));
          parts.push(<strong key={m.index} className="text-cyan-400 font-extrabold">{m[1]}</strong>);
          lastIdx = boldRegex.lastIndex;
        }
        if (lastIdx > 0) {
          parts.push(raw.substring(lastIdx));
          return <li key={idx} className="ml-4 list-disc text-slate-350 pl-1 text-[11px] leading-relaxed my-0.5 font-medium">{parts}</li>;
        }
        return <li key={idx} className="ml-4 list-disc text-slate-350 pl-1 text-[11px] leading-relaxed my-0.5 font-medium">{raw}</li>;
      }
      const parts: React.ReactNode[] = [];
      let lastIdx = 0, m;
      while ((m = boldRegex.exec(line)) !== null) {
        parts.push(line.substring(lastIdx, m.index));
        parts.push(<strong key={m.index} className="text-cyan-400 font-extrabold">{m[1]}</strong>);
        lastIdx = boldRegex.lastIndex;
      }
      if (lastIdx > 0) {
        parts.push(line.substring(lastIdx));
        return <p key={idx} className="text-[11px] leading-relaxed my-1 font-medium text-slate-350">{parts}</p>;
      }
      return <p key={idx} className="text-[11px] leading-relaxed my-1 font-medium text-slate-350">{line}</p>;
    });
  };

  // ── SELECTION PHASE ──
  if (phase === 'select') {
    return (
      <div className="flex-1 flex items-center justify-center p-6 bg-slate-950/20">
        <div className="max-w-2xl w-full space-y-6">
          <div className="text-center space-y-2">
            <div className="p-2 inline-flex rounded-xl bg-cyan-950/60 border border-cyan-800/40 text-cyan-400 mb-2">
              <Sparkles className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-black text-slate-100 uppercase tracking-wider">
              Demo Mode
            </h2>
            <p className="text-[11px] text-slate-400 font-medium max-w-md mx-auto">
              Choose a scripted scenario to see ROADWATCH in action. Each covers multiple judging criteria.
            </p>
          </div>

          <div className="grid gap-4">
            {demoSnippets.map((snip) => (
              <motion.button
                key={snip.id}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => handleSelectSnippet(snip)}
                className="text-left p-5 rounded-2xl bg-slate-900/60 border border-white/[0.06] hover:border-cyan-500/50 hover:bg-slate-900/80 transition-all cursor-pointer group"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="text-sm font-black text-slate-100 group-hover:text-cyan-400 transition-colors">
                      {snip.title}
                    </h3>
                    <p className="text-[10px] text-slate-500 font-semibold mt-0.5">{snip.subtitle}</p>
                  </div>
                  <span className="text-[9px] font-bold text-cyan-400 bg-cyan-950/30 border border-cyan-900/60 px-2 py-0.5 rounded-full whitespace-nowrap">
                    {snip.duration}
                  </span>
                </div>
                <p className="text-[10.5px] text-slate-400 font-medium leading-relaxed mb-3">
                  {snip.description}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {snip.criteria.map((c) => (
                    <span
                      key={c}
                      className="inline-flex items-center gap-1 text-[8px] font-bold uppercase tracking-wider text-cyan-500 bg-cyan-950/30 border border-cyan-900/50 px-1.5 py-0.5 rounded"
                    >
                      {CRITERIA_LABELS[c]?.icon}
                      {CRITERIA_LABELS[c]?.label}
                    </span>
                  ))}
                </div>
              </motion.button>
            ))}
          </div>

          <div className="text-center">
            <button
              onClick={handleExit}
              className="text-[10px] font-bold text-slate-500 hover:text-slate-300 transition-colors cursor-pointer px-4 py-2"
            >
              Exit Demo Mode
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── DONE PHASE ──
  if (phase === 'done') {
    return (
      <div className="flex-1 flex items-center justify-center p-6 bg-slate-950/20">
        <div className="max-w-md w-full text-center space-y-5">
          <div className="p-3 inline-flex rounded-full bg-emerald-950/40 border border-emerald-900/60 text-emerald-400">
            <CheckCircle className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-black text-slate-100 uppercase tracking-wider">
            Demo Complete
          </h2>
          <p className="text-[11px] text-slate-400 font-medium">
            You have seen how ROADWATCH demonstrates root cause analysis, budget transparency,
            contractor accountability, citizen complaint routing, and SLA-based dispatch tracking.
          </p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={handleReplay}
              className="px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-[10px] uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Play className="w-3.5 h-3.5" /> Replay Scenario
            </button>
            <button
              onClick={() => { setPhase('select'); setSelectedSnippet(null); setActiveDemoSnippet(null); }}
              className="px-4 py-2.5 rounded-xl border border-white/[0.08] hover:border-cyan-500/50 text-slate-300 hover:text-cyan-400 font-bold text-[10px] uppercase tracking-wider transition-all cursor-pointer"
            >
              Try Another Scenario
            </button>
            <button
              onClick={handleExit}
              className="p-2.5 rounded-xl border border-white/[0.06] text-slate-500 hover:text-slate-300 transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── PLAYING PHASE ──
  const isLastMessage = currentMessageIndex >= (selectedSnippet?.messages.length || 1) - 1;
  const progress = selectedSnippet
    ? ((currentMessageIndex + 1) / selectedSnippet.messages.length) * 100
    : 0;

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 overflow-hidden relative bg-slate-950/20">
      {/* Narration Overlay */}
      <AnimatePresence>
        {showNarration && getCurrentScene() && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute inset-x-0 top-0 z-20 p-4 bg-gradient-to-b from-slate-950/95 via-slate-950/90 to-transparent pointer-events-none"
          >
            <div className="max-w-3xl mx-auto space-y-2">
              <div className="flex items-center gap-2">
                <Info className="w-3.5 h-3.5 text-cyan-400" />
                <span className="text-[9px] font-black uppercase tracking-widest text-cyan-400">
                  Narration — {getCurrentScene()?.title}
                </span>
              </div>
              <p className="text-[11px] text-slate-300 font-medium leading-relaxed">
                {getCurrentScene()?.description}
              </p>
              <p className="text-[10px] text-slate-500 italic font-medium">
                {getCurrentScene()?.narration}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Progress Bar */}
      <div className="h-0.5 bg-slate-900/60 shrink-0">
        <motion.div
          className="h-full bg-gradient-to-r from-cyan-500 to-indigo-500"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      {/* Header */}
      <div className="px-4 py-3 bg-gradient-to-r from-slate-900/40 via-cyan-950/10 to-indigo-950/10 border-b border-white/[0.05] flex items-center justify-between shrink-0 select-none">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-cyan-950/60 border border-cyan-800/40 text-cyan-400">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-[11px] font-black uppercase text-slate-100 tracking-wider">
                {selectedSnippet?.title}
              </h3>
              <span className="text-[8px] font-bold text-cyan-400 bg-cyan-950/30 border border-cyan-900/50 px-1.5 py-0.5 rounded-full">
                DEMO
              </span>
            </div>
            <p className="text-[8.5px] text-slate-500 font-semibold">
              {selectedSnippet?.subtitle}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Criteria badges */}
          <div className="hidden sm:flex items-center gap-1 mr-2">
            {selectedSnippet?.criteria.map((c) => (
              <span
                key={c}
                className="text-[7px] font-bold text-cyan-500 bg-cyan-950/20 border border-cyan-900/30 px-1.5 py-0.5 rounded"
              >
                C{c}
              </span>
            ))}
          </div>

          {/* Playback controls */}
          {isDemoAutoPlaying ? (
            <button
              onClick={handlePause}
              className="p-1.5 rounded-lg border border-white/[0.06] hover:bg-cyan-950/40 text-cyan-400 transition-all cursor-pointer"
              title="Pause demo"
            >
              <Pause className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              onClick={handleResume}
              disabled={isLastMessage}
              className="p-1.5 rounded-lg border border-white/[0.06] hover:bg-cyan-950/40 text-cyan-400 transition-all cursor-pointer disabled:opacity-30"
              title="Resume demo"
            >
              <Play className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={handleSkip}
            disabled={isLastMessage}
            className="p-1.5 rounded-lg border border-white/[0.06] hover:bg-cyan-950/40 text-slate-400 hover:text-cyan-400 transition-all cursor-pointer disabled:opacity-30"
            title="Skip to next message"
          >
            <SkipForward className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleExit}
            className="p-1.5 rounded-lg border border-white/[0.06] hover:bg-red-950/40 text-slate-400 hover:text-red-400 transition-all cursor-pointer"
            title="Exit demo"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
        {displayedMessages.map((msg, idx) => {
          const isAI = msg.role === 'assistant';
          const isLast = idx === displayedMessages.length - 1;
          const content = isLast && isAI ? streamedContent : msg.content;

          return (
            <div
              key={idx}
              className={`flex items-start gap-2.5 ${isAI ? 'justify-start' : 'justify-end'}`}
            >
              {isAI && (
                <div className="p-1 rounded-lg bg-cyan-950/60 border border-cyan-850 text-cyan-400 shrink-0 mt-0.5">
                  <Sparkles className="w-3 h-3" />
                </div>
              )}
              <div className={`flex flex-col max-w-[85%] ${isAI ? 'items-start' : 'items-end'}`}>
                <div className={`p-3 rounded-2xl text-[11px] font-medium leading-relaxed border ${
                  isAI
                    ? 'bg-slate-900/60 border-white/[0.04] text-slate-100 rounded-tl-sm'
                    : 'bg-gradient-to-tr from-cyan-600/90 to-indigo-600/90 border-cyan-500/20 text-slate-950 font-bold rounded-tr-sm'
                }`}>
                  {isAI ? (
                    content === '' ? (
                      <div className="flex items-center gap-1 py-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce delay-75" />
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce delay-150" />
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce delay-225" />
                      </div>
                    ) : (
                      renderMessageMarkdown(content)
                    )
                  ) : (
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  )}
                </div>

                {/* Evidence for last assistant message */}
                {isAI && isLast && streamingEvidence.length > 0 && (
                  <div className="w-full mt-2.5 space-y-1.5">
                    <span className="text-[9px] text-cyan-500/70 uppercase font-black tracking-widest block pl-1">
                      Verification Evidence Logs
                    </span>
                    {streamingEvidence.map((ev: any, evIdx: number) => {
                      const isExpanded = expandedEvidenceKey === `${idx}-${evIdx}`;
                      return (
                        <div key={evIdx} className="border border-cyan-500/10 bg-cyan-950/10 rounded-xl overflow-hidden">
                          <button
                            type="button"
                            onClick={() => setExpandedEvidenceKey(isExpanded ? null : `${idx}-${evIdx}`)}
                            aria-expanded={isExpanded}
                            className="w-full px-3 py-2 flex items-center justify-between text-[10px] font-bold text-cyan-400/90 hover:bg-cyan-500/5 transition-all text-left cursor-pointer"
                          >
                            <div className="flex items-center gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                              <span>{ev.title}</span>
                            </div>
                            <motion.span animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
                              <ChevronDown className="w-3.5 h-3.5 text-cyan-500/80" />
                            </motion.span>
                          </button>
                          <AnimatePresence initial={false}>
                            {isExpanded && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="overflow-hidden"
                              >
                                <ul className="px-3 pb-2 pt-0.5 space-y-1 border-t border-cyan-500/5">
                                  {ev.items.map((item: string, itemIdx: number) => (
                                    <li key={itemIdx} className="text-[9px] text-slate-350 font-mono leading-relaxed flex items-start gap-1.5">
                                      <span className="text-cyan-600 select-none mt-0.5">❯</span>
                                      <span>{item}</span>
                                    </li>
                                  ))}
                                </ul>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Citations for last assistant message */}
                {isAI && isLast && streamingCitations.length > 0 && (
                  <div className="w-full mt-2.5">
                    <CitationRenderer
                      citations={streamingCitations}
                      onSelectRoad={(id) => { setSelectedRoadId(id); setActiveView('roads'); }}
                      onSelectContractor={(id) => {
                        dispatchChatAction({
                          type: 'RENDER_CONTRACTOR_AUDIT',
                          payload: { contractorId: id },
                        });
                        setActiveView('contractors');
                      }}
                    />
                  </div>
                )}

                {/* Suggested actions for last assistant message */}
                {isAI && isLast && streamingActions.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {streamingActions.map((act: any, actIdx: number) => (
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

      {/* Bottom status bar */}
      <div className="px-4 py-2.5 border-t border-white/[0.05] bg-slate-900/20 flex items-center justify-between shrink-0 select-none">
        <div className="flex items-center gap-2">
          {isDemoAutoPlaying ? (
            <span className="text-[8px] font-bold text-cyan-400 flex items-center gap-1">
              <Activity className="w-3 h-3 animate-pulse" /> Auto-playing
            </span>
          ) : (
            <span className="text-[8px] font-bold text-slate-500 flex items-center gap-1">
              <Clock className="w-3 h-3" /> Paused
            </span>
          )}
          <span className="text-[8px] text-slate-600 font-mono">
            step {currentMessageIndex + 1}/{selectedSnippet?.messages.length}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {selectedSnippet?.criteria.map((c) => (
            <span
              key={c}
              className="text-[7px] font-bold text-slate-500 bg-slate-900/60 border border-white/[0.04] px-1.5 py-0.5 rounded"
            >
              Criterion {c}: {CRITERIA_LABELS[c]?.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}