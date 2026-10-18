import Link from "next/link";

export const metadata = { title: "Use cases" };

const CASES = [
  {
    id: "brands",
    eyebrow: "Fashion brands",
    title: "Keep every new style true to your block.",
    body: "Technical designers and production teams record sample measurements as they arrive. SizeMemo checks each one against the brand block, so a narrow chest or a long inseam is spotted at sampling, not after launch.",
    teams: [
      ["Technical design", "Measurement editor with tolerance checks and grade sanity checks per size."],
      ["Production", "Off-spec alerts by factory batch, with the measurements to send back."],
      ["Fit & quality", "Feedback-corroborated flags that justify a pattern correction."],
    ],
  },
  {
    id: "retailers",
    eyebrow: "E-commerce retailers",
    title: "Recommend sizes from measurements, not guesswork.",
    body: "Multi-brand retailers inherit everyone else's sizing. SizeMemo normalises supplier measurement charts into one model and recommends a size per product, with the working shown, so customers trust it and customer service can explain it.",
    teams: [
      ["E-commerce", "Embeddable recommendation with confidence and between-sizes messaging."],
      ["Buying & merchandising", "Return rate by product and size, and which suppliers run small or large."],
      ["Customer service", "Classified return reasons, so recurring issues reach the right team."],
    ],
  },
  {
    id: "marketplaces",
    eyebrow: "Marketplaces",
    title: "One fit language across thousands of sellers.",
    body: "Ask sellers for garment measurements once, validate them against category norms, and surface consistent “fits like” guidance across brands. Feedback analysis highlights listings whose sizing confuses shoppers.",
    teams: [
      ["Seller onboarding", "Measurement templates and completeness checks per category."],
      ["Trust & quality", "Listings whose fit feedback is out of line with the category."],
      ["Product", "Cross-brand “fits like” matching based on measured garments."],
    ],
  },
];

export default function UseCases() {
  return (
    <>
      <section className="hero" style={{ paddingBottom: 32 }}>
        <div className="container">
          <div className="eyebrow">Use cases</div>
          <h1 style={{ marginTop: 16, maxWidth: 880 }}>Fit is a team sport. SizeMemo gives every team the same numbers.</h1>
        </div>
      </section>
      {CASES.map((c, i) => (
        <section key={c.id} id={c.id} className="section" style={{ borderTop: "1px solid var(--line)", background: i % 2 ? "var(--paper-2)" : undefined }}>
          <div className="container split" style={{ alignItems: "start" }}>
            <div>
              <div className="eyebrow">{c.eyebrow}</div>
              <h2 style={{ marginTop: 12 }}>{c.title}</h2>
              <p className="lede" style={{ marginTop: 20 }}>{c.body}</p>
            </div>
            <ul className="check-list" style={{ marginTop: 8 }}>
              {c.teams.map(([t, d]) => (
                <li key={t}>
                  <strong>{t}.</strong> <span className="muted">{d}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ))}
      <section className="section" style={{ borderTop: "1px solid var(--line)" }}>
        <div className="container" style={{ textAlign: "center" }}>
          <h2>See the workflow end to end.</h2>
          <div className="row" style={{ justifyContent: "center", marginTop: 28 }}>
            <Link href="/fit-demo" className="btn">Fit demonstration</Link>
            <Link href="/request-demo" className="btn ghost">Request a demo</Link>
          </div>
        </div>
      </section>
    </>
  );
}
