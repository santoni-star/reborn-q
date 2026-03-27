import { NoteType } from '../notes/Note';

export interface ProcessedNoteData {
  title: string;
  formattedContent: string;
  type: NoteType;
  tags: string[];
  color?: string;
}

export interface AiRequestOptions {
  content: string;
  context?: string;
  masterContext?: string;
  language?: string;
  keys: {
    openai?: string;
    gemini?: string;
    groq?: string;
    googleAccessToken?: string;
  };
}

export interface IAiProvider {
  processNote(options: AiRequestOptions): Promise<ProcessedNoteData>;
  ask(prompt: string, options: AiRequestOptions): Promise<string>;
  generateInsight(notes: any[], options: AiRequestOptions): Promise<string>;
  runSmartAction(action: string, notes: any[], options: AiRequestOptions): Promise<string>;
  generateReport?(notes: any[], options: AiRequestOptions, isGlobal?: boolean): Promise<string>;
}
