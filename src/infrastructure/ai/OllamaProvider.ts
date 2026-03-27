import { IAiProvider, AiRequestOptions, ProcessedNoteData } from '../../domain/ai/IAiProvider';
import { analyzeNoteContent } from '../../utils/localAi';

export class OllamaProvider implements IAiProvider {
  private endpoint = 'http://localhost:11434/api/chat';
  private model = 'qwen2.5:latest'; // Default model, can be made configurable

  async processNote(options: AiRequestOptions): Promise<ProcessedNoteData> {
    const systemPrompt = `
      Analyze technical voice input. Respond strictly in the language: ${options.language || 'en'}.
      OUTPUT VALID JSON ONLY:
      { "title": "string", "formattedContent": "string (markdown)", "type": "idea|bug|architecture|todo|generic", "tags": [] }
    `;

    const prompt = `${systemPrompt}\n\nINPUT TO PROCESS: ${options.content}`;

    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.model,
          messages: [{ role: 'user', content: prompt }],
          stream: false,
          format: 'json'
        })
      });

      if (!response.ok) throw new Error(`Ollama error: ${response.statusText}`);
      
      const data = await response.json();
      const content = data.message.content;
      
      const start = content.indexOf('{');
      const end = content.lastIndexOf('}');
      if (start === -1) throw new Error("No JSON found in Ollama response");
      
      return JSON.parse(content.substring(start, end + 1));
    } catch (e) {
      console.error("[OllamaProvider] Failed, falling back to regex", e);
      return analyzeNoteContent(options.content);
    }
  }

  async ask(prompt: string, options: AiRequestOptions): Promise<string> {
    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.model,
          messages: [{ role: 'user', content: prompt }],
          stream: false
        })
      });

      if (!response.ok) throw new Error(`Ollama error: ${response.statusText}`);
      const data = await response.json();
      return data.message.content;
    } catch (e) {
      return `Error: ${e instanceof Error ? e.message : String(e)}`;
    }
  }

  async generateInsight(notes: any[], options: AiRequestOptions): Promise<string> {
    const context = notes.slice(0, 10).map(n => `[${n.type}] ${n.title}`).join('\n');
    const prompt = `
      Based on these technical notes, provide a 1-sentence high-level technical insight for the developer.
      Respond strictly in the language: ${options.language || 'en'}.
      Be concise, professional, and insightful.

      NOTES:
      ${context}
    `;
    return this.ask(prompt, options);
  }

  async runSmartAction(action: string, notes: any[], options: AiRequestOptions): Promise<string> {
    const notesContext = notes.map(n => `### ${n.title}\n${n.content}\n---`).join('\n');
    let prompt = '';

    if (action === 'github-issue') {
      prompt = `Create a well-structured GitHub Issue from these notes. Language: ${options.language || 'en'}.\n\nNOTES:\n${notesContext}`;
    } else if (action === 'adr') {
      prompt = `Create an Architecture Decision Record (ADR) from these notes. Language: ${options.language || 'en'}.\n\nNOTES:\n${notesContext}`;
    } else {
      return `Unknown action: ${action}`;
    }

    return this.ask(prompt, options);
  }
}
