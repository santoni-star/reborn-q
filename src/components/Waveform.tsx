import { useEffect, useRef } from 'react';

interface WaveformProps {
  level: number;
  isRecording: boolean;
  className?: string;
}

export const Waveform = ({ level, isRecording, className }: WaveformProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bars = useRef<number[]>(new Array(20).fill(0.1));

  useEffect(() => {
    if (!isRecording) {
      bars.current = bars.current.map(() => 0.1);
      return;
    }

    // Shift bars and add new level
    const newBars = [...bars.current.slice(1), Math.max(0.1, level)];
    bars.current = newBars;
  }, [level, isRecording]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    const render = () => {
      const { width, height } = canvas;
      ctx.clearRect(0, 0, width, height);

      const barWidth = width / bars.current.length;
      const spacing = 2;

      bars.current.forEach((barHeight, index) => {
        const h = barHeight * height;
        const x = index * barWidth;
        const y = (height - h) / 2;

        // Triple A Gradient
        const gradient = ctx.createLinearGradient(0, y, 0, y + h);
        gradient.addColorStop(0, '#6366f1'); // indigo-500
        gradient.addColorStop(1, '#a855f7'); // purple-500

        ctx.fillStyle = isRecording ? gradient : '#3f3f46'; // zinc-700 fallback
        
        // Rounded rectangles for Triple A look
        const radius = 2;
        ctx.beginPath();
        ctx.roundRect(x + spacing, y, barWidth - spacing * 2, h, radius);
        ctx.fill();
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [isRecording]);

  return (
    <canvas
      ref={canvasRef}
      width={120}
      height={32}
      className={className}
    />
  );
};
