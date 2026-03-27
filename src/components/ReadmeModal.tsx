import { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { X, FileText, Maximize2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { clsx } from 'clsx';

interface ReadmeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ReadmeModal = ({ isOpen, onClose }: ReadmeModalProps) => {
  const { settings } = useStore();
  const [content, setContent] = useState('');
  const [isMaximized, setIsMaximized] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    if (isOpen) {
      const lang = settings.language || 'en';
      const fileName = lang === 'en' ? 'README.md' : `README.${lang}.md`;
      fetch(`/${fileName}`)
        .then(res => res.text())
        .then(text => setContent(text))
        .catch(err => console.error("Failed to load README:", err));
    }
  }, [isOpen, settings.language]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[10005] flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-md animate-in fade-in duration-500">
      <div className={clsx(
          "ui-window h-full max-h-[90vh]",
          isMaximized ? "w-full" : "w-[95%]"
      )}>
        <div className="ui-window-header">
          <div className="flex items-center gap-4 px-2">
            <FileText className="w-5 h-5 text-indigo-400" />
            <div className="flex flex-col">
                <h2 className="ui-title-main text-xs">{t('settings.documentation')}</h2>
                <span className="text-[10px] text-zinc-500 font-bold uppercase mt-1">Project Guide</span>
            </div>
          </div>
          <div className="flex items-center">
            <button onClick={() => setIsMaximized(!isMaximized)} className={clsx("p-2.5 hover:bg-white/10 transition-colors", isMaximized ? "text-indigo-400" : "text-zinc-400")}><Maximize2 className="w-4 h-4" /></button>
            <button onClick={onClose} className="p-2.5 hover:bg-red-500 hover:text-white transition-colors text-zinc-400"><X className="w-5 h-5" /></button>
          </div>
        </div>

        <div className="ui-window-content">
          <div className="max-w-4xl mx-auto p-4">
            <pre className="whitespace-pre-wrap font-sans text-zinc-300 leading-relaxed text-sm">
                {content}
            </pre>
          </div>
        </div>

        <div className="ui-window-footer">
          <div className="col-start-2 flex justify-center">
            <button onClick={onClose} className="px-12 h-12 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-indigo-500/20 active:scale-95">
                {t('common.save')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
