import React, { useEffect, useRef } from "react";

interface VisualizerProps {
  analyser: AnalyserNode | null;
  isPlaying: boolean;
}

export const Visualizer: React.FC<VisualizerProps> = ({ analyser, isPlaying }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;
    const bufferLength = analyser ? analyser.frequencyBinCount : 32;
    const dataArray = new Uint8Array(bufferLength);

    const renderFrame = () => {
      const width = canvas.width;
      const height = canvas.height;
      ctx.fillStyle = "#0c0c0e";
      ctx.fillRect(0, 0, width, height);

      const barCount = 24;
      const gap = 2;
      const barWidth = Math.floor((width - gap * (barCount - 1)) / barCount);

      if (analyser && isPlaying) {
        analyser.getByteFrequencyData(dataArray);
      } else {
        for (let i = 0; i < bufferLength; i++) {
          dataArray[i] = 6;
        }
      }

      for (let i = 0; i < barCount; i++) {
        const value = dataArray[i % bufferLength] || 0;
        const normalized = value / 255;
        const segments = 8;
        const activeSegments = Math.max(1, Math.round(normalized * segments));
        const segHeight = Math.floor((height - (segments - 1)) / segments);
        const x = i * (barWidth + gap);

        for (let s = 0; s < segments; s++) {
          const y = height - (s + 1) * (segHeight + 1);
          if (s < activeSegments) {
            if (s >= 6) {
              ctx.fillStyle = "#ff5500";
            } else if (s >= 4) {
              ctx.fillStyle = "#f59e0b";
            } else {
              ctx.fillStyle = "#f2f0ea";
            }
          } else {
            ctx.fillStyle = "#1c1c21";
          }
          ctx.fillRect(x, y, barWidth, segHeight);
        }
      }

      animationId = requestAnimationFrame(renderFrame);
    };

    renderFrame();
    return () => cancelAnimationFrame(animationId);
  }, [analyser, isPlaying]);

  return (
    <div className="bg-obsidian border border-hairline px-2 py-1.5 shadow-recessed flex flex-col justify-between">
      <div className="flex items-center justify-between text-[9px] font-mono tracking-widest text-ash mb-1">
        <span>SPECTRUM // 24-BAND</span>
        <span className={isPlaying ? "text-signal" : "text-ash"}>
          {isPlaying ? "ACTIVE" : "IDLE"}
        </span>
      </div>
      <canvas
        ref={canvasRef}
        width={184}
        height={34}
        className="block w-[184px] h-[34px]"
      />
    </div>
  );
};
