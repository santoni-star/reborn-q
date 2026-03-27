import type { Note, Project, AiProvider } from '../types/entities';
import { aiService } from './aiService';
import i18n from '../i18n';

export interface ProjectMasterDigest {
  summary: string;
  modules: { name: string; status: string; progress: number }[];
  mermaidGraph: string;
  nextSteps: string[];
}

export const digestService = {
  async generateMasterDigest(notes: Note[], activeProject: Project | undefined, provider: AiProvider, keys: { openai: string; gemini?: string; groq?: string; googleAccessToken?: string }): Promise<ProjectMasterDigest> {
    const notesSummary = notes.map(n => ({
      t: n.title,
      content: n.content.slice(0, 150),
      type: n.type,
      tags: n.tags,
      status: n.completed ? 'COMPLETED' : 'ACTIVE',
      date: new Date(n.createdAt).toLocaleDateString()
    }));

    const knowledgeContext = activeProject?.knowledge ? `PROJECT BACKGROUND & KNOWLEDGE:\n${activeProject.knowledge}\n---\n` : '';
    const currentLang = i18n.language || 'en';

    const prompt = `
      ${knowledgeContext}
      Analyze these project notes and provide a structured JSON digest for the project "${activeProject?.name || 'Unknown'}".
      RESPOND STRICTLY IN THE LANGUAGE: ${currentLang}.
      
      TASK:
      1. Group information by status (COMPLETED vs ACTIVE).
      2. Reflect the objective progress in the "summary" and "modules".
      3. Use "nextSteps" to address only the ACTIVE items and ideas.
      4. DO NOT use technical jargon if possible, be clear and technical.
      5. The "mermaidGraph" MUST use english labels for technical reasons, but all text fields must be in ${currentLang}.
      
      NOTES: ${JSON.stringify(notesSummary.slice(0, 60))}

      OUTPUT VALID JSON ONLY:
      {
        "summary": "High-level overview of progress and current state in ${currentLang}...",
        "modules": [{"name": "Feature Name in ${currentLang}", "status": "Stable|In Progress|Critical", "progress": 0-100}],
        "mermaidGraph": "graph TD\\n  A[Technical Node] --> B[Status]",
        "nextSteps": ["Specific actionable item 1 in ${currentLang}", "item 2"]
      }
    `;

    try {
      const content = await aiService.askAI(prompt, provider, keys);
      
      try {
        const start = content.indexOf('{');
        const end = content.lastIndexOf('}');
        if (start !== -1 && end !== -1) {
            const jsonStr = content.substring(start, end + 1);
            return JSON.parse(jsonStr) as ProjectMasterDigest;
        }
        throw new Error("No JSON found in AI response");
      } catch {
        console.error("Failed to parse master digest JSON. Raw content:", content);
        return {
            summary: content.slice(0, 500),
            modules: [],
            mermaidGraph: "",
            nextSteps: []
        };
      }
    } catch (e) {
      console.error("Master Digest generation failed", e);
      throw e;
    }
  }
};
