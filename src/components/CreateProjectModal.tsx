import React, { useState } from 'react';
import { X, FolderPlus, CheckCircle } from 'lucide-react';
import { useStore } from '../store/useStore';
import { useTranslation } from 'react-i18next';
import db from '../services/db';
import { toast } from '../utils/toast';
import { unifiedSyncService } from '../services/unifiedSyncService';

export const CreateProjectModal = () => {
  const { isCreatingProject, setCreatingProject, addProject, setActiveProject } = useStore();
  const [name, setName] = useState('');
  const { t } = useTranslation();

  if (!isCreatingProject) return null;

  const handleCreate = async () => {
    if (!name.trim()) {
        setCreatingProject(false);
        return;
    }

    const newProject = {
        id: Date.now().toString(),
        name: name.trim(),
        createdAt: Date.now(),
        updatedAt: Date.now()
    };

    try {
        await addProject(newProject);
        await db.projects.add(newProject);
        
        // Sync to cloud
        unifiedSyncService.syncProject(newProject).catch(err => {
            console.error("[CreateProject] Cloud sync failed:", err);
        });

        setName('');
        setCreatingProject(false);
        setActiveProject(newProject.id);
        toast.success(t('common.saveSuccess'));
    } catch (e) {
        console.error("Failed to create project", e);
        toast.error("Error creating project");
    }
  };

  return (
    <div className="fixed inset-0 z-[10006] flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-md animate-in fade-in duration-300">
      <div className="ui-window w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="ui-window-header">
          <div className="flex items-center gap-3 px-2">
            <FolderPlus className="w-5 h-5 text-indigo-400" />
            <h2 className="ui-title-main text-xs">{t('sidebar.newProject')}</h2>
          </div>
          <button
            onClick={() => setCreatingProject(false)}
            className="p-2 hover:bg-red-500 hover:text-white transition-all rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-8 space-y-6">
            <div className="space-y-2">
                <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">
                    {t('sidebar.renameProject')}
                </label>
                <input
                    autoFocus
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') handleCreate();
                        if (e.key === 'Escape') setCreatingProject(false);
                    }}
                    placeholder="Project Name..."
                    className="w-full bg-white/5 border border-white/5 rounded-xl h-14 px-6 text-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all"
                />
            </div>

            <button
                onClick={handleCreate}
                className="w-full h-14 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-black uppercase text-xs tracking-widest shadow-lg shadow-indigo-500/20 transition-all active:scale-95 flex items-center justify-center gap-2"
            >
                <CheckCircle className="w-5 h-5" />
                {t('common.save')}
            </button>
        </div>
      </div>
    </div>
  );
};
