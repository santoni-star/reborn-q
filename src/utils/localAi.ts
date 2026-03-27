type NoteType = 'idea' | 'bug' | 'architecture' | 'todo' | 'generic';

interface AiAnalysisResult {
  title: string;
  formattedContent: string;
  type: NoteType;
  tags: string[];
  color?: string;
}

export const analyzeWithRegex = (content: string): AiAnalysisResult => {
  const safeContent = typeof content === 'string' ? content : String(content || '');
  const lowerContent = safeContent.toLowerCase();
  let type: NoteType = 'generic';
  let color = 'bg-zinc-900/95 border-white/20 text-zinc-100';
  const tags: Set<string> = new Set();

  if (/(fix|bug|crash|error|fail|broken|exception|undefined|null|виправити|помилка|баг|крах|зламано|глюк|не працює|трабл|дефект|критично)/.test(lowerContent)) {
    type = 'bug';
    color = 'bg-red-900/90 border-red-500/40 text-red-100';
  } else if (/(refactor|structure|architecture|pattern|clean code|mvp|scale|рефактор|структура|архітектура|патерн|схема|дизайн|модель|інфраструктура)/.test(lowerContent)) {
    type = 'architecture';
    color = 'bg-blue-900/90 border-blue-500/40 text-blue-100';
  } else if (/(todo|must|remind|remember|don't forget|task|check|list|зробити|треба|план|завдання|список|черга|нагадати|виконати)/.test(lowerContent)) {
    type = 'todo';
    color = 'bg-green-900/90 border-green-500/40 text-green-100';
  } else if (/(idea|feature|add|create|should|maybe|concept|imagine|ідея|фіча|додати|створити|можливо|гіпотеза|пропозиція|думка|а що як)/.test(lowerContent)) {
    type = 'idea';
    color = 'bg-yellow-900/90 border-yellow-500/40 text-yellow-100';
  }

  const techKeywords: Record<string, RegExp> = {
    'react': /react/,
    'typescript': /typescript|ts/,
    'javascript': /javascript|js/,
    'css': /css|style|tailwind/,
    'backend': /backend|server|api|endpoint/,
    'database': /database|db|sql|mongo|postgres/,
    'auth': /auth|login|signup|token|jwt/,
    'ui': /ui|ux|design|button|modal/,
    'performance': /slow|fast|optimize|performance|render/,
    'testing': /test|jest|cypress|unit|e2e/,
    'deploy': /deploy|ci\/cd|docker|aws|vercel/,
    'security': /security|hack|protect/,
  };

  for (const [tag, regex] of Object.entries(techKeywords)) {
    if (regex.test(lowerContent)) {
      tags.add(tag);
    }
  }

  if (type === 'bug') tags.add('urgent');
  if (type === 'architecture') tags.add('planning');

  return { 
    title: safeContent.slice(0, 30) + (safeContent.length > 30 ? '...' : ''),
    formattedContent: safeContent,
    type, 
    tags: Array.from(tags), 
    color 
  };
};

export const analyzeNoteContent = async (content: string): Promise<AiAnalysisResult> => {
    return analyzeWithRegex(content);
};

export const generateLocalReport = (notesContent: string, isGlobal: boolean): string => {
  return `### ${isGlobal ? 'Global' : 'Project'} Daily Report\n\nNotes analysis completed via Regex fallback.\n\n${notesContent}`;
};
