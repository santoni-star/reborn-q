import { LayoutGrid, Brain, User, Sparkles, Folder } from 'lucide-react';
import { clsx } from 'clsx';
import { useStore, type MobileTab } from '../store/useStore';
import { useTranslation } from 'react-i18next';

export const BottomNav = () => {
  const { currentMobileTab, setMobileTab, setUserCabinetOpen, activeProjectId, setActiveProject, currentUser, isSidebarVisible, setSidebarVisible } = useStore();
  const { t } = useTranslation();

  const handleTabClick = (tab: MobileTab) => {
    if (tab === 'profile') {
        setUserCabinetOpen(true);
        return;
    }
    
    if (tab === 'projects') {
        setSidebarVisible(true);
        return;
    }
    
    if (tab === 'workspace' && activeProjectId === 'all-projects') {
        setActiveProject('1');
    }
    
    setMobileTab(tab);
  };

  const tabs: { id: MobileTab; icon: any; label: string }[] = [
    { id: 'workspace', icon: LayoutGrid, label: t('sidebar.workspace') },
    { id: 'projects', icon: Folder, label: t('sidebar.projects') },
    { id: 'ai', icon: Sparkles, label: 'AI' },
    { id: 'profile', icon: User, label: t('settings.account') },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[100] bg-zinc-950/80 backdrop-blur-xl border-t border-white/5 px-4 pb-safe pt-2 md:hidden">
      <div className="flex items-center justify-between max-w-lg mx-auto">
        {tabs.map((tab) => {
          const isActive = tab.id === 'projects' ? isSidebarVisible : currentMobileTab === tab.id;
          const Icon = tab.icon;
          
          return (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              className={clsx(
                "flex flex-col items-center gap-1 py-2 px-4 rounded-2xl transition-all duration-300 relative",
                isActive ? "text-indigo-400" : "text-zinc-500"
              )}
            >
              {isActive && (
                <div className="absolute inset-0 bg-indigo-500/10 rounded-2xl animate-in zoom-in-90 duration-300" />
              )}
              
              {tab.id === 'profile' && currentUser ? (
                  <div className={clsx(
                      "w-5 h-5 rounded-full overflow-hidden border transition-all",
                      isActive ? "border-indigo-400 scale-110" : "border-zinc-600"
                  )}>
                      {currentUser.photoURL ? (
                          <img src={currentUser.photoURL} alt="User" className="w-full h-full object-cover" />
                      ) : (
                          <div className="w-full h-full bg-indigo-600 flex items-center justify-center text-[8px] text-white font-bold">
                              {currentUser.displayName?.slice(0, 1).toUpperCase() || 'U'}
                          </div>
                      )}
                  </div>
              ) : (
                  <Icon className={clsx("w-5 h-5", isActive && "fill-indigo-500/20")} />
              )}
              
              <span className="text-[10px] font-black uppercase tracking-tighter">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
