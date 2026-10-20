import React, { useEffect, useRef } from "react";

export default function VoiceVisualizer({ isConnected, isSpeaking, audioLevel = 0 }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let animationFrameId;
    let angle = 0;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const baseRadius = 110;

      // Audio reactive amplitude
      const amplitude = isSpeaking ? 25 + audioLevel * 40 : isConnected ? 10 : 3;
      angle += 0.03;

      // Background multi-layer glow
      const grad = ctx.createRadialGradient(centerX, centerY, 10, centerX, centerY, baseRadius + amplitude + 30);
      if (isSpeaking) {
        grad.addColorStop(0, "rgba(236, 72, 153, 0.8)");
        grad.addColorStop(0.5, "rgba(147, 51, 234, 0.5)");
        grad.addColorStop(1, "rgba(0, 0, 0, 0)");
      } else if (isConnected) {
        grad.addColorStop(0, "rgba(59, 130, 246, 0.8)");
        grad.addColorStop(0.5, "rgba(37, 99, 235, 0.4)");
        grad.addColorStop(1, "rgba(0, 0, 0, 0)");
      } else {
        grad.addColorStop(0, "rgba(107, 114, 128, 0.4)");
        grad.addColorStop(1, "rgba(0, 0, 0, 0)");
      }

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(centerX, centerY, baseRadius + amplitude + 40, 0, Math.PI * 2);
      ctx.fill();

      // Fluid Organic Sphere Waveforms
      for (let layer = 0; layer < 3; layer++) {
        ctx.beginPath();
        const points = 120;
        for (let i = 0; i <= points; i++) {
          const theta = (i / points) * Math.PI * 2;
          const wave = Math.sin(theta * 6 + angle + layer) * Math.cos(theta * 4 - angle) * amplitude;
          const r = baseRadius + wave + layer * 4;
          const x = centerX + Math.cos(theta) * r;
          const y = centerY + Math.sin(theta) * r;

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.closePath();

        if (isSpeaking) {
          ctx.strokeStyle = layer === 0 ? "#f43f5e" : layer === 1 ? "#a855f7" : "#3b82f6";
          ctx.lineWidth = 3 - layer * 0.5;
        } else if (isConnected) {
          ctx.strokeStyle = layer === 0 ? "#60a5fa" : layer === 1 ? "#3b82f6" : "#2563eb";
          ctx.lineWidth = 2.5;
        } else {
          ctx.strokeStyle = "#4b5563";
          ctx.lineWidth = 1.5;
        }
        ctx.stroke();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [isConnected, isSpeaking, audioLevel]);

  return (
    <div className="visualizer-wrapper">
      <canvas
        ref={canvasRef}
        width={400}
        height={400}
        className={`sphere-glow ${isSpeaking ? "speaking" : isConnected ? "listening" : ""}`}
        style={{ width: "100%", maxWidth: "320px", height: "auto" }}
      />
    </div>
  );
}

