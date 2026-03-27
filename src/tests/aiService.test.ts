import { describe, it, expect, vi, beforeEach } from 'vitest';
import { aiService } from '../services/aiService';

describe('aiService.askAI (Bridge Communication)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should send a message via postMessage and resolve on DevVoiceResponse', async () => {
    const prompt = 'Test prompt';
    const provider = 'chatgpt-tab';
    const keys = {};

    // Simulate the extension response after a short delay
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('DevVoiceResponse', {
        detail: {
          action: 'chatgpt_response',
          success: true,
          data: { raw: 'Mocked AI Response' }
        }
      }));
    }, 100);

    const promise = aiService.askAI(prompt, provider, keys);
    const result = await promise;

    expect(result).toBe('Mocked AI Response');
    expect(window.postMessage).toHaveBeenCalled();
  });

  it('should timeout if no response is received', async () => {
    // We can use fake timers to test timeout without waiting 90s
    vi.useFakeTimers();
    const promise = aiService.askAI('test', 'chatgpt-tab', {});
    
    vi.advanceTimersByTime(95000);
    const result = await promise;
    
    expect(result).toBe('Error: AI Response Timeout');
    vi.useRealTimers();
  });
});
