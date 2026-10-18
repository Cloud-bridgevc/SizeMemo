import { DemoForm } from "./DemoForm";

export const metadata = { title: "Request a demo" };

export default async function RequestDemo({ searchParams }: { searchParams: Promise<{ plan?: string }> }) {
  const { plan } = await searchParams;
  return (
    <section className="hero">
      <div className="container split" style={{ alignItems: "start" }}>
        <div>
          <div className="eyebrow">Request a demo</div>
          <h1 style={{ marginTop: 16, fontSize: "clamp(2.4rem, 5vw, 3.8rem)" }}>Bring a size chart and a returns export.</h1>
          <p className="lede" style={{ marginTop: 20 }}>
            In 45 minutes we&apos;ll load a sample of your range, classify a batch of real return comments, and show you where measurements and
            feedback disagree.
          </p>
          <ul className="check-list" style={{ marginTop: 28, maxWidth: 480 }}>
            <li>A fit specialist, not a script</li>
            <li>Your data stays in a private, time-limited workspace</li>
            <li>A written summary of what we found</li>
          </ul>
        </div>
        <div className="card" style={{ boxShadow: "var(--shadow)" }}>
          <DemoForm plan={plan} />
        </div>
      </div>
    </section>
  );
}
