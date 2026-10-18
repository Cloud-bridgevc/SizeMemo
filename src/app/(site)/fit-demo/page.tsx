import Link from "next/link";
import { CUSTOMER_PROFILES, FEEDBACK, PRODUCTS, SALES, SIZE_CHARTS } from "@/lib/data/seed";
import { assessCatalogue } from "@/lib/sizing/consistency";
import { FEEDBACK_LABELS, POM_LABELS } from "@/lib/types";
import { catColor } from "@/components/charts";
import { FitDemo } from "./FitDemo";

export const metadata = { title: "Fit demonstration" };

export default function FitDemoPage() {
  const linden = PRODUCTS.find((p) => p.id === "p-linden")!;
  const block = SIZE_CHARTS.find((c) => c.id === linden.sizeChartId)!;
  const result = assessCatalogue(PRODUCTS, SIZE_CHARTS, FEEDBACK, SALES).find((r) => r.productId === "p-linden")!;
  const comments = FEEDBACK.filter((f) => f.productId === "p-linden" && f.classification).slice(0, 6);
  const fb = result.feedback;
  const chestRows = linden.sizes.map((s) => ({ size: s, spec: block.specs[s].chest!, measured: linden.measurements[s].chest! }));

  return (
    <>
      <section className="hero" style={{ paddingBottom: 40 }}>
        <div className="container">
          <div className="eyebrow">Measurement-based fit demonstration</div>
          <h1 style={{ marginTop: 16, maxWidth: 900 }}>
            Watch a size get <em>calculated</em>.
          </h1>
          <p className="lede" style={{ marginTop: 20 }}>
            Every garment, shopper and return below is fictional, from an imaginary label called Maison Halden. The calculation is the real
            SizeMemo engine, running in your browser.
          </p>
        </div>
      </section>

      <section className="section-tight">
        <div className="container">
          <FitDemo
            products={PRODUCTS.filter((p) => ["p-arden", "p-linden", "p-harlow", "p-isla", "p-corin"].includes(p.id))}
            profiles={CUSTOMER_PROFILES}
          />
        </div>
      </section>

      <hr className="rule" />

      <section className="section">
        <div className="container">
          <div className="eyebrow">From returns to a sizing flag</div>
          <h2 style={{ marginTop: 12, maxWidth: 820 }}>How recurring feedback exposed the Linden shirt.</h2>

          <div className="grid g2" style={{ marginTop: 48, alignItems: "start" }}>
            <div className="stack">
              <div className="step-num">01</div>
              <h3>Read what customers wrote</h3>
              <p className="muted">
                Returns arrive as free text. Amazon Bedrock assigns each comment a fit category and the body area it mentions, with a confidence
                score. Uncertain ones go to a person.
              </p>
              {comments.map((f) => (
                <div className="ticket" key={f.id}>
                  <div>“{f.text}”</div>
                  <div className="row tiny muted" style={{ marginTop: 6, gap: 6 }}>
                    <i className="dot" style={{ background: catColor(f.classification!.category) }} />
                    {FEEDBACK_LABELS[f.classification!.category]} · {f.classification!.area} · size {f.size}
                  </div>
                </div>
              ))}
            </div>

            <div className="stack">
              <div className="step-num">02</div>
              <h3>Count the pattern</h3>
              <p className="muted">
                Counting is plain arithmetic, no AI. Of {fb.fitReturns} fit-related comments, {fb.byCategory.too_small} say the shirt is too small,
                most often at the <strong>{fb.topArea}</strong>. Its return rate is {Math.round(fb.returnRate * 100)}%.
              </p>
              <div className="stack-track" style={{ height: 22 }}>
                {(["too_small", "too_large", "too_long", "too_short", "unexpected_fit"] as const)
                  .filter((k) => fb.byCategory[k])
                  .map((k) => (
                    <span key={k} style={{ flex: fb.byCategory[k], background: catColor(k) }} data-tip={`${FEEDBACK_LABELS[k]}: ${fb.byCategory[k]}`} />
                  ))}
              </div>
              <div className="tiny muted">
                {(["too_small", "too_large", "too_long", "too_short", "unexpected_fit"] as const)
                  .filter((k) => fb.byCategory[k])
                  .map((k) => `${FEEDBACK_LABELS[k]} ${fb.byCategory[k]}`)
                  .join(" · ")}
              </div>

              <div className="step-num" style={{ marginTop: 32 }}>03</div>
              <h3>Check the tape measure</h3>
              <p className="muted">
                Independently, Linden&apos;s chest is compared with the brand&apos;s regular shirt block (tolerance ±{block.tolerances.chest} cm).
              </p>
              <div className="table-wrap">
                <table className="data" style={{ fontSize: 13 }}>
                  <thead>
                    <tr>
                      <th>{POM_LABELS.chest}</th>
                      {chestRows.map((r) => (
                        <th key={r.size} className="num">{r.size}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Block spec</td>
                      {chestRows.map((r) => (
                        <td key={r.size} className="num mono">{r.spec}</td>
                      ))}
                    </tr>
                    <tr>
                      <td>Linden</td>
                      {chestRows.map((r) => (
                        <td key={r.size} className="num mono">{r.measured}</td>
                      ))}
                    </tr>
                    <tr>
                      <td>Deviation</td>
                      {chestRows.map((r) => {
                        const d = Math.round((r.measured - r.spec) * 10) / 10;
                        const out = Math.abs(d) > (block.tolerances.chest ?? 2);
                        return (
                          <td key={r.size} className="num mono" style={{ color: out ? "var(--bad)" : undefined, fontWeight: out ? 600 : 400 }}>
                            {d > 0 ? "+" : ""}
                            {d}
                            {out ? " ▲" : ""}
                          </td>
                        );
                      })}
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="step-num" style={{ marginTop: 32 }}>04</div>
              <h3>Flag only when both agree</h3>
              <div className="callout">{result.summary}</div>
              <p className="small muted">
                It&apos;s a <em>potential</em> inconsistency: the next step is a person measuring a physical sample. Meanwhile, the recommendation
                engine already uses Linden&apos;s real measurements, so shoppers are steered to the right size.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="section" style={{ background: "var(--paper-2)", borderTop: "1px solid var(--line)" }}>
        <div className="container split">
          <div>
            <h2>Try it with your own range.</h2>
            <p className="lede" style={{ marginTop: 16 }}>The full dashboard includes the measurement editor, size chart manager, feedback import and reports.</p>
          </div>
          <div className="row">
            <Link href="/request-demo" className="btn burg">Request a demo</Link>
            <Link href="/app" className="btn ghost">Open the demo dashboard</Link>
          </div>
        </div>
      </section>
    </>
  );
}
