"use client";

import { useState, useTransition } from "react";
import { recommendAction } from "../actions";
import { RecommendationView } from "@/components/RecommendationView";
import type { Recommendation } from "@/lib/sizing/recommend";
import { BODY_MEASURE_LABELS, type BodyMeasure, type Category, type CustomerProfile, type FitPreference } from "@/lib/types";

type P = { id: string; name: string; category: Category; sizes: string[]; sku: string };

const BODY_FOR: Record<Category, BodyMeasure[]> = {
  tops: ["chest", "waist", "arm"],
  outerwear: ["chest", "waist", "arm"],
  bottoms: ["waist", "hip", "inseam"],
  dresses: ["chest", "waist", "hip"],
};

export function RecommendClient({ products, profiles, initialProductId }: { products: P[]; profiles: CustomerProfile[]; initialProductId: string }) {
  const [productId, setProductId] = useState(products.some((p) => p.id === initialProductId) ? initialProductId : products[0].id);
  const product = products.find((p) => p.id === productId)!;
  const [mode, setMode] = useState<"body" | "reference">("body");
  const [body, setBody] = useState<Partial<Record<BodyMeasure, string>>>({ chest: "100", waist: "88", arm: "63" });
  const [preference, setPreference] = useState<FitPreference>("regular");
  const sameCategory = products.filter((p) => p.category === product.category && p.id !== product.id);
  const [refId, setRefId] = useState<string>("");
  const [refSize, setRefSize] = useState("M");
  const [result, setResult] = useState<{ rec: Recommendation; explanation: { text: string; method: "bedrock" | "template" } } | null>(null);
  const [pending, start] = useTransition();

  const ref = sameCategory.find((p) => p.id === refId) ?? sameCategory[0];

  function run() {
    start(async () => {
      const r =
        mode === "body"
          ? await recommendAction(productId, {
              mode: "body",
              body: {
                preference,
                body: Object.fromEntries(
                  BODY_FOR[product.category].filter((k) => body[k]).map((k) => [k, Number(body[k])]),
                ) as Partial<Record<BodyMeasure, number>>,
              },
            })
          : await recommendAction(productId, { mode: "reference", referenceProductId: ref!.id, referenceSize: refSize });
      setResult(r);
    });
  }

  function loadProfile(id: string) {
    const p = profiles.find((x) => x.id === id);
    if (!p) return;
    setBody(Object.fromEntries(Object.entries(p.body).map(([k, v]) => [k, String(v)])));
    setPreference(p.preference);
    setResult(null);
  }

  return (
    <div className="two-pane">
      <div className="card stack sticky">
        <label className="field">
          <span>Product</span>
          <select value={productId} onChange={(e) => (setProductId(e.target.value), setResult(null), setRefId(""))}>
            {products.map((p) => (
              <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
            ))}
          </select>
        </label>

        <div className="seg" role="group" aria-label="Recommendation method">
          <button aria-pressed={mode === "body"} onClick={() => (setMode("body"), setResult(null))}>Body measurements</button>
          <button aria-pressed={mode === "reference"} onClick={() => (setMode("reference"), setResult(null))} disabled={!sameCategory.length}>
            A garment I own
          </button>
        </div>

        {mode === "body" ? (
          <>
            <label className="field">
              <span>Load a fictional customer profile</span>
              <select defaultValue="" onChange={(e) => loadProfile(e.target.value)}>
                <option value="" disabled>Choose…</option>
                {profiles.map((p) => (
                  <option key={p.id} value={p.id}>{p.label}</option>
                ))}
              </select>
            </label>
            {BODY_FOR[product.category].map((k) => (
              <label className="field" key={k}>
                <span>{BODY_MEASURE_LABELS[k]} (cm)</span>
                <input type="number" step="0.5" min="0" value={body[k] ?? ""} onChange={(e) => setBody({ ...body, [k]: e.target.value })} />
              </label>
            ))}
            <div>
              <div className="small" style={{ fontWeight: 600, marginBottom: 6 }}>Fit preference</div>
              <div className="seg" role="group" aria-label="Fit preference">
                {(["fitted", "regular", "relaxed"] as const).map((p) => (
                  <button key={p} aria-pressed={preference === p} onClick={() => setPreference(p)}>{p}</button>
                ))}
              </div>
            </div>
          </>
        ) : (
          <>
            <label className="field">
              <span>Reference garment (same category)</span>
              <select value={ref?.id ?? ""} onChange={(e) => setRefId(e.target.value)}>
                {sameCategory.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Size that fits well</span>
              <select value={refSize} onChange={(e) => setRefSize(e.target.value)}>
                {(ref?.sizes ?? []).map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
          </>
        )}

        <button className="btn burg" onClick={run} disabled={pending}>{pending ? "Calculating…" : "Calculate size"}</button>
        <p className="tiny muted" style={{ margin: 0 }}>
          Measurements are self-reported. SizeMemo does not measure bodies from photos.
        </p>
      </div>

      <div className="card" style={{ minHeight: 320 }}>
        {result ? (
          <RecommendationView
            rec={result.rec}
            explanation={result.explanation.text}
            explanationSource={result.explanation.method}
            productName={product.name}
          />
        ) : (
          <div className="muted" style={{ padding: "40px 8px" }}>
            <div className="display" style={{ fontSize: "2rem", color: "var(--ink)" }}>Enter measurements and calculate.</div>
            <p style={{ marginTop: 12 }}>
              Try Profile A on the <strong>Arden Poplin Shirt</strong> (on spec) and then on the <strong>Linden Oxford Shirt</strong>: the
              same shopper needs a different size, because Linden&apos;s chest is cut narrower than the brand block.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
