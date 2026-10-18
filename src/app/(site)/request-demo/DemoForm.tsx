"use client";

import { useState } from "react";

export function DemoForm({ plan }: { plan?: string }) {
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState("sending");
    setError(null);
    const fd = new FormData(e.currentTarget);
    const body = Object.fromEntries(fd.entries());
    const res = await fetch("/api/demo-request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...body, consent: fd.get("consent") === "on" }),
    });
    if (res.ok) setState("done");
    else {
      setState("error");
      setError((await res.json().catch(() => null))?.error ?? "Something went wrong. Please try again.");
    }
  }

  if (state === "done") {
    return (
      <div className="stack" style={{ padding: "24px 4px" }}>
        <div className="display" style={{ fontSize: "2.2rem" }}>Thank you.</div>
        <p className="muted">We&apos;ll be in touch within one working day to find a time. In the meantime, try the fit demonstration.</p>
        <a className="btn ghost" href="/fit-demo">Open the fit demo</a>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="grid g2" style={{ gap: 14 }}>
      <label className="field">
        <span>Full name</span>
        <input type="text" name="name" required autoComplete="name" />
      </label>
      <label className="field">
        <span>Work email</span>
        <input type="email" name="email" required autoComplete="email" />
      </label>
      <label className="field">
        <span>Company</span>
        <input type="text" name="company" required autoComplete="organization" />
      </label>
      <label className="field">
        <span>Role</span>
        <input type="text" name="role" placeholder="e.g. Head of Technical Design" />
      </label>
      <label className="field">
        <span>Company type</span>
        <select name="companyType" required defaultValue="">
          <option value="" disabled>Choose…</option>
          <option value="fashion_brand">Fashion brand</option>
          <option value="ecommerce_retailer">E-commerce retailer</option>
          <option value="marketplace">Marketplace</option>
          <option value="other">Other</option>
        </select>
      </label>
      <label className="field">
        <span>Active styles</span>
        <select name="skuCount" defaultValue={plan === "maison" ? "2500+" : ""}>
          <option value="">Choose…</option>
          <option>Under 250</option>
          <option>250–2,500</option>
          <option>2500+</option>
        </select>
      </label>
      <label className="field" style={{ gridColumn: "1 / -1" }}>
        <span>What would you like to solve?</span>
        <textarea name="message" rows={4} defaultValue={plan ? `Interested in the ${plan[0].toUpperCase() + plan.slice(1)} plan.` : ""} />
      </label>
      <label className="row small" style={{ gridColumn: "1 / -1", alignItems: "flex-start", flexWrap: "nowrap" }}>
        <input type="checkbox" name="consent" required style={{ marginTop: 4 }} />
        <span className="muted">I agree that SizeMemo may store these details and contact me about this demo request. We don&apos;t share them with third parties beyond our CRM provider.</span>
      </label>
      <div style={{ gridColumn: "1 / -1" }} className="row between">
        {error ? <span className="small" style={{ color: "var(--bad)" }}>{error}</span> : <span />}
        <button className="btn burg" disabled={state === "sending"}>{state === "sending" ? "Sending…" : "Request demo"}</button>
      </div>
    </form>
  );
}
