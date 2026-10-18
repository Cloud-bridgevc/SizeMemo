import Link from "next/link";

export const metadata = { title: "Pricing" };

const PLANS = [
  {
    name: "Atelier",
    price: "$490",
    period: "per month",
    blurb: "For independent labels getting their sizing in order.",
    features: ["Up to 250 active styles", "Measurement editor & size chart manager", "Return feedback import (CSV)", "AI feedback classification, 2,000 comments / mo", "Consistency monitoring", "Email support"],
  },
  {
    name: "Studio",
    price: "$1,450",
    period: "per month",
    blurb: "For growing brands and retailers selling online at scale.",
    featured: true,
    features: ["Up to 2,500 active styles", "Everything in Atelier", "Fit recommendation API & storefront widget", "AI classification, 20,000 comments / mo", "S3 background imports & scheduled reports", "HubSpot and commerce integrations", "Onboarding with a fit specialist"],
  },
  {
    name: "Maison",
    price: "Custom",
    period: "annual agreement",
    blurb: "For multi-brand retailers and marketplaces.",
    features: ["Unlimited styles and brands", "Everything in Studio", "Supplier measurement onboarding", "Dedicated AWS region & data residency", "SSO, audit logs and SLA", "Custom ease targets per brand"],
  },
];

export default function Pricing() {
  return (
    <>
      <section className="hero" style={{ paddingBottom: 40 }}>
        <div className="container" style={{ textAlign: "center" }}>
          <div className="eyebrow">Pricing</div>
          <h1 style={{ marginTop: 16 }}>Priced by the range you carry.</h1>
          <p className="lede" style={{ margin: "20px auto 0" }}>All plans include unlimited users and every core capability. Indicative pricing in USD; annual billing saves two months.</p>
        </div>
      </section>
      <section className="section-tight">
        <div className="container grid g3" style={{ alignItems: "stretch" }}>
          {PLANS.map((p) => (
            <div key={p.name} className={`card plan stack${p.featured ? " featured" : ""}`} style={{ display: "flex", flexDirection: "column" }}>
              <div className="row between">
                <h3 style={{ margin: 0 }}>{p.name}</h3>
                {p.featured && <span className="badge burg">Most chosen</span>}
              </div>
              <div>
                <span className="price">{p.price}</span> <span className="small muted">{p.period}</span>
              </div>
              <p className="small muted">{p.blurb}</p>
              <ul className="check-list" style={{ flex: 1 }}>
                {p.features.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
              <Link href={`/request-demo?plan=${p.name.toLowerCase()}`} className={`btn${p.featured ? " burg" : " ghost"}`}>
                {p.price === "Custom" ? "Talk to us" : "Request a demo"}
              </Link>
            </div>
          ))}
        </div>
      </section>
      <section className="section-tight">
        <div className="container grid g3">
          {[
            ["What counts as a style?", "One product in one colourway family that shares a measurement chart. Sizes don't count separately."],
            ["Do you charge for recommendations?", "No. Recommendations are deterministic calculations and are unmetered on Studio and Maison."],
            ["Where is data stored?", "In your plan's AWS region: PostgreSQL for measurements and outcomes, S3 for files. Bedrock runs in the same region."],
          ].map(([q, a]) => (
            <div key={q}>
              <h3 style={{ fontSize: "1.25rem" }}>{q}</h3>
              <p className="small muted" style={{ marginTop: 8 }}>{a}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
