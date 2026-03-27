import { useStore } from '../store';
import { Hash, Brain, Edit2, Trash2, Plus, ArrowRight, Cloud, CloudOff, Loader2, AlertCircle } from 'lucide-react';
import { clsx } from 'clsx';
import { useTranslation } from 'react-i18next';

export const ProjectList = () => {
  const { 
    projects, 
    notes, 
    setActiveProject, 
    setCreatingProject, 
    setRenamingProject, 
    setDeletingProject, deleteProject,
    setEditingProject
  } = useStore();
  const { t } = useTranslation();

      const displayProjects = projects.filter(p =>
        p.id !== '1' &&
        p.id !== 'global-digest' &&
        !(p.id || '').includes('digest') &&
        !(p.id || '').startsWith('view-') &&
        !(p.name || '').startsWith('.')
      );
  return (
    <div className="flex-1 overflow-y-auto p-3 md:p-12 scrollbar-hide">
      <div className="max-w-6xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-white/5 pb-8">
        <div className="space-y-1">
            <h1 className="text-4xl font-black text-white tracking-tighter uppercase">{t('sidebar.projects')}</h1>
            <p className="text-xs text-zinc-500 font-bold uppercase tracking-[0.2em]">{t('projects.gridDesc')}</p>
        </div>
        <button
            onClick={() => setCreatingProject(true)}
            title={t('sidebar.newProject')}
            className="flex items-center gap-2 px-8 h-12 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-black uppercase text-xs tracking-widest transition-all shadow-lg shadow-indigo-500/20 active:scale-95 w-fit"
        >
            <Plus className="w-5 h-5" />
            {t('sidebar.newProject')}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {displayProjects.map((project) => {
          const projectNotes = notes.filter(n => n.projectId === project.id);
          const projectColor = project.color || 'bg-zinc-900/40 border-white/5 text-zinc-100';

          return (
            <div
                key={project.id}
                onClick={() => setActiveProject(project.id)}
                title={t('common.tooltips.viewAll', { type: project.name })}
                className={clsx(
                    "group relative border rounded-2xl p-3 transition-all cursor-pointer overflow-hidden h-[70px] md:h-[120px] flex flex-col justify-between",
                    projectColor,
                    "hover:shadow-xl hover:shadow-indigo-500/10 hover:border-white/20 active:scale-[0.98]"
                )}
            >
                {/* Background Glow */}
                <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/5 rounded-full blur-3xl group-hover:bg-white/10 transition-colors" />

                <div className="relative flex flex-col h-full">
                  {/* Unified layout: Icon + Title on top */}
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <div className="p-1 bg-white/10 rounded border border-white/10 group-hover:scale-110 transition-transform duration-500">
                        <Hash className="w-3 h-3 opacity-80" />
                      </div>
                      <h3 className="font-black uppercase tracking-wide group-hover:text-white transition-colors truncate text-xs md:text-sm flex-1">
                        {project.name}
                      </h3>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all ml-1">
                      <button
                        onClick={(e) => { e.stopPropagation(); setEditingProject(project.id); }}
                        className="p-1 hover:bg-white/10 rounded transition-colors text-indigo-400"
                        title={t('sidebar.editKnowledge')}
                      >
                        <Brain className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setEditingProject(project.id); }}
                        className="p-1 hover:bg-white/10 rounded transition-colors text-zinc-400 hover:text-white"
                        title={t('common.edit')}
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); if (window.confirm('Ви впевнені, що хочете видалити цей проект?')) { deleteProject(project.id); } }}
                        className="p-1 hover:bg-red-500/10 rounded text-red-400 transition-colors"
                        title={t('sidebar.deleteProject')}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {/* Stats on bottom: note count, sync status, and AI brain indicator */}
                  <div className="flex items-center justify-between border-t border-white/10 pt-1 mt-auto flex-shrink-0">
                    <div className="flex items-center gap-0.5 overflow-hidden">
                      <div className="flex items-center gap-0.5 bg-white/10 px-0.5 py-0.125 rounded overflow-hidden">
                        <span className="text-xs font-black uppercase tracking-tight opacity-80 truncate">
                          {t('common.notes', { count: projectNotes.length })}
                        </span>
                        {projectNotes.length > 0 && (
                          <>
                            {projectNotes.some(n => n.syncStatus === 'error') ? (
                              <span title={t('common.syncStatus.error')}><AlertCircle className="w-2 h-2 text-red-400" /></span>
                            ) : projectNotes.some(n => n.syncStatus === 'pending') ? (
                              <span title={t('common.syncStatus.pending')}><Loader2 className="w-2 h-2 text-indigo-400 animate-spin" /></span>
                            ) : projectNotes.some(n => !n.syncStatus) ? (
                              <span title={t('common.syncStatus.offline')}><CloudOff className="w-2 h-2 opacity-20" /></span>
                            ) : (
                              <span title={t('common.syncStatus.synced')}><Cloud className="w-2 h-2 text-green-500/50" /></span>
                            )}
                          </>
                        )}

                      {project.knowledge && (
                        <span className="text-xs font-black uppercase tracking-tight bg-indigo-500/20 text-indigo-300 px-0.5 py-0.125 rounded truncate">
                          {t('projects.aiBrainActive')}
                        </span>
                      )}
                    </div>
                    </div>
                    <ArrowRight className="w-3 h-3 opacity-20 group-hover:opacity-100 group-hover:translate-x-1 transition-all flex-shrink-0" />
                  </div>
                </div>
            </div>
          );
        })}

        {displayProjects.length === 0 && (
            <div className="col-span-full py-24 border-2 border-dashed border-white/5 rounded-3xl flex flex-col items-center justify-center space-y-4">
                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center">
                    <Hash className="w-8 h-8 text-zinc-700" />
                </div>
                <div className="text-center">
                    <p className="text-zinc-400 font-bold text-base">{t('projects.noProjects')}</p>
                    <p className="text-zinc-600 text-base">{t('projects.noProjectsDesc')}</p>
                </div>
                <button
                    onClick={() => setCreatingProject(true)}
                    className="text-indigo-400 hover:text-indigo-300 font-bold text-base transition-colors"
                >
                    + {t('sidebar.newProject')}
                </button>
            </div>
        )}
      </div>
      </div>
    </div>
  );
};