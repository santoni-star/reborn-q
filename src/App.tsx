import { useEffect, useState, useRef } from 'react';
import { Sidebar } from './components/Sidebar';
import { VoiceInput } from './components/VoiceInput';
import { NoteList } from './components/NoteList';
import { RightPanel } from './components/RightPanel';
import { ReadmeModal } from './components/ReadmeModal';
import { SettingsModal } from './components/SettingsModal';
import { UserCabinet } from './components/UserCabinet';
import { AuthPage } from './components/AuthPage';
import { useStore } from './store/useStore';
import { syncService } from './services/syncService';
import { firebaseService } from './services/firebaseService';
import { ArrowLeft, ArrowRight, Minimize2, Maximize2, X, Trash2, Plus, Mic, ChevronDown, Check, Globe, Inbox, Brain, Sparkles } from 'lucide-react';
import { clsx } from 'clsx';
import { useTranslation } from 'react-i18next';
import { ProjectDigestModal } from './components/ProjectDigestModal';
import { InsightModal } from './components/InsightModal';
import { ProjectList } from './components/ProjectList';
import { CreateProjectModal } from './components/CreateProjectModal';
import { EditProjectModal } from './components/EditProjectModal';
import { DeleteNoteModal } from './components/DeleteNoteModal';
import { unifiedSyncService } from './services/unifiedSyncService';
import { BottomNav } from './components/BottomNav';
import { useSpeechRecognition } from './hooks/useSpeechRecognition';
import { Toaster } from 'sonner';
import 'prism-themes/themes/prism-vsc-dark-plus.css';

