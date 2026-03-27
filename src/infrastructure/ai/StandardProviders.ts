import { IAiProvider, AiRequestOptions, ProcessedNoteData } from '../../domain/ai/IAiProvider';
import { analyzeNoteContent } from '../../utils/localAi';

export class OpenAiProvider implements IAiProvider {
  async processNote(options: AiRequestOptions): Promise<ProcessedNoteData> {
    const systemPrompt = `
      Analyze technical voice input. Respond strictly in the language: ${options.language || 'en'}.
      ${options.masterContext ? `PROJECT CONTEXT:\n${options.masterContext}\n---\n` : ''}
      ${options.context ? `RECENT NOTES:\n${options.context}\n---\n` : ''}
      OUTPUT VALID JSON ONLY:
      { "title": "string", "formattedContent": "string (markdown)", "type": "idea|bug|architecture|todo|generic", "tags": [] }
    `;

    const prompt = `${systemPrompt}\n\nINPUT TO PROCESS: ${options.content}`;

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${options.keys.openai}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          response_format: { type: 'json_object' },
          temperature: 0.1
        })
      });

      if (!response.ok) throw new Error(`OpenAI error: ${response.statusText}`);
      const data = await response.json();
      return JSON.parse(data.choices[0].message.content);
    } catch (e) {
      console.error("[OpenAiProvider] Failed, falling back to regex", e);
      return analyzeNoteContent(options.content);
    }
  }

  async ask(prompt: string, options: AiRequestOptions): Promise<string> {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${options.keys.openai}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.1
        })
      });
      const data = await response.json();
      return data.choices[0].message.content;
    } catch (e) {
      return `Error: ${e instanceof Error ? e.message : String(e)}`;
    }
  }

  async generateInsight(notes: any[], options: AiRequestOptions): Promise<string> {
    const context = notes.slice(0, 10).map(n => `[${n.type}] ${n.title}`).join('\n');
    const prompt = `Based on these notes, provide 1 technical insight. Lang: ${options.language || 'en'}.\n\nNOTES:\n${context}`;
    return this.ask(prompt, options);
  }

  async runSmartAction(action: string, notes: any[], options: AiRequestOptions): Promise<string> {
    const notesContext = notes.map(n => `### ${n.title}\n${n.content}\n---`).join('\n');
    const prompt = `Action: ${action}. Lang: ${options.language || 'en'}.\n\nNOTES:\n${notesContext}`;
    return this.ask(prompt, options);
  }
}

export class GeminiApiProvider implements IAiProvider {
  async processNote(options: AiRequestOptions): Promise<ProcessedNoteData> {
    const systemPrompt = `Analyze tech voice input. Lang: ${options.language || 'en'}. JSON ONLY.`;
    const prompt = `${systemPrompt}\n\nINPUT: ${options.content}`;
    const key = options.keys.gemini;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent${key ? `?key=${key}` : ''}`;
    const headers: any = { 'Content-Type': 'application/json' };
    if (!key && options.keys.googleAccessToken) headers['Authorization'] = `Bearer ${options.keys.googleAccessToken}`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { response_mime_type: "application/json", temperature: 0.1 }
        })
      });
      const data = await response.json();
      return JSON.parse(data.candidates[0].content.parts[0].text);
    } catch (e) {
      return analyzeNoteContent(options.content);
    }
  }

  async ask(prompt: string, options: AiRequestOptions): Promise<string> {
    const key = options.keys.gemini;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent${key ? `?key=${key}` : ''}`;
    const headers: any = { 'Content-Type': 'application/json' };
    if (!key && options.keys.googleAccessToken) headers['Authorization'] = `Bearer ${options.keys.googleAccessToken}`;
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      });
      const data = await response.json();
      return data.candidates[0].content.parts[0].text;
    } catch (e) { return String(e); }
  }

  async generateInsight(notes: any[], options: AiRequestOptions): Promise<string> {
    return this.ask(`Insight based on: ${notes.map(n => n.title).join(', ')}`, options);
  }

  async runSmartAction(action: string, notes: any[], options: AiRequestOptions): Promise<string> {
    return this.ask(`Action ${action} for notes.`, options);
  }
}

export class GroqApiProvider implements IAiProvider {
  async processNote(options: AiRequestOptions): Promise<ProcessedNoteData> {
    const prompt = `Analyze: ${options.content}. JSON format. Lang: ${options.language || 'en'}.`;
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${options.keys.groq}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [{ role: 'user', content: prompt }],
          response_format: { type: 'json_object' },
          temperature: 0.1
        })
      });
      const data = await response.json();
      return JSON.parse(data.choices[0].message.content);
    } catch (e) { return analyzeNoteContent(options.content); }
  }

  async ask(prompt: string, options: AiRequestOptions): Promise<string> {
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${options.keys.groq}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages: [{ role: 'user', content: prompt }] })
      });
      const data = await response.json();
      return data.choices[0].message.content;
    } catch (e) { return String(e); }
  }

  async generateInsight(notes: any[], options: AiRequestOptions): Promise<string> {
    return this.ask(`Insight for: ${notes.map(n => n.title).join(', ')}`, options);
  }

  async runSmartAction(action: string, notes: any[], options: AiRequestOptions): Promise<string> {
    return this.ask(`Action ${action} for notes.`, options);
  }
}

export class BridgeAiProvider implements IAiProvider {
  constructor(private bridgeName: string) {}

  async processNote(options: AiRequestOptions): Promise<ProcessedNoteData> {
    const requestId = Date.now();
    return new Promise((resolve, reject) => {
      const handler = (e: any) => {
        if (e.detail.requestId === requestId) {
          window.removeEventListener('DevVoiceResponse', handler);
          if (e.detail.success) resolve(e.detail.data);
          else reject(new Error(e.detail.error));
        }
      };
      window.addEventListener('DevVoiceResponse', handler);
      window.postMessage({ 
        type: 'DEVVOICE_BRIDGE_REQUEST', 
        action: 'process_text', 
        content: options.content, 
        provider: this.bridgeName, 
        requestId 
      }, '*');
      setTimeout(() => {
        window.removeEventListener('DevVoiceResponse', handler);
        resolve(analyzeNoteContent(options.content));
      }, 90000);
    });
  }

  async ask(prompt: string, options: AiRequestOptions): Promise<string> {
    const requestId = Date.now();
    return new Promise((resolve) => {
      const handler = (e: any) => {
        if (e.detail.requestId === requestId) {
          window.removeEventListener('DevVoiceResponse', handler);
          resolve(e.detail.response || e.detail.text || "No response");
        }
      };
      window.addEventListener('DevVoiceResponse', handler);
      window.postMessage({ 
        type: 'DEVVOICE_BRIDGE_REQUEST', 
        action: 'raw_query', 
        content: prompt, 
        provider: this.bridgeName, 
        requestId 
      }, '*');
      setTimeout(() => {
        window.removeEventListener('DevVoiceResponse', handler);
        resolve("Error: AI Timeout");
      }, 90000);
    });
  }

  async generateInsight(notes: any[], options: AiRequestOptions): Promise<string> {
    return this.ask(`Insight based on ${notes.length} notes.`, options);
  }

  async runSmartAction(action: string, notes: any[], options: AiRequestOptions): Promise<string> {
    return this.ask(`Smart action ${action}.`, options);
  }
}

export class FallbackAiProvider implements IAiProvider {
  async processNote(options: AiRequestOptions): Promise<ProcessedNoteData> {
    return analyzeNoteContent(options.content);
  }
  async ask(prompt: string): Promise<string> {
    return "Fallback: askAI not supported in regex mode.";
  }
  async generateInsight(): Promise<string> { return ""; }
  async runSmartAction(): Promise<string> { return ""; }
}
