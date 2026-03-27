import type { Note, AiProvider } from '../types/entities';
import { IAiProvider, AiRequestOptions } from '../domain/ai/IAiProvider';
import { 
    OpenAiProvider, 
    GeminiApiProvider, 
    GroqApiProvider, 
    BridgeAiProvider, 
    FallbackAiProvider 
} from '../infrastructure/ai/StandardProviders';
import { OllamaProvider } from '../infrastructure/ai/OllamaProvider';
import i18n from '../i18n';

class AiProviderFactory {
    static getProvider(provider: AiProvider): IAiProvider {
        switch (provider) {
            case 'openai':
                return new OpenAiProvider();
            case 'gemini-api':
                return new GeminiApiProvider();
            case 'groq-api':
                return new GroqApiProvider();
            case 'browser-native-extension':
            case 'chatgpt-tab':
            case 'claude-tab':
            case 'gemini-tab':
                const bridgeName = provider === 'browser-native-extension' ? 'chatgpt' : provider.replace('-tab', '');
                return new BridgeAiProvider(bridgeName);
            case 'browser':
            case 'free-ai':
                return new FallbackAiProvider();
            // Local Qwen support (can be extended to check settings for model name)
            default:
                if (provider && (provider as string).includes('qwen')) {
                    return new OllamaProvider();
                }
                return new FallbackAiProvider();
        }
    }
}

export const aiService = {
    async processNote(arg1: string | AiRequestOptions, arg2?: AiProvider, arg3?: any): Promise<any> {
        let options: any;
        if (typeof arg1 === 'object') {
            options = { ...arg1, language: arg1.language || i18n.language };
        } else {
            options = {
                content: arg1,
                provider: arg2!,
                keys: arg3,
                language: i18n.language
            };
        }

        const provider = AiProviderFactory.getProvider(options.provider);
        return provider.processNote(options as any);
    },

    async askAI(prompt: string, provider: AiProvider, keys: any): Promise<string> {
        const ai = AiProviderFactory.getProvider(provider);
        return ai.ask(prompt, { content: '', keys, language: i18n.language });
    },

    async generateInsight(notes: Note[], provider: AiProvider, keys: any): Promise<string> {
        const ai = AiProviderFactory.getProvider(provider);
        return ai.generateInsight(notes, { content: '', keys, language: i18n.language });
    },

    async runSmartAction(action: string, notes: Note[], provider: AiProvider, keys: any): Promise<string> {
        const ai = AiProviderFactory.getProvider(provider);
        return ai.runSmartAction(action, notes, { content: '', keys, language: i18n.language });
    },

    async generateReport(notes: Note[], provider: AiProvider, keys: any, isGlobal = false): Promise<string> {
        const ai = AiProviderFactory.getProvider(provider);
        if (ai.generateReport) {
            return ai.generateReport(notes, { content: '', keys, language: i18n.language }, isGlobal);
        }
        
        // Fallback report generation if not implemented by provider
        const currentLang = i18n.language || 'en';
        const notesContext = notes.map(n => `### ${n.title}\n${n.content}\n---`).join('\n');
        const prompt = `Generate a technical report (${isGlobal ? 'Global' : 'Project'}). Lang: ${currentLang}.\n\nNOTES:\n${notesContext}`;
        return ai.ask(prompt, { content: '', keys, language: i18n.language });
    }
};
