import { useMemo, useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import {
  LayoutGrid, Inbox, Hash, Plus, Settings, Edit2, Trash2,
  CheckCircle, Brain, Globe, X, Search, Mic,
  ChevronDown, ChevronRight, Sparkles
} from 'lucide-react';
import { clsx } from 'clsx';
import { syncService } from '../services/syncService';
import { aiService } from '../services/aiService';
import { useTranslation } from 'react-i18next';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import db from '../services/db';

export const Sidebar = () => {
  const store = useStore();
  const {
    projects,
    notes,
    activeProjectId,
    setActiveProject,
    searchQuery,
    setSearchQuery,
    setCreatingProject,
    isCreatingProject,
    setDeletingProject,
    setSettingsOpen,
    setProjectDigestOpen,
    setInsightModalOpen,
    setUserCabinetOpen,
    isFolderConnected,
    setFolderConnected,
    setNotes,
    setProjects,
    addProject,
    setEditingProject,
    setSidebarVisible,
    sidebarSections,
    toggleSidebarSection,
    currentUser,
    settings
  } = store;

  const { t } = useTranslation();
  const [insight, setInsight] = useState<string>('');
  const [isInsightLoading, setIsInsightLoading] = useState(false);
  const [lastSyncInfo, setLastSyncInfo] = useState<{timestamp: number, message: string, status: string} | null>(null);

  // Helper to get section visibility
  const isSectionVisible = (id: string) => sidebarSections.find(s => s.id === id)?.visible ?? true;

  useEffect(() => {
    const updateInsight = async () => {
      if (!settings.showDevInsight || notes.length === 0 || isInsightLoading) return;

      setIsInsightLoading(true);
      try {
        const text = await aiService.generateInsight(notes, settings.aiProvider, {
            openai: settings.openaiKey,
            gemini: settings.geminiKey,
            groq: settings.groqKey,
            googleAccessToken: settings.googleAccessToken,
            content: ''
        });
        if (text && typeof text === 'string' && !text.includes('Error:')) {
            setInsight(text);
        }
      } catch (e) {
        console.warn("Sidebar Insight failed:", e);
      } finally {
        setIsInsightLoading(false);
      }
    };

    const loadLastSyncInfo = async () => {
      try {
        const latestSync = await db.getLatestSyncLog('full_sync');
        if (latestSync) {
          setLastSyncInfo({
            timestamp: latestSync.timestamp,
            message: latestSync.details.message || `Synced ${latestSync.details.notesCount || 0} notes`,
            status: latestSync.status
          });
        }
      } catch (error) {
        console.error('Failed to load last sync info:', error);
      }
    };

    const timer = setTimeout(updateInsight, 5000);
    loadLastSyncInfo();
    return () => clearTimeout(timer);
  }, [notes.length, settings]);

  const noteCounts = useMemo(() => {
    return {
        bug: notes.filter(n => n.type === 'bug').length,
        todo: notes.filter(n => n.type === 'todo').length,
        idea: notes.filter(n => n.type === 'idea').length,
    };
  }, [notes]);
  
  const handleConnectFolder = async () => {
    const success = await syncService.connectFolder();
    if (success) {
      setFolderConnected(true);
      const diskData = await syncService.loadNotesFromFolder();
      
      // Preserve existing project colors from localStorage
      const currentProjects = useStore.getState().projects;
      const mergedProjects = diskData.projects.map(diskProj => {
        const existing = currentProjects.find(p => p.id === diskProj.id);
        return {
          ...diskProj,
          color: existing?.color || diskProj.color // Preserve existing color or use disk color
        };
      });
      
      if (diskData.notes.length > 0) setNotes(diskData.notes);
      if (mergedProjects.length > 1) setProjects(mergedProjects);
    }
  };

  const handleDeleteProject = (projectId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    console.log("[Sidebar] handleDeletingProject for ID:", projectId);
    setDeletingProject(projectId);
  };
  
  const handleSelectProject = (projectId: string) => {
    setActiveProject(projectId);
    if (window.innerWidth < 768) {
      setSidebarVisible(false);
    }
  };

  const { isRecording, toggleRecording } = useSpeechRecognition({
    onResult: (text) => setSearchQuery(text),
    onEnd: () => {}
  });

  const userDisplayName = currentUser?.displayName || currentUser?.email || t('settings.auth.login');
  const userEmail = currentUser ? currentUser.email : t('sidebar.accountPro');

  return (
    <div className="w-full bg-zinc-950 md:border-r border-white/5 flex flex-col h-full p-4 md:p-6 overflow-y-auto space-y-8 scrollbar-hide relative z-20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20 ring-1 ring-white/20">
            <LayoutGrid className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col">
            <span className="font-black text-lg tracking-tight text-white leading-none">DevVoice</span>
            <span className="text-xs text-zinc-500 uppercase tracking-[0.2em] font-bold mt-1">Scratchpad</span>
            </div>
        </div>
        <button
          onClick={() => setSidebarVisible(false)}
          className="p-2 text-zinc-500 hover:text-white bg-white/5 hover:bg-white/10 rounded-full transition-all min-h-[44px] min-w-[44px] flex items-center justify-center"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="space-y-8">
        <div className="relative group">
            <Search className={clsx("absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors", searchQuery ? "text-indigo-400" : "text-zinc-600 group-focus-within:text-indigo-400")} />
            <input 
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('sidebar.searchPlaceholder')}
                className="w-full bg-white/5 border border-white/5 focus:border-indigo-500/30 rounded-xl h-10 pl-10 pr-10 text-sm text-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all"
            />
            <button
                onClick={toggleRecording}
                className={clsx(
                    "absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-all min-h-[44px] min-w-[44px] flex items-center justify-center",
                    isRecording ? "bg-red-500 text-white animate-pulse" : "text-zinc-500 hover:text-white hover:bg-white/10"
                )}
            >
                <Mic className="w-3.5 h-3.5" />
            </button>
        </div>

        <div>
          <button
            onClick={handleConnectFolder}
            className={clsx(
              "w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-black uppercase tracking-widest transition-all mb-4 min-h-[44px]",
              isFolderConnected
                ? "bg-green-500/10 text-green-400 border border-green-500/20"
                : "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20 hover:bg-indigo-500"
            )}
          >
            {isFolderConnected ? <CheckCircle className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {isFolderConnected ? t('sidebar.folderSynced') : t('sidebar.connectFolder')}
          </button>

          <button
            onClick={() => toggleSidebarSection('workspace')}
            className="w-full px-3 mb-3 text-xs font-bold text-zinc-500 uppercase tracking-widest flex items-center justify-between group/h hover:text-zinc-300 transition-colors"
          >
            <div className="flex items-center gap-2">
                <span className="w-1 h-1 rounded-full bg-zinc-700"></span>
                {t('sidebar.workspace')}
            </div>
            {isSectionVisible('workspace') ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          </button>

          {isSectionVisible('workspace') && (
            <nav className="space-y-1">
                <button
                onClick={() => handleSelectProject('1')} 
                className={clsx(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 group",
                    activeProjectId === '1' 
                    ? "bg-indigo-600/10 text-indigo-400 ring-1 ring-indigo-500/20" 
                    : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
                )}
                >
                <Inbox className={clsx("w-4 h-4 transition-colors", activeProjectId === '1' ? "text-indigo-400" : "text-zinc-500 group-hover:text-zinc-300")} />
                {t('common.inbox')}
                </button>

                <button
                onClick={() => handleSelectProject('global-digest')} 
                className={clsx(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 group",
                    activeProjectId === 'global-digest' 
                    ? "bg-indigo-600/10 text-indigo-400 ring-1 ring-indigo-500/20" 
                    : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
                )}
                >
                <Globe className={clsx("w-4 h-4 transition-colors", activeProjectId === 'global-digest' ? "text-indigo-400" : "text-zinc-500 group-hover:text-zinc-300")} />
                {t('sidebar.globalDigest')}
                </button>

                <button
                onClick={() => setProjectDigestOpen(true)} 
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-zinc-400 hover:bg-indigo-500/5 hover:text-indigo-300 transition-all duration-200 group"
                >
                <Brain className="w-4 h-4 text-zinc-500 group-hover:text-indigo-400 transition-colors" />
                {t('sidebar.projectBrain')}
                </button>
            </nav>
          )}
        </div>

        <div>
          <button
            onClick={() => toggleSidebarSection('smartViews')}
            className="w-full px-3 mb-3 text-xs font-bold text-zinc-500 uppercase tracking-widest flex items-center justify-between group/h hover:text-zinc-300 transition-colors"
          >
            <div className="flex items-center gap-2">
                <span className="w-1 h-1 rounded-full bg-zinc-700"></span>
                {t('sidebar.smartViews')}
            </div>
            {isSectionVisible('smartViews') ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          </button>

          {isSectionVisible('smartViews') && (
            <nav className="space-y-1">
                {[
                    { id: 'view-bugs', label: t('sidebar.bugs'), icon: '🐞', count: noteCounts.bug },
                    { id: 'view-todos', label: t('sidebar.todos'), icon: '✅', count: noteCounts.todo },
                    { id: 'view-ideas', label: t('sidebar.ideas'), icon: '💡', count: noteCounts.idea }
                ].map(view => (
                    <button
                        key={view.id}
                        onClick={() => handleSelectProject(view.id)}
                        className={clsx(
                            "w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 group",
                            activeProjectId === view.id ? "bg-white/10 text-white" : "text-zinc-400 hover:bg-white/5"
                        )}
                    >
                        <div className="flex items-center gap-3">
                            <span className="text-xs">{view.icon}</span>
                            {view.label}
                        </div>
                        {view.count > 0 && (
                            <span className="px-1.5 py-0.5 rounded-md bg-white/5 text-[10px] font-bold text-zinc-500 group-hover:bg-white/10 group-hover:text-zinc-300 transition-all">
                                {view.count}
                            </span>
                        )}
                    </button>
                ))}
            </nav>
          )}
        </div>

        <div>
          <div className="px-3 mb-3 flex items-center justify-between">
            <button
                onClick={() => toggleSidebarSection('projects')}
                className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-zinc-500 hover:text-zinc-300 transition-colors"
            >
                <span className="w-1 h-1 rounded-full bg-zinc-700"></span>
                {t('sidebar.projects')}
                {isSectionVisible('projects') ? <ChevronDown className="w-3 h-3 ml-1" /> : <ChevronRight className="w-3 h-3 ml-1" />}
            </button>
            <button onClick={() => setCreatingProject(true)} className="text-zinc-500 hover:text-white p-1.5 rounded-lg hover:bg-white/5"><Plus className="w-4 h-4" /></button>
          </div>

          {isSectionVisible('projects') && (
            <nav className="space-y-1">
                {projects.filter(p => 
                  p.id !== '1' && 
                  !p.id.includes('digest') &&
                  !p.id.startsWith('view-')
                ).map((project) => (
                <div
                    key={project.id}
                    className={clsx(
                    "group w-full flex items-center gap-2.5 px-2.5 py-1 rounded-lg text-sm font-semibold transition-all duration-200 cursor-pointer",
                    activeProjectId === project.id ? "bg-indigo-600/10 text-indigo-400" : "text-zinc-400 hover:bg-white/5"
                    )}
                    onClick={() => handleSelectProject(project.id)}
                >
                    <Hash className="w-3.5 h-3.5 shrink-0 opacity-50" />
                    <span className="truncate flex-1">{project.name}</span>
                    <div className="flex items-center opacity-0 group-hover:opacity-100 transition-all">
                        <button 
                            onClick={(e) => { e.stopPropagation(); setEditingProject(project.id); }} 
                            className="p-1 hover:text-indigo-400 transition-colors"
                        >
                            <Edit2 size={12} />
                        </button>
                        <button 
                            onClick={(e) => handleDeleteProject(project.id, e)} 
                            className="p-1 hover:text-red-400 transition-colors"
                        >
                            <Trash2 size={12} />
                        </button>
                    </div>
                </div>
                ))}
            </nav>
          )}
        </div>
      </div>

      <div className="mt-auto space-y-4">
        <button onClick={() => setSettingsOpen(true)} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-base font-bold text-zinc-400 hover:text-white hover:bg-white/5 transition-all border border-white/5 shadow-sm">
            <Settings className="w-4 h-4" /><span>{t('common.settings')}</span>
        </button>
        
        <button onClick={() => setUserCabinetOpen(true)} className="w-full flex items-center gap-3 px-2 py-2 hover:bg-white/5 rounded-2xl transition-all group text-left">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 p-[2px] shadow-lg">
            <div className="w-full h-full rounded-full bg-zinc-950 flex items-center justify-center overflow-hidden text-white font-bold text-[10px]">
              {userDisplayName.slice(0, 2).toUpperCase()}
            </div>
          </div>
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-sm font-bold text-zinc-200 truncate">{userDisplayName}</span>
            <span className="text-xs text-zinc-500 font-medium truncate">{userEmail}</span>
          </div>
        </button>
      </div>
    </div>
  );
};
