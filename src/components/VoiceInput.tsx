import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { Mic, Square, XCircle, Send, Sparkles, Check, Bug, Lightbulb, CheckSquare, FileCode } from 'lucide-react';
import { clsx } from 'clsx';
import { useStore } from '../store/useStore';
import { type Note } from '../types/entities';
import { aiService } from '../services/aiService';
import { firebaseService } from '../services/firebaseService';
import { unifiedSyncService } from '../services/unifiedSyncService';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { useTranslation } from 'react-i18next';
import { analyzeWithRegex } from '../utils/localAi';

export const VoiceInput = () => {
  const { 
    activeProjectId, 
    addNote, 
    settings, 
    projects, 
    isZenMode, 
    notes, 
    editingProjectId, 
    isSettingsOpen,
    sidebarWidth,
    rightPanelWidth,
    isSidebarVisible,
    isRightPanelVisible
  } = useStore();
  const [inputValue, setInputValue] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showMic, setShowMic] = useState(true);
  const [containerHeight, setContainerHeight] = useState(window.innerWidth < 400 ? 160 : 206);
  const [detectedType, setDetectedType] = useState<'idea' | 'bug' | 'architecture' | 'todo' | 'generic'>('generic');
  
  const isAnyModalOpen = editingProjectId !== null || isSettingsOpen;
  const { t } = useTranslation();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const baseInputRef = useRef('');
  const frozenCursorRef = useRef<number | null>(null);
  const lastCursorPosRef = useRef<number | null>(null);

  const { isRecording, isProcessing, error, toggleRecording, startRecording } = useSpeechRecognition({
    onResult: (sessionText) => {
      const base = baseInputRef.current;
      const pos = frozenCursorRef.current ?? base.length;
      
      const prefix = base.slice(0, pos);
      const suffix = base.slice(pos);
      
      // Розумні пробіли
      const needsLeadingSpace = prefix.length > 0 && !prefix.endsWith(' ') && !sessionText.startsWith(' ');
      const needsTrailingSpace = suffix.length > 0 && !suffix.startsWith(' ') && !sessionText.endsWith(' ');
      
      const newVal = `${prefix}${needsLeadingSpace ? ' ' : ''}${sessionText}${needsTrailingSpace ? ' ' : ''}${suffix}`;
      setInputValue(newVal);
      
      if (newVal.trim()) {
        const analysis = analyzeWithRegex(newVal);
        setDetectedType(analysis.type);
      }
    },
    onEnd: () => {
      // Після завершення фіксуємо результат як нову базу
      baseInputRef.current = inputValue;
      frozenCursorRef.current = null;
    }
  });

  // Handle expansion logic outside of direct render effect to avoid cascading renders
  useEffect(() => {
    const shouldExpand = isRecording || isProcessing || inputValue.trim() || isAnalyzing;
    if (shouldExpand && !isExpanded) {
        // Using setTimeout to defer the state update to avoid synchronous setState in effect
        setTimeout(() => {
            setIsExpanded(true);
            setShowMic(false);
        }, 0);
    } else if (!shouldExpand && isExpanded) {
        const timer = setTimeout(() => {
            // Re-check conditions inside timer
            if (!isRecording && !isProcessing && !inputValue.trim() && !isAnalyzing) {
                setIsExpanded(false);
                setShowMic(true);
            }
        }, 3000);
        return () => clearTimeout(timer);
    }
  }, [isRecording, isProcessing, inputValue, isAnalyzing, isExpanded, showMic]);

  useLayoutEffect(() => {
    if (textareaRef.current) {
        const defaultHeight = window.innerWidth < 400 ? 100 : 120;
        const maxHeight = window.innerHeight * 0.4; // Максимум 40% висоти екрану
        
        textareaRef.current.style.height = `${defaultHeight}px`;
        const scrollHeight = textareaRef.current.scrollHeight;
        
        const finalHeight = Math.min(scrollHeight, maxHeight);
        textareaRef.current.style.height = `${finalHeight}px`;
        
        // Вмикаємо прокрутку лише якщо текст не вміщується
        textareaRef.current.style.overflowY = scrollHeight > maxHeight ? 'auto' : 'hidden';
        
        // containerHeight = scrollHeight + padding + buttons
        setContainerHeight(finalHeight + 128);
    }
  }, [inputValue]);

  const handleSend = async () => {
    if (!inputValue.trim() || !activeProjectId) return;
    if (isRecording) toggleRecording();
    
    const rawContent = inputValue.trim();
    const isReallyUndefined = !rawContent || 
                              rawContent === 'undefined' || 
                              rawContent.toLowerCase() === 'undefined';

    if (isReallyUndefined) {
        console.warn('[VoiceInput] Empty or undefined content skipped.');
        return;
    }
    
    // МИТТЄВЕ ОЧИЩЕННЯ для запобігання дублікатів
    setInputValue('');
    baseInputRef.current = '';
    frozenCursorRef.current = null;
    setIsAnalyzing(true);

    const startTime = Date.now();
    console.log(`[VoiceInput] Starting processing for "${rawContent.substring(0, 30)}..." at ${new Date(startTime).toLocaleTimeString()}`);

    const originatingProjectId = activeProjectId; // Lock project ID
    const activeProject = projects.find(p => p.id === originatingProjectId);
    const rawContext = notes
        .filter(n => n.projectId === originatingProjectId)
        .slice(0, 5)
        .map(n => `Title: ${n.title}\nContent: ${n.content}`)
        .join('\n---\n');
    
    // Limit context size to ~4000 chars to avoid token limits
    const context = rawContext.length > 4000 ? rawContext.substring(0, 4000) + "..." : rawContext;
    const masterContext = activeProject?.knowledge && activeProject.knowledge.length > 2000 
        ? activeProject.knowledge.substring(0, 2000) + "..." 
        : activeProject?.knowledge;
    
    try {
        console.log(`[VoiceInput] Stage 1: AI Analysis (${settings.aiProvider})...`);
        const aiStartTime = Date.now();
        
        const aiResult = await aiService.processNote({ 
            content: rawContent, 
            provider: settings.aiProvider, 
            context, 
            masterContext, 
            language: settings.language,
            keys: { 
                openai: settings.openaiKey, 
                gemini: settings.geminiKey,
                groq: settings.groqKey,
                googleAccessToken: settings.googleAccessToken
            } 
        });

        console.log(`[VoiceInput] AI Analysis took ${Date.now() - aiStartTime}ms`);

        // ПЕРЕВІРКА: Якщо результат порожній або містить помилку AI
        if (!aiResult || !aiResult.formattedContent || aiResult.formattedContent.startsWith('AI Error:')) {
            console.error('Invalid AI result, skipping note creation:', aiResult);
            const errorMsg = aiResult?.formattedContent?.replace('AI Error: ', '') || 'AI processing failed';
            import('../utils/toast').then(({ toast }) => {
                toast.error(errorMsg);
            });
            setIsAnalyzing(false);
            return;
        }

        const newNote: Note = { 
            id: `note-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, 
            projectId: originatingProjectId, // Use locked project ID
            title: aiResult.title || 'Untitled', 
            content: aiResult.formattedContent, 
            type: (aiResult.type as any) || 'generic', 
            color: aiResult.color, 
            tags: aiResult.tags || [], 
            createdAt: Date.now(),
            syncStatus: 'pending'
        };
        
        console.log(`[VoiceInput] Creating note with projectId: ${newNote.projectId} (Current active: ${activeProjectId})`);
        
        if (!newNote.content || newNote.content === 'undefined') {
            console.error('[VoiceInput] Final safety check failed: content is undefined');
            setIsAnalyzing(false);
            return;
        }

        console.log(`[VoiceInput] Stage 2: Adding to local store...`, newNote.id);
        
        // Wrap in try-catch to ensure we don't crash the UI
        try {
            await addNote(newNote);
            
            // Миттєва синхронізація в хмару
            if (settings.cloudSyncEnabled || firebaseService.isAuthenticated()) {
                unifiedSyncService.syncNote(newNote, activeProject?.name || 'Inbox').catch(e => {
                    console.warn("[VoiceInput] Instant sync failed:", e);
                });
            }

            setShowSuccess(true);
            setDetectedType('generic');
            
            // Success toast early
            import('../utils/toast').then(({ toast }) => {
                toast.success(t('common.captured') || 'Note captured');
            });

            // МИТТЄВО ХОВАЄМО ПАНЕЛЬ ПІСЛЯ УСПІХУ
            setIsExpanded(false);
            setShowMic(true);
        } catch (storeErr) {
            console.error("[VoiceInput] Store update failed:", storeErr);
        }

        console.log(`[VoiceInput] Total processing time: ${Date.now() - startTime}ms`);
        setIsAnalyzing(false);
        setTimeout(() => setShowSuccess(false), 3000);
    } catch (err) {
        console.error('[VoiceInput] Fatal error in handleSend:', err);
        setIsAnalyzing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setInputValue(val);
    // ВАЖЛИВО: Оновлюємо реф відразу при ручному введенні
    baseInputRef.current = val;
    lastCursorPosRef.current = e.target.selectionStart;

    if (val.trim()) {
        const analysis = analyzeWithRegex(val);
        setDetectedType(analysis.type);
    } else {
        setDetectedType('generic');
    }
  };


  const handleTextareaInteract = (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
    const target = e.target as HTMLTextAreaElement;
    const pos = target.selectionStart;
    lastCursorPosRef.current = pos;
    
    // Якщо не записуємо - це ідеальний момент оновити "базу"
    if (!isRecording) {
        baseInputRef.current = target.value;
        frozenCursorRef.current = pos;
    }
  };

  const handleToggleRecording = () => {
    if (!isRecording) {
      // ПРИМУСОВО фіксуємо стан перед початком
      const currentPos = lastCursorPosRef.current ?? inputValue.length;
      frozenCursorRef.current = currentPos;
      baseInputRef.current = inputValue;
      console.log(`[VoiceInput] Recording locked at pos ${currentPos} of ${inputValue.length}`);
    }
    toggleRecording();
  };

  const handleMicClick = () => {
    if (!isExpanded) {
        setIsExpanded(true);
        setShowMic(false);
        // Початкова позиція в кінці, якщо поле тільки відкрилося
        baseInputRef.current = inputValue;
        frozenCursorRef.current = inputValue.length;
        setTimeout(() => startRecording(), 100); 
    } else {
        handleToggleRecording();
    }
  };

  const actualSidebarWidth = (!isZenMode && isSidebarVisible) ? sidebarWidth : 0;
  const actualRightPanelWidth = (!isZenMode && isRightPanelVisible) ? rightPanelWidth : 0;

  return (
    <div 
        className={clsx(
            "absolute bottom-4 md:bottom-8 inset-x-0 z-50 flex flex-col items-center justify-end pointer-events-none transition-all duration-500",
            isAnyModalOpen && "opacity-0"
        )}
    >
      <div className={clsx(
          "relative flex items-center justify-center pointer-events-auto transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]",
          isExpanded ? (isZenMode ? "w-[90%] max-w-[1200px]" : "w-[95%] max-w-[900px]") : "w-auto"
      )}>
        
        {/* 1. Expanded Command Center */}
        <div className={clsx(
          "w-full transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden backdrop-blur-3xl bg-zinc-900/90 rounded-3xl border border-white/10 origin-bottom",
          isExpanded ? "opacity-100 scale-100" : "opacity-0 scale-95 h-0 absolute bottom-0"
        )}
        style={{ height: isExpanded ? `${containerHeight}px` : '0px' }}
        >
            {isAnalyzing && (
                <div className="absolute top-0 left-0 right-0 h-1 bg-indigo-500/20 overflow-hidden">
                    <div className="h-full bg-indigo-500 animate-[shimmer_2s_infinite] w-1/2"></div>
                </div>
            )}

            {error && (
                <div className="p-3 md:p-4 bg-red-500/10 border-b border-red-500/20 text-red-400 text-[10px] md:text-xs font-bold flex items-center gap-3">
                    <XCircle className="w-4 h-4" />
                    <span>{error}</span>
                </div>
            )}

            <textarea
                ref={textareaRef}
                value={inputValue}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                onSelect={handleTextareaInteract}
                onClick={handleTextareaInteract}
                onKeyUp={handleTextareaInteract}
                placeholder={isRecording ? t('voice.listening') : t('voice.placeholder')}
                className="w-full bg-transparent text-zinc-100 placeholder:text-zinc-600 resize-none focus:outline-none font-sans leading-relaxed p-4 md:p-6 text-base md:text-xl overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)]"
                rows={3}
                disabled={isAnalyzing}
            />

            <div className="grid grid-cols-3 items-center px-4 md:px-6 pb-4 md:pb-6">
                <div className="flex items-center gap-3">
                    {detectedType !== 'generic' && !isAnalyzing && !showSuccess && (
                        <div className={clsx(
                            "flex items-center gap-2 px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-widest animate-in fade-in zoom-in duration-300",
                            detectedType === 'bug' && "bg-red-500/10 text-red-400",
                            detectedType === 'todo' && "bg-green-500/10 text-green-400",
                            detectedType === 'idea' && "bg-yellow-500/10 text-yellow-400",
                            detectedType === 'architecture' && "bg-blue-500/10 text-blue-400"
                        )}>
                            {detectedType === 'bug' && <Bug className="w-3 h-3" />}
                            {detectedType === 'todo' && <CheckSquare className="w-3 h-3" />}
                            {detectedType === 'idea' && <Lightbulb className="w-3 h-3" />}
                            {detectedType === 'architecture' && <FileCode className="w-3 h-3" />}
                            <span className="hidden sm:inline">{detectedType}</span>
                        </div>
                    )}
                    {isRecording ? (
                         <div className="flex items-center gap-2 md:gap-3">
                            <div className="flex gap-1 items-center h-3 md:h-4">
                                <span className="w-1 md:w-1.5 h-full bg-indigo-500 rounded-full animate-[bounce_1s_infinite_0ms]"></span>
                                <span className="w-1 md:w-1.5 h-2 bg-indigo-500 rounded-full animate-[bounce_1s_infinite_200ms]"></span>
                                <span className="w-1 md:w-1.5 h-full bg-indigo-500 rounded-full animate-[bounce_1s_infinite_400ms]"></span>
                            </div>
                            <span className="hidden sm:inline text-[10px] md:text-xs text-indigo-400 font-black uppercase tracking-widest leading-none">{t('voice.recording')}</span>
                         </div>
                    ) : isProcessing ? (
                        <div className="flex items-center gap-2 text-[10px] md:text-xs text-amber-400 font-black uppercase tracking-widest animate-pulse">
                            <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                            <span>{t('voice.transcribing')}</span>
                        </div>
                    ) : isAnalyzing ? (
                        <span className="flex items-center gap-2 text-[10px] md:text-xs text-indigo-400 font-black uppercase tracking-widest animate-pulse">
                            <Sparkles className="w-4 h-4" />
                            <span className="hidden sm:inline">{t('voice.processing')}</span>
                        </span>
                    ) : showSuccess ? (
                        <span className="flex items-center gap-2 text-[10px] md:text-xs text-green-400 font-black uppercase tracking-widest">
                            <Check className="w-4 h-4" />
                            <span className="hidden sm:inline">{t('voice.captured')}</span>
                        </span>
                    ) : (
                        <div className="hidden md:flex items-center gap-2 text-[10px] text-zinc-500 font-bold uppercase tracking-widest opacity-40">
                            <kbd className="px-1.5 py-0.5 rounded border border-white/10 bg-white/5 font-sans">Enter</kbd>
                            <span>{t('voice.toSave')}</span>
                        </div>
                    )}
                </div>

                <div className="flex justify-center">
                   <button
                    onClick={(e) => { e.stopPropagation(); handleToggleRecording(); }}
                    disabled={isAnalyzing}
                    className={clsx(
                      "w-12 h-12 md:w-14 md:h-14 rounded-full transition-all flex items-center justify-center shadow-lg min-h-[44px] min-w-[44px]",
                      isRecording ? "bg-red-500 text-white scale-110" : "bg-white/5 text-zinc-400 hover:text-white"
                    )}
                  >
                    {isRecording ? <Square className="w-5 h-5 md:w-6 md:h-6 fill-current" /> : <Mic className="w-5 h-5 md:w-6 md:h-6" />}
                  </button>
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleSend(); }}
                    disabled={!inputValue.trim() || isAnalyzing}
                    className="bg-indigo-600 text-white rounded-2xl hover:bg-indigo-500 disabled:opacity-20 transition-all shadow-xl font-black uppercase text-[10px] md:text-xs tracking-widest flex items-center gap-2 md:gap-3 px-4 md:px-8 h-12 md:h-14 min-h-[44px] min-w-[80px]"
                  >
                    <span className="hidden sm:inline">{t('common.send')}</span>
                    <Send className="w-4 h-4 md:w-5 md:h-5" />
                  </button>
                </div>
              </div>
        </div>

        {/* 2. Collapsed State: Perfect Circle Mic Button */}
        {!isExpanded && showMic && (
            <button
                onClick={handleMicClick}
                className="w-16 h-16 md:w-20 md:h-20 rounded-full border-2 border-indigo-500/50 bg-zinc-900/80 flex items-center justify-center shadow-2xl transition-all duration-500 hover:scale-110 hover:border-indigo-400 backdrop-blur-xl animate-in fade-in slide-in-from-bottom-4 aspect-square shrink-0 min-h-[44px] min-w-[44px]"
            >
                <Mic className={clsx("w-8 h-8 md:w-12 md:h-12 transition-colors", isRecording ? "text-red-500 animate-pulse" : "text-indigo-500")} />
            </button>
        )}
      </div>
    </div>
  );
};