"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createProductAction } from "../actions";

export function NewProductForm({ charts }: { charts: { id: string; name: string; fitIntent: string }[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <form
      action={(fd) =>
        start(async () => {
          const r = await createProductAction(fd);
          if (!r.ok) setError(r.error);
          else router.push(`/app/products/${r.id}`);
        })
      }
      className="grid g2"
      style={{ gap: 14 }}
    >
      <label className="field">
        <span>Product name</span>
        <input type="text" name="name" required placeholder="e.g. Rowan Seersucker Shirt" />
      </label>
      <label className="field">
        <span>SKU</span>
        <input type="text" name="sku" required placeholder="MH-SH-030" />
      </label>
      <label className="field">
        <span>Size chart (block)</span>
        <select name="sizeChartId" required>
          {charts.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </label>
      <label className="field">
        <span>Fit intent</span>
        <select name="fitIntent" defaultValue="regular">
          <option value="slim">Slim</option>
          <option value="regular">Regular</option>
          <option value="relaxed">Relaxed</option>
        </select>
      </label>
      <label className="field">
        <span>Fabric</span>
        <input type="text" name="fabric" placeholder="100% cotton seersucker" />
      </label>
      <label className="field">
        <span>Colourway</span>
        <input type="text" name="colourway" placeholder="Navy stripe" />
      </label>
      <label className="row small">
        <input type="checkbox" name="stretch" /> Fabric has meaningful stretch
      </label>
      <div className="row" style={{ justifyContent: "flex-end" }}>
        {error && <span className="small" style={{ color: "var(--bad)" }}>{error}</span>}
        <button className="btn" disabled={pending}>{pending ? "Creating…" : "Create draft"}</button>
      </div>
    </form>
  );
}
