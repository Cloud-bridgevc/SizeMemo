"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { saveSizeChartAction } from "../../actions";
import { POM_LABELS, type Category, type FitIntent, type Pom, type SizeChart } from "@/lib/types";

export function SizeChartEditor({
  chart,
  isNew,
  categoryPoms,
  productNames,
}: {
  chart: SizeChart;
  isNew: boolean;
  categoryPoms: Record<Category, Pom[]>;
  productNames: string[];
}) {
  const router = useRouter();
  const [c, setC] = useState<SizeChart>(chart);
  const [pending, start] = useTransition();
  const [saved, setSaved] = useState(false);
  const poms = categoryPoms[c.category];

  const setSpec = (size: string, pom: Pom, v: string) =>
    setC((x) => ({ ...x, specs: { ...x.specs, [size]: { ...x.specs[size], [pom]: v === "" ? undefined : Number(v) } } }));

  /** Fill all sizes from the base size using a constant grade per POM. */
  const [grades, setGrades] = useState<Partial<Record<Pom, string>>>({});
  function applyGrade(pom: Pom) {
    const base = c.sizes.indexOf("M");
    const baseVal = c.specs["M"]?.[pom];
    const g = Number(grades[pom]);
    if (baseVal == null || !Number.isFinite(g)) return;
    setC((x) => {
      const specs = { ...x.specs };
      x.sizes.forEach((s, i) => (specs[s] = { ...specs[s], [pom]: Math.round((baseVal + (i - base) * g) * 10) / 10 }));
      return { ...x, specs };
    });
  }

  function save() {
    start(async () => {
      await saveSizeChartAction(c);
      setSaved(true);
      if (isNew) router.push(`/app/size-charts/${c.id}`);
      else router.refresh();
    });
  }

  return (
    <div className="stack">
      <div className="card grid g4" style={{ gap: 14 }}>
        <label className="field" style={{ gridColumn: "span 2" }}>
          <span>Name</span>
          <input type="text" value={c.name} onChange={(e) => setC({ ...c, name: e.target.value })} placeholder="Knitwear — Relaxed block" />
        </label>
        <label className="field">
          <span>Category</span>
          <select value={c.category} disabled={!isNew} onChange={(e) => setC({ ...c, category: e.target.value as Category })}>
            {Object.keys(categoryPoms).map((k) => (
              <option key={k}>{k}</option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Fit intent</span>
          <select value={c.fitIntent} onChange={(e) => setC({ ...c, fitIntent: e.target.value as FitIntent })}>
            <option>slim</option>
            <option>regular</option>
            <option>relaxed</option>
          </select>
        </label>
        <label className="field" style={{ gridColumn: "1 / -1" }}>
          <span>Notes (measuring method, base size, grade rules)</span>
          <input type="text" value={c.notes} onChange={(e) => setC({ ...c, notes: e.target.value })} />
        </label>
      </div>

      <div className="table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th>Point of measure (cm)</th>
              {c.sizes.map((s) => (
                <th key={s} className="num">{s}</th>
              ))}
              <th className="num">Tolerance ±</th>
              <th>Grade from M</th>
            </tr>
          </thead>
          <tbody>
            {poms.map((pom) => (
              <tr key={pom}>
                <td style={{ fontWeight: 500 }}>{POM_LABELS[pom]}</td>
                {c.sizes.map((s) => (
                  <td key={s} className="num">
                    <input
                      className="cell"
                      type="number"
                      step="0.5"
                      value={c.specs[s]?.[pom] ?? ""}
                      onChange={(e) => setSpec(s, pom, e.target.value)}
                      aria-label={`${POM_LABELS[pom]} ${s}`}
                    />
                  </td>
                ))}
                <td className="num">
                  <input
                    className="cell"
                    type="number"
                    step="0.5"
                    value={c.tolerances[pom] ?? ""}
                    onChange={(e) => setC({ ...c, tolerances: { ...c.tolerances, [pom]: e.target.value === "" ? undefined : Number(e.target.value) } })}
                    aria-label={`${POM_LABELS[pom]} tolerance`}
                  />
                </td>
                <td>
                  <div className="row" style={{ flexWrap: "nowrap", gap: 6 }}>
                    <input
                      className="cell"
                      type="number"
                      step="0.5"
                      placeholder="+/size"
                      value={grades[pom] ?? ""}
                      onChange={(e) => setGrades({ ...grades, [pom]: e.target.value })}
                      aria-label={`${POM_LABELS[pom]} grade per size`}
                    />
                    <button
                      className="btn ghost sm"
                      onClick={() => applyGrade(pom)}
                      disabled={!grades[pom] || c.specs["M"]?.[pom] == null}
                      title={c.specs["M"]?.[pom] == null ? "Enter the size M value first" : "Fill all sizes from M using this grade"}
                    >
                      Apply
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="row between">
        <span className="small muted">
          {productNames.length ? `Used by: ${productNames.join(", ")}. Changes re-run consistency checks for these products.` : "Not yet used by any product."}
        </span>
        <div className="row">
          {saved && !pending && <span className="small" style={{ color: "var(--good)" }}>✓ Saved</span>}
          <button className="btn" onClick={save} disabled={pending}>{pending ? "Saving…" : "Save block"}</button>
        </div>
      </div>
    </div>
  );
}
