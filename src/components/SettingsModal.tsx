import { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import type { AiProvider, AppLanguage } from '../types/entities';
import { X, Folder, Check, AlertCircle, Languages, FileText, ChevronRight, Maximize2, Settings, CloudDownload, RefreshCw, Lock, Eye, EyeOff, Download } from 'lucide-react';
import { syncService } from '../services/syncService';
import { unifiedSyncService } from '../services/unifiedSyncService';
import { toast } from '../utils/toast';
import { useTranslation } from 'react-i18next';
import { clsx } from 'clsx';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal = ({ isOpen, onClose }: SettingsModalProps) => {
  const { settings, updateSettings, isFolderConnected, setFolderConnected, setReadmeOpen, projects, setProjects, setNotes } = useStore();
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState({ current: 0, total: 0, status: '' });
  const [isMaximized, setIsMaximized] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { t, i18n } = useTranslation();

  useKeyboardShortcuts({
    onClose,
    enabled: isOpen
  });

  useEffect(() => {
    if (settings.language && i18n.language !== settings.language) {
      i18n.changeLanguage(settings.language);
    }
  }, [settings.language, i18n]);

  if (!isOpen) return null;

  const handleLanguageChange = (lang: AppLanguage) => {
    updateSettings({ language: lang });
    i18n.changeLanguage(lang);
  };

  const handleConnectFolder = async () => {
    setIsConnecting(true);
    const success = await syncService.connectFolder();
    setFolderConnected(success);
    setIsConnecting(false);
  };

  const handleFullSync = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
        await unifiedSyncService.fullSync(projects, (current, total, status) => {
            setSyncProgress({ current, total, status });
        });
        
        // Refresh local data after sync
        const diskData = await syncService.loadNotesFromFolder();
        if (diskData.projects.length > 0) setProjects(diskData.projects);
        if (diskData.notes.length > 0) setNotes(diskData.notes);
        
        toast.success(t('common.cabinet.syncSuccess'));
    } catch (e: any) {
        toast.error(e.message || t('common.cabinet.syncFailed'));
    } finally {
        setIsSyncing(false);
        setSyncProgress({ current: 0, total: 0, status: '' });
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center md:p-4 bg-zinc-950/60 backdrop-blur-2xl animate-in fade-in duration-300">
      <div 
        className={clsx(
            "ui-window",
            isMaximized ? "md:w-[85%] md:h-[95vh]" : "md:w-[75%] md:max-w-2xl md:h-auto md:max-h-[85vh]"
        )}
      >
        {/* Header */}
        <div className="ui-window-header">
          <div className="flex items-center gap-4 flex-1 px-2">
            <div className="p-2 rounded-lg bg-white/5 shrink-0">
              <Settings className="w-5 h-5 text-indigo-400" />
            </div>
            <div className="flex flex-col">
                <h2 className="ui-title-main text-sm">{t('settings.title')}</h2>
                <span className="text-[10px] text-zinc-500 font-bold uppercase mt-1">{t('settings.accountDescription')}</span>
            </div>
          </div>
          
          <div className="flex items-center">
            <button
                onClick={() => setIsMaximized(!isMaximized)}
                className={clsx("p-2.5 hover:bg-white/10 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center", isMaximized ? "text-indigo-400" : "text-zinc-400")}
            >
                <Maximize2 className="w-4 h-4" />
            </button>
            <button onClick={onClose} className="p-2.5 hover:bg-red-500 hover:text-white transition-colors text-zinc-400 min-h-[44px] min-w-[44px] flex items-center justify-center">
                <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="ui-window-content space-y-8">
          {/* Section: Cloud to Disk Sync */}
          {isFolderConnected && (
            <div>
              <h3 className="ui-section-label mb-4">
                <CloudDownload className="w-3 h-3" />
                {t('settings.cloudSync.title')} → {t('settings.localSync')}
              </h3>
              <div className="p-6 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-white">{t('settings.cloudSync.localSync')}</p>
                    <p className="text-xs text-zinc-500">{t('settings.cloudSync.localSyncDesc')}</p>
                  </div>
                  <button
                    onClick={handleFullSync}
                    disabled={isSyncing}
                    className={clsx(
                      "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all min-h-[44px] min-w-[80px] flex items-center justify-center",
                      isSyncing
                        ? "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                        : "bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg shadow-indigo-500/20"
                    )}
                  >
                    <RefreshCw className={clsx("w-3.5 h-3.5", isSyncing && "animate-spin")} />
                    {isSyncing ? t('common.syncing') : t('common.syncNow')}
                  </button>
                </div>
                
                {isSyncing && (
                  <div className="space-y-2 animate-in fade-in duration-300">
                    <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-indigo-400">
                      <span>{syncProgress.status || t('common.syncing')}</span>
                      <span>{syncProgress.total > 0 ? `${Math.round((syncProgress.current / syncProgress.total) * 100)}%` : ''}</span>
                    </div>
                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-indigo-500 transition-all duration-300 ease-out"
                        style={{ width: `${syncProgress.total > 0 ? (syncProgress.current / syncProgress.total) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Section: Sync */}
          <div>
            <h3 className="ui-section-label mb-4">
              <RefreshCw className="w-3 h-3" />
              {t('settings.cloudSync.title')} & {t('settings.localSync')}
            </h3>
            <div className="space-y-3">
              <button
                onClick={() => updateSettings({ localSyncEnabled: !settings.localSyncEnabled })}
                className={clsx(
                  "w-full flex items-center justify-between px-6 py-4 rounded-2xl border transition-all",
                  settings.localSyncEnabled
                    ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-100"
                    : "bg-white/5 border-white/5 text-zinc-400 hover:bg-white/10"
                )}
              >
                <div className="flex flex-col items-start">
                    <span className="text-sm font-bold">{t('settings.cloudSync.localSync')}</span>
                    <span className="text-[10px] text-zinc-500 font-medium">{t('settings.cloudSync.localSyncDesc')}</span>
                </div>
                <div className={clsx(
                  "w-10 h-5 rounded-full relative transition-colors",
                  settings.localSyncEnabled ? "bg-indigo-600" : "bg-zinc-700"
                )}>
                  <div className={clsx(
                    "absolute top-1 w-3 h-3 rounded-full bg-white transition-all",
                    settings.localSyncEnabled ? "right-1" : "left-1"
                  )} />
                </div>
              </button>

              {!isFolderConnected && settings.localSyncEnabled && (
                  <button
                    onClick={handleConnectFolder}
                    disabled={isConnecting}
                    className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-2xl bg-indigo-600 text-white font-black uppercase text-[10px] tracking-widest hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-500/20"
                  >
                    <Folder className="w-4 h-4" />
                    {isConnecting ? t('common.syncStatus.pending') : t('settings.connectFolder')}
                  </button>
              )}
            </div>
          </div>

          {/* Section: Security */}
          <div>
            <h3 className="ui-section-label mb-4">
              <Lock className="w-3 h-3" />
              {t('settings.security.title')}
            </h3>
            <div className="p-6 rounded-2xl bg-amber-500/5 border border-amber-500/10 space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between ml-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                    {t('settings.security.masterPassword')}
                  </label>
                  <button 
                    onClick={() => setReadmeOpen(true)}
                    className="text-[9px] font-bold text-amber-500 hover:text-amber-400 underline uppercase tracking-tighter"
                  >
                    {t('settings.security.learnMore')}
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={settings.encryptionPassword || ''}
                    onChange={(e) => updateSettings({ encryptionPassword: e.target.value })}
                    placeholder={t('settings.security.passwordPlaceholder')}
                    className="w-full bg-white/5 border border-white/5 rounded-xl h-12 pl-4 pr-12 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500/40 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-zinc-500 hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="flex gap-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-[10px] text-amber-200/70 leading-relaxed">
                  {t('settings.security.warning')}
                </p>
              </div>
            </div>
          </div>

          {/* Section: Language */}
          <div>
            <h3 className="ui-section-label mb-4">
              <Languages className="w-3 h-3" />
              {t('settings.language')}
            </h3>
            <select
              value={settings.language}
              onChange={(e) => handleLanguageChange(e.target.value as AppLanguage)}
              className="w-full bg-white/5 border border-white/5 rounded-xl h-12 px-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40 cursor-pointer [&>option]:bg-zinc-900 [&>option]:text-white"
            >
              <option value="auto">{t('settings.languageAuto')}</option>
              <option value="en">English</option>
              <option value="uk">Українська</option>
              <option value="pl">Polski</option>
              <option value="de">Deutsch</option>
            </select>
          </div>

          {/* Section: Documentation */}
          <div>
            <h3 className="ui-section-label mb-4">{t('settings.documentation')}</h3>
            <button
              onClick={() => setReadmeOpen(true)}
              className="w-full flex items-center justify-between px-6 py-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 hover:border-indigo-500/30 transition-all group"
            >
              <div className="flex items-center gap-4">
                <FileText className="w-5 h-5 text-indigo-400" />
                <span className="text-sm font-bold text-zinc-300 group-hover:text-white transition-colors">{t('settings.viewReadme')}</span>
              </div>
              <ChevronRight className="w-5 h-5 text-zinc-600 group-hover:text-white transition-all group-hover:translate-x-1" />
            </button>
          </div>

          {/* Section: UI Behavior */}
          <div>
            <h3 className="ui-section-label mb-4">{t('settings.uiBehavior')}</h3>
            <div className="space-y-3">
              <button
                onClick={() => updateSettings({ showDevInsight: !settings.showDevInsight })}
                className={clsx(
                  "w-full flex items-center justify-between px-6 py-4 rounded-2xl border transition-all",
                  settings.showDevInsight
                    ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-100"
                    : "bg-white/5 border-white/5 text-zinc-400 hover:bg-white/10"
                )}
              >
                <span className="text-sm font-bold">{t('settings.showDevInsight')}</span>
                <div className={clsx(
                  "w-10 h-5 rounded-full relative transition-colors",
                  settings.showDevInsight ? "bg-indigo-600" : "bg-zinc-700"
                )}>
                  <div className={clsx(
                    "absolute top-1 w-3 h-3 rounded-full bg-white transition-all",
                    settings.showDevInsight ? "right-1" : "left-1"
                  )} />
                </div>
              </button>

              <button
                onClick={() => updateSettings({ disableExpansion: !settings.disableExpansion })}
                className={clsx(
                  "w-full flex items-center justify-between px-6 py-4 rounded-2xl border transition-all",
                  settings.disableExpansion
                    ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-100"
                    : "bg-white/5 border-white/5 text-zinc-400 hover:bg-white/10"
                )}
              >
                <div className="flex flex-col items-start">
                    <span className="text-sm font-bold">{t('settings.disableExpansion')}</span>
                    <span className="text-[10px] text-zinc-500 font-medium">{t('settings.disableExpansionDesc')}</span>
                </div>
                <div className={clsx(
                  "w-10 h-5 rounded-full relative transition-colors",
                  settings.disableExpansion ? "bg-indigo-600" : "bg-zinc-700"
                )}>
                  <div className={clsx(
                    "absolute top-1 w-3 h-3 rounded-full bg-white transition-all",
                    settings.disableExpansion ? "right-1" : "left-1"
                  )} />
                </div>
              </button>

              {/* Font Size Picker */}
              <div className="w-full px-6 py-4 rounded-2xl bg-white/5 border border-white/5">
                <div className="flex flex-col">
                  <span className="text-sm font-bold mb-3">{t('settings.fontSize')}</span>
                  <div className="grid grid-cols-4 gap-2">
                    {(['sm', 'base', 'lg', 'xl'] as const).map((size) => (
                      <button
                        key={size}
                        onClick={() => updateSettings({ fontSize: size })}
                        className={clsx(
                          "py-3 rounded-xl text-center text-xs font-bold uppercase tracking-wider transition-all min-h-[44px] flex items-center justify-center",
                          settings.fontSize === size
                            ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20"
                            : "bg-white/10 text-zinc-300 hover:bg-white/20"
                        )}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section: AI */}
          <div>
            <h3 className="ui-section-label mb-4">{t('settings.aiProvider')}</h3>
            <div className="space-y-6">
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">{t('settings.speechEngine')}</label>
                  <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => updateSettings({ transcriptionProvider: 'browser' })}
                        className={clsx(
                          "flex flex-col items-center justify-center p-4 rounded-2xl border transition-all",
                          settings.transcriptionProvider === 'browser' 
                            ? "bg-indigo-600/10 border-indigo-500/50 text-indigo-400 shadow-lg shadow-indigo-500/10" 
                            : "bg-white/5 border-white/5 text-zinc-500 hover:bg-white/10"
                        )}
                      >
                        <span className="text-xs font-black uppercase tracking-widest">{t('settings.browserNative')}</span>
                        <span className="text-[9px] font-bold mt-1 opacity-60 uppercase tracking-tighter">{t('settings.googleChrome')}</span>
                      </button>
                      <button
                        onClick={() => updateSettings({ transcriptionProvider: 'groq' })}
                        className={clsx(
                          "flex flex-col items-center justify-center p-4 rounded-2xl border transition-all",
                          settings.transcriptionProvider === 'groq' 
                            ? "bg-indigo-600/10 border-indigo-500/50 text-indigo-400 shadow-lg shadow-indigo-500/10" 
                            : "bg-white/5 border-white/5 text-zinc-500 hover:bg-white/10"
                        )}
                      >
                        <span className="text-xs font-black uppercase tracking-widest">{t('settings.groqWhisper')}</span>
                        <span className="text-[9px] font-bold mt-1 opacity-60 uppercase tracking-tighter">{t('settings.llamaUltraFast')}</span>
                      </button>
                  </div>
                </div>

                <div className="h-px bg-white/5" />

                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">{t('settings.llmProvider')}</label>
                  <select
                    value={settings.aiProvider}
                    onChange={(e) => updateSettings({ aiProvider: e.target.value as AiProvider })}
                    className="w-full bg-white/5 border border-white/5 rounded-xl h-12 px-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40 cursor-pointer [&>option]:bg-zinc-900 [&>option]:text-white"
                  >
                    <option value="browser">{t('settings.browserNativeDesc')}</option>
                    <option value="browser-native-extension">{t('settings.browserNativeExt')}</option>
                    <option value="groq-api">{t('settings.groqApi')}</option>
                    <option value="gemini-api">{t('settings.geminiApi')}</option>
                    <option value="openai">{t('settings.openaiApi')}</option>
                    <option value="chatgpt-tab">{t('settings.chatGptTab')}</option>
                    <option value="gemini-tab">{t('settings.geminiTab')}</option>
                    <option value="claude-tab">{t('settings.claudeTab')}</option>
                    <option value="grok-tab">{t('settings.grokTab')}</option>
                    <option value="free-ai">{t('settings.freeAi')}</option>
                  </select>
                </div>

                {['chatgpt-tab', 'gemini-tab', 'claude-tab', 'grok-tab'].includes(settings.aiProvider) && (
                  <div className="p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="flex items-center gap-2 text-indigo-400">
                      <Download className="w-4 h-4" />
                      <span className="text-xs font-black uppercase tracking-wider">{t('settings.extensionInfo.title')}</span>
                    </div>
                    <p className="text-[11px] text-zinc-400 leading-relaxed">
                      {t('settings.extensionInfo.description')}
                    </p>
                    <div className="flex flex-col gap-2 p-3 rounded-xl bg-white/5 border border-white/5">
                      <p className="text-[10px] text-zinc-500 leading-relaxed">
                        <span className="text-indigo-400 font-bold uppercase mr-1">Install:</span>
                        {t('settings.extensionInfo.installSteps')}
                      </p>
                      <a 
                        href="/extension.zip" 
                        download="DevVoiceBridge_Extension.zip"
                        className="flex items-center justify-center gap-2 w-full py-2.5 mt-1 rounded-lg bg-indigo-600/20 text-indigo-300 text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
                      >
                        <Download className="w-3.5 h-3.5" />
                        {t('settings.extensionInfo.link')} (ZIP)
                      </a>
                    </div>
                  </div>
                )}

                {settings.aiProvider === 'openai' && (
                  <input
                    type="password"
                    value={settings.openaiKey}
                    onChange={(e) => updateSettings({ openaiKey: e.target.value })}
                    placeholder="OpenAI API Key (sk-...)"
                    className="w-full bg-white/5 border border-white/5 rounded-xl h-12 px-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                  />
                )}

                {settings.aiProvider === 'groq-api' && (
                  <div className="space-y-4">
                    <input
                      type="password"
                      value={settings.groqKey || ''}
                      onChange={(e) => updateSettings({ groqKey: e.target.value })}
                      placeholder="Groq API Key (gsk_...)"
                      className="w-full bg-white/5 border border-white/5 rounded-xl h-12 px-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                    />
                    <p className="text-[10px] text-zinc-500 pl-1 leading-relaxed">
                      {t('settings.getGroqKey')} {" "}
                      <a href="https://console.groq.com/keys" target="_blank" rel="noreferrer" className="text-indigo-400 hover:text-indigo-300 underline">Groq Console</a>.
                      {" "}{t('settings.llamaRecommended')}
                    </p>
                  </div>
                )}

                {settings.aiProvider === 'gemini-api' && (
                  <div className="space-y-4">
                    <input
                      type="password"
                      value={settings.geminiKey || ''}
                      onChange={(e) => updateSettings({ geminiKey: e.target.value })}
                      placeholder="Gemini API Key (AIza...)"
                      className="w-full bg-white/5 border border-white/5 rounded-xl h-12 px-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                    />
                    
                    <div className="flex items-center justify-between p-4 bg-indigo-500/5 border border-indigo-500/10 rounded-xl">
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black uppercase text-indigo-400">{t('settings.cloudSync.title')} Status</span>
                            <span className="text-xs text-zinc-400">
                                {settings.googleAccessToken ? t('settings.cloudSync.connected') : t('settings.cloudSync.disconnected')}
                            </span>
                        </div>
                        {settings.googleAccessToken ? (
                            <Check className="w-4 h-4 text-green-500" />
                        ) : (
                            <X className="w-4 h-4 text-zinc-600" />
                        )}
                    </div>

                    <p className="text-[10px] text-zinc-500 pl-1 leading-relaxed">
                      {settings.googleAccessToken 
                        ? t('settings.cloudSync.localSyncDesc')
                        : t('settings.cloudSync.description')}
                      {" "}{t('settings.getGeminiKey')} {" "}
                      <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-indigo-400 hover:text-indigo-300 underline">Google AI Studio</a>.
                    </p>
                  </div>
                )}
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <div className="ui-window-footer">
             <div className="col-start-3 flex justify-end">
                <button
                    onClick={onClose}
                    className="px-10 h-12 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-indigo-500/20 active:scale-95 min-h-[44px] min-w-[80px] flex items-center justify-center"
                >
                    {t('common.save')}
                </button>
             </div>
        </div>
      </div>
    </div>
  );
};