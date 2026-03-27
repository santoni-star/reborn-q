import React, { useState, useEffect, useRef } from 'react';
import { X, Settings, CheckCircle, FileText, Hash, Mic, Trash2, Palette } from 'lucide-react';
import { useStore } from '../store/useStore';
import { useTranslation } from 'react-i18next';
import { toast } from '../utils/toast';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { clsx } from 'clsx';
import { unifiedSyncService } from '../services/unifiedSyncService';

export const EditProjectModal = () => {
  const { editingProjectId, setEditingProject, projects, updateProject } = useStore();
  const [name, setName] = useState('');
  const [knowledge, setKnowledge] = useState('');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const { t } = useTranslation();

  const project = projects.find(p => p.id === editingProjectId);
  const [color, setColor] = useState(project?.color || '');

  useEffect(() => {
    if (project) {
      setName(project.name);
      setKnowledge(project.knowledge || '');
      baseContentRef.current = project.knowledge || '';
      setColor(project.color || '');
    }
  }, [project]);

  // Voice Recognition for Knowledge
  const baseContentRef = useRef('');
  const { isRecording, toggleRecording } = useSpeechRecognition({
    onResult: (text) => {
        const base = baseContentRef.current;
        const spacing = (base.length > 0 && !base.endsWith(' ') && !text.startsWith(' ')) ? ' ' : '';
        setKnowledge(`${base}${spacing}${text}`);
    },
    onEnd: () => {
        baseContentRef.current = knowledge;
    }
  });

  if (!editingProjectId || !project) return null;

  const handleSave = async () => {
    if (!name.trim()) {
        toast.error("Project name cannot be empty");
        return;
    }

    try {
        const updatedFields = {
            name: name.trim(),
            knowledge: knowledge.trim(),
            color: color || undefined
        };
        await updateProject(project.id, updatedFields);

        // Sync to cloud
        unifiedSyncService.syncProject({ ...project, ...updatedFields }).catch(err => {
            console.error("[EditProject] Cloud sync failed:", err);
        });

        setEditingProject(null);
        toast.success(t('common.saveSuccess'));
    } catch (e) {
        console.error("Failed to update project", e);
        toast.error("Error updating project");
    }
  };

  return (
    <div className="fixed inset-0 z-[10007] flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-md animate-in fade-in duration-300">
      <div className="ui-window w-full max-w-3xl shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        <div className="ui-window-header border-b border-white/5">
          <div className="flex items-center gap-3 px-2">
            <Settings className="w-5 h-5 text-indigo-400" />
            <h2 className="ui-title-main text-xs">{t('sidebar.renameProject')}</h2>
          </div>
          <button
            onClick={() => setEditingProject(null)}
            className="p-2 hover:bg-red-500 hover:text-white transition-all rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 md:p-8 space-y-6 overflow-y-auto custom-scrollbar">
            <div className="space-y-2">
                <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">
                    <Hash className="w-3 h-3" />
                    {t('sidebar.renameProject')}
                </label>
                <input
                    autoFocus
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Project Name..."
                    className="w-full bg-white/5 border border-white/5 rounded-xl h-14 px-6 text-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all"
                />
            </div>

            <div className="space-y-2 relative">
                <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">
                    <FileText className="w-3 h-3" />
                    {t('knowledge.title')}
                </label>
                <textarea
                    value={knowledge}
                    onChange={(e) => {
                        setKnowledge(e.target.value);
                        baseContentRef.current = e.target.value;
                    }}
                    placeholder={t('knowledge.placeholder')}
                    className="w-full bg-white/5 border border-white/5 rounded-2xl p-6 min-h-[350px] text-zinc-200 leading-relaxed focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all custom-scrollbar resize-none font-sans"
                />
                
                {/* Floating Mic Button for Knowledge Editor */}
                <button
                    onClick={toggleRecording}
                    className={clsx(
                        "absolute bottom-6 right-6 w-12 h-12 rounded-full flex items-center justify-center transition-all shadow-xl z-10",
                        isRecording ? "bg-red-500 text-white animate-pulse" : "bg-indigo-600 text-white hover:bg-indigo-500"
                    )}
                >
                    <Mic className={clsx("w-5 h-5", isRecording && "fill-current")} />
                </button>
            </div>
        </div>

        <div className="p-6 border-t border-white/5 bg-white/5 flex justify-between items-center">
            <div className="flex items-center gap-2">
                <button
                    onClick={() => setShowColorPicker(!showColorPicker)}
                    className="p-3 text-zinc-500 hover:text-indigo-400 transition-colors relative"
                    title="Choose Color"
                >
                    <Palette className="w-5 h-5" />
                    {color && (
                        <div
                            className="absolute bottom-1 right-1 w-3 h-3 rounded-full border border-white/20"
                            style={{ backgroundColor: color }}
                        />
                    )}
                </button>
                <button
                    onClick={() => {
                        if (window.confirm("Clear project knowledge?")) {
                            setKnowledge('');
                            baseContentRef.current = '';
                        }
                    }}
                    className="p-3 text-zinc-500 hover:text-red-400 transition-colors"
                    title="Clear Info"
                >
                    <Trash2 className="w-5 h-5" />
                </button>
            </div>

            {/* Color Picker Popup */}
            {showColorPicker && (
                <div className="absolute bottom-20 left-6 p-4 bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl z-50">
                    <div className="grid grid-cols-6 gap-2">
                        {[
                            'bg-zinc-900/40 border-white/5 text-zinc-100',
                            'bg-slate-900/40 border-white/5 text-slate-100',
                            'bg-gray-900/40 border-white/5 text-gray-100',
                            'bg-neutral-900/40 border-white/5 text-neutral-100',
                            'bg-stone-900/40 border-white/5 text-stone-100',
                            'bg-emerald-900/30 border-white/5 text-emerald-100',
                            'bg-teal-900/30 border-white/5 text-teal-100',
                            'bg-cyan-900/30 border-white/5 text-cyan-100',
                            'bg-sky-900/30 border-white/5 text-sky-100',
                            'bg-blue-900/30 border-white/5 text-blue-100',
                            'bg-indigo-900/30 border-white/5 text-indigo-100',
                            'bg-violet-900/30 border-white/5 text-violet-100',
                            'bg-purple-900/30 border-white/5 text-purple-100',
                            'bg-fuchsia-900/30 border-white/5 text-fuchsia-100',
                            'bg-pink-900/30 border-white/5 text-pink-100',
                            'bg-rose-900/30 border-white/5 text-rose-100',
                        ].map((colorClass) => (
                            <button
                                key={colorClass}
                                onClick={() => {
                                    setColor(colorClass);
                                    setShowColorPicker(false);
                                }}
                                className={clsx(
                                    "w-8 h-8 rounded-lg border transition-all hover:scale-110",
                                    colorClass,
                                    color === colorClass && "ring-2 ring-white"
                                )}
                            />
                        ))}
                    </div>
                    <button
                        onClick={() => {
                            setColor('');
                            setShowColorPicker(false);
                        }}
                        className="mt-2 w-full text-[10px] text-zinc-500 hover:text-white uppercase tracking-widest font-bold"
                    >
                        Reset
                    </button>
                </div>
            )}

            <button
                onClick={handleSave}
                className="px-10 h-14 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-black uppercase text-xs tracking-widest shadow-lg shadow-indigo-500/20 transition-all active:scale-95 flex items-center justify-center gap-2"
            >
                <CheckCircle className="w-5 h-5" />
                {t('common.save')}
            </button>
        </div>
      </div>
    </div>
  );
};
