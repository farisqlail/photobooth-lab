"use client";

import { useEffect, useRef } from "react";

export default function PhotoboothCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    let canvas: import("fabric").Canvas | null = null;
    let mounted = true;

    const setup = async () => {
      const { fabric } = await import("fabric");
      if (!canvasRef.current || !mounted) {
        return;
      }
      canvas = new fabric.Canvas(canvasRef.current, {
        width: 640,
        height: 420,
        backgroundColor: "#0b0b10",
      });

      const frame = new fabric.Rect({
        left: 24,
        top: 24,
        width: 592,
        height: 372,
        rx: 24,
        ry: 24,
        fill: "#0f172a",
        stroke: "#7c3aed",
        strokeWidth: 2,
      });

      const label = new fabric.Text("Live Preview", {
        left: 232,
        top: 190,
        fill: "#94a3b8",
        fontSize: 20,
        fontFamily: "Inter",
      });

      canvas.add(frame, label);
    };

    setup();

    return () => {
      mounted = false;
      if (canvas) {
        canvas.dispose();
      }
    };
  }, []);

  return (
    <div className="w-full overflow-hidden rounded-2xl border border-border bg-card p-4">
      <canvas ref={canvasRef} className="w-full rounded-xl" />
    </div>
  );
}
