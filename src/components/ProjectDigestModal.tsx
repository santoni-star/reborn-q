import React, { useState, useEffect } from 'react';
import { X, Brain, Activity, Zap, ChevronRight, Share2, Download, RefreshCw } from 'lucide-react';
import { useStore } from '../store/useStore';
import { digestService } from '../services/digestService';
import { useTranslation } from 'react-i18next';
import { clsx } from 'clsx';
import { toast } from '../utils/toast';
import Mermaid from './Mermaid';

export const ProjectDigestModal = () => {
  const isProjectDigestOpen = useStore(state => state.isProjectDigestOpen);
  const setProjectDigestOpen = useStore(state => state.setProjectDigestOpen);
  const notes = useStore(state => state.notes);
  const projects = useStore(state => state.projects);
  const settings = useStore(state => state.settings);
  const activeProjectId = useStore(state => state.activeProjectId);
  
  interface DigestData {
    summary: string;
    modules: Array<{
      name: string;
      status: string;
      progress: number;
    }>;
    mermaidGraph: string;
    nextSteps: string[];
  }

  const [digest, setDigest] = useState<DigestData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { t } = useTranslation();

  const handleExportJson = () => {
    if (!digest) return;
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(digest, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `project_digest_${activeProjectId}_${new Date().toISOString().slice(0,10)}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
    toast.success("JSON exported successfully");
  };

  const handleShareReport = async () => {
    if (!digest) return;
    const reportText = `
Project Master Digest
Summary: ${digest.summary}

Modules:
${digest.modules.map(m => `- ${m.name}: ${m.status} (${m.progress}%)`).join('\n')}

Next Steps:
${digest.nextSteps.map((s, i) => `${i+1}. ${s}`).join('\n')}
    `.trim();

    try {
      await navigator.clipboard.writeText(reportText);
      toast.success("Report copied to clipboard!");
    } catch {
      toast.error("Failed to copy report");
    }
  };

  const generateDigest = React.useCallback(async () => {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      // Filter notes by active project
      const projectNotes = activeProjectId === '1' 
        ? notes.filter(n => n.projectId === '1')
        : notes.filter(n => n.projectId === activeProjectId);

      const activeProject = projects.find(p => p.id === activeProjectId);

      const data = await digestService.generateMasterDigest(
        projectNotes, 
        activeProject, 
        settings.aiProvider, 
        { 
            openai: settings.openaiKey, 
            gemini: settings.geminiKey, 
            groq: settings.groqKey,
            googleAccessToken: settings.googleAccessToken 
        }
      );
      
      if (typeof data.summary === 'string' && data.summary.startsWith('Error:')) {
        setError(data.summary);
      } else {
        setDigest(data);
      }
    } catch (err: unknown) {
      console.error("Digest generation error:", err);
      const message = err instanceof Error ? err.message : String(err);
      setError(message || "An unexpected error occurred during generation.");
    } finally {
      setLoading(false);
    }
  }, [loading, activeProjectId, notes, projects, settings.aiProvider, settings.openaiKey, settings.geminiKey, settings.googleAccessToken]);

  useEffect(() => {
    if (isProjectDigestOpen && !digest && !loading && !error) {
      generateDigest();
    }
  }, [isProjectDigestOpen, digest, loading, error, generateDigest]);

  if (!isProjectDigestOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-zinc-950/90 border border-white/10 w-full max-w-4xl max-h-[90vh] rounded-3xl overflow-hidden shadow-2xl flex flex-col glass-effect">
        {/* Header */}
        <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-500/20 rounded-2xl flex items-center justify-center border border-indigo-500/30 shadow-lg shadow-indigo-500/10">
              <Brain className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white tracking-tight">{t('sidebar.projectBrain')}</h2>
              <p className="text-xs text-zinc-500 font-medium uppercase tracking-widest">{t('sidebar.masterDigest')}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
                onClick={generateDigest}
                disabled={loading}
                className="p-2 text-zinc-400 hover:text-white hover:bg-white/5 rounded-xl transition-all disabled:opacity-50"
            >
                <RefreshCw className={clsx("w-5 h-5", loading && "animate-spin")} />
            </button>
            <button 
              onClick={() => setProjectDigestOpen(false)}
              className="p-2 text-zinc-500 hover:text-white hover:bg-white/10 rounded-full transition-all"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 custom-scrollbar">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-4">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
                <Brain className="absolute inset-0 m-auto w-6 h-6 text-indigo-400 animate-pulse" />
              </div>
              <p className="text-zinc-400 font-medium animate-pulse">{t('digest.analyzingDna')}</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-20 text-center space-y-6">
                <div className="w-20 h-20 bg-red-500/10 rounded-3xl flex items-center justify-center border border-red-500/20 shadow-lg shadow-red-500/5">
                    <X className="w-10 h-10 text-red-400" />
                </div>
                <div className="space-y-2 max-w-md">
                    <h3 className="text-lg font-bold text-white">{t('digest.generationFailed')}</h3>
                    <p className="text-sm text-zinc-500 leading-relaxed">{error}</p>
                </div>
                <button 
                    onClick={generateDigest} 
                    className="px-8 py-3 bg-white/5 hover:bg-white/10 text-white rounded-2xl text-sm font-bold transition-all border border-white/10 flex items-center gap-2"
                >
                    <RefreshCw className="w-4 h-4" />
                    {t('common.tryAgain')}
                </button>
            </div>
          ) : digest ? (
            <>
              {/* Summary Section */}
              <section className="space-y-4">
                <div className="flex items-center gap-2 text-indigo-400">
                  <Activity className="w-4 h-4" />
                  <h3 className="text-xs font-black uppercase tracking-[0.2em]">{t('digest.summary')}</h3>
                </div>
                <p className="text-zinc-300 leading-relaxed text-lg font-medium">
                  {digest.summary || "No summary available."}
                </p>
              </section>

              {/* Modules Grid */}
              <section className="space-y-4">
                <div className="flex items-center gap-2 text-purple-400">
                  <Zap className="w-4 h-4" />
                  <h3 className="text-xs font-black uppercase tracking-[0.2em]">{t('digest.modules')}</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {digest.modules?.map((module, idx: number) => (
                    <div key={idx} className="p-2 rounded-2xl bg-white/5 border border-white/5 hover:border-white/10 transition-all group">
                      <div className="flex justify-between items-center mb-3">
                        <span className="font-bold text-zinc-200 group-hover:text-white transition-colors">{module.name}</span>
                        <span className={clsx(
                          "text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter",
                          module.status === 'Stable' ? "bg-green-500/20 text-green-400" : 
                          module.status === 'Critical' ? "bg-red-500/20 text-red-400" : "bg-yellow-500/20 text-yellow-400"
                        )}>
                          {module.status}
                        </span>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                          <span>{t('digest.progress')}</span>
                          <span>{module.progress}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-1000" 
                            style={{ width: `${module.progress}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Mermaid Graph */}
              <section className="space-y-4">
                <div className="flex items-center gap-2 text-indigo-400">
                  <Share2 className="w-4 h-4" />
                  <h3 className="text-xs font-black uppercase tracking-[0.2em]">{t('digest.visualMap')}</h3>
                </div>
                {digest.mermaidGraph ? (
                   <Mermaid chart={digest.mermaidGraph} />
                ) : (
                  <div className="p-6 rounded-3xl bg-zinc-900/50 border border-white/5 font-mono text-[10px] text-zinc-400">
                    Graph data unavailable.
                  </div>
                )}
              </section>

              {/* Next Steps */}
              <section className="space-y-4">
                <div className="flex items-center gap-2 text-emerald-400">
                  <ChevronRight className="w-4 h-4" />
                  <h3 className="text-xs font-black uppercase tracking-[0.2em]">{t('digest.nextSteps')}</h3>
                </div>
                <div className="space-y-3">
                  {digest.nextSteps?.map((step: string, idx: number) => (
                    <div key={idx} className="flex items-start gap-2 p-2 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 group">
                      <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0 mt-0.5">
                        <span className="text-[10px] font-black text-emerald-400">{idx + 1}</span>
                      </div>
                      <p className="text-zinc-300 text-sm font-medium group-hover:text-emerald-100 transition-colors">{step}</p>
                    </div>
                  ))}
                </div>
              </section>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
                <Brain className="w-12 h-12 mb-4 opacity-20" />
                <p>{t('common.noDigestData')}</p>
                <button onClick={generateDigest} className="mt-4 px-10 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-indigo-500/20">
                    {t('common.generateNow')}
                </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-white/5 bg-white/5 flex justify-between items-center shrink-0">
            <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest">{t('digest.aiIntelligenceVersion')}</p>
            <div className="flex gap-3">
                <button 
                  onClick={handleExportJson}
                  disabled={!digest}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white/5 text-zinc-300 hover:text-white hover:bg-white/10 text-[10px] font-black uppercase tracking-widest transition-all border border-white/10 disabled:opacity-50"
                >
                    <Download className="w-3.5 h-3.5" />
                    {t('common.exportJson')}
                </button>
                <button 
                  onClick={handleShareReport}
                  disabled={!digest}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-indigo-600 text-white hover:bg-indigo-500 text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50"
                >
                    <Share2 className="w-3.5 h-3.5" />
                    {t('common.copy')}
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};