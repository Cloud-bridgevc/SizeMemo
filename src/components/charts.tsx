import { FEEDBACK_CATEGORIES, FEEDBACK_LABELS, type FeedbackCategory } from "@/lib/types";
import type { CategoryCounts } from "@/lib/analytics";

export const catColor = (c: FeedbackCategory) => `var(--cat-${c})`;

export function CategoryLegend({ include = FEEDBACK_CATEGORIES }: { include?: readonly FeedbackCategory[] }) {
  return (
    <div className="legend" aria-label="Legend">
      {include.map((c) => (
        <span key={c}>
          <i className="dot" style={{ background: catColor(c) }} />
          {FEEDBACK_LABELS[c]}
        </span>
      ))}
    </div>
  );
}

/** Horizontal stacked bars: one row per label, segments per feedback category. */
export function StackedBars({
  rows,
  include = FEEDBACK_CATEGORIES,
  scaleTo,
}: {
  rows: { label: React.ReactNode; key: string; counts: CategoryCounts; note?: string }[];
  include?: readonly FeedbackCategory[];
  scaleTo?: number;
}) {
  const totals = rows.map((r) => include.reduce((a, c) => a + r.counts[c], 0));
  const max = scaleTo ?? Math.max(1, ...totals);
  return (
    <div>
      <CategoryLegend include={include} />
      <div className="bars" role="table">
        {rows.map((r, i) => (
          <div className="bar-row" key={r.key} role="row">
            <div role="rowheader" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {r.label}
            </div>
            <div className="stack-track" style={{ width: `${(totals[i] / max) * 100}%`, minWidth: totals[i] ? 4 : 0 }} role="cell">
              {include
                .filter((c) => r.counts[c] > 0)
                .map((c) => (
                  <span
                    key={c}
                    style={{ flex: r.counts[c], background: catColor(c) }}
                    data-tip={`${typeof r.label === "string" ? r.label + "\n" : ""}${FEEDBACK_LABELS[c]}: ${r.counts[c]} (${Math.round((r.counts[c] / totals[i]) * 100)}%)`}
                  />
                ))}
            </div>
            <div className="num mono muted" role="cell">
              {totals[i]}
              {r.note ? <span className="tiny"> {r.note}</span> : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Simple single-series horizontal bars. */
export function BarList({
  rows,
  format = (n) => String(n),
  color = "var(--ink-2)",
}: {
  rows: { key: string; label: React.ReactNode; value: number; tip?: string; highlight?: boolean }[];
  format?: (n: number) => string;
  color?: string;
}) {
  const max = Math.max(1e-9, ...rows.map((r) => r.value));
  return (
    <div className="bars">
      {rows.map((r) => (
        <div className="bar-row" key={r.key}>
          <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.label}</div>
          <div className="bar-track">
            <div
              className="bar-fill"
              style={{ width: `${(r.value / max) * 100}%`, background: r.highlight ? "var(--burgundy)" : color }}
              data-tip={r.tip ?? `${format(r.value)}`}
            />
          </div>
          <div className="num mono">{format(r.value)}</div>
        </div>
      ))}
    </div>
  );
}

/** Sequential single-hue cell tint for heat tables (burgundy, light → dark). */
export function heat(rate: number, max = 0.4) {
  const t = Math.max(0, Math.min(1, rate / max));
  const alpha = 0.06 + t * 0.6;
  return { background: `rgba(111, 36, 53, ${alpha.toFixed(3)})`, color: t > 0.6 ? "#fffdf9" : "var(--ink)" };
}
