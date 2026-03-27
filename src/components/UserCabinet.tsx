import { useStore } from '../store/useStore';
import { firebaseService } from '../services/firebaseService';
import { syncService } from '../services/syncService';
import { unifiedSyncService } from '../services/unifiedSyncService';
import { clsx } from 'clsx';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from '../utils/toast';
import {
  User, Cloud, CloudOff, Loader2, Smartphone, HardDrive,
  LogOut, X, Shield, Mail, CheckCircle, ArrowLeft, Settings, Activity
} from 'lucide-react';

import { PrivacyModal } from './PrivacyModal';
import { db } from '../services/db';

export const UserCabinet = ({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) => {
    const {
      settings,
      updateSettings,
      setAuthOpen,
      setNotes,
      setProjects,
      setFolderConnected,
      isFolderConnected,
      projects,
      setSettingsOpen
    } = useStore();

    const isCloudSyncEnabled = settings.cloudSyncEnabled;
    const [isConnecting, setIsConnecting] = useState(false);
    const [isConnectingFolder, setIsConnectingFolder] = useState(false);

    // Status is 'connected' if we have an access token AND cloud sync is enabled
    const connectionStatus = (settings.googleAccessToken && isCloudSyncEnabled) ? 'connected' :
                             isConnecting ? 'connecting' : 'disconnected';

    const [progress, setProgress] = useState(0);
    const [syncStatus, setSyncStatus] = useState<string>('');
    const [timeRemaining, setTimeRemaining] = useState<string | null>(null);
    const [isSyncingNow, setIsSyncingNow] = useState(false);
    const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);
    const [lastSyncInfo, setLastSyncInfo] = useState<{timestamp: number, message: string, status: string} | null>(null);
    const { t } = useTranslation();
    const { currentUser, notes } = useStore();
    const isMobile = window.innerWidth < 768;

    // Load last sync info when component mounts
    useEffect(() => {
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

        loadLastSyncInfo();
    }, []);

    const handleConnectFolder = async () => {
        setIsConnectingFolder(true);
        try {
            const success = await syncService.connectFolder();
            if (success) {
              setFolderConnected(true);
              const diskData = await syncService.loadNotesFromFolder();
              if (diskData.notes.length > 0) setNotes(diskData.notes);
              if (diskData.projects.length > 1) setProjects(diskData.projects);
              toast.success(t('sidebar.folderSynced'));
            }
        } catch (e) {
            console.error("Folder connection failed:", e);
            toast.error(t('common.syncStatus.error') || "Failed to connect folder");
        } finally {
            setIsConnectingFolder(false);
        }
    };

    const setCloudSyncEnabled = (enabled: boolean) => {
        updateSettings({ cloudSyncEnabled: enabled });
    };

    const handleManualSync = async () => {
        setIsSyncingNow(true);
        setProgress(0);
        setSyncStatus(t('common.cabinet.syncing'));
        setTimeRemaining(t('common.cabinet.calculating'));

        let startTime = Date.now();
        let actualStartHappened = false;

        try {
            await unifiedSyncService.fullSync(projects, (processed, total, status) => {
                const percent = Math.round((processed / (total || 1)) * 100);
                setProgress(percent);
                setSyncStatus(status);

                if (processed > 0 && processed < total) {
                    // Reset startTime when first item is actually processed to avoid counting initialization delay
                    if (!actualStartHappened) {
                        startTime = Date.now();
                        actualStartHappened = true;
                    }

                    const elapsed = Date.now() - startTime;
                    const timePerNote = elapsed / processed;
                    const remainingNotes = total - processed;
                    const remainingMs = remainingNotes * timePerNote;
                    
                    const seconds = Math.max(1, Math.ceil(remainingMs / 1000));
                    if (seconds > 60) {
                        const mins = Math.floor(seconds / 60);
                        const secs = seconds % 60;
                        setTimeRemaining(`${mins}м ${secs}с`);
                    } else if (processed > total - 2) {
                        setTimeRemaining(t('common.syncStatus.pending'));
                    } else {
                        setTimeRemaining(`${seconds}с`);
                    }
                } else if (processed === total && total > 0) {
                    setTimeRemaining(null);
                }
            });
            toast.success(t('common.cabinet.syncSuccess'));
        } catch (error: any) {
            console.error("Sync Error Detailed:", error);
            toast.error(error.message || t('common.cabinet.syncFailed'));
        } finally {
            setIsSyncingNow(false);
            setTimeRemaining(null);
            setTimeout(() => setProgress(0), 3000);
        }
    };

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      // With unified flow, we always sign in via Firebase to get both Auth and Drive access
      console.log("[Cabinet] Starting unified Google login (Auth + Drive)...");
      await firebaseService.signInWithGoogle();
      // On mobile, this will redirect. On desktop, this might use a popup.

      if (!isMobile) {
          // If popup was used, we can continue
          updateSettings({ cloudSyncEnabled: true });

          for (let i = 0; i <= 100; i += 20) {
            await new Promise(resolve => setTimeout(resolve, 100));
            setProgress(i);
          }

          if (firebaseService.isAuthenticated()) {
              const cloudNotes = await unifiedSyncService.downloadNotesFromCloud();
              setNotes(cloudNotes);
          }
      }
    } catch (error: any) {
      console.error('Cloud sync failed:', error);
      const message = error.message || "Unknown error";
      toast.error(`${t('common.syncStatus.error')}: ${message}`);
    } finally {
      setIsConnecting(false);
      setProgress(0);
    }
  };

  const handleLogout = async () => {
    if (window.confirm(t('common.cabinet.logoutConfirm'))) {
      await firebaseService.signOut();
      updateSettings({ cloudSyncEnabled: false });
      window.location.reload();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[10000] bg-zinc-950/80 backdrop-blur-2xl flex flex-col md:items-center md:justify-center p-0 md:p-4 animate-in fade-in duration-300">
      <div className="ui-window w-full max-w-2xl">

        {/* Header */}
        <div className="h-16 md:h-20 border-b border-white/5 flex items-center px-6 justify-between bg-black/20">
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-all">
              <ArrowLeft className="w-6 h-6 text-zinc-400" />
            </button>
            <h2 className="text-sm font-black uppercase tracking-widest text-zinc-200">{t('settings.account')}</h2>
          </div>
          <button onClick={onClose} className="hidden md:block p-2 hover:bg-red-500 hover:text-white transition-all rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 md:p-10 space-y-10">

          {/* User Profile Info */}
          <section className="space-y-6">
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-indigo-500 to-purple-600 p-[2px] shadow-lg shadow-indigo-500/20">
                <div className="w-full h-full rounded-[22px] bg-zinc-900 flex items-center justify-center overflow-hidden">      
                                {currentUser?.photoURL ? (
                                  <img src={currentUser.photoURL} className="w-full h-full rounded-[22px] object-cover" />
                                ) : (
                                  <div className="flex flex-col items-center">
                                      <User className="w-8 h-8 text-indigo-400" />
                                      <span className="text-[10px] font-bold text-zinc-500 mt-1">
                                          {typeof currentUser?.displayName === 'string' ? currentUser.displayName.slice(0, 2).toUpperCase() : '??'}
                                      </span>
                                  </div>
                                )}                </div>
              </div>
              <div className="flex flex-col flex-1">
                <h3 className="text-xl font-bold text-white">
                    {currentUser?.displayName || currentUser?.email || t('settings.auth.login')}
                </h3>
                <div className="flex items-center gap-2 text-zinc-500 text-sm mt-1">
                  <Mail className="w-3.5 h-3.5" />
                  <span>{currentUser?.email || t('settings.auth.noAccount')}</span>
                </div>

                {!currentUser ? (
                  <button
                    onClick={() => { setAuthOpen(true); onClose(); }}
                    className="mt-4 px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all w-fit shadow-lg shadow-indigo-500/20"
                  >
                    {t('settings.auth.signInWithGoogle')}
                  </button>
                ) : (
                  <div className="flex items-center gap-2 mt-3">
                    <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-400 text-[10px] font-black uppercase tracking-widest rounded-md border border-indigo-500/20">
                      {t('sidebar.accountPro')}
                    </span>
                    <span className="flex items-center gap-1 text-green-500 text-[10px] font-bold uppercase tracking-widest">
                      <CheckCircle className="w-3 h-3" /> {t('common.cabinet.verified')}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Data Management: Local & Cloud */}
          <section className="space-y-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-indigo-500/10 rounded-lg">
                <HardDrive className="w-5 h-5 text-indigo-400" />
              </div>
              <h3 className="text-xs font-black uppercase tracking-widest text-zinc-200">{t('settings.storage')}</h3>
            </div>

            {/* Local Sync Block */}
            <div className={clsx(
              "p-6 rounded-2xl border transition-all",
              isFolderConnected ? "bg-green-500/5 border-green-500/20" : "bg-zinc-800/30 border-white/5"
            )}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={clsx(
                    "p-3 rounded-xl",
                    isFolderConnected ? "bg-green-500/20 text-green-400" : "bg-zinc-700/50 text-zinc-500"        
                  )}>
                    <HardDrive className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white">{t('settings.localSync')}</h4>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      {isFolderConnected ? t('settings.connected') : t('settings.notConnected')}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleConnectFolder}
                  disabled={isConnectingFolder}
                  className={clsx(
                    "px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all",        
                    isFolderConnected
                      ? "bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white border border-white/5"      
                      : "bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg shadow-indigo-500/20"
                  )}
                >
                  {isConnectingFolder ? <Loader2 className="w-4 h-4 animate-spin" /> :
                   isFolderConnected ? t('settings.reconnectFolder') : t('sidebar.connectFolder')}
                </button>
              </div>
            </div>

            {/* Cloud Sync Block */}
            <div className={clsx(
              "p-6 rounded-2xl border transition-all",
              connectionStatus === 'connected' ? "bg-blue-500/5 border-blue-500/20" : "bg-zinc-800/30 border-white/5"
            )}>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <div className={clsx(
                    "p-3 rounded-xl",
                    connectionStatus === 'connected' ? "bg-blue-500/20 text-blue-400" : "bg-zinc-700/50 text-zinc-500"
                  )}>
                    {connectionStatus === 'connected' ? <Cloud className="w-6 h-6" /> : <CloudOff className="w-6 h-6" />}
                  </div>
                  <div>
                    <h4 className="font-bold text-white">Google Drive</h4>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      {connectionStatus === 'connected' ? t('settings.cloudSync.connected') : t('settings.cloudSync.disconnected')}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                    <button
                    onClick={connectionStatus === 'connected' ? () => setCloudSyncEnabled(false) : handleConnect}
                    disabled={isConnecting}
                    className={clsx(
                        "px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all",    
                        connectionStatus === 'connected'
                        ? "bg-red-500/10 text-red-400 hover:bg-red-500/20"
                        : "bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg shadow-indigo-500/20"
                    )}
                    >
                    {isConnecting ? <Loader2 className="w-4 h-4 animate-spin" /> :
                    connectionStatus === 'connected' ? t('settings.cloudSync.disconnect') : t('settings.cloudSync.connect')}
                    </button>

                    {connectionStatus === 'connected' && (
                        <button
                            onClick={handleManualSync}
                            disabled={isSyncingNow}
                            className="px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all bg-white/5 hover:bg-white/10 text-white flex items-center justify-center gap-2 border border-white/5"   
                        >
                            <Loader2 className={clsx("w-3.5 h-3.5", isSyncingNow && "animate-spin")} />
                            {isSyncingNow ? t('common.cabinet.syncing') : t('common.cabinet.syncNow')}
                        </button>
                    )}
                </div>
              </div>

              {isSyncingNow && (
                <div className="space-y-3 mb-6 animate-in fade-in duration-300">
                  <div className="flex justify-between items-end">
                    <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">{t('common.cabinet.processing')}</span>
                        <span className="text-xs text-zinc-300 font-medium truncate max-w-[180px]">{syncStatus}</span>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">{t('common.cabinet.estimatedTime')}</span>
                        <span className="text-xs text-white font-mono">{timeRemaining || t('common.cabinet.calculating')}</span>
                    </div>
                  </div>
                  <div className="h-2 bg-zinc-800 rounded-full overflow-hidden border border-white/5">
                    <div
                        className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-blue-500 transition-all duration-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]"
                        style={{ width: `${progress}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-[10px] text-zinc-500 font-bold uppercase tracking-tighter">
                    <span>{progress}% {t('sidebar.folderSynced') || 'Complete'}</span>
                    <span>{t('common.cabinet.totalObjects', { count: notes.length })}</span>
                  </div>
                </div>
              )}

              {/* Last Sync Status */}
              {lastSyncInfo && (
                <div className="mb-4 p-3 bg-zinc-800/30 rounded-xl border border-white/5">
                  <div className="flex items-center gap-2 text-zinc-400">
                    <Activity className="w-4 h-4" />
                    <span className="text-[10px] font-black uppercase tracking-widest">{t('common.cabinet.lastSync')}</span>
                  </div>
                  <div className="mt-2 text-xs text-zinc-300">
                    <div className={`font-medium ${lastSyncInfo.status === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                      {lastSyncInfo.status === 'success' ? '✓' : '⚠'} {lastSyncInfo.message}
                    </div>
                    <div className="text-zinc-500 mt-1">
                      {new Date(lastSyncInfo.timestamp).toLocaleString()}
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div className="p-2 bg-black/20 rounded-xl border border-white/5 space-y-2">
                  <div className="flex items-center gap-2 text-indigo-400">
                    <Smartphone className="w-4 h-4" />
                    <span className="text-[10px] font-black uppercase tracking-widest">{t('settings.cloudSync.mobileAccess')}</span>
                  </div>
                  <p className="text-[11px] text-zinc-500 leading-relaxed">{t('settings.cloudSync.mobileAccessDesc')}</p>
                </div>
                <div className="p-2 bg-black/20 rounded-xl border border-white/5 space-y-2">
                  <div className={clsx(
                    "p-3 rounded-xl",
                    connectionStatus === 'connected' ? "bg-blue-500/20 text-blue-400" : "bg-zinc-700/50 text-zinc-500"
                  )}>
                    <HardDrive className="w-4 h-4" />
                    <span className="text-[10px] font-black uppercase tracking-widest">{t('settings.cloudSync.localSync')}</span>
                  </div>
                  <p className="text-[11px] text-zinc-500 leading-relaxed">{t('settings.cloudSync.localSyncDesc')}</p>
                </div>
              </div>
            </div>
          </section>

          {/* Security & System */}
          <section className="pt-4 border-t border-white/5 space-y-4">
            <button
                onClick={() => { setSettingsOpen(true); onClose(); }}
                className="w-full flex items-center justify-between p-2 hover:bg-white/5 rounded-2xl transition-all group"
            >
              <div className="flex items-center gap-2">
                <div className="p-2 bg-zinc-800 rounded-lg group-hover:bg-indigo-500/20 transition-colors">      
                  <Settings className="w-4 h-4 text-zinc-400 group-hover:text-indigo-400" />
                </div>
                <span className="text-sm font-bold text-zinc-300">{t('settings.title')}</span>
              </div>
              <ArrowLeft className="w-4 h-4 text-zinc-600 rotate-180" />
            </button>

            <button
                onClick={() => setIsPrivacyOpen(true)}
                className="w-full flex items-center justify-between p-2 hover:bg-white/5 rounded-2xl transition-all group"
            >
              <div className="flex items-center gap-2">
                <div className="p-2 bg-zinc-800 rounded-lg group-hover:bg-indigo-500/20 transition-colors">      
                  <Shield className="w-4 h-4 text-zinc-400 group-hover:text-indigo-400" />
                </div>
                <span className="text-sm font-bold text-zinc-300">{t('common.cabinet.privacy')}</span>
              </div>
              <ArrowLeft className="w-4 h-4 text-zinc-600 rotate-180" />
            </button>

            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2 p-2 hover:bg-red-500/10 rounded-2xl transition-all group text-red-400"
            >
              <div className="p-2 bg-red-500/10 rounded-lg group-hover:bg-red-500/20 transition-colors">
                <LogOut className="w-4 h-4" />
              </div>
              <span className="text-sm font-bold">{t('common.cabinet.signOut')}</span>
            </button>
          </section>

        </div>
      </div>
      <PrivacyModal isOpen={isPrivacyOpen} onClose={() => setIsPrivacyOpen(false)} />
    </div>
  );
};
