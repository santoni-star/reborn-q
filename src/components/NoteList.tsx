import { useState } from 'react';
import { useStore } from '../store/useStore';
import { Search } from 'lucide-react';
import { clsx } from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';
import { NoteItem } from './NoteItem';
import { NoteSkeleton } from './NoteSkeleton';
import { useTranslation } from 'react-i18next';

export const NoteList = () => {
  const { notes, activeProjectId, projects, searchQuery } = useStore();
  const [expandedDates, setExpandedDates] = useState<Record<string, boolean>>({});
  const { t } = useTranslation();

  // Determine if we're still loading initial data
  // If notes array is empty and we haven't received any data yet, show skeleton
  const isLoading = notes.length === 0 && activeProjectId === '1';
  
  // Advanced Filter: Handle Global Digest section, Smart Views, vs regular projects + SEARCH
  const filteredNotes = notes.filter(n => {
    // Apply search filter if query exists
    if (searchQuery.trim()) {
      // Use cached search results if available
      const cachedResults = useStore.getState().searchCache[searchQuery.toLowerCase()];
      if (cachedResults) {
        return cachedResults.some(cachedNote => cachedNote.id === n.id);
      }

      // Fallback to manual search if not cached
      const query = searchQuery.toLowerCase();
      const matchesSearch = (n.title || '').toLowerCase().includes(query) ||
                           (n.content || '').toLowerCase().includes(query) ||
                           (n.tags || []).some(t => (t || '').toLowerCase().includes(query));
      if (!matchesSearch) return false;
    }

    if (activeProjectId === 'global-digest') {
        return n.id.startsWith('digest-global-');
    }
    if (activeProjectId === 'view-bugs') {
        return n.type === 'bug';
    }
    if (activeProjectId === 'view-todos') {
        return n.type === 'todo';
    }
    if (activeProjectId === 'view-ideas') {
        return n.type === 'idea';
    }
    // In regular projects, show project notes but HIDE global digests
    const noteProjectId = String(n.projectId);
    const activeId = String(activeProjectId);

    // AAA mapping logic:
    // 1. Exact match
    if (noteProjectId === activeId) return !n.id.startsWith('digest-global-');

    // 2. Folder name mapping (Disk sync artifact)
    if (activeId === '1') {
        const isInboxEquivalent = ['inbox', 'voicenotesapp', '1', 'unknown'].includes(noteProjectId.toLowerCase());
        if (isInboxEquivalent) return !n.id.startsWith('digest-global-');
    }

    // 3. Project name match (if we have project metadata)
    const activeProject = projects.find(p => p.id === activeId);
    if (activeProject && activeProject.name && noteProjectId.toLowerCase() === activeProject.name.toLowerCase().replace(/\s+/g, '_')) {
        return !n.id.startsWith('digest-global-');
    }

    return false;
  });

  const getActiveProjectName = () => {
    if (activeProjectId === 'global-digest') return t('sidebar.globalDigest');
    if (activeProjectId === 'view-bugs') return t('sidebar.bugs');
    if (activeProjectId === 'view-todos') return t('sidebar.todos');
    if (activeProjectId === 'view-ideas') return t('sidebar.ideas');
    return projects.find(p => p.id === activeProjectId)?.name || 'Unknown';
  };

  const activeProjectName = getActiveProjectName();

  const groups: Record<string, Note[]> = {};
  filteredNotes.forEach(note => {
    const dateObj = new Date(note.createdAt);
    // Use local date for consistent grouping in user's timezone
    const date = `${dateObj.getFullYear()}-${(dateObj.getMonth() + 1).toString().padStart(2, '0')}-${dateObj.getDate().toString().padStart(2, '0')}`;
    if (!groups[date]) groups[date] = [];
    groups[date].push(note);
  });

  const sortedDates = Object.keys(groups).sort((a, b) => {
    return b.localeCompare(a); // String comparison works for YYYY-MM-DD
  });

  const todayStr = (() => {
    const today = new Date();
    return `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`;
  })();

  if (isLoading) {
    // Show skeleton screens while loading
    return (
      <div className="flex-1 overflow-y-auto p-4 md:p-6 scrollbar-hide space-y-6 note-list-container">
        <NoteSkeleton count={6} />
      </div>
    );
  }

  if (filteredNotes.length === 0) {
      return (
          <div className="flex-1 flex flex-col items-center justify-center text-zinc-500">
              <Search className="w-8 h-8 mb-4 opacity-20" />
              <p className="font-medium">
                {searchQuery ? `${t('common.magicFix') === 'Magic Fix' ? 'No results found for' : 'Нічого не знайдено для'} "${searchQuery}"` : t('voice.placeholder')}
              </p>
              {searchQuery && (
                  <button onClick={() => useStore.getState().setSearchQuery('')} className="mt-4 text-xs text-indigo-400 hover:text-indigo-300 font-bold uppercase tracking-widest">{t('common.clearSearch')}</button>
              )}
          </div>
      )
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 scrollbar-hide space-y-6 note-list-container">
        <AnimatePresence>
          {sortedDates.map(date => {
              const isExpanded = expandedDates[date] ?? (date === todayStr);
              const dateNotes = [...groups[date]].sort((a, b) => {
                  const isDigestA = a.id.startsWith('digest-');
                  const isDigestB = b.id.startsWith('digest-');
                  if (isDigestA && !isDigestB) return -1;
                  if (!isDigestA && isDigestB) return 1;
                  return b.createdAt - a.createdAt; // Sort by timestamp descending (most recent first within the day)
              });

              const digestNote = dateNotes.find(n => n.id.startsWith('digest-'));
              const otherNotes = dateNotes.filter(n => !n.id.startsWith('digest-'));

              const getRelativeDateLabel = (dateStr: string) => {
                  const [year, month, day] = dateStr.split('-').map(Number);
                  const d = new Date(year, month - 1, day); // month is 0-indexed in JS Date
                  const today = new Date();
                  const yesterday = new Date();
                  yesterday.setDate(today.getDate() - 1);

                  if (d.toDateString() === today.toDateString()) return t('common.today');
                  if (d.toDateString() === yesterday.toDateString()) return t('common.yesterday');

                  // Convert back to readable format for other dates
                  return d.toLocaleDateString([], { year: 'numeric', month: 'long', day: 'numeric' });
              };

              return (
                  <motion.div
                    key={date}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-4"
                  >
                      <button
                        onClick={() => setExpandedDates(p => ({...p, [date]: !(p[date] ?? (date === todayStr))}))}
                        className="flex items-center gap-4 w-full group/header text-left"
                      >
                          <h2 className={clsx("text-[10px] font-black uppercase tracking-[0.3em]", isExpanded ? "text-indigo-400" : "text-zinc-500")}>{getRelativeDateLabel(date)}</h2>
                          <div className="h-px flex-1 bg-white/5"></div>
                          <span className="text-[10px] font-bold text-zinc-600">{t('common.notes', { count: dateNotes.length })}</span>
                      </button>

                      <motion.div
                        layout
                        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 items-start"
                      >
                          <AnimatePresence>
                            {isExpanded && (
                              <>
                                {digestNote && (
                                    <motion.div
                                      layout
                                      initial={{ opacity: 0, scale: 0.9 }}
                                      animate={{ opacity: 1, scale: 1 }}
                                      exit={{ opacity: 0, scale: 0.9 }}
                                      transition={{ duration: 0.3 }}
                                      key={digestNote.id}
                                      className="xl:col-span-1"
                                    >
                                        <NoteItem
                                            note={digestNote}
                                            projectName={activeProjectName}
                                        />
                                    </motion.div>
                                )}

                                {otherNotes.map((note) => (
                                    <motion.div
                                      layout
                                      initial={{ opacity: 0, scale: 0.9 }}
                                      animate={{ opacity: 1, scale: 1 }}
                                      exit={{ opacity: 0, scale: 0.9 }}
                                      transition={{ duration: 0.3 }}
                                      key={note.id}
                                    >
                                        <NoteItem
                                            note={note}
                                            projectName={activeProjectName}
                                        />
                                    </motion.div>
                                ))}
                              </>
                            )}
                          </AnimatePresence>
                      </motion.div>
                  </motion.div>
              );
          })}
        </AnimatePresence>
    </div>
  );
};