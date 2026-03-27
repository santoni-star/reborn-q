import type { Note, AiProvider } from '../types/entities';
import { analyzeNoteContent } from "../utils/localAi";

interface AiRequestOptions {
  content: string;
  provider: AiProvider;
  keys: {
    openai: string;
    gemini?: string;
    groq?: string;
    googleAccessToken?: string;
  };
  context?: string;
  masterContext?: string;
  language?: string;
  isInternal?: boolean;
}

export const aiService = {
  async processNote(arg1: string | AiRequestOptions, arg2?: AiProvider, arg3?: any): Promise<any> {
    let options: AiRequestOptions;

    // Handle both object-based and positional arguments
    if (typeof arg1 === 'object') {
      options = arg1;
    } else {
      options = {
        content: arg1,
        provider: arg2!,
        keys: arg3,
        language: i18n.language // Fallback to current language
      };
    }

    const { content, provider, keys, requestId: reqId } = options as any;
    const requestId = reqId || Date.now();

    const isUndefined = !content || 
                        content === 'undefined' || 
                        String(content).toLowerCase() === 'undefined' || 
                        String(content).trim() === '';

    if (isUndefined) {
        console.error("[aiService] Content is empty or undefined!");
        return { 
            title: "Empty Input", 
            formattedContent: "AI Error: Input was empty or undefined", 
            type: "bug", 
            tags: ["error"] 
        };
    }

    if (!provider) {
        console.error("[aiService] Provider is missing!");
        return analyzeNoteContent(typeof arg1 === 'string' ? arg1 : options.content);
    }

    if (provider === 'browser' || provider === 'free-ai') {
      return analyzeNoteContent(content);
    }

    const isDirectApi = provider.endsWith('-api') || provider === 'openai';

    if (isDirectApi) {
        return this.processDirectApi(options);
    }

    // Bridge Logic
    return new Promise((resolve, reject) => {
      const handler = (e: any) => {
        const result = e.detail;
        console.log(`[aiService] Received response from bridge. ID: ${result.requestId} (Expected: ${requestId})`);
        
        if (result.requestId == requestId) {
          window.removeEventListener('DevVoiceResponse', handler);
          if (result.success) {
            // НОРМАЛІЗАЦІЯ: перевіряємо, чи є необхідні поля
            const data = result.data || {};
            if (!data.formattedContent && data.raw) {
                // Якщо маємо тільки raw текст, робимо локальний аналіз
                const fallback = analyzeNoteContent(data.raw);
                resolve({ ...fallback, raw: data.raw });
            } else if (!data.formattedContent) {
                // Зовсім пуста відповідь
                resolve(analyzeNoteContent(content));
            } else {
                resolve(data);
            }
          } else {
            reject(new Error(result.error || "Bridge reported error"));
          }
        }
      };
      window.addEventListener('DevVoiceResponse', handler);
      
      const providerName = provider.replace('-tab', '').replace('browser-native-extension', 'chatgpt');
      const request = { 
        action: 'process_text', 
        content, 
        text: content, 
        provider: providerName, 
        requestId, 
        type: 'DEVVOICE_BRIDGE_REQUEST' 
      };
      
      window.postMessage(request, '*');

      setTimeout(() => {
        window.removeEventListener('DevVoiceResponse', handler);
        reject(new Error("AI Bridge Timeout (90s)"));
      }, 90000);
    });
  },

  async processDirectApi(options: AiRequestOptions): Promise<any> {
    const { content, provider, keys, context, masterContext, language } = options;
    const currentLang = language || i18n.language || 'en';

    console.log(`[aiService] processDirectApi called with provider: ${provider}`);

    const systemPrompt = `
      Analyze technical voice input. Respond strictly in the language: ${currentLang}.
      ${masterContext ? `PROJECT CONTEXT:\n${masterContext}\n---\n` : ''}
      ${context ? `RECENT NOTES:\n${context}\n---\n` : ''}

      OUTPUT VALID JSON ONLY:
      { "title": "string", "formattedContent": "string (markdown)", "type": "idea|bug|architecture|todo|generic", "tags": [] }
    `;

    const prompt = `${systemPrompt}\n\nINPUT TO PROCESS: ${content}`;

    const response = await this.askDirectApi(prompt, provider, keys, true);
    try {
        const start = response.indexOf('{');
        const end = response.lastIndexOf('}');
        if (start === -1) throw new Error("No JSON found");
        return JSON.parse(response.substring(start, end + 1));
    } catch (e) {
        console.error("Failed to parse AI JSON, fallback to local", response);
        return analyzeNoteContent(content);
    }
  },

  async askDirectApi(prompt: string, provider: AiProvider, keys: any, jsonMode = false): Promise<string> {
    if (provider === 'groq-api') {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${keys.groq}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'llama-3.3-70b-versatile',
                messages: [{ role: 'user', content: prompt }],
                response_format: jsonMode ? { type: 'json_object' } : undefined,
                temperature: 0.1
            })
        });
        const data = await response.json();
        if (data.error) throw new Error(data.error.message);
        return data.choices[0].message.content;
    }

    if (provider === 'openai') {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${keys.openai}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [{ role: 'user', content: prompt }],
                response_format: jsonMode ? { type: 'json_object' } : undefined,
                temperature: 0.1
            })
        });
        const data = await response.json();
        if (data.error) throw new Error(data.error.message);
        return data.choices[0].message.content;
    }

    if (provider === 'gemini-api') {
        const key = keys.gemini;
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent${key ? `?key=${key}` : ''}`;

        const headers: any = { 'Content-Type': 'application/json' };
        if (!key && keys.googleAccessToken) headers['Authorization'] = `Bearer ${keys.googleAccessToken}`;

        const response = await fetch(url, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    response_mime_type: jsonMode ? "application/json" : "text/plain",
                    temperature: 0.1
                }
            })
        });
        const data = await response.json();
        if (data.error) throw new Error(data.error.message);
        return data.candidates[0].content.parts[0].text;
    }

    throw new Error(`Direct API not implemented for ${provider}. Available: groq-api, openai, gemini-api`);
  },

  async askAI(prompt: string, provider: AiProvider, keys: any): Promise<string> {
    if (provider.endsWith('-api') || provider === 'openai') {
        return this.askDirectApi(prompt, provider, keys);
    }

    const requestId = Date.now();
    return new Promise((resolve) => {
        const handler = (e: any) => {
            const data = e.detail;
            if (data.requestId === requestId) {
                window.removeEventListener('DevVoiceResponse', handler);
                resolve(data.response || data.text || data.raw || "No response");
            }
        };

        const providerName = provider.replace('-tab', '').replace('browser-native-extension', 'chatgpt');
        const request = { 
            action: 'raw_query', 
            content: prompt, 
            text: prompt, 
            provider: providerName, 
            requestId, 
            type: 'DEVVOICE_BRIDGE_REQUEST' 
        };
        
        window.addEventListener('DevVoiceResponse', handler);
        window.postMessage(request, '*');

        setTimeout(() => {
            window.removeEventListener('DevVoiceResponse', handler);
            resolve("Error: AI Timeout");
        }, 90000);
    });
  },

  async generateInsight(notes: Note[], provider: AiProvider, keys: any): Promise<string> {
    if (notes.length === 0) return "";
    const currentLang = i18n.language || 'en';
    const context = notes.slice(0, 10).map(n => `[${n.type}] ${n.title}`).join('\n');
    const prompt = `
      Based on these technical notes, provide a 1-sentence high-level technical insight for the developer.
      Respond strictly in the language: ${currentLang}.
      Be concise, professional, and insightful.

      NOTES:
      ${context}
    `;
    return this.askAI(prompt, provider, keys);
  },

  async runSmartAction(action: 'github-issue' | 'adr', notes: Note[], provider: AiProvider, keys: any): Promise<string> {
    const currentLang = i18n.language || 'en';
    const notesContext = notes.map(n => `### ${n.title}\n${n.content}\n---`).join('\n');

    if (action === 'github-issue') {
        const prompt = `
      Based on these technical notes, create a well-structured GitHub Issue.
      Respond strictly in the language: ${currentLang}.

      Format as Markdown with:
      1. **Title**: Clear, descriptive title
      2. **Description**: What is the issue/feature?
      3. **Context**: Why is this important?
      4. **Acceptance Criteria**: Bullet points of what needs to be done
      5. **Technical Notes**: Any relevant technical details
      6. **References**: Link to related notes if applicable

      NOTES:
      ${notesContext}
    `;
        return this.askAI(prompt, provider, keys);
    }

    if (action === 'adr') {
        const prompt = `
      Based on these technical notes, create an Architecture Decision Record (ADR).
      Respond strictly in the language: ${currentLang}.

      Format as Markdown with:
      1. **Title**: Clear ADR title
      2. **Status**: Proposed | Accepted | Deprecated | Superseded
      3. **Context**: What is the issue we're solving?
      4. **Decision**: What have we decided?
      5. **Consequences**: What are the trade-offs, risks, and benefits?
      6. **Compliance**: How will we verify this decision is followed?

      NOTES:
      ${notesContext}
    `;
        return this.askAI(prompt, provider, keys);
    }

    throw new Error(`Unknown smart action: ${action}`);
  },

  async generateReport(notes: Note[], provider: AiProvider, keys: any, isGlobal = false): Promise<string> {
    const currentLang = i18n.language || 'en';
    const notesContext = notes.map(n => `### ${n.title}\n${n.content}\n---`).join('\n');
    const reportType = isGlobal ? 'Global Daily Report' : 'Project Report';
    
    const prompt = `
      Generate a comprehensive technical report based on the following notes.
      Respond strictly in the language: ${currentLang}.
      
      Report Type: ${reportType}
      Total Notes: ${notes.length}
      
      Structure the report with:
      1. Executive Summary
      2. Key Developments
      3. Technical Insights
      4. Action Items
      5. Recommendations
      
      NOTES:
      ${notesContext}
    `;
    
    return this.askAI(prompt, provider, keys);
  }
};

import i18n from '../i18n';
