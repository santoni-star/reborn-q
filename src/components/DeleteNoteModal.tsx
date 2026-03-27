import { Trash2, AlertCircle } from 'lucide-react';
import { useStore } from '../store/useStore';
import { unifiedSyncService } from '../services/unifiedSyncService';
import { useTranslation } from 'react-i18next';
import { toast } from '../utils/toast';

export const DeleteNoteModal = () => {
  const { isDeletingNote, setDeletingNote, deleteNote, projects } = useStore();
  const { t } = useTranslation();

  if (!isDeletingNote) return null;

  const handleDelete = async () => {
    try {
      const note = isDeletingNote;
      const project = projects.find(p => p.id === note.projectId);
      const projectName = project?.name || 'Inbox';

      // 1. Спершу видаляємо звідусіль (Firebase, Local FS, IndexedDB)
      await unifiedSyncService.deleteNote(note, projectName);
      
      // 2. Оновлюємо локальний Store (це видалить із масиву notes)
      await deleteNote(note.id);
      
      toast.success(t('common.deleteSuccess') || 'Note deleted successfully');
    } catch (error) {
      console.error('Failed to delete note:', error);
      toast.error(t('common.deleteError') || 'Failed to delete note');
    } finally {
      setDeletingNote(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-md animate-in fade-in duration-300">
      <div className="w-full max-w-md bg-zinc-900 border border-white/10 rounded-3xl p-6 shadow-2xl animate-in zoom-in-95 duration-300">
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center">
            <Trash2 className="w-8 h-8 text-red-500" />
          </div>
          
          <div className="space-y-2">
            <h2 className="text-xl font-black uppercase tracking-tight text-white">
              {t('common.deleteConfirmTitle') || 'Delete Note?'}
            </h2>
            <p className="text-sm text-zinc-400 leading-relaxed">
              {t('common.deleteConfirmDesc') || 'This will permanently remove the note from your local storage and cloud sync. This action cannot be undone.'}
            </p>
          </div>

          <div className="flex items-center gap-3 w-full pt-4">
            <button
              onClick={() => setDeletingNote(null)}
              className="flex-1 py-3 rounded-2xl bg-white/5 text-zinc-400 text-sm font-bold uppercase tracking-widest hover:bg-white/10 transition-all"
            >
              {t('common.cancel')}
            </button>
            <button
              onClick={handleDelete}
              className="flex-1 py-3 rounded-2xl bg-red-600 text-white text-sm font-bold uppercase tracking-widest hover:bg-red-500 shadow-lg shadow-red-600/20 transition-all active:scale-95"
            >
              {t('common.delete')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
