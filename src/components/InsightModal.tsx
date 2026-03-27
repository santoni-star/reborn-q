import React, { useState, useEffect } from 'react';
import { X, Sparkles, Activity, Share2, RefreshCw, MessageSquare, Lightbulb, Zap } from 'lucide-react';
import { useStore } from '../store/useStore';
import { aiService } from '../services/aiService';
import { useTranslation } from 'react-i18next';
import { clsx } from 'clsx';
import { toast } from '../utils/toast';

export const InsightModal = () => {
  const { isInsightModalOpen, setInsightModalOpen, notes, settings } = useStore();
  const [insight, setInsight] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { t } = useTranslation();

  const generateInsight = async () => {
    if (loading || notes.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      const text = await aiService.generateInsight(notes, settings.aiProvider, {
        openai: settings.openaiKey,
        gemini: settings.geminiKey,
        groq: settings.groqKey,
        googleAccessToken: settings.googleAccessToken
      });
      if (text.includes('AI Error')) {
        setError(text);
      } else {
        setInsight(text);
      }
    } catch (err: any) {
      setError(err.message || "Failed to generate insight");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isInsightModalOpen && !insight && !loading) {
      generateInsight();
    }
  }, [isInsightModalOpen]);

  if (!isInsightModalOpen) return null;

  const handleShare = async () => {
    try {
        await navigator.clipboard.writeText(insight);
        toast.success("Insight copied to clipboard!");
    } catch {
        toast.error("Failed to copy");
    }
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 md:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-zinc-950/90 border border-indigo-500/20 w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl flex flex-col glass-effect">
        {/* Header */}
        <div className="p-6 border-b border-white/5 flex items-center justify-between bg-indigo-500/5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-500/20 rounded-2xl flex items-center justify-center border border-indigo-500/30 shadow-lg shadow-indigo-500/10">
              <Sparkles className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white tracking-tight">{t('rightPanel.devInsight')}</h2>
              <p className="text-xs text-indigo-400/60 font-medium uppercase tracking-widest">Technical AI Analysis</p>
            </div>
          </div>
          <button 
            onClick={() => setInsightModalOpen(false)}
            className="p-2 text-zinc-500 hover:text-white hover:bg-white/10 rounded-full transition-all"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-8 md:p-12 overflow-y-auto max-h-[60vh] custom-scrollbar">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
                <Zap className="absolute inset-0 m-auto w-6 h-6 text-indigo-400 animate-pulse" />
              </div>
              <p className="text-indigo-300/60 font-medium animate-pulse uppercase tracking-widest text-[10px]">{t('voice.processing')}...</p>
            </div>
          ) : error ? (
            <div className="text-center space-y-4">
                <p className="text-red-400 text-sm">{error}</p>
                <button onClick={generateInsight} className="px-6 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-bold transition-all border border-white/10 flex items-center gap-2 mx-auto">
                    <RefreshCw className="w-3.5 h-3.5" />
                    {t('common.tryAgain')}
                </button>
            </div>
          ) : (
            <div className="space-y-8 animate-in zoom-in-95 duration-500">
                <div className="relative p-6 rounded-3xl bg-indigo-500/5 border border-indigo-500/10 group">
                    <MessageSquare className="absolute -top-3 -left-3 w-8 h-8 text-indigo-500/20" />
                    <p className="text-lg md:text-xl text-indigo-100 font-medium leading-relaxed italic text-center">
                        "{insight}"
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <div className="p-2 rounded-2xl bg-white/5 border border-white/5 flex items-start gap-2">
                        <div className="p-2 bg-amber-500/10 rounded-lg"><Lightbulb className="w-4 h-4 text-amber-400" /></div>
                        <div>
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1">Observation</h4>
                            <p className="text-xs text-zinc-500 leading-relaxed">This insight is based on your 10 most recent technical notes and activity patterns.</p>
                        </div>
                    </div>
                    <div className="p-2 rounded-2xl bg-white/5 border border-white/5 flex items-start gap-2">
                        <div className="p-2 bg-indigo-500/10 rounded-lg"><Activity className="w-4 h-4 text-indigo-400" /></div>
                        <div>
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1">Focus Tip</h4>
                            <p className="text-xs text-zinc-500 leading-relaxed">Consider organizing your thoughts into a Project Digest for deeper architectural clarity.</p>
                        </div>
                    </div>
                </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-white/5 bg-black/20 flex justify-between items-center">
            <button 
                onClick={generateInsight}
                disabled={loading}
                className="flex items-center gap-2 text-xs font-bold text-zinc-500 hover:text-indigo-400 transition-colors disabled:opacity-30"
            >
                <RefreshCw className={clsx("w-4 h-4", loading && "animate-spin")} />
                Regenerate
            </button>
            <div className="flex gap-3">
                <button 
                    onClick={() => setInsightModalOpen(false)}
                    className="px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest text-zinc-500 hover:text-zinc-300 transition-all"
                >
                    {t('common.close')}
                </button>
                <button 
                    onClick={handleShare}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 text-white hover:bg-indigo-500 text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-indigo-500/20"
                >
                    <Share2 className="w-3.5 h-3.5" />
                    Share Insight
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};