function App() {
  const storeData = useStore();
  const { t, i18n } = useTranslation();

  const [isLoaded, setIsLoaded] = useState(false);
  const [isAuthChecked, setIsAuthChecked] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isResizingSidebar, setIsResizingSidebar] = useState(false);
  const [isResizingRightPanel, setIsResizingRightPanel] = useState(false);
  const [isProjectSelectorOpen, setProjectSelectorOpen] = useState(false);
  const [isAiSelectorOpen, setAiSelectorOpen] = useState(false);
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);
  const isMobile = windowWidth < 768;
  
  // Refs for smooth resizing without re-renders
  const sidebarRef = useRef<HTMLDivElement>(null);
  const rightPanelRef = useRef<HTMLDivElement>(null);

  // Initialize Data
  useEffect(() => {
    storeData.loadInitialData().then(() => {
        setIsLoaded(true);
    });
  }, []);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    const handleResize = () => setWindowWidth(window.innerWidth);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const {
    activeProjectId,
    projects = [],
    notes = [],
    isZenMode,
    setZenMode,
    isSidebarVisible,
    setSidebarVisible,
    isRightPanelVisible,
    setRightPanelVisible,
    isReadmeOpen,
    setReadmeOpen,
    isSettingsOpen,
    setSettingsOpen,
    editingProjectId,
    isCreatingProject,
    setCreatingProject,
    isRenamingProject,
    setRenamingProject,
    isDeletingProject,
    setDeletingProject,
    isDeletingNote,
    setDeletingNote,
    deleteProject,
    settings,
    isAuthOpen,
    setAuthOpen,
    isUserCabinetOpen,
    setUserCabinetOpen,
    setActiveProject,
    sidebarWidth,
    setSidebarWidth,
    rightPanelWidth,
    setRightPanelWidth,
    setCurrentUser,
    currentMobileTab,
    aiStatus,
    updateSettings
  } = storeData;

  const { isRecording, toggleRecording } = useSpeechRecognition({
    onResult: (text) => {}, 
    onEnd: () => {}
  });

  useEffect(() => {
    if (isMobile) {
        setSidebarVisible(false);
        setRightPanelVisible(false);
    }
  }, [isMobile, setSidebarVisible, setRightPanelVisible]);

  // Handle sidebar resizing - optimized with refs to prevent re-renders
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isResizingSidebar && sidebarRef.current) {
        const newWidth = Math.max(200, Math.min(500, e.clientX));
        sidebarRef.current.style.width = `${newWidth}px`;
      }
      if (isResizingRightPanel && rightPanelRef.current) {
        const newWidth = Math.max(200, Math.min(600, window.innerWidth - e.clientX));
        rightPanelRef.current.style.width = `${newWidth}px`;
      }
    };

    const handleMouseUp = () => {
      // Save final width to store
      if (isResizingSidebar && sidebarRef.current) {
        const finalWidth = parseInt(sidebarRef.current.style.width || '280');
        setSidebarWidth(finalWidth);
      }
      if (isResizingRightPanel && rightPanelRef.current) {
        const finalWidth = parseInt(rightPanelRef.current.style.width || '400');
        setRightPanelWidth(finalWidth);
      }
      setIsResizingSidebar(false);
      setIsResizingRightPanel(false);
    };

    if (isResizingSidebar || isResizingRightPanel) {
      document.addEventListener('mousemove', handleMouseMove, { passive: true });
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizingSidebar, isResizingRightPanel, setSidebarWidth, setRightPanelWidth]);

  useEffect(() => {
    const fontSizeMap = { sm: '14px', base: '16px', lg: '18px', xl: '20px' };
    document.documentElement.style.fontSize = fontSizeMap[settings.fontSize as keyof typeof fontSizeMap] || '16px';
  }, [settings.fontSize]);

  useEffect(() => {
    if (settings.language && i18n.language !== settings.language) {
      i18n.changeLanguage(settings.language);
    }
  }, [settings.language, i18n]);

  useEffect(() => {
    // Clear chunk-retry flag if app loads successfully
    sessionStorage.removeItem('chunk-retry-reloaded');
    
    const unsubscribe = firebaseService.subscribeToAuth(async (user) => {
      if (user) {
          setCurrentUser({ uid: user.uid, email: user.email, displayName: user.displayName, photoURL: user.photoURL });
          
          // Update unifiedSyncService settings
          unifiedSyncService.setCloudSyncEnabled(settings.cloudSyncEnabled);
          
          if (settings.cloudSyncEnabled) {
              console.log("[App] Starting Cloud Sync Listeners...");
              unifiedSyncService.startRealtimeListeners();
          }
      } else {
          setCurrentUser(null);
          unifiedSyncService.stopRealtimeListeners();
      }
      setIsAuthChecked(true);
    });
    return () => {
        unsubscribe();
        unifiedSyncService.stopRealtimeListeners();
    };
  }, [setCurrentUser, settings.cloudSyncEnabled]);

  const activeProject = projects.find(p => p.id === activeProjectId);

  if (!isLoaded || !isAuthChecked) {
    return (
      <div className="h-screen w-screen bg-zinc-950 flex items-center justify-center text-zinc-500 font-mono text-[10px] uppercase tracking-[0.3em]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          <span>INITIALIZING CORE...</span>
        </div>
      </div>
    );
  }

  const showSidebar = !isZenMode && isSidebarVisible;
  const showRightPanel = !isZenMode && isRightPanelVisible;

  const renderMainContent = () => {
    if (isMobile) {
        if (currentMobileTab === 'projects') return <ProjectList />;
        if (currentMobileTab === 'ai') return <div className="flex-1 overflow-y-auto"><RightPanel /></div>;
        return activeProjectId === 'all-projects' ? <ProjectList /> : (
            <>
                <NoteList />
            </>
        );
    }
    return activeProjectId === 'all-projects' ? <ProjectList /> : (
        <>
            <NoteList />
        </>
    );
  };

  return (
    <div className="flex h-screen w-screen bg-zinc-950 text-zinc-100 overflow-hidden font-sans selection:bg-indigo-500/30">
      <Toaster position="bottom-right" richColors closeButton />
      
      {!isOnline && (
        <div className="fixed top-0 left-0 right-0 z-[10002] bg-amber-500 text-black text-[10px] font-black uppercase tracking-widest py-1 text-center animate-in slide-in-from-top duration-500">
          OFFLINE MODE
        </div>
      )}

      {/* Confirmation Modal for Project Deletion */}
      {isDeletingProject && (
        <div className="fixed inset-0 z-[10008] flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="ui-window w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="ui-window-header border-b border-white/5">
              <div className="flex items-center gap-3 px-2">
                <Trash2 className="w-5 h-5 text-red-500" />
                <h2 className="ui-title-main text-xs">{t('sidebar.deleteProject')}</h2>
              </div>
              <button
                onClick={() => setDeletingProject(null)}
                className="p-2 hover:bg-red-500 hover:text-white transition-all rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-8 space-y-6">
                <div className="text-center">
                    <p className="text-zinc-200 font-bold mb-1">{t('sidebar.confirmDeleteProject')}</p>
                    <p className="text-zinc-500 text-sm font-mono break-all px-4 bg-black/20 p-3 rounded-lg border border-white/5">
                        {projects.find(p => p.id === isDeletingProject)?.name}
                    </p>
                </div>

                <div className="flex flex-col gap-3 pt-2">
                    <button
                        onClick={async () => {
                            const pid = isDeletingProject;
                            if (pid) {
                                try {
                                    // Unified delete handles everything: cloud, disk, db, state
                                    await deleteProject(pid);
                                    import('./utils/toast').then(({ toast }) => toast.success(t('common.deleteSuccess')));
                                } catch (e) {
                                    console.error("Delete failed:", e);
                                    import('./utils/toast').then(({ toast }) => toast.error("Delete failed"));
                                }
                            }
                            setDeletingProject(null);
                        }}
                        className="w-full h-14 bg-red-600 hover:bg-red-500 text-white rounded-xl font-black uppercase text-xs tracking-widest shadow-lg shadow-red-900/20 transition-all active:scale-95 flex items-center justify-center gap-2"
                    >
                        <Trash2 className="w-4 h-4" />
                        {t('common.delete')}
                    </button>
                    <button
                        onClick={() => setDeletingProject(null)}
                        className="w-full h-12 bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white rounded-xl font-black uppercase text-xs tracking-widest transition-all"
                    >
                        {t('common.cancel')}
                    </button>
                </div>
            </div>
          </div>
        </div>
      )}
      
      <div
        ref={sidebarRef}
        className={clsx(
          "fixed md:relative z-[110] md:z-20 h-full transition-all duration-300 ease-in-out",
          showSidebar ? "translate-x-0 opacity-100" : "-translate-x-full md:hidden opacity-0 md:opacity-100"
        )}
        style={{ width: isMobile ? '100%' : sidebarWidth }}
      >
        <Sidebar />
        <div onMouseDown={() => setIsResizingSidebar(true)} className="hidden md:block absolute right-0 top-0 w-1 h-full cursor-col-resize hover:bg-indigo-500/30 transition-colors z-50" />
      </div>
      
      <main className={clsx(
          "flex-1 flex flex-col min-w-0 bg-transparent relative w-full overflow-hidden transition-all duration-300",
          isMobile && (showSidebar || showRightPanel) && !isZenMode ? "hidden" : "flex",
          isMobile && "pb-[72px]"
      )}>
        <header className="h-16 border-b border-white/5 flex items-center px-4 md:px-6 justify-between bg-zinc-950/50 backdrop-blur-md sticky top-0 z-50">
            <div className="flex items-center gap-3">
                {!isMobile && (
                    <button onClick={() => setSidebarVisible(!isSidebarVisible)} className={clsx("p-2 hover:bg-white/5 rounded-lg transition-all", isSidebarVisible ? "text-indigo-400 bg-indigo-500/10" : "text-zinc-500")}>
                        <ArrowLeft className={clsx("w-5 h-5 transition-transform duration-300", !isSidebarVisible && "rotate-180")} />
                    </button>
                )}
                
                <div className="relative">
                  <button onClick={() => setProjectSelectorOpen(!isProjectSelectorOpen)} className="flex items-center gap-3 px-3 py-2 rounded-xl transition-all border border-white/5 bg-white/5 outline-none">
                      <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center shrink-0 text-lg">
                          {activeProjectId === 'all-projects' ? '🗄️' : (activeProjectId === '1' ? '📥' : '📁')}
                      </div>
                      <div className="flex flex-col items-start text-left leading-none pr-1">
                          <h1 className="font-black text-[10px] uppercase tracking-widest text-white">{activeProjectId === 'all-projects' ? t('sidebar.projects') : (activeProject?.name || t('common.inbox'))}</h1>
                          <span className="text-[8px] text-zinc-500 font-bold mt-1 uppercase tracking-tighter">PROJECT</span>
                      </div>
                      <ChevronDown className={clsx("w-3 h-3 text-zinc-600 transition-transform", isProjectSelectorOpen && "rotate-180")} />
                  </button>

                  {isProjectSelectorOpen && (
                    <>
                      <div className="fixed inset-0 z-[100]" onClick={() => setProjectSelectorOpen(false)} />
                      <div className="absolute top-full left-0 mt-2 w-72 bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl z-[101] overflow-hidden animate-in fade-in slide-in-from-top-2 max-h-[70vh] overflow-y-auto scrollbar-hide">
                        <div className="p-2 border-b border-white/5 bg-black/20 text-[9px] font-black text-zinc-500 uppercase tracking-widest px-4">System</div>
                        <div className="p-1.5 space-y-0.5">
                             <button 
                                onClick={() => { setActiveProject('all-projects'); setProjectSelectorOpen(false); }} 
                                className={clsx(
                                    "w-full text-left px-3 py-2 rounded-xl flex items-center justify-between transition-all",
                                    activeProjectId === 'all-projects' ? "bg-indigo-600/20 text-indigo-300" : "text-zinc-400 hover:bg-white/5 hover:text-white"
                                )}
                            >
                                <div className="flex items-center gap-2">
                                    <span className="text-lg">🗄️</span>
                                    <span className="text-xs font-bold">{t('sidebar.projects')}</span>
                                </div>
                            </button>
                             <button 
                                onClick={() => { setActiveProject('1'); setProjectSelectorOpen(false); }} 
                                className={clsx(
                                    "w-full text-left px-3 py-2 rounded-xl flex items-center justify-between transition-all",
                                    activeProjectId === '1' ? "bg-indigo-600/20 text-indigo-300" : "text-zinc-400 hover:bg-white/5 hover:text-white"
                                )}
                            >
                                <div className="flex items-center gap-2">
                                    <span className="text-lg">📥</span>
                                    <span className="text-xs font-bold">{t('common.inbox')}</span>
                                </div>
                            </button>
                        </div>

                        {/* User Projects */}
                        {projects.filter(p => 
                            p.id !== '1' && 
                            p.id !== 'global-digest' && 
                            !p.id.includes('digest') &&
                            !p.id.startsWith('view-')
                        ).length > 0 && (
                            <>
                                <div className="p-2 border-b border-white/5 bg-black/20 text-[9px] font-black text-zinc-500 uppercase tracking-widest px-4">Projects</div>
                                <div className="p-1.5 space-y-0.5">
                                    {projects.filter(p => 
                                        p.id !== '1' && 
                                        p.id !== 'global-digest' && 
                                        !p.id.includes('digest') &&
                                        !p.id.startsWith('view-')
                                    ).map(project => (
                                        <button
                                            key={project.id}
                                            onClick={() => { setActiveProject(project.id); setProjectSelectorOpen(false); }}
                                            className={clsx(
                                                "w-full text-left px-3 py-2 rounded-xl flex items-center gap-2 transition-all",
                                                activeProjectId === project.id ? "bg-indigo-600/20 text-indigo-300" : "text-zinc-400 hover:bg-white/5 hover:text-white"
                                            )}
                                        >
                                            <div className={clsx(
                                                "w-2 h-2 rounded-full shrink-0",
                                                project.color ? project.color.replace('bg-', 'bg-').split(' ')[0] : 'bg-zinc-600'
                                            )} />
                                            <span className="text-xs font-bold truncate flex-1">{project.name}</span>
                                            <span className="text-[9px] text-zinc-600 font-bold">
                                                {notes.filter(n => n.projectId === project.id).length}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}
                      </div>
                    </>
                  )}
                </div>

                <div className="h-8 w-px bg-white/5 mx-1 hidden md:block" />
                
                <div className="relative group/ai">
                    <button 
                        onClick={() => setAiSelectorOpen(!isAiSelectorOpen)}
                        className={clsx(
                            "flex items-center gap-3 px-3 py-2 rounded-xl transition-all group outline-none border",
                            isAiSelectorOpen ? "bg-indigo-500/10 border-indigo-500/30 shadow-lg shadow-indigo-500/10" : "bg-white/5 border-white/5 hover:border-white/10"
                        )}
                    >
                        <div className="relative">
                            <div className={clsx(
                                "w-2 h-2 rounded-full transition-all shadow-sm",
                                aiStatus === 'connected' ? "bg-green-500 shadow-green-500/40" : 
                                aiStatus === 'connecting' ? "bg-amber-500 animate-pulse" : "bg-zinc-600"
                            )} />
                            {aiStatus === 'connected' && <div className="absolute inset-0 bg-green-500 rounded-full animate-ping opacity-20" />}
                        </div>
                        <div className="flex flex-col items-start leading-none pr-1">
                            <span className="text-[10px] font-black uppercase tracking-widest text-white group-hover:text-indigo-400 transition-colors">
                                {settings.aiProvider.replace('-api', '').replace('-tab', '').toUpperCase()}
                            </span>
                            <span className="text-[8px] text-zinc-500 font-bold mt-1">AI ENGINE</span>
                        </div>
                        <ChevronDown className={clsx("w-3 h-3 text-zinc-600 transition-transform", isAiSelectorOpen && "rotate-180")} />
                    </button>

                    {isAiSelectorOpen && (
                        <>
                            <div className="fixed inset-0 z-[100]" onClick={() => setAiSelectorOpen(false)} />
                            <div className="absolute top-full left-0 mt-2 w-72 bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl z-[101] overflow-hidden animate-in fade-in slide-in-from-top-2">
                                <div className="p-2 border-b border-white/5 bg-black/20 text-[9px] font-black text-zinc-500 uppercase tracking-widest px-4">{t('settings.aiProvider')}</div>
                                <div className="max-h-[60vh] overflow-y-auto p-1.5 space-y-1">
                                    {[
                                        { id: 'groq-api', name: 'Groq API', desc: 'Llama 3.3 (Ultra Fast)', icon: '⚡' },
                                        { id: 'openai', name: 'OpenAI', desc: 'GPT-4o-mini', icon: '🧠' },
                                        { id: 'gemini-api', name: 'Google Gemini', desc: 'API Key / OAuth2', icon: '✨' },
                                        { id: 'browser-native-extension', name: 'Browser Extension', desc: 'Free & Local', icon: '🧩' },
                                        { id: 'chatgpt-tab', name: 'ChatGPT Tab', desc: 'Free via Bridge', icon: '💬' },
                                        { id: 'claude-tab', name: 'Claude Tab', desc: 'Free via Bridge', icon: '🎭' },
                                        { id: 'gemini-tab', name: 'Gemini Tab', desc: 'Free via Bridge', icon: '♊' }
                                    ].map(provider => (
                                        <button
                                            key={provider.id}
                                            onClick={() => {
                                                updateSettings({ aiProvider: provider.id as any });
                                                setAiSelectorOpen(false);
                                            }}
                                            className={clsx(
                                                "w-full text-left px-3 py-2.5 rounded-xl flex items-center justify-between transition-all group/item",
                                                settings.aiProvider === provider.id ? "bg-indigo-600/20 text-indigo-300" : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
                                            )}
                                        >
                                            <div className="flex items-center gap-3">
                                                <span className="text-lg opacity-80 group-hover/item:opacity-100">{provider.icon}</span>
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-bold">{provider.name}</span>
                                                    <span className="text-[8px] opacity-50 font-medium uppercase">{provider.desc}</span>
                                                </div>
                                            </div>
                                            {settings.aiProvider === provider.id && <Check className="w-4 h-4 text-indigo-400" />}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
            
            <div className="flex items-center gap-2">
                <button onClick={() => setZenMode(!isZenMode)} className="p-2 hover:bg-white/5 rounded-lg transition-all text-zinc-400 outline-none">
                    {isZenMode ? <Maximize2 className="w-5 h-5" /> : <Minimize2 className="w-5 h-5" />}
                </button>
                <button onClick={() => setRightPanelVisible(!isRightPanelVisible)} className={clsx("p-2 hover:bg-white/5 rounded-lg transition-all outline-none", isRightPanelVisible ? "text-indigo-400 bg-indigo-500/10" : "text-zinc-500")}>
                    <ArrowRight className={clsx("w-5 h-5 transition-transform duration-300", !isRightPanelVisible && "rotate-180")} />
                </button>
            </div>
        </header>
        
        <div className="flex-1 flex flex-col relative overflow-hidden">
          {renderMainContent()}
          {activeProjectId !== 'all-projects' && (!isMobile || currentMobileTab === 'workspace') && <VoiceInput onNoteCreated={() => storeData.loadInitialData()} />}
        </div>
      </main>

      <div
        ref={rightPanelRef}
        className={clsx("fixed right-0 md:relative z-[110] md:z-20 h-full transition-all duration-300 ease-in-out", showRightPanel ? "translate-x-0 opacity-100" : "translate-x-full md:hidden opacity-0 md:opacity-100")}
        style={{ width: isMobile ? '100%' : rightPanelWidth }}
      >
        <div onMouseDown={() => setIsResizingRightPanel(true)} className="hidden md:block absolute left-0 top-0 w-1 h-full cursor-col-resize hover:bg-indigo-500/30 transition-colors z-50" />
        <RightPanel />
      </div>

      {isMobile && <BottomNav />}
      
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setSettingsOpen(false)} />
      {isAuthOpen && <AuthPage />}
      {isUserCabinetOpen && <UserCabinet isOpen={isUserCabinetOpen} onClose={() => setUserCabinetOpen(false)} />}
      {isReadmeOpen && <ReadmeModal isOpen={isReadmeOpen} onClose={() => setReadmeOpen(false)} />}
      <CreateProjectModal />
      <EditProjectModal />
      <ProjectDigestModal />
      <InsightModal />
      <DeleteNoteModal />
    </div>
  );
}

export default App;
