import { X, Shield, Lock, EyeOff, Server, HardDrive, ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export const PrivacyModal = ({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) => {
  const { t } = useTranslation();

  if (!isOpen) return null;

  const items = [
    {
      icon: <HardDrive className="w-5 h-5" />,
      title: t('settings.cloudSync.privacyPolicy.localFirst'),
      desc: t('settings.cloudSync.privacyPolicy.localFirstDesc'),
      color: "text-blue-400",
      bg: "bg-blue-500/10"
    },
    {
      icon: <EyeOff className="w-5 h-5" />,
      title: t('settings.cloudSync.privacyPolicy.aiProcessing'),
      desc: t('settings.cloudSync.privacyPolicy.aiProcessingDesc'),
      color: "text-purple-400",
      bg: "bg-purple-500/10"
    },
    {
      icon: <Server className="w-5 h-5" />,
      title: t('settings.cloudSync.privacyPolicy.cloudSync'),
      desc: t('settings.cloudSync.privacyPolicy.cloudSyncDesc'),
      color: "text-indigo-400",
      bg: "bg-indigo-500/10"
    },
    {
      icon: <Lock className="w-5 h-5" />,
      title: t('settings.cloudSync.privacyPolicy.encryption'),
      desc: t('settings.cloudSync.privacyPolicy.encryptionDesc'),
      color: "text-green-400",
      bg: "bg-green-500/10"
    },
    {
      icon: <Shield className="w-5 h-5" />,
      title: t('settings.cloudSync.privacyPolicy.noTracking'),
      desc: t('settings.cloudSync.privacyPolicy.noTrackingDesc'),
      color: "text-amber-400",
      bg: "bg-amber-500/10"
    }
  ];

  return (
    <div className="fixed inset-0 z-[10001] bg-zinc-950 flex flex-col md:items-center md:justify-center p-0 md:p-4 animate-in fade-in duration-300">
      <div className="flex-1 w-full max-w-2xl bg-zinc-900 md:rounded-3xl md:border border-white/5 flex flex-col overflow-hidden shadow-2xl">
        
        {/* Header */}
        <div className="h-16 md:h-20 border-b border-white/5 flex items-center px-6 justify-between bg-black/20">
          <div className="flex items-center gap-4">
            <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-all">
              <ArrowLeft className="w-6 h-6 text-zinc-400" />
            </button>
            <div className="flex flex-col">
                <h2 className="text-sm font-black uppercase tracking-widest text-zinc-200">{t('settings.cloudSync.privacyPolicy.title')}</h2>
                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-tight">{t('settings.cloudSync.privacyPolicy.desc')}</span>
            </div>
          </div>
          <button onClick={onClose} className="hidden md:block p-2 hover:bg-red-500 hover:text-white transition-all rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 md:p-10 space-y-6">
          {items.map((item, idx) => (
            <div key={idx} className="flex gap-6 p-6 rounded-2xl bg-white/5 border border-white/5 hover:border-white/10 transition-all group">
              <div className={`p-4 rounded-xl ${item.bg} ${item.color} h-fit`}>
                {item.icon}
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-zinc-200">{item.title}</h3>
                <p className="text-sm text-zinc-500 leading-relaxed font-medium">
                  {item.desc}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="p-8 border-t border-white/5 bg-black/20 text-center">
            <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest leading-loose">
                {t('settings.cloudSync.privacyPolicy.footerLine1')} <br/>
                {t('settings.cloudSync.privacyPolicy.footerLine2')}
            </p>
        </div>
      </div>
    </div>
  );
};