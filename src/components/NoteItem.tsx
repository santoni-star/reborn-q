import { useState, useRef, useEffect, memo } from 'react';
import {
  Clock, Bug, Lightbulb, FileCode, CheckSquare, MoreHorizontal,
  Edit, Trash2, Mic, Copy, Check, Palette, Maximize2, X,
  Cloud, CloudOff, AlertCircle, Loader2, Sparkles, FileText
} from 'lucide-react';
import { clsx } from 'clsx';
import type { Note } from '../types/entities';
import { useStore } from '../store';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { unifiedSyncService } from '../services/unifiedSyncService';
import { aiService } from '../services/aiService';
import { useTranslation } from 'react-i18next';
import { toast } from '../utils/toast';
import { LazyMarkdownRenderer } from './LazyMarkdownRenderer';
import { findRelatedNotesSync } from '../utils/relatedNotes';

const TypeIcon = ({ type, className }: { type: string; className?: string }) => {
  const iconClass = className || "w-4 h-4";
  switch (type) {
    case 'bug': return <Bug className={iconClass} />;
    case 'idea': return <Lightbulb className={iconClass} />;
    case 'architecture': return <FileCode className={iconClass} />;
    case 'todo': return <CheckSquare className={iconClass} />;
    default: return <MoreHorizontal className={iconClass} />;
  }
};

const COLOR_PRESETS = [
    { name: 'Zinc', value: 'bg-zinc-900/40 border-white/5 text-zinc-100' },
    { name: 'Zinc Dark', value: 'bg-zinc-950/60 border-white/5 text-zinc-100' },
    { name: 'Zinc Light', value: 'bg-zinc-800/40 border-white/5 text-zinc-100' },
    { name: 'Slate', value: 'bg-slate-900/40 border-white/5 text-slate-100' },
    { name: 'Gray', value: 'bg-gray-900/40 border-white/5 text-gray-100' },
    { name: 'Neutral', value: 'bg-neutral-900/40 border-white/5 text-neutral-100' },
    { name: 'Stone', value: 'bg-stone-900/40 border-white/5 text-stone-100' },
    { name: 'Emerald', value: 'bg-emerald-900/30 border-white/5 text-emerald-100' },
    { name: 'Teal', value: 'bg-teal-900/30 border-white/5 text-teal-100' },
    { name: 'Cyan', value: 'bg-cyan-900/30 border-white/5 text-cyan-100' },
    { name: 'Sky', value: 'bg-sky-900/30 border-white/5 text-sky-100' },
    { name: 'Blue', value: 'bg-blue-900/30 border-white/5 text-blue-100' },
    { name: 'Indigo', value: 'bg-indigo-900/30 border-white/5 text-indigo-100' },
    { name: 'Violet', value: 'bg-violet-900/30 border-white/5 text-violet-100' },
    { name: 'Purple', value: 'bg-purple-900/30 border-white/5 text-purple-100' },
    { name: 'Fuchsia', value: 'bg-fuchsia-900/30 border-white/5 text-fuchsia-100' },
    { name: 'Pink', value: 'bg-pink-900/30 border-white/5 text-pink-100' },
    { name: 'Rose', value: 'bg-rose-900/30 border-white/5 text-rose-100' },
];

interface NoteItemProps {
  note: Note;
  projectName: string;
}

