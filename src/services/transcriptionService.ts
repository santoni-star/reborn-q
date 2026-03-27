export const transcriptionService = {
  async transcribeAudio(audioBlob: Blob, apiKey: string, language: string): Promise<string> {
    const formData = new FormData();
    formData.append('file', audioBlob, 'audio.webm');
    formData.append('model', 'whisper-large-v3-turbo');
    
    if (language && language !== 'auto') {
      formData.append('language', language);
    }

    const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`
      },
      body: formData
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || `Transcription error: ${response.status}`);
    }

    const data = await response.json();
    return data.text;
  }
};
