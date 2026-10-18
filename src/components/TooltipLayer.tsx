"use client";

import { useEffect, useState } from "react";

/** One tooltip for every element with a data-tip attribute (chart marks, cells). */
export function TooltipLayer() {
  const [tip, setTip] = useState<{ text: string; x: number; y: number } | null>(null);
  useEffect(() => {
    const move = (e: PointerEvent) => {
      const el = (e.target as HTMLElement | null)?.closest?.("[data-tip]") as HTMLElement | null;
      if (!el) return setTip(null);
      setTip({ text: el.dataset.tip!, x: e.clientX, y: e.clientY });
    };
    const hide = () => setTip(null);
    window.addEventListener("pointermove", move);
    window.addEventListener("scroll", hide, true);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("scroll", hide, true);
    };
  }, []);
  if (!tip) return null;
  const left = Math.min(tip.x + 14, (typeof window !== "undefined" ? window.innerWidth : 1200) - 270);
  return (
    <div className="chart-tip" style={{ left, top: tip.y + 14 }} role="tooltip">
      {tip.text.split("\n").map((line, i) => (
        <div key={i}>{line}</div>
      ))}
    </div>
  );
}