export const NoteItem = memo(({ note, projectName }: NoteItemProps) => {
  const { settings, setDeletingNote, updateNote, toggleNoteCompleted } = useStore();
  const [isEditing, setIsEditing] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [editedContent, setEditedContent] = useState(note.content);
  const [editedTitle, setEditedTitle] = useState(note.title);
  const [editedColor, setEditedColor] = useState(note.color);
  const [isCopied, setIsCopied] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [localCompleted, setLocalCompleted] = useState(note.completed);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    setLocalCompleted(note.completed);
  }, [note.completed]);

  const handleToggleCompleted = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log("[NoteItem] Toggling completion for:", note.id);

    // Optimistic UI update
    const newStatus = !localCompleted;
    setLocalCompleted(newStatus);

    try {
        // Оновлюємо лише в Store, він сам запустить синхронізацію
        await toggleNoteCompleted(note.id);
    } catch (error) {
        console.error("Failed to toggle completion:", error);
        setLocalCompleted(!newStatus);
    }
  };

  const handleAiProcess = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (isProcessing) return;

    setIsProcessing(true);
    toast.info(`${t('voice.processing')}...`);

    try {
      const { notes, projects } = useStore.getState();
      const project = projects.find(p => p.id === note.projectId);
      
      const projectNotesContext = notes
        .filter(n => n.projectId === note.projectId && n.id !== note.id && !n.id.startsWith('digest-'))
        .slice(0, 5)
        .map(n => `[${n.type}] ${n.title}: ${n.content.substring(0, 200)}`)
        .join('\n---\n');

      const result = await aiService.processNote({
        content: note.content,
        provider: settings.aiProvider,
        language: settings.language,
        masterContext: project?.knowledge,
        context: projectNotesContext,
        keys: {
            openai: settings.openaiKey,
            gemini: settings.geminiKey,
            groq: settings.groqKey,
            googleAccessToken: settings.googleAccessToken
        }
      });

      if (result.formattedContent.includes("AI Error")) {
          throw new Error(result.formattedContent);
      }

      if (result.formattedContent.trim() === note.content.trim() && result.title === note.title) {
          toast.info(t('common.ai.noChanges') || 'AI made no changes to the note');
          return;
      }

      const updates = {
          title: result.title,
          content: result.formattedContent,
          type: result.type as any,
          tags: result.tags,
          color: result.color,
          createdAt: Date.now()
      };

      // Лише один виклик updateNote - він зробить все інше
      await updateNote(note.id, updates);
      toast.success(t('common.saveSuccess'));
    } catch (error: any) {
      console.error("AI Processing failed:", error);
      const fullMessage = error.message || "AI Processing failed";
      const errorPart = fullMessage.split('\n\n')[0].replace('AI Error: ', '');
      toast.error(errorPart);
    } finally {
      setIsProcessing(false);
    }
  };


  const handleSave = async () => {
    try {
        const updates = {
            content: editedContent,
            title: editedTitle,
            color: editedColor
        };
        await updateNote(note.id, updates);
        toast.success(t('common.saveSuccess') || 'Note saved successfully');
    } catch (error) {
        console.error('Error saving note:', error);
        toast.error(t('common.syncStatus.error') || 'Failed to save note.');
    } finally {
        setIsEditing(false);
        setShowColorPicker(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setShowColorPicker(false);
  };

  useKeyboardShortcuts({
    onClose: handleCancel,
    onSave: handleSave,
    enabled: isEditing
  });

  const isDigest = note.id.startsWith('digest-');
  const canExpand = !settings.disableExpansion || isDigest;
  
  const baseContentRef = useRef(note.content);
  const frozenCursorRef = useRef<number | null>(null);
  const lastCursorPosRef = useRef<number | null>(null);

  const { isRecording, toggleRecording } = useSpeechRecognition({
    onResult: (text) => {
        const base = baseContentRef.current;
        const pos = frozenCursorRef.current ?? base.length;
        const prefix = base.slice(0, pos);
        const suffix = base.slice(pos);
        const spacing = (prefix.length > 0 && !prefix.endsWith(' ') && !text.startsWith(' ')) ? ' ' : '';
        setEditedContent(`${prefix}${spacing}${text}${suffix}`);
    },
    onEnd: () => {
        baseContentRef.current = editedContent;
        frozenCursorRef.current = null;
    }
  });

  const handleTextareaInteract = (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
    lastCursorPosRef.current = e.currentTarget.selectionStart;
  };

  const handleToggleRecording = () => {
    if (!isRecording) {
      frozenCursorRef.current = lastCursorPosRef.current ?? baseContentRef.current.length;
      baseContentRef.current = editedContent;
    }
    toggleRecording();
  };

  useEffect(() => {
    if (isEditing) {
        setEditedContent(note.content);
        setEditedTitle(note.title);
        setEditedColor(note.color);
        baseContentRef.current = note.content;
        lastCursorPosRef.current = note.content.length;
    }
  }, [isEditing, note.content, note.title, note.color]);

  const handleDelete = () => {
    setDeletingNote(note);
  };

  const handleCopy = (e?: React.MouseEvent) => {
    if (e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    if (!note.content) return;

    navigator.clipboard.writeText(note.content).then(() => {
      setIsCopied(true);
      toast.success(t('common.copied') || 'Copied to clipboard');
      setTimeout(() => setIsCopied(false), 2000);
    }).catch(err => {
      console.error("Failed to copy:", err);
      toast.error(t('common.error') || 'Failed to copy to clipboard');
    });
  };

  const getCardClasses = () => {
    const isOldColor = note.color?.includes('/10') || note.color?.includes('/20') || note.color?.includes('/40');
    if (note.color && !isEditing && !isOldColor) return note.color;
    if (isEditing && editedColor) return editedColor;

    // Define sophisticated, semi-transparent color themes for each note type
    const typeColors: Record<string, string> = {
      bug: "bg-red-900/20 border-red-500/10 text-red-100",
      idea: "bg-blue-900/20 border-blue-500/10 text-blue-100",
      architecture: "bg-purple-900/20 border-purple-500/10 text-purple-100",
      todo: "bg-emerald-900/20 border-emerald-500/10 text-emerald-100",
      generic: "bg-zinc-900/20 border-zinc-500/10 text-zinc-100"
    };

    return typeColors[note.type] || typeColors.generic;
  };

  const colors = getCardClasses();

  return (
    <>
      <div className={clsx(
        "h-[160px] note-card-wrapper relative transition-all",
        !isEditing && "md:hover:z-[40]"
      )}>
        <div
            onClick={handleCopy}
            onContextMenu={(e) => {
                e.preventDefault();
                if (!isEditing) setIsEditing(true);
            }}
            className={clsx(
                "rounded-2xl border backdrop-blur-sm transition-all duration-500 flex flex-col w-full overflow-hidden group/card note-card-content p-3 relative",
                !isEditing
                    ? clsx(
                        "h-[160px] cursor-pointer active:scale-[0.98]",
                        isDigest ? "z-[20] hover:z-[30]" : "z-[10] hover:z-[25]",
                        canExpand ? "md:hover:w-[200%] w-full" : "w-full"
                      )
                    : "invisible",
                colors,
                // Add permanent subtle glow matching the note's color
                note.type === 'bug' && "shadow-[0_0_15px_-5px_rgba(239,68,68,0.3)] hover:shadow-[0_0_20px_-3px_rgba(239,68,68,0.5)]",
                note.type === 'idea' && "shadow-[0_0_15px_-5px_rgba(59,130,246,0.3)] hover:shadow-[0_0_20px_-3px_rgba(59,130,246,0.5)]",
                note.type === 'architecture' && "shadow-[0_0_15px_-5px_rgba(139,92,246,0.3)] hover:shadow-[0_0_20px_-3px_rgba(139,92,246,0.5)]",
                note.type === 'todo' && "shadow-[0_0_15px_-5px_rgba(16,185,129,0.3)] hover:shadow-[0_0_20px_-3px_rgba(16,185,129,0.5)]",
                note.type === 'generic' && "shadow-[0_0_15px_-5px_rgba(113,113,122,0.3)] hover:shadow-[0_0_20px_-3px_rgba(113,113,122,0.5)]",
                // Use border-l-4 with saturated version of the type color for strong visual accent
                note.type === 'bug' && "border-l-[4px] border-l-red-500 hover:border-l-red-400",
                note.type === 'idea' && "border-l-[4px] border-l-blue-500 hover:border-l-blue-400",
                note.type === 'architecture' && "border-l-[4px] border-l-purple-500 hover:border-l-purple-400",
                note.type === 'todo' && "border-l-[4px] border-l-emerald-500 hover:border-l-emerald-400",
                note.type === 'generic' && "border-l-[4px] border-l-zinc-500 hover:border-l-zinc-400",
                localCompleted && "border-l-2 border-l-green-500/50", // Subtle side accent for completed notes
                isCopied && "ring-2 ring-green-500/50"
            )}
        >
          <div className="flex items-start justify-between relative">
            <div className="flex items-center gap-2 flex-1 min-w-0">
                <div className="flex items-center gap-1 shrink-0 relative">
                  <button
                    onClick={handleToggleCompleted}
                    title={localCompleted ? t('common.tooltips.markActive') : t('common.tooltips.markCompleted')}
                    className={clsx(
                      "p-2 rounded-lg transition-all min-h-[44px] min-w-[44px] flex items-center justify-center relative",
                      localCompleted ? "bg-emerald-500/10 text-emerald-400" : "bg-white/5 text-zinc-400 hover:bg-white/10"
                    )}
                  >
                    {localCompleted && (
                      <div className="absolute top-1 left-1 w-2 h-2 bg-emerald-500 rounded-full shadow-[0_0_6px_2px_rgba(16,185,129,0.5)]"></div>
                    )}
                    <TypeIcon
                      type={note.type}
                      className={localCompleted ? "text-emerald-500/60" : "text-zinc-400"}
                    />
                  </button>
                </div>
                <div className="flex flex-col min-w-0 flex-1">
                  <div className="marquee-container">
                    <h3 className={clsx(
                      "font-semibold text-sm leading-tight tracking-tight whitespace-nowrap overflow-hidden marquee-text transition-colors",
                      localCompleted ? "text-zinc-400/60 group-hover/card:text-zinc-200" : "text-zinc-200"
                    )}>
                        {note.title || (note.content || '').split(' ').slice(0, 10).join(' ')}
                    </h3>
                  </div>
                  <div className="flex items-center gap-1 mt-1">
                    <span className="text-xs opacity-70" title={t('common.tooltips.createdOn', { date: new Date(note.createdAt).toLocaleString() })}>
                        {new Date(note.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })} {new Date(note.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <div className="w-px h-3 bg-white/10 mx-1" />
                    <div className="flex items-center gap-1">
                      {note.syncStatus === 'pending' && <span title={t('common.syncStatus.pending')}><Loader2 className="w-2.5 h-2.5 text-indigo-400 animate-spin" /></span>}
                      {note.syncStatus === 'error' && <span title={t('common.syncStatus.error')}><AlertCircle className="w-2.5 h-2.5 text-red-400" /></span>}
                      {note.syncStatus === 'synced' && <span title={t('common.syncStatus.synced')}><Cloud className="w-2.5 h-2.5 text-emerald-500/70" /></span>}
                      {!note.syncStatus && <span title={t('common.syncStatus.offline')}><CloudOff className="w-2.5 h-2.5 opacity-30" /></span>}
                    </div>

                  </div>
                </div>
            </div>

            <div className="flex items-center gap-1 md:opacity-0 md:group-hover/card:opacity-100 transition-all ml-auto md:absolute md:top-0 md:right-0 md:z-20">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsPreviewOpen(true);
                }}
                className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-zinc-400 hover:text-white min-h-[44px] min-w-[44px] flex items-center justify-center"
                title="Preview as Markdown"
              >
                <FileText className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleAiProcess}
                disabled={isProcessing}
                className={clsx(
                    "p-1.5 hover:bg-white/10 rounded-lg transition-colors text-indigo-400 min-h-[44px] min-w-[44px] flex items-center justify-center",
                    isProcessing && "animate-pulse"
                )}
                title={t('common.tooltips.processAi')}
              >
                {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
                className="p-1.5 hover:bg-white/10 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                title={t('common.edit')}
              >
                <Edit className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); handleDelete(); }}
                className="p-1.5 hover:bg-red-500/10 rounded-lg transition-colors text-red-400 min-h-[44px] min-w-[44px] flex items-center justify-center"
                title={t('common.delete')}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-hidden mt-3 transition-opacity">
            <LazyMarkdownRenderer
              markdownText={note.content}
              className={clsx(
                'text-sm',
                localCompleted ? "opacity-70 text-zinc-400/50 group-hover/card:opacity-100 group-hover/card:text-zinc-300" : "text-zinc-300"
              )}
            />
          </div>
        </div>
      </div>

      {isEditing && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-2 bg-zinc-950/70 backdrop-blur-xl animate-in fade-in duration-300">
            <div className={clsx("ui-window w-full h-full max-w-full max-h-full rounded-2xl border border-white/10", isMaximized ? "w-[100vw] h-[100vh]" : "w-[95%] max-w-5xl h-[90vh] max-h-[95vh]", "bg-zinc-900/80")}>
                <div className="ui-window-header border-b border-white/5 bg-zinc-800/30">
                    <div className="flex items-center gap-2 flex-1 px-3">
                        <div className="p-2 rounded-lg bg-white/5 shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center"><TypeIcon type={note.type} className="w-4 h-4 text-zinc-400" /></div>
                        <input
                          value={editedTitle}
                          onChange={(e) => setEditedTitle(e.target.value)}
                          placeholder={t('common.untitled')}
                          className="bg-transparent border-none focus:outline-none font-semibold text-zinc-200 w-full placeholder:text-zinc-500/50 text-lg"
                        />
                    </div>
                    <div className="flex items-center">
                        <button
                          onClick={() => setIsMaximized(!isMaximized)}
                          className={clsx("p-2.5 hover:bg-white/10 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center", isMaximized ? "text-emerald-400" : "text-zinc-400")}
                          title={isMaximized ? t('common.tooltips.zenModeExit') : t('common.tooltips.zenModeEnter')}
                        >
                          <Maximize2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={handleCancel}
                          className="p-2.5 hover:bg-red-500/20 hover:text-white transition-colors text-zinc-400 min-h-[44px] min-w-[44px] flex items-center justify-center"
                          title={t('common.close')}
                        >
                          <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>
                <div className="ui-window-content p-3">
                    <textarea
                      className="w-full h-[calc(100%-40px)] min-h-[200px] bg-zinc-800/30 border border-white/5 rounded-xl p-3 leading-relaxed focus:outline-none focus:ring-2 focus:ring-emerald-500/30 resize-none text-zinc-200 placeholder-zinc-500/40 text-base font-sans"
                      value={editedContent}
                      onChange={(e) => setEditedContent(e.target.value)}
                      onSelect={handleTextareaInteract}
                      onClick={handleTextareaInteract}
                      onKeyUp={handleTextareaInteract}
                      autoFocus
                    />
                    {showColorPicker && (
                        <div className="absolute bottom-4 left-4 p-3 bg-zinc-800/80 border border-white/10 rounded-xl shadow-2xl grid grid-cols-6 gap-2 w-64 z-[110] animate-in slide-in-from-bottom-4 duration-200 backdrop-blur-sm">
                            {COLOR_PRESETS.map((preset) => (
                                <button
                                  key={preset.name}
                                  onClick={() => setEditedColor(preset.value)}
                                  className={clsx(
                                    "w-8 h-8 rounded-full border border-white/10 hover:scale-110 transition-transform",
                                    (preset.value || '').split(' ')[0],
                                    editedColor === preset.value && "ring-2 ring-emerald-500 ring-offset-4 ring-offset-zinc-900"
                                  )}
                                  title={preset.name}
                                />
                            ))}
                        </div>
                    )}
                </div>
                <div className="ui-window-footer px-3 sm:px-4 py-3">
                    <div className="flex items-center gap-1">
                        <button
                          onClick={() => setShowColorPicker(!showColorPicker)}
                          className={clsx("p-2 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center", showColorPicker ? "bg-emerald-500/20 text-emerald-400" : "hover:bg-white/10 text-zinc-400")}
                          title={t('settings.uiBehavior')}
                        >
                          <Palette className="w-5 h-5" />
                        </button>
                        <button
                          onClick={handleDelete}
                          className="p-2 hover:bg-red-500/20 rounded-lg transition-colors text-red-400 min-h-[44px] min-w-[44px] flex items-center justify-center"
                          title={t('common.delete')}
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                        <div className="w-px h-6 bg-white/10 mx-1" />
                        <div className="flex flex-col">
                          <span className="text-xs font-medium uppercase tracking-wide opacity-40 leading-none">{t('common.tooltips.createdOn', { date: '' }).split(' ')[0]}</span>
                          <span className="text-xs font-medium opacity-50 mt-0.5">{new Date(note.createdAt).toLocaleString()}</span>
                        </div>
                    </div>
                    <div className="flex justify-center">
                        <button
                          onClick={handleToggleRecording}
                          className={clsx("w-[60px] h-[60px] sm:w-[74px] sm:h-[74px] rounded-full border-2 transition-all duration-500 flex items-center justify-center backdrop-blur-sm hover:scale-110", isRecording ? "bg-red-500/20 border-red-500 text-white animate-pulse" : "bg-zinc-800/50 border-white/10 text-emerald-500 hover:border-emerald-400")}
                          title={isRecording ? t('common.tooltips.stopRecording') : t('common.tooltips.startVoiceSearch')}
                        >
                          <Mic className={clsx("w-6 h-6 sm:w-9 sm:h-9", isRecording && "fill-current")} />
                        </button>
                    </div>
                    <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={handleCancel}
                          className="px-3 py-2 sm:px-3 sm:py-2 rounded-lg hover:bg-zinc-700/50 text-sm font-medium transition-colors text-zinc-400 min-h-[44px] min-w-[80px] flex items-center justify-center"
                        >
                          {t('common.cancel')}
                        </button>
                        <button
                          onClick={handleSave}
                          className="px-3 py-2 sm:px-4 sm:py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-sm font-medium transition-all text-white active:scale-95 min-h-[44px] min-w-[80px] flex items-center justify-center"
                        >
                          {t('common.save')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* Markdown Preview Modal */}
      {isPreviewOpen && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="ui-window w-full max-w-4xl h-[85vh] flex flex-col">
            <div className="ui-window-header border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-indigo-400" />
                <h3 className="text-sm font-bold text-white">{note.title}</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const blob = new Blob([`---\ntitle: ${note.title}\ntype: ${note.type}\ntags: ${note.tags.join(', ')}\ncreated: ${new Date(note.createdAt).toISOString()}\n---\n\n${note.content}`], { type: 'text/markdown' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `${note.title.replace(/[^a-z0-9]/gi, '_')}.md`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                    toast.success('Downloaded as .md');
                  }}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors text-zinc-400 hover:text-white"
                  title="Download as .md"
                >
                  <Cloud className="w-5 h-5" />
                </button>
                <button
                  onClick={() => {
                    const printWindow = window.open('', '_blank');
                    if (printWindow) {
                      printWindow.document.write(`
                        <!DOCTYPE html>
                        <html>
                        <head>
                          <title>${note.title}</title>
                          <style>
                            body { font-family: system-ui, -apple-system, sans-serif; padding: 40px; background: #fff; color: #1a1a1a; }
                            h1 { color: #6366f1; border-bottom: 2px solid #6366f1; padding-bottom: 10px; }
                            pre { background: #f5f5f5; padding: 15px; border-radius: 8px; overflow-x: auto; }
                            code { background: #f5f5f5; padding: 2px 6px; border-radius: 4px; }
                            blockquote { border-left: 4px solid #6366f1; padding-left: 15px; color: #666; }
                            @media print { body { padding: 20px; } }
                          </style>
                        </head>
                        <body>
                          <h1>${note.title}</h1>
                          <p><strong>Type:</strong> ${note.type} | <strong>Created:</strong> ${new Date(note.createdAt).toLocaleString()}</p>
                          <p><strong>Tags:</strong> ${note.tags.join(', ')}</p>
                          <hr/>
                          ${note.content.replace(/\n/g, '<br/>')}
                        </body>
                        </html>
                      `);
                      printWindow.document.close();
                      printWindow.print();
                    }
                  }}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors text-zinc-400 hover:text-white"
                  title="Print"
                >
                  <FileCode className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setIsPreviewOpen(false)}
                  className="p-2 hover:bg-red-500 hover:text-white transition-colors text-zinc-400 rounded-lg"
                  title="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
              <div className="prose prose-invert max-w-none prose-headings:text-white prose-headings:font-bold prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg prose-p:text-zinc-300 prose-p:leading-relaxed prose-a:text-indigo-400 prose-strong:text-white prose-code:bg-zinc-800/50 prose-code:px-2 prose-code:py-1 prose-code:rounded prose-pre:bg-zinc-800/50 prose-pre:border prose-pre:border-white/10">
                <LazyMarkdownRenderer markdownText={note.content} fullContent />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
});
