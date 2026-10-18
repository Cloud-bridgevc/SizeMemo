"use client";

import { useState } from "react";

type Series = { key: string; label: string; color: string; values: (number | null)[]; dashed?: boolean };

/** Line chart of one point of measure across sizes. One y-axis, cm. */
export function GradingChart({ sizes, series }: { sizes: string[]; series: Series[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 560;
  const H = 260;
  const pad = { l: 44, r: 16, t: 12, b: 30 };
  const all = series.flatMap((s) => s.values.filter((v): v is number => v != null));
  if (!all.length) return <p className="muted small">No measurements for this point.</p>;
  const lo = Math.floor(Math.min(...all) - 2);
  const hi = Math.ceil(Math.max(...all) + 2);
  const x = (i: number) => pad.l + (i / Math.max(sizes.length - 1, 1)) * (W - pad.l - pad.r);
  const y = (v: number) => pad.t + (1 - (v - lo) / (hi - lo)) * (H - pad.t - pad.b);
  const ticks = Array.from({ length: 5 }, (_, i) => Math.round(lo + ((hi - lo) * i) / 4));

  return (
    <div>
      <div className="legend">
        {series.map((s) => (
          <span key={s.key}>
            <svg width="18" height="8" aria-hidden>
              <line x1="0" y1="4" x2="18" y2="4" stroke={s.color} strokeWidth="2" strokeDasharray={s.dashed ? "4 3" : undefined} />
            </svg>
            {s.label}
          </span>
        ))}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto" }} role="img" aria-label="Measurement by size" onMouseLeave={() => setHover(null)}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke="var(--line)" strokeWidth="1" />
            <text x={pad.l - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill="var(--muted)">{t}</text>
          </g>
        ))}
        {sizes.map((s, i) => (
          <text key={s} x={x(i)} y={H - 8} textAnchor="middle" fontSize="12" fill="var(--ink-2)">{s}</text>
        ))}
        {hover != null && <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={H - pad.b} stroke="var(--ink-2)" strokeWidth="1" strokeDasharray="2 3" />}
        {series.map((s) => {
          const pts = s.values.map((v, i) => (v == null ? null : ([x(i), y(v)] as const))).filter(Boolean) as (readonly [number, number])[];
          return (
            <g key={s.key}>
              <polyline points={pts.map((p) => p.join(",")).join(" ")} fill="none" stroke={s.color} strokeWidth="2" strokeDasharray={s.dashed ? "5 4" : undefined} />
              {!s.dashed && pts.map(([px, py], i) => <circle key={i} cx={px} cy={py} r="4" fill={s.color} stroke="#fffdf9" strokeWidth="2" />)}
            </g>
          );
        })}
        {sizes.map((_, i) => (
          <rect key={i} x={x(i) - 24} y={pad.t} width={48} height={H - pad.t - pad.b} fill="transparent" onMouseEnter={() => setHover(i)} />
        ))}
      </svg>
      <div className="small" style={{ minHeight: 22 }} aria-live="polite">
        {hover != null ? (
          <span>
            <strong>{sizes[hover]}</strong>{" "}
            {series.map((s) => `${s.label.replace(/^Block: /, "block ")}: ${s.values[hover] ?? "—"}`).join(" · ")}
          </span>
        ) : (
          <span className="muted">Hover a size for values.</span>
        )}
      </div>
    </div>
  );
}
