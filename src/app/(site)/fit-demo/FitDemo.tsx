"use client";

import { useMemo, useState } from "react";
import { recommendFromBody, templateExplanation } from "@/lib/sizing/recommend";
import { RecommendationView } from "@/components/RecommendationView";
import { BODY_MEASURE_LABELS, POM_LABELS, type BodyMeasure, type Category, type CustomerProfile, type FitPreference, type Pom, type Product } from "@/lib/types";

const BODY_FOR: Record<Category, BodyMeasure[]> = {
  tops: ["chest", "waist", "arm"],
  outerwear: ["chest", "waist", "arm"],
  bottoms: ["waist", "hip", "inseam"],
  dresses: ["chest", "waist", "hip"],
};

export function FitDemo({ products, profiles }: { products: Product[]; profiles: CustomerProfile[] }) {
  const [productId, setProductId] = useState("p-arden");
  const product = products.find((p) => p.id === productId)!;
  const [body, setBody] = useState<Partial<Record<BodyMeasure, number>>>(profiles[0].body);
  const [pref, setPref] = useState<FitPreference>(profiles[0].preference);

  const input = useMemo(() => {
    const keys = BODY_FOR[product.category];
    return Object.fromEntries(keys.filter((k) => body[k]).map((k) => [k, body[k]!])) as Partial<Record<BodyMeasure, number>>;
  }, [body, product.category]);
  const rec = useMemo(() => recommendFromBody(product, { body: input, preference: pref }), [product, input, pref]);
  const poms = Object.keys(product.measurements[product.sizes[0]]) as Pom[];

  return (
    <div className="two-pane">
      <div className="card stack sticky">
        <div className="eyebrow">1 · Choose a fictional garment</div>
        <div className="stack" style={{ marginTop: 8 }}>
          {products.map((p) => (
            <label key={p.id} className="row small" style={{ gap: 10, cursor: "pointer" }}>
              <input type="radio" name="garment" checked={p.id === productId} onChange={() => setProductId(p.id)} />
              <span>
                <strong>{p.name}</strong>
                <span className="muted"> · {p.category}, {p.fitIntent}{p.stretch ? ", stretch" : ""}</span>
              </span>
            </label>
          ))}
        </div>

        <hr className="rule" />
        <div className="eyebrow">2 · Shopper measurements</div>
        <div className="row" style={{ gap: 6 }}>
          {profiles.map((p) => (
            <button key={p.id} className="btn ghost sm" onClick={() => (setBody(p.body), setPref(p.preference))} title={p.note}>
              {p.label.split(" — ")[0]}
            </button>
          ))}
        </div>
        {BODY_FOR[product.category].map((k) => (
          <label key={k} className="field">
            <span>{BODY_MEASURE_LABELS[k]} · {body[k] ?? "—"} cm</span>
            <input
              type="number"
              step="0.5"
              value={body[k] ?? ""}
              onChange={(e) => setBody({ ...body, [k]: e.target.value === "" ? undefined : Number(e.target.value) })}
            />
          </label>
        ))}
        <div>
          <div className="small" style={{ fontWeight: 600, marginBottom: 6 }}>Fit preference</div>
          <div className="seg" role="group" aria-label="Fit preference">
            {(["fitted", "regular", "relaxed"] as const).map((p) => (
              <button key={p} aria-pressed={pref === p} onClick={() => setPref(p)}>{p}</button>
            ))}
          </div>
        </div>
        <p className="tiny muted" style={{ margin: 0 }}>Measurements are typed in, never estimated from a photo.</p>
      </div>

      <div className="stack">
        <div className="card">
          <RecommendationView rec={rec} explanation={templateExplanation(product, rec)} explanationSource="template" productName={product.name} />
        </div>
        <details className="card flat">
          <summary className="small" style={{ cursor: "pointer", fontWeight: 600 }}>{product.name} — fictional measurement chart (cm)</summary>
          <div className="table-wrap" style={{ marginTop: 12 }}>
            <table className="data" style={{ fontSize: 13 }}>
              <thead>
                <tr>
                  <th>Point of measure</th>
                  {product.sizes.map((s) => (
                    <th key={s} className="num">{s}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {poms.map((p) => (
                  <tr key={p}>
                    <td>{POM_LABELS[p]}</td>
                    {product.sizes.map((s) => (
                      <td key={s} className="num mono">{product.measurements[s][p]}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      </div>
    </div>
  );
}
