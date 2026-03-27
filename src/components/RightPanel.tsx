import { Sparkles, ArrowRight, MonitorPlay, Zap, FileText, Loader2, Globe, X, Download, Check } from 'lucide-react';
import { useStore } from '../store';
import { type Note } from '../types/entities';
import { aiService } from '../services/aiService';
import { unifiedSyncService } from '../services/unifiedSyncService';
import { useState, useEffect } from 'react';
import { clsx } from 'clsx';
import { useTranslation } from 'react-i18next';
import { toast } from '../utils/toast';

export const RightPanel = () => {
  const { notes, activeProjectId, projects, addNote, updateNote, settings, setRightPanelVisible, aiStatus, aiStatusMsg, setAiStatus } = useStore();
  const { t } = useTranslation();
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingGlobal, setIsGeneratingGlobal] = useState(false);
  const [insight, setInsight] = useState<string>(''); 
  const [isInsightLoading, setIsInsightLoading] = useState(false);

  // Update initial strings once t is available
  useEffect(() => {
    if (!insight) setInsight(t('common.ai.analyzing'));
    if (!aiStatusMsg) setAiStatus(aiStatus, t('common.ai.bridgeNoSignal'));
  }, [t]);

  // Load Insight on mount or when notes change significantly
  useEffect(() => {
    let active = true;
    const loadInsight = async () => {
        // ПЕРЕВІРКА: Якщо функція інсайтів вимкнена в налаштуваннях - виходимо
        if (!settings.showDevInsight) {
            setInsight(t('rightPanel.realtimeContext') || 'Insight disabled');
            return;
        }

        if (notes.length === 0 || isInsightLoading) {
            setInsight(t('common.ai.noNotes'));
            return;
        }
        
        // Беремо лише валідні нотатки для перевірки
        const validNotesCount = notes.filter(n => n.content && n.content !== 'undefined').length;
        if (validNotesCount === 0) {
            setInsight(t('common.ai.addMoreNotes'));
            return;
        }

        setIsInsightLoading(true);
        try {
            const recentNotes = notes
                .filter(n => n.content && n.content !== 'undefined')
                .slice(0, 5);
                
            const result = await aiService.generateInsight(
                recentNotes, 
                settings.aiProvider, 
                {
                    openai: settings.openaiKey,
                    gemini: settings.geminiKey,
                    groq: settings.groqKey,
                    googleAccessToken: settings.googleAccessToken
                }
            );
            if (active) setInsight(result);
        } catch {
            if (active) setInsight(t('common.ai.addMoreNotes'));
        } finally {
            if (active) setIsInsightLoading(false);
        }
    };
    
    // Збільшуємо затримку до 10 секунд для стабільності
    const timeout = setTimeout(loadInsight, 10000);
    return () => {
        active = false;
        clearTimeout(timeout);
    };
  }, [notes.length, settings.aiProvider]); // Відстежуємо лише кількість нотаток, а не кожну зміну вмісту

  const handleSmartAction = async (action: 'github-issue' | 'adr') => {
      setIsGenerating(true);
      try {
          // Filter notes relevant to the active project
          const projectNotes = activeProjectId ? notes.filter(n => n.projectId === activeProjectId) : notes;
          if (projectNotes.length === 0) {
              toast.error(t('rightPanel.noNotesToAnalyze') || 'No notes available for analysis');
              setIsGenerating(false);
              return;
          }

          const content = await aiService.runSmartAction(
              action,
              projectNotes.slice(0, 10), // Context of last 10 notes
              settings.aiProvider,
              {
                  openai: settings.openaiKey,
                  gemini: settings.geminiKey,
                  groq: settings.groqKey,
                  googleAccessToken: settings.googleAccessToken
              }
          );

          const title = action === 'github-issue' ? '🐛 GitHub Issue Draft' : '📐 ADR Draft';
          const type = action === 'github-issue' ? 'bug' : 'architecture';

          const newNote: Note = {
            id: Date.now().toString(),
            projectId: activeProjectId || '1',
            title,
            content,
            type,
            tags: ['ai-generated', action],
            color: action === 'github-issue' ? 'bg-red-900/30 border-red-500/20 text-red-100' : 'bg-blue-900/30 border-blue-500/20 text-blue-100',
            createdAt: Date.now(),
            syncStatus: 'pending'
          };

          await addNote(newNote);
          
          // Sync to cloud if enabled
          if (settings.cloudSyncEnabled || settings.localSyncEnabled) {
              const { unifiedSyncService } = await import('../services/unifiedSyncService');
              const projectName = projects.find(p => p.id === activeProjectId)?.name || 'Inbox';
              unifiedSyncService.syncNote(newNote, projectName).catch(e => {
                  console.warn("[SmartAction] Sync failed:", e);
              });
          }
          
          toast.success(t('rightPanel.draftCreated') || 'Draft created successfully');

      } catch (err: any) {
          console.error("[SmartAction] Error:", err);
          toast.error(err.message || t('rightPanel.smartActionFailed') || 'Failed to create draft');
      } finally {
          setIsGenerating(false);
      }
  };

  const checkAiConnection = () => {
    // ДЛЯ API ПРОВАЙДЕРІВ (Groq, OpenAI, Gemini API) МІСТ НЕ ПОТРІБЕН
    if (['groq-api', 'openai', 'gemini-api'].includes(settings.aiProvider)) {
        const hasKey = (settings.aiProvider === 'groq-api' && settings.groqKey) || 
                       (settings.aiProvider === 'openai' && settings.openaiKey) ||
                       (settings.aiProvider === 'gemini-api' && (settings.geminiKey || settings.googleAccessToken));
        
        if (hasKey) {
            setAiStatus('connected', t('common.ai.connected', { provider: settings.aiProvider.replace('-api', '').toUpperCase() }));
        } else {
            setAiStatus('disconnected', "Missing API Key");
        }
        return null;
    }

    // Якщо вже підключено, не скидаємо статус у 'connecting', щоб не було "блимання"
    if (aiStatus !== 'connected') {
        setAiStatus('connecting', t('common.ai.checking'));
    }

    const requestId = Math.floor(Date.now() + Math.random() * 1000);

    const timeoutId = window.setTimeout(() => {
        // Ставимо 'disconnected' тільки якщо за 10 секунд нічого не прийшло
        const currentStatus = useStore.getState().aiStatus;
        if (currentStatus === 'connecting') {
            setAiStatus('disconnected', t('common.ai.bridgeTimeout'));
        }
    }, 10000);

    const currentProvider = settings.aiProvider.endsWith('-tab')
      ? settings.aiProvider.replace('-tab', '')
      : settings.aiProvider;

    const request = {
      type: 'DEVVOICE_BRIDGE_REQUEST',
      action: "check_connection",
      provider: currentProvider,
      requestId
    };

    window.dispatchEvent(new CustomEvent("DevVoiceRequest", { detail: request }));
    window.postMessage(request, '*');

    return timeoutId;
  };

  useEffect(() => {
    let checkInterval: number | null = null;
    let initialTimeout: number | null = null;

    const handleAnyResponse = (data: any) => {
        if (!data) return;
        const action = data.action;
        
        // Визначаємо поточного провайдера для порівняння
        const currentProvider = settings.aiProvider.endsWith('-tab')
          ? settings.aiProvider.replace('-tab', '').toLowerCase()
          : settings.aiProvider.toLowerCase();

        // Визначаємо провайдера з повідомлення
        const msgProvider = (data.provider || '').toLowerCase() || 
                           (action?.startsWith('gemini') ? 'gemini' :
                            action?.startsWith('claude') ? 'claude' :
                            action?.startsWith('grok') ? 'grok' : 'chatgpt');

        if (msgProvider === currentProvider || action === 'connection_status') {
            const isConnected = data.connected ?? (action?.endsWith('_response'));
            if (isConnected) {
                setAiStatus('connected', t('common.ai.bridgeVerified', { provider: msgProvider.toUpperCase() }));
            } else if (action === 'connection_status') {
                setAiStatus('disconnected', t('common.ai.bridgeNoSignal'));
            }
        }
    };

    const handler = (e: Event) => handleAnyResponse((e as CustomEvent).detail);
    const messageHandler = (e: MessageEvent) => {
        if (e.data?.type === 'DEVVOICE_BRIDGE_RESPONSE' || e.data?.action === 'connection_status') {
            handleAnyResponse(e.data);
        }
    };

    window.addEventListener('DevVoiceResponse', handler);
    window.addEventListener('message', messageHandler);

    // Перша перевірка
    initialTimeout = checkAiConnection();

    // Періодична перевірка кожні 30 секунд для підтримки статусу
    checkInterval = window.setInterval(checkAiConnection, 30000);

    return () => {
        window.removeEventListener('DevVoiceResponse', handler);
        window.removeEventListener('message', messageHandler);
        if (initialTimeout) window.clearTimeout(initialTimeout);
        if (checkInterval) window.clearInterval(checkInterval);
    };
  }, [settings.aiProvider]);

    const launchAiWorker = () => {
    // Не відкриваємо вкладки для API-провайдерів
    if (['groq-api', 'openai', 'gemini-api'].includes(settings.aiProvider)) {
        checkAiConnection();
        return;
    }

    const width = 480;
    const height = 700;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;
    
    const url = settings.aiProvider === 'gemini-tab' ? 'https://gemini.google.com/app' : 
                settings.aiProvider === 'claude-tab' ? 'https://claude.ai' :
                settings.aiProvider === 'grok-tab' ? 'https://x.com/i/grok' :
                'https://chatgpt.com';
    
    const name = settings.aiProvider === 'gemini-tab' ? 'GeminiWorker' :
                 settings.aiProvider === 'claude-tab' ? 'ClaudeWorker' :
                 settings.aiProvider === 'grok-tab' ? 'GrokWorker' :
                 'ChatGPTWorker';

    window.open(
      url, 
      name, 
      `width=${width},height=${height},left=${left},top=${top},menubar=no,toolbar=no,location=no,status=no,resizable=yes`
    );
    
    setAiStatus('connecting');
    // Give it a moment to load before checking connection
    setTimeout(checkAiConnection, 2000);
  };

  const handleGenerateProjectReport = async () => {
    if (!activeProjectId || isGenerating) return; // Prevent duplicates
    setIsGenerating(true);
    try {
        const now = new Date();
        const todayStr = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;
        
        const projectNotes = notes.filter(n => {
            const noteDate = new Date(n.createdAt);
            const noteDateStr = `${noteDate.getFullYear()}-${(noteDate.getMonth() + 1).toString().padStart(2, '0')}-${noteDate.getDate().toString().padStart(2, '0')}`;
            return n.projectId === activeProjectId && 
                   !n.id.startsWith('digest-') &&
                   noteDateStr === todayStr;
        });

        if (projectNotes.length === 0) {
            toast.info(t('rightPanel.noNotesToday'));
            setIsGenerating(false);
            return;
        }

        const reportContent = await aiService.generateReport(
            projectNotes,
            settings.aiProvider,
            {
                openai: settings.openaiKey,
                gemini: settings.geminiKey,
                groq: settings.groqKey,
                googleAccessToken: settings.googleAccessToken
            }
        );

        await syncOrUpdateDigest(`digest-project-${activeProjectId}-${todayStr}`, activeProjectId, `Project Digest: ${todayStr}`, reportContent);
        toast.success(t('rightPanel.reportUpdated'));
    } catch (err) {
        console.error("[RightPanel] Project report failed:", err);
        toast.error(t('rightPanel.failedToGenerate'));
    } finally {
        setIsGenerating(false);
    }
  };

  const handleGenerateGlobalReport = async () => {
    if (isGeneratingGlobal) return;
    setIsGeneratingGlobal(true);
    try {
        const now = new Date();
        const todayStr = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;
        
        const allTodayNotes = notes.filter(n => {
            const noteDate = new Date(n.createdAt);
            const noteDateStr = `${noteDate.getFullYear()}-${(noteDate.getMonth() + 1).toString().padStart(2, '0')}-${noteDate.getDate().toString().padStart(2, '0')}`;
            return !n.id.startsWith('digest-') && noteDateStr === todayStr;
        });

        if (allTodayNotes.length === 0) {
            toast.info(t('rightPanel.noGlobalNotesToday'));
            setIsGeneratingGlobal(false);
            return;
        }

        const reportContent = await aiService.generateReport(
            allTodayNotes,
            settings.aiProvider,
            {
                openai: settings.openaiKey,
                gemini: settings.geminiKey,
                groq: settings.groqKey,
                googleAccessToken: settings.googleAccessToken
            },
            true
        );

        await syncOrUpdateDigest(`digest-global-${todayStr}`, '1', `Global Daily Digest: ${todayStr}`, reportContent);
        toast.success(t('rightPanel.reportUpdated'));
    } catch (err) {
        console.error("[RightPanel] Global report failed:", err);
        toast.error(t('rightPanel.failedToGenerate'));
    } finally {
        setIsGeneratingGlobal(false);
    }
  };

  const handleExportProject = () => {
    const projectNotes = activeProjectId ? notes.filter(n => n.projectId === activeProjectId) : notes;
    if (projectNotes.length === 0) {
        toast.info(t('rightPanel.noNotesToExport'));
        return;
    }

    const projectName = projects.find(p => p.id === activeProjectId)?.name || 'Inbox';
    let mdContent = `# Project: ${projectName}\nExported on: ${new Date().toLocaleString()}\n\n---\n\n`;

    projectNotes.forEach(note => {
        mdContent += `## ${note.title}\n`;
        mdContent += `**Type:** ${note.type} | **Date:** ${new Date(note.createdAt).toLocaleString()}\n`;
        mdContent += `**Tags:** ${note.tags.join(', ')}\n\n`;
        mdContent += `${note.content}\n\n---\n\n`;
    });

    const blob = new Blob([mdContent], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${projectName.replace(/[^a-z0-9]/gi, '_')}_notes.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const syncOrUpdateDigest = async (id: string, projectId: string, title: string, content: string) => {
    const existing = notes.find(n => n.id === id);
    const projectName = projects.find(p => p.id === projectId)?.name || 'Unknown';

    if (existing) {
        updateNote(id, { content });
        await unifiedSyncService.syncNote({ ...existing, content }, projectName);
    } else {
        const newDigest: Note = {
            id,
            projectId,
            title,
            content,
            type: 'architecture' as 'idea' | 'bug' | 'architecture' | 'todo' | 'generic',
            color: 'bg-indigo-900/90 border-indigo-500/40 text-indigo-100',
            tags: ['auto-digest'],
            createdAt: Date.now()
        };
        addNote(newDigest);
        await unifiedSyncService.syncNote(newDigest, projectName);
    }
  };

  return (
    <div className="w-full bg-zinc-950 border-l border-white/5 flex flex-col h-full p-4 md:p-6 overflow-y-auto space-y-8 z-20 scrollbar-hide">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/10 rounded-lg shrink-0">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="flex flex-col">
            <span className="font-black text-xs uppercase tracking-[0.2em] text-zinc-200">{t('rightPanel.aiIntelligence')}</span>
            <span className="text-[10px] text-zinc-500 font-medium leading-none mt-1">{t('rightPanel.realtimeContext')}</span>
            </div>
        </div>
        <button 
          onClick={() => setRightPanelVisible(false)} 
          className="p-2 text-zinc-500 hover:text-white bg-white/5 hover:bg-white/10 rounded-full transition-all"
          title={t('rightPanel.closePanel')}
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="space-y-8">
        {/* Project Digest Block */}
        <div className="bg-white/5 rounded-2xl p-5 border border-white/5 shadow-lg relative overflow-hidden group">
          <div className="flex items-center gap-2 mb-3 text-zinc-300 relative">
            <FileText className="w-4 h-4 text-indigo-400" />
            <h3 className="text-xs font-black uppercase tracking-widest">{t('rightPanel.projectDigest')}</h3>
          </div>
          <p className="text-[11px] text-zinc-400 mb-4 leading-relaxed relative">{t('rightPanel.digestDescription')}</p>
          <button onClick={handleGenerateProjectReport} disabled={isGenerating} className="w-full bg-white/10 hover:bg-white/20 text-white text-[10px] font-black uppercase tracking-widest py-3 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50">
            {isGenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
            {isGenerating ? t('rightPanel.analyzing') : t('rightPanel.generateReport')}
          </button>
        </div>

        {/* GLOBAL Digest Block */}
        <div className="bg-indigo-500/5 rounded-2xl p-5 border border-indigo-500/20 shadow-lg relative overflow-hidden group">
          <div className="flex items-center gap-2 mb-3 text-indigo-300 relative">
            <Globe className="w-4 h-4" />
            <h3 className="text-xs font-black uppercase tracking-widest">{t('rightPanel.globalDigest')}</h3>
          </div>
          <p className="text-[11px] text-zinc-400 mb-4 leading-relaxed relative">{t('rightPanel.globalDigestDesc')}</p>
          <button onClick={handleGenerateGlobalReport} disabled={isGeneratingGlobal} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-black uppercase tracking-widest py-3 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50">
            {isGeneratingGlobal ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Globe className="w-3.5 h-3.5" />}
            {isGeneratingGlobal ? t('rightPanel.aggregating') : t('rightPanel.generateGlobal')}
          </button>
        </div>

        {/* AI Worker Block */}
        <div className={clsx("rounded-2xl p-5 border shadow-lg relative overflow-hidden group transition-all duration-500", aiStatus === 'connected' ? "bg-green-500/5 border-green-500/20" : "bg-zinc-900 border-white/5")}>
          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 blur-2xl rounded-full -translate-y-1/2 translate-x-1/2 group-hover:bg-indigo-500/20 transition-colors"></div>
          <div className="flex items-center justify-between mb-3 relative">
            <div className={clsx("flex items-center gap-2", aiStatus === 'connected' ? "text-green-400" : "text-indigo-300")}>
                <Zap className={clsx("w-4 h-4 fill-current", aiStatus === 'connected' ? "opacity-100" : "opacity-50")} />
                <h3 className="text-xs font-black uppercase tracking-widest">{aiStatus === 'connected' ? t('rightPanel.aiActive') : t('rightPanel.reliability')}</h3>
            </div>
            {aiStatus === 'connected' && <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>}
          </div>
          <p className="text-[11px] text-zinc-400 mb-4 leading-relaxed relative">
            {aiStatus === 'connected'
              ? t('common.ai.connected', { provider: settings.aiProvider.replace('-tab', '').charAt(0).toUpperCase() + settings.aiProvider.replace('-tab', '').slice(1) })
              : t('rightPanel.reliabilityDescription')
            }
          </p>
          
          <div className="mb-4 text-[9px] font-mono text-zinc-500 opacity-60 bg-black/20 p-2 rounded border border-white/5 truncate">
            Bridge: {aiStatusMsg}
            {settings.googleAccessToken && (
                <div className="text-indigo-400 mt-1 flex items-center gap-1">
                    <Check className="w-2 h-2" /> {t('rightPanel.oauth2Active')}
                </div>
            )}
          </div>

          <button onClick={aiStatus === 'connected' ? checkAiConnection : launchAiWorker} disabled={aiStatus === 'connecting'} className={clsx("w-full text-[10px] font-black uppercase tracking-widest py-3 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg relative active:scale-95 disabled:opacity-50", aiStatus === 'connected' ? "bg-zinc-800 text-zinc-400 hover:text-white border border-white/5" : "bg-indigo-600 text-white shadow-indigo-500/20 hover:bg-indigo-500")}>
            {aiStatus === 'connecting' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <MonitorPlay className="w-3.5 h-3.5" />}
            {aiStatus === 'connected' ? t('rightPanel.refreshConnection') : t('rightPanel.connectProvider', { provider: settings.aiProvider.replace('-tab', '').charAt(0).toUpperCase() + settings.aiProvider.replace('-tab', '').slice(1) })}
          </button>
        </div>

        <div className="space-y-4">
          <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] px-1">{t('rightPanel.smartActions')}</h3>
          <div className="grid gap-2">
            <button 
                onClick={() => handleSmartAction('github-issue')}
                disabled={isGenerating}
                className="w-full text-left p-3 rounded-xl bg-white/5 border border-white/5 hover:border-indigo-500/30 hover:bg-indigo-500/5 transition-all group flex items-center justify-between disabled:opacity-50"
            >
                <span className="text-xs font-bold text-zinc-400 group-hover:text-zinc-200">{t('rightPanel.convertGithub')}</span>
                <ArrowRight className="w-3.5 h-3.5 text-zinc-600 group-hover:text-indigo-400 transition-all group-hover:translate-x-1" />
            </button>
            <button 
                onClick={() => handleSmartAction('adr')}
                disabled={isGenerating}
                className="w-full text-left p-3 rounded-xl bg-white/5 border border-white/5 hover:border-indigo-500/30 hover:bg-indigo-500/5 transition-all group flex items-center justify-between disabled:opacity-50"
            >
                <span className="text-xs font-bold text-zinc-400 group-hover:text-zinc-200">{t('rightPanel.draftAdr')}</span>
                <ArrowRight className="w-3.5 h-3.5 text-zinc-600 group-hover:text-indigo-400 transition-all group-hover:translate-x-1" />
            </button>
          </div>
        </div>

        {/* Recent Activity Section */}
        <div className="space-y-4">
          <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] px-1">{t('common.magicFix') === 'Magic Fix' ? 'Recent Activity' : 'Остання активність'}</h3>
          <div className="space-y-2">
            {notes.slice(0, 3).map(note => (
              <div key={note.id} className="p-3 rounded-xl bg-white/5 border border-white/5 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-zinc-400 truncate max-w-[150px]">{note.title || 'Untitled'}</span>
                  <span className={clsx(
                    "text-[8px] font-black uppercase px-1.5 py-0.5 rounded",
                    note.type === 'bug' ? "bg-red-500/20 text-red-400" :
                    note.type === 'idea' ? "bg-yellow-500/20 text-yellow-400" :
                    note.type === 'todo' ? "bg-green-500/20 text-green-400" : "bg-zinc-500/20 text-zinc-400"
                  )}>{note.type}</span>
                </div>
                <p className="text-[10px] text-zinc-500 line-clamp-2 italic">"{note.content.substring(0, 60)}..."</p>
              </div>
            ))}
            {notes.length === 0 && (
              <p className="text-[10px] text-zinc-600 text-center py-4 italic">{t('common.ai.noNotes')}</p>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] px-1">{t('rightPanel.dataManagement')}</h3>
          <button 
              onClick={handleExportProject}
              className="w-full text-left p-3 rounded-xl bg-white/5 border border-white/5 hover:border-indigo-500/30 hover:bg-indigo-500/5 transition-all group flex items-center justify-between"
          >
              <div className="flex items-center gap-3">
                  <Download className="w-4 h-4 text-zinc-500 group-hover:text-indigo-400" />
                  <span className="text-xs font-bold text-zinc-400 group-hover:text-zinc-200">{t('rightPanel.exportProject')}</span>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-zinc-600 group-hover:text-indigo-400 transition-all group-hover:translate-x-1" />
          </button>
        </div>

        <div className="mt-auto bg-indigo-900/10 border border-indigo-500/20 rounded-2xl p-5 shadow-inner">
             <div className="flex items-center gap-2 mb-2">
                <div className={clsx("w-1.5 h-1.5 rounded-full bg-indigo-400", isInsightLoading ? "animate-ping" : "animate-pulse")}></div>
                <h3 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">{t('rightPanel.devInsight')}</h3>
             </div>
             <p className="text-xs text-indigo-200/60 leading-relaxed font-medium">
                {isInsightLoading ? t('rightPanel.analyzing') : insight}
             </p>
        </div>
      </div>
    </div>
  );
};