import { describe, it, expect, vi, beforeEach } from 'vitest';
import { aiService } from '../services/aiService';

describe('Real-world simulation: Create note in "test" project and check AI bridge', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock postMessage to avoid actual browser errors
    window.postMessage = vi.fn((data) => {
        console.log('Test Simulation: App sent message:', data);
    });
  });

  it('should process the note and receive response from AI tab mock', async () => {
    const content = "проведемо тест";
    const provider = 'chatgpt-tab';
    
    // Simulate the AI Bridge response (from extension/tampermonkey)
    // In a real browser, this would happen via window.postMessage from the bridge
    const simulateResponse = () => {
        setTimeout(() => {
            console.log('Test Simulation: Bridge captured AI response, sending to App...');
            window.dispatchEvent(new CustomEvent('DevVoiceResponse', {
                detail: {
                    action: 'chatgpt_response',
                    success: true,
                    data: {
                        title: "Тестова замітка",
                        formattedContent: "Проведемо тест - успішно оброблено AI",
                        type: "generic",
                        tags: ["test", "ai"],
                        color: "bg-indigo-500"
                    }
                }
            }));
        }, 500);
    };

    simulateResponse();

    console.log(`Test Simulation: Processing note "${content}" via ${provider}...`);
    const result = await aiService.processNote({
        content,
        provider,
        keys: { openai: '' }
    });

    console.log('Test Simulation: App received AI result:', result);

    expect(result.title).toBe("Тестова замітка");
    expect(result.formattedContent).toContain("успішно оброблено AI");
    expect(result.type).toBe("generic");
  });
});
