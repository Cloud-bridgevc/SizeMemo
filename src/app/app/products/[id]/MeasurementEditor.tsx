"use client";

import { useMemo, useState, useTransition } from "react";
import { saveMeasurementsAction } from "../../actions";
import { POM_LABELS, type Pom, type Product, type SizeChart } from "@/lib/types";

type M = Product["measurements"];

export function MeasurementEditor({ product, chart, poms }: { product: Product; chart: SizeChart | null; poms: Pom[] }) {
  const [values, setValues] = useState<Record<string, Record<string, string>>>(() =>
    Object.fromEntries(product.sizes.map((s) => [s, Object.fromEntries(poms.map((p) => [p, product.measurements[s]?.[p]?.toString() ?? ""]))])),
  );
  const [saved, setSaved] = useState<M>(product.measurements);
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  const visiblePoms = poms.filter((p) => product.sizes.some((s) => saved[s]?.[p] != null || values[s][p] !== ""));
  const hiddenPoms = poms.filter((p) => !visiblePoms.includes(p));
  const [extra, setExtra] = useState<Pom[]>([]);
  const shown = [...visiblePoms, ...extra.filter((p) => !visiblePoms.includes(p))];

  const dirty = useMemo(
    () => product.sizes.some((s) => shown.some((p) => (values[s][p] === "" ? undefined : Number(values[s][p])) !== saved[s]?.[p])),
    [values, saved, product.sizes, shown],
  );

  const set = (size: string, pom: Pom, v: string) => setValues((x) => ({ ...x, [size]: { ...x[size], [pom]: v } }));

  /** Grade between consecutive sizes, used to sanity-check entries. */
  const grade = (pom: Pom, i: number) => {
    if (i === 0) return null;
    const a = Number(values[product.sizes[i - 1]][pom]);
    const b = Number(values[product.sizes[i]][pom]);
    return a && b ? Math.round((b - a) * 10) / 10 : null;
  };

  function save() {
    const m: M = {};
    for (const s of product.sizes) {
      m[s] = {};
      for (const p of shown) if (values[s][p] !== "") m[s][p] = Number(values[s][p]);
    }
    start(async () => {
      await saveMeasurementsAction(product.id, m);
      setSaved(m);
      setMessage("Saved. Consistency checks and recommendations now use these values.");
    });
  }

  return (
    <div>
      <div className="table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th>Point of measure</th>
              {product.sizes.map((s) => (
                <th key={s} className="num">{s}</th>
              ))}
              <th className="num">Tolerance</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((pom) => (
              <tr key={pom}>
                <td>
                  <div style={{ fontWeight: 500 }}>{POM_LABELS[pom]}</div>
                </td>
                {product.sizes.map((s, i) => {
                  const raw = values[s][pom];
                  const n = raw === "" ? undefined : Number(raw);
                  const spec = chart?.specs[s]?.[pom];
                  const tol = chart?.tolerances[pom];
                  const dev = n != null && spec != null ? Math.round((n - spec) * 10) / 10 : null;
                  const out = dev != null && tol != null && Math.abs(dev) > tol;
                  const changed = n !== saved[s]?.[pom];
                  const g = grade(pom, i);
                  return (
                    <td key={s} className="num" style={{ minWidth: 92 }}>
                      <input
                        className={`cell${changed ? " changed" : ""}${out ? " out" : ""}`}
                        type="number"
                        step="0.5"
                        min="0"
                        value={raw}
                        onChange={(e) => set(s, pom, e.target.value)}
                        aria-label={`${POM_LABELS[pom]} size ${s}`}
                      />
                      <div
                        className="tiny mono"
                        style={{ color: out ? "var(--bad)" : "var(--muted)", marginTop: 2 }}
                        data-tip={spec != null ? `Spec ${spec} cm · deviation ${dev != null && dev > 0 ? "+" : ""}${dev ?? "—"} cm${g != null ? `\nGrade from previous size: ${g > 0 ? "+" : ""}${g} cm` : ""}` : "No spec in chart"}
                      >
                        {spec != null ? `spec ${spec}` : "—"}
                        {dev ? ` (${dev > 0 ? "+" : ""}${dev})` : ""}
                        {out ? " ▲" : ""}
                      </div>
                    </td>
                  );
                })}
                <td className="num mono small muted">{chart?.tolerances[pom] != null ? `±${chart.tolerances[pom]}` : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="row between" style={{ marginTop: 14 }}>
        <div className="row small">
          {hiddenPoms.filter((p) => !extra.includes(p)).map((p) => (
            <button key={p} className="btn ghost sm" onClick={() => setExtra((x) => [...x, p])}>+ {POM_LABELS[p]}</button>
          ))}
          <span className="tiny muted">▲ outside chart tolerance · amber = unsaved edit</span>
        </div>
        <div className="row">
          {message && !dirty && <span className="small" style={{ color: "var(--good)" }}>✓ {message}</span>}
          <button className="btn" disabled={!dirty || pending} onClick={save}>{pending ? "Saving…" : "Save measurements"}</button>
        </div>
      </div>
    </div>
  );
}
