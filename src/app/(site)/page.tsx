import Link from "next/link";

export default function Home() {
  return (
    <>
      <section className="hero">
        <div className="container split">
          <div>
            <div className="eyebrow">Apparel fit intelligence</div>
            <h1 style={{ marginTop: 16 }}>
              Sizing that <em>remembers</em> every measurement.
            </h1>
            <p className="lede" style={{ marginTop: 24 }}>
              SizeMemo connects your garment measurements, size charts and return feedback, so you can recommend sizes from real numbers and
              catch products that don&apos;t fit like the rest of your range.
            </p>
            <div className="row" style={{ marginTop: 32 }}>
              <Link href="/fit-demo" className="btn">See how a size is calculated</Link>
              <Link href="/request-demo" className="btn ghost">Request a demo</Link>
            </div>
          </div>
          <div className="hero-figure" aria-label="Example recommendation card">
            <div className="row between">
              <span className="eyebrow">Linden Oxford Shirt · fictional</span>
              <span className="badge warn">◆ Medium confidence</span>
            </div>
            <div className="display" style={{ fontSize: "4.6rem", margin: "10px 0 4px" }}>XL</div>
            <p className="small muted">Shopper usually wears L. Linden&apos;s chest measures 5 cm narrower than the brand&apos;s shirt block.</p>
            <div className="tape" aria-hidden />
            <table className="data" style={{ fontSize: 13, background: "transparent" }}>
              <thead>
                <tr><th>POM</th><th className="num">Garment</th><th className="num">Body</th><th className="num">Ease</th><th>Target</th></tr>
              </thead>
              <tbody>
                <tr><td>Chest</td><td className="num mono">110.5</td><td className="num mono">100</td><td className="num mono">+10.5</td><td className="small">9–15 ✓</td></tr>
                <tr><td>Waist</td><td className="num mono">106</td><td className="num mono">88</td><td className="num mono">+18</td><td className="small">10–18 ✓</td></tr>
                <tr><td>Sleeve</td><td className="num mono">67</td><td className="num mono">63</td><td className="num mono">+4</td><td className="small">−1–2.5 · long</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <hr className="rule" />

      <section className="section">
        <div className="container">
          <div className="split" style={{ alignItems: "start" }}>
            <div>
              <div className="eyebrow">Why fit goes wrong</div>
              <h2 style={{ marginTop: 12 }}>The answers are already in your tech packs and your returns.</h2>
            </div>
            <div className="stack lede" style={{ fontSize: "1.05rem" }}>
              <p>
                A shirt from a new factory comes in a little narrow. Nobody notices until the returns arrive, and the comments say the same thing
                in a hundred different ways: <span className="italic">tight across the chest</span>, <span className="italic">buttons pull</span>,{" "}
                <span className="italic">runs small</span>.
              </p>
              <p>
                SizeMemo reads those comments, groups them into fit categories, and lays them next to the garment&apos;s measured specification.
                When both say the same thing, your fit team gets one clear, evidenced flag.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="section" style={{ background: "var(--paper-2)", borderTop: "1px solid var(--line)", borderBottom: "1px solid var(--line)" }}>
        <div className="container">
          <div className="eyebrow">The platform</div>
          <h2 style={{ marginTop: 12, maxWidth: 760 }}>Five capabilities, one source of measurement truth.</h2>
          <div className="grid g3" style={{ marginTop: 48 }}>
            {[
              ["Garment measurement intelligence", "Store every point of measure for every size. Compare products, sizes and categories against your brand blocks, with a full edit history."],
              ["Fit recommendation engine", "Deterministic size matching from garment measurements and a shopper's own measurements, fit preference, or a garment they already own."],
              ["Return feedback analysis", "AI classifies free-text return reasons into too small, too large, too long, too short or unexpected fit — with a human review queue."],
              ["Size consistency monitoring", "Flags products whose measurements drift from your established sizing, and checks whether customer feedback agrees."],
              ["Fit insights dashboard", "Return rates by product and size, fit-issue patterns by category, and exportable reports for production meetings."],
              ["Built for honesty", "Every recommendation shows its working and its confidence. No body scanning, no black box, no invented precision."],
            ].map(([t, d]) => (
              <div key={t} className="card flat" style={{ borderColor: "var(--line-strong)" }}>
                <h3>{t}</h3>
                <p className="small muted" style={{ margin: 0 }}>{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="eyebrow">How a recommendation works</div>
          <h2 style={{ marginTop: 12 }}>Arithmetic first. AI second.</h2>
          <div className="grid g3" style={{ marginTop: 48 }}>
            <div>
              <div className="step-num">01</div>
              <h3 style={{ marginTop: 12 }}>Measure the garment</h3>
              <p className="muted">Your team records chest, waist, hip, lengths and more for every size, against the block it was graded from.</p>
            </div>
            <div>
              <div className="step-num">02</div>
              <h3 style={{ marginTop: 12 }}>Compare with the shopper</h3>
              <p className="muted">
                Garment minus body gives the ease at each point. Each size is scored against the ease range for the shopper&apos;s fit preference. The
                lowest score wins.
              </p>
            </div>
            <div>
              <div className="step-num">03</div>
              <h3 style={{ marginTop: 12 }}>Explain it plainly</h3>
              <p className="muted">
                Amazon Bedrock turns the finished calculation into a short, readable explanation. It never picks the size or changes the numbers.
              </p>
            </div>
          </div>
          <div className="row" style={{ marginTop: 32 }}>
            <Link href="/fit-demo" className="btn">Try the fit demonstration</Link>
            <Link href="/methodology" className="linkish">Read the methodology and limitations</Link>
          </div>
        </div>
      </section>

      <section className="section" style={{ background: "var(--ink)", color: "var(--paper)" }}>
        <div className="container split">
          <div>
            <div className="eyebrow" style={{ color: "var(--beige-2)" }}>What we won&apos;t claim</div>
            <h2 style={{ marginTop: 12 }}>We don&apos;t measure bodies from photographs.</h2>
          </div>
          <div style={{ color: "var(--beige)" }}>
            <p>
              SizeMemo uses measurements that shoppers enter themselves, or a garment they already own. It does not estimate body measurements
              from photos, and it will not do so unless a validated, consent-based measurement system is in place.
            </p>
            <p>
              Recommendations are guidance. Self-measurement varies by a centimetre or two, fabrics behave differently, and taste is personal —
              so every result carries a confidence level and says when a shopper is between sizes.
            </p>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container" style={{ textAlign: "center" }}>
          <h2>See your own range through SizeMemo.</h2>
          <p className="lede" style={{ margin: "16px auto 32px" }}>
            Bring a size chart and a returns export. We&apos;ll walk through what the measurements and the comments are telling you.
          </p>
          <Link href="/request-demo" className="btn burg">Request a demo</Link>
        </div>
      </section>
    </>
  );
}
