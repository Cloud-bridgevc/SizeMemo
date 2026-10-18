import { EASE_RANGES, LENGTH_RANGES } from "@/lib/sizing/ease";
import { POM_LABELS, type Pom } from "@/lib/types";

export const metadata = { title: "Methodology & limitations" };

export default function Methodology() {
  const tops = EASE_RANGES.tops;
  return (
    <>
      <section className="hero" style={{ paddingBottom: 32 }}>
        <div className="container">
          <div className="eyebrow">Methodology & limitations</div>
          <h1 style={{ marginTop: 16, maxWidth: 900 }}>What SizeMemo calculates, and what it doesn&apos;t.</h1>
        </div>
      </section>

      <section className="section-tight">
        <div className="container grid g2" style={{ alignItems: "start", gap: 56 }}>
          <div className="stack">
            <h2 style={{ fontSize: "2rem" }}>Size matching is deterministic</h2>
            <p>For each size and each point of measure the engine computes <strong>ease</strong>: garment measurement minus body measurement.</p>
            <p>
              Ease is compared with a target range that depends on garment category and the shopper&apos;s fit preference. Inside the range costs
              nothing. Outside it, the penalty is the distance in centimetres × the point&apos;s weight. Too-tight distances are multiplied by 1.5,
              because a garment that is too small can&apos;t be worn, while one that&apos;s slightly loose usually can.
            </p>
            <p>
              The size with the lowest total penalty is suggested. When two adjacent sizes score within 1.5 points, the shopper is told they&apos;re
              between sizes. Stretch fabrics allow 3 cm less ease at circumference points.
            </p>
            <p>
              The same inputs always give the same output. Amazon Bedrock is used afterwards only to phrase the explanation; it never picks or
              changes a size.
            </p>
          </div>
          <div className="card">
            <h3>Default ease targets — tops (cm)</h3>
            <table className="data" style={{ marginTop: 12 }}>
              <thead>
                <tr><th>Point</th><th className="num">Fitted</th><th className="num">Regular</th><th className="num">Relaxed</th></tr>
              </thead>
              <tbody>
                {(Object.keys(tops) as Pom[]).map((p) => (
                  <tr key={p}>
                    <td>{POM_LABELS[p]}</td>
                    {(["fitted", "regular", "relaxed"] as const).map((f) => (
                      <td key={f} className="num mono">{tops[p]![f][0]} to {tops[p]![f][1]}</td>
                    ))}
                  </tr>
                ))}
                <tr>
                  <td>Sleeve vs arm</td>
                  <td colSpan={3} className="num mono">{LENGTH_RANGES.tops!.sleeve![0]} to {LENGTH_RANGES.tops!.sleeve![1]} (all preferences)</td>
                </tr>
              </tbody>
            </table>
            <p className="tiny muted" style={{ marginTop: 12, marginBottom: 0 }}>
              Defaults are starting points and should be tuned with each brand&apos;s fit sessions.
            </p>
          </div>
        </div>
      </section>

      <section className="section-tight">
        <div className="container grid g2" style={{ alignItems: "start", gap: 56 }}>
          <div className="stack">
            <h2 style={{ fontSize: "2rem" }}>AI interprets feedback</h2>
            <p>
              Return comments are unstructured. A Claude model on Amazon Bedrock assigns each one a category (too small, too large, too long, too
              short, unexpected fit or not fit-related), the body area mentioned, a confidence score and a one-line rationale.
            </p>
            <p>
              Low-confidence results are queued for review, and a person&apos;s correction always overrides the model. If Bedrock is unavailable, a
              transparent keyword classifier is used and labelled as such.
            </p>
          </div>
          <div className="stack">
            <h2 style={{ fontSize: "2rem" }}>Consistency needs two signals</h2>
            <p>
              A product is flagged as a <em>potential sizing inconsistency</em> only when its measurements sit outside the brand block&apos;s
              tolerance in two or more sizes <strong>and</strong> classified feedback complains in the matching direction and body area.
            </p>
            <p>One signal alone is reported separately: off-spec measurements may be a deliberate design choice, and feedback alone may point to fabric or styling.</p>
          </div>
        </div>
      </section>

      <section className="section" style={{ background: "var(--paper-2)", borderTop: "1px solid var(--line)" }}>
        <div className="container">
          <h2>Limitations, stated plainly</h2>
          <div className="grid g2" style={{ marginTop: 32 }}>
            <ul className="check-list">
              <li>SizeMemo does not measure bodies. It uses measurements a shopper enters, or a garment they already own.</li>
              <li>We do not estimate body measurements from photographs. We would only offer that alongside a validated, consent-based measurement system.</li>
              <li>Self-measurement commonly varies by 1–2 cm, enough to change a result near a size boundary.</li>
            </ul>
            <ul className="check-list">
              <li>Garments carry manufacturing tolerances. A recommendation is only as good as the measurements on file.</li>
              <li>Fabric drape, stretch recovery, posture and personal taste are only partly captured by numbers.</li>
              <li>Every recommendation shows a confidence level and its full working, so shoppers and staff can judge it for themselves.</li>
            </ul>
          </div>
        </div>
      </section>
    </>
  );
}
