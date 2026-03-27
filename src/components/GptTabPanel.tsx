import { useState, useEffect } from 'react';
import { Sparkles, ArrowRight, MonitorPlay, Zap, FileText, Loader2, Globe, X } from 'lucide-react';
import { useStore } from '../store/useStore';
import { type Note } from '../types/entities';
import { aiService } from '../services/aiService';
import { unifiedSyncService } from '../services/unifiedSyncService';
import { clsx } from 'clsx';
import { useTranslation } from 'react-i18next';
import { toast } from '../utils/toast';

export const GptTabPanel = () => {
  const { notes, activeProjectId, projects, addNote, updateNote, settings, setRightPanelVisible } = useStore();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingGlobal, setIsGeneratingGlobal] = useState(false);
  const [aiStatus, setAiStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const { t } = useTranslation();

  const [lastBridgeMsg, setLastBridgeMsg] = useState<string>('No signal from bridge');
  
  // Queue Processing State
  const [isQueueProcessing, setIsQueueProcessing] = useState(false);
  const [queueProgress, setQueueProgress] = useState(0);
  const [queueTotal, setQueueTotal] = useState(0);

  // Detect "Raw" notes (generic type and no tags, likely from phone)
  const rawNotes = notes.filter(n => n.type === 'generic' && (!n.tags || n.tags.length === 0) && !n.id.startsWith('digest-'));

  const handleRefineQueue = async () => {
    if (isQueueProcessing || rawNotes.length === 0) return;
    
    setIsQueueProcessing(true);
    setQueueTotal(rawNotes.length);
    setQueueProgress(0);

    toast.info(`${t('rightPanel.refining')} ${rawNotes.length}...`);

    for (let i = 0; i < rawNotes.length; i++) {
        const note = rawNotes[i];
        try {
            setLastBridgeMsg(`${t('rightPanel.refining')} ${note.content.substring(0, 20)}...`);
            
            const { notes: allNotes, projects: allProjects } = useStore.getState();
            const project = allProjects.find(p => p.id === note.projectId);
            const projectNotesContext = allNotes
                .filter(n => n.projectId === note.projectId && n.id !== note.id && !n.id.startsWith('digest-'))
                .slice(0, 5)
                .map(n => `[${n.type}] ${n.title}: ${n.content.substring(0, 200)}`)
                .join('\n---\n');

            const result = await aiService.processNote({
                content: note.content,
                provider: settings.aiProvider,
                masterContext: project?.knowledge,
                context: projectNotesContext,
                keys: {
                    openai: settings.openaiKey,
                    gemini: settings.geminiKey,
                    googleAccessToken: settings.googleAccessToken
                }
            });

            if (!result.formattedContent.includes("AI Error")) {
                const updates = {
                    title: result.title,
                    content: result.formattedContent,
                    type: result.type as 'idea' | 'bug' | 'architecture' | 'todo' | 'generic',
                    tags: result.tags,
                    color: result.color,
                    createdAt: Date.now(), // Оновлюємо час для підняття замітки та синхронізації
                    lastSyncedAt: Date.now() // Позначаємо як синхронізовану
                };
                
                await updateNote(note.id, updates);
                const projectName = projects.find(p => p.id === note.projectId)?.name || 'Inbox';
                await unifiedSyncService.syncNote({ ...note, ...updates }, projectName);
            } else {
                // Log error but don't stop queue completely
                console.warn(`Queue item ${i} failed:`, result.formattedContent.split('\n\n')[0]);
            }
        } catch (e) {
            console.error("Queue refinement error:", e);
        }
        setQueueProgress(i + 1);
    }

    setIsQueueProcessing(false);
    toast.success(t('rightPanel.reportUpdated') || "All notes in queue refined!");
    setLastBridgeMsg(t('common.syncStatus.synced') || "Queue complete.");
  };

  const checkAiConnection = () => {
    setAiStatus('connecting');
    setLastBridgeMsg(t('common.syncing') || 'Checking...');

    const timeoutId = setTimeout(() => {
        setAiStatus(prev => {
            if (prev === 'connecting') {
                setLastBridgeMsg(t('common.ai.bridgeTimeout') || 'Timeout: No response from extension/bridge');
                return 'disconnected';
            }
            return prev;
        });
    }, 5000);

    const providerName = settings.aiProvider.replace('-tab', '');

    // Send request via multiple channels for robustness
    const request = { type: 'DEVVOICE_BRIDGE_REQUEST', action: "check_connection", provider: providerName };
    window.postMessage(request, '*');
    window.dispatchEvent(new CustomEvent("DevVoiceRequest", { detail: request }));

    return timeoutId;
  };

  useEffect(() => {
    let checkTimeout: NodeJS.Timeout | null = null;

    const handler = (e: Event) => {
        const customEvent = e as CustomEvent<{ action: string, connected: boolean, provider?: string }>;
        const data = customEvent.detail;
        if (data?.action === "connection_status") {
            const providerName = settings.aiProvider.replace('-tab', '');
            if (data.provider === providerName) {
                setLastBridgeMsg(`${t('common.ai.bridgeVerified').replace('{{provider}}', data.provider || 'Unknown')}`);
                setAiStatus(data.connected ? 'connected' : 'disconnected');
                if (checkTimeout) clearTimeout(checkTimeout);
            }
        }
    };

    const messageHandler = (e: MessageEvent) => {
        if (e.data?.type === 'DEVVOICE_BRIDGE_RESPONSE') {
            const data = e.data;
            const providerName = settings.aiProvider.replace('-tab', '');
            if (data.provider === providerName) {
                setLastBridgeMsg(`${t('common.ai.bridgeVerified').replace('{{provider}}', data.provider || 'Unknown')} (postMessage)`);
                setAiStatus(data.connected ? 'connected' : 'disconnected');
                if (checkTimeout) clearTimeout(checkTimeout);
            }
        }
    };

    window.addEventListener('DevVoiceResponse', handler);
    window.addEventListener('message', messageHandler);

    checkTimeout = checkAiConnection();

    return () => {
        window.removeEventListener('DevVoiceResponse', handler);
        window.removeEventListener('message', messageHandler);
        if (checkTimeout) clearTimeout(checkTimeout);
    };
  }, [t, settings.aiProvider]);

  const launchAiWorker = () => {
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
    if (!activeProjectId) return;
    setIsGenerating(true);
    try {
        const todayStr = new Date().toLocaleDateString([], { year: 'numeric', month: 'long', day: 'numeric' });
        const projectNotes = notes.filter(n =>
            n.projectId === activeProjectId &&
            !n.id.startsWith('digest-') &&
            new Date(n.createdAt).toLocaleDateString([], { year: 'numeric', month: 'long', day: 'numeric' }) === todayStr
        );

        if (projectNotes.length === 0) {
            toast.error(t('rightPanel.noNotesToday') || "No notes today in this project.");
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

        await syncOrUpdateDigest(`digest-project-${activeProjectId}-${todayStr}`, activeProjectId, `${t('rightPanel.projectDigest')}: ${todayStr}`, reportContent);
        toast.success(t('rightPanel.reportUpdated') || "Project report updated!");
    } catch {
        toast.error(t('rightPanel.failedToGenerate') || "Failed to generate report.");
    } finally {
        setIsGenerating(false);
    }
  };

  const handleGenerateGlobalReport = async () => {
    setIsGeneratingGlobal(true);
    try {
        const todayStr = new Date().toLocaleDateString([], { year: 'numeric', month: 'long', day: 'numeric' });
        const allTodayNotes = notes.filter(n =>
            !n.id.startsWith('digest-') &&
            new Date(n.createdAt).toLocaleDateString([], { year: 'numeric', month: 'long', day: 'numeric' }) === todayStr
        );

        if (allTodayNotes.length === 0) {
            toast.error(t('rightPanel.noGlobalNotesToday') || "No notes found for today across all projects.");
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

        await syncOrUpdateDigest(`digest-global-${todayStr}`, '1', `${t('rightPanel.globalDigest')}: ${todayStr}`, reportContent);
        toast.success(t('rightPanel.reportUpdated') || "Global Daily Digest updated!");
    } catch {
        toast.error(t('rightPanel.failedToGenerate') || "Failed to generate global report.");
    } finally {
        setIsGeneratingGlobal(false);
    }
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
          className="md:hidden p-2 text-zinc-500 hover:text-white"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      <div className="space-y-8">
        {/* Refinement Queue Block - Only visible if there are raw notes */}
        {(rawNotes.length > 0 || isQueueProcessing) && (
          <div className="bg-amber-500/5 rounded-2xl p-5 border border-amber-500/20 shadow-lg relative overflow-hidden group animate-in slide-in-from-right duration-500">
             <div className="absolute top-0 right-0 w-20 h-20 bg-amber-500/5 blur-2xl rounded-full -translate-y-1/2 translate-x-1/2"></div>
             <div className="flex items-center justify-between mb-3 relative">
                <div className="flex items-center gap-2 text-amber-400">
                    <Sparkles className="w-4 h-4" />
                    <h3 className="text-xs font-black uppercase tracking-widest">{t('rightPanel.autoRefineQueue')}</h3>
                </div>
                {!isQueueProcessing && <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 text-[10px] font-black rounded-md">{rawNotes.length} RAW</span>}
             </div>
             <p className="text-[11px] text-zinc-400 mb-4 leading-relaxed relative">
                {isQueueProcessing ? `${t('rightPanel.refining')} ${queueProgress}/${queueTotal}` : t('rightPanel.reliabilityDescription')}
             </p>

             {isQueueProcessing ? (
                <div className="space-y-2">
                    <div className="h-1.5 w-full bg-black/40 rounded-full overflow-hidden border border-white/5">
                        <div 
                            className="h-full bg-amber-500 transition-all duration-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]" 
                            style={{ width: `${(queueProgress / queueTotal) * 100}%` }}
                        ></div>
                    </div>
                    <div className="flex justify-between text-[9px] font-bold text-amber-500/60 uppercase">
                        <span>{t('rightPanel.refining')}</span>
                        <span>{Math.round((queueProgress / queueTotal) * 100)}%</span>
                    </div>
                </div>
             ) : (
                <button 
                  onClick={handleRefineQueue}
                  className="w-full bg-amber-600 hover:bg-amber-500 text-white text-[10px] font-black uppercase tracking-widest py-3 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-amber-900/20"
                >
                  <MonitorPlay className="w-3.5 h-3.5" />
                  {t('rightPanel.autoRefineQueue')}
                </button>
             )}
          </div>
        )}

        {/* Project Digest Block */}
        <div className="bg-white/5 rounded-2xl p-5 border border-white/5 shadow-lg relative overflow-hidden group">
          <div className="flex items-center gap-2 mb-3 text-zinc-300 relative">
            <FileText className="w-4 h-4 text-indigo-400" />
            <h3 className="text-xs font-black uppercase tracking-widest">{t('rightPanel.projectDigest')}</h3>
          </div>
          <p className="text-[11px] text-zinc-400 mb-4 leading-relaxed relative">{t('rightPanel.digestDescription')}</p>
          <button onClick={handleGenerateProjectReport} disabled={isGenerating} className="w-full bg-white/10 hover:bg-white/20 text-white text-[10px] font-black uppercase tracking-widest py-3 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50">
            {isGenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
            {isGenerating ? t('common.analyzing') : t('rightPanel.generateReport')}
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
            {isGeneratingGlobal ? t('common.aggregating') : t('rightPanel.generateGlobal')}
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
          <p className="text-[11px] text-zinc-400 mb-4 leading-relaxed relative">{aiStatus === 'connected' ? (t('common.ai.connected').replace('{{provider}}', 'ChatGPT')) : t('rightPanel.reliabilityDescription')}</p>

          <div className="mb-4 text-[9px] font-mono text-zinc-500 opacity-60 bg-black/20 p-2 rounded border border-white/5 truncate">
            {t('knowledge.statusLabel')}: {lastBridgeMsg}
          </div>

          <button onClick={aiStatus === 'connected' ? checkAiConnection : launchAiWorker} disabled={aiStatus === 'connecting'} className={clsx("w-full text-[10px] font-black uppercase tracking-widest py-3 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg relative active:scale-95 disabled:opacity-50", aiStatus === 'connected' ? "bg-zinc-800 text-zinc-400 hover:text-white border border-white/5" : "bg-indigo-600 text-white shadow-indigo-500/20 hover:bg-indigo-500")}>
            {aiStatus === 'connecting' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <MonitorPlay className="w-3.5 h-3.5" />}
            {aiStatus === 'connected' ? t('rightPanel.refreshConnection') : t('rightPanel.connectChatGPT')}
          </button>
        </div>

        <div className="space-y-4">
          <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] px-1">{t('rightPanel.smartActions')}</h3>
          <div className="grid gap-2">
            <button className="w-full text-left p-3 rounded-xl bg-white/5 border border-white/5 hover:border-indigo-500/30 hover:bg-indigo-500/5 transition-all group flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-400 group-hover:text-zinc-200">{t('rightPanel.convertGithub')}</span>
              <ArrowRight className="w-3.5 h-3.5 text-zinc-600 group-hover:text-indigo-400 transition-all group-hover:translate-x-1" />
            </button>
            <button className="w-full text-left p-3 rounded-xl bg-white/5 border border-white/5 hover:border-indigo-500/30 hover:bg-indigo-500/5 transition-all group flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-400 group-hover:text-zinc-200">{t('rightPanel.draftAdr')}</span>
              <ArrowRight className="w-3.5 h-3.5 text-zinc-600 group-hover:text-indigo-400 transition-all group-hover:translate-x-1" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};