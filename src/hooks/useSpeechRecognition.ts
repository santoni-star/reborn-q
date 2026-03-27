import { useState, useRef, useEffect, useCallback } from 'react';
import { useStore } from '../store';
import { transcriptionService } from '../services/transcriptionService';

declare global {
  interface Window {
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
  }
}

type SpeechRecognition = any;
type SpeechRecognitionEvent = any;
type SpeechRecognitionErrorEvent = any;

interface UseSpeechRecognitionProps {
  onResult?: (text: string) => void;
  onEnd?: () => void;
  onError?: (error: string) => void;
}

export const useSpeechRecognition = ({ onResult, onEnd, onError }: UseSpeechRecognitionProps = {}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  
  const onResultRef = useRef(onResult);
  const onEndRef = useRef(onEnd);
  const onErrorRef = useRef(onError);

  useEffect(() => { onResultRef.current = onResult; }, [onResult]);
  useEffect(() => { onEndRef.current = onEnd; }, [onEnd]);
  useEffect(() => { onErrorRef.current = onError; }, [onError]);

  const stopAudioAnalysis = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setAudioLevel(0);
  }, []);

  const startAudioAnalysis = useCallback(async () => {
    try {
      if (streamRef.current) return streamRef.current;

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      const AudioContextClass = (window.AudioContext || (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext) as typeof AudioContext;
      const audioContext = new AudioContextClass();
      audioContextRef.current = audioContext;
      
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;
      
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);
      
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      
      const updateLevel = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const average = sum / dataArray.length;
        setAudioLevel(average / 128); 
        
        animationFrameRef.current = requestAnimationFrame(updateLevel);
      };
      
      updateLevel();
      return stream;
    } catch (err) {
      console.error('Failed to start audio analysis:', err);
      throw err;
    }
  }, []);

  const stopRecording = useCallback(async () => {
    const { settings } = useStore.getState();
    
    if (settings.transcriptionProvider === 'groq') {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
        setIsRecording(false);
      }
    } else {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          console.error('Error stopping recognition:', e);
        }
        recognitionRef.current = null;
        setIsRecording(false);
      }
      stopAudioAnalysis();
    }
  }, [stopAudioAnalysis]);

  const startRecording = useCallback(async () => {
    const { settings } = useStore.getState();
    setError(null);

    // GROQ WHISPER PATH
    if (settings.transcriptionProvider === 'groq') {
      if (!settings.groqKey) {
          setError("Groq API Key is missing.");
          return;
      }

      try {
        const stream = await startAudioAnalysis();
        audioChunksRef.current = [];
        
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        
        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) audioChunksRef.current.push(event.data);
        };
        
          mediaRecorder.onstop = async () => {
          setIsProcessing(true);
          try {
            const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
            const text = await transcriptionService.transcribeAudio(audioBlob, settings.groqKey, settings.language);
            
            if (text && text !== 'undefined' && onResultRef.current) {
                onResultRef.current(text);
            } else if (!text) {
                console.warn("[Speech] Transcription returned empty result.");
            }
          } catch (e: any) {
            setError(e.message);
            if (onErrorRef.current) onErrorRef.current(e.message);
          } finally {
            setIsProcessing(false);
            stopAudioAnalysis();
            if (onEndRef.current) onEndRef.current();
          }
        };
        
        mediaRecorder.start();
        setIsRecording(true);
      } catch (e: any) {
        setError(e.message);
      }
      return;
    }

    // BROWSER NATIVE PATH
    if (!('webkitSpeechRecognition' in window)) {
      const msg = "Web Speech API not supported.";
      setError(msg);
      if (onErrorRef.current) onErrorRef.current(msg);
      return;
    }

    const SpeechRecognition = window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.continuous = true;
    recognition.interimResults = true;
    
    let selectedLang = 'en-US';
    if (settings.language === 'auto') {
        selectedLang = navigator.language || (navigator.languages && navigator.languages[0]) || 'en-US';
    } else {
        const langMap: Record<string, string> = {
            'uk': 'uk-UA',
            'en': 'en-US',
            'pl': 'pl-PL',
            'de': 'de-DE'
        };
        selectedLang = langMap[settings.language] || 'en-US';
    }

    recognition.lang = selectedLang;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let sessionTranscript = '';
      for (let i = 0; i < event.results.length; ++i) {
        sessionTranscript += event.results[i][0].transcript;
      }

      if (onResultRef.current) {
        onResultRef.current(sessionTranscript);
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Speech recognition error:', event.error);
      let msg = event.error;
      if (event.error === 'not-allowed') msg = "Microphone access denied.";
      else if (event.error === 'no-speech') return;

      setError(msg);
      if (onErrorRef.current) onErrorRef.current(msg);
      stopAudioAnalysis();
    };

    recognition.onend = () => {
      setIsRecording(false);
      stopAudioAnalysis();
      if (onEndRef.current) onEndRef.current();
    };

    try {
      await startAudioAnalysis();
      recognition.start();
      recognitionRef.current = recognition;
      setIsRecording(true);
      
      // Haptic feedback
      if ('vibrate' in navigator) {
        navigator.vibrate(50);
      }
    } catch (e) {
      console.error('Error starting recognition:', e);
    }
  }, [startAudioAnalysis, stopAudioAnalysis]);

  const toggleRecording = useCallback(() => {
    if (isRecording) stopRecording();
    else startRecording();
  }, [isRecording, startRecording, stopRecording]);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.onend = null;
        recognitionRef.current.stop();
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
          mediaRecorderRef.current.stop();
      }
      stopAudioAnalysis();
    };
  }, [stopAudioAnalysis]);

  return {
    isRecording,
    isProcessing,
    audioLevel,
    error,
    startRecording,
    stopRecording,
    toggleRecording
  };
};