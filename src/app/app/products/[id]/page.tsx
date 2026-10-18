import Link from "next/link";
import { notFound } from "next/navigation";
import { loadWorkspace } from "@/lib/load";
import { countBy, pct } from "@/lib/analytics";
import { StackedBars } from "@/components/charts";
import { ConsistencyBadge } from "@/components/StatusBadge";
import { CATEGORY_POMS, FEEDBACK_LABELS } from "@/lib/types";
import { MeasurementEditor } from "./MeasurementEditor";
import { ImagePanel } from "./ImagePanel";
import { s3Configured } from "@/lib/integrations/s3";

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { products, charts, feedback, sales, consistency } = await loadWorkspace();
  const product = products.find((p) => p.id === id);
  if (!product) notFound();
  const chart = charts.find((c) => c.id === product.sizeChartId) ?? null;
  const c = consistency.find((x) => x.productId === id);
  const mine = feedback.filter((f) => f.productId === id);
  const bySize = countBy(mine, (f) => f.size);
  const s = sales.filter((x) => x.productId === id);
  const sold = s.reduce((a, x) => a + x.unitsSold, 0);
  const ret = s.reduce((a, x) => a + x.unitsReturned, 0);

  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow">
            <Link href="/app/products" style={{ textDecoration: "none" }}>Catalogue</Link> / {product.sku}
          </div>
          <h1>{product.name}</h1>
          <p>
            {product.category} · {product.fitIntent} fit · {product.fabric}
            {product.stretch ? " · stretch" : ""} · {product.colourway}
          </p>
        </div>
        <div className="row">
          {c && <ConsistencyBadge status={c.status} />}
          <Link className="btn ghost sm" href={`/app/compare?a=${product.id}`}>Compare</Link>
          <Link className="btn sm" href={`/app/recommend?product=${product.id}`}>Try a recommendation</Link>
        </div>
      </div>

      {c && c.status !== "consistent" && <div className="callout" style={{ marginBottom: 24 }}>{c.summary}</div>}

      <div className="card" style={{ marginBottom: 24 }}>
        <div className="panel-title">
          <h3>Garment measurements</h3>
          <span className="tiny muted">cm · full circumference · spec from {chart?.name ?? "no chart"}</span>
        </div>
        <MeasurementEditor product={product} chart={chart} poms={CATEGORY_POMS[product.category]} />
      </div>

      <div className="grid g2">
        <div className="card">
          <div className="panel-title">
            <h3>Returns by size</h3>
            <span className="tiny muted">
              {pct(sold ? ret / sold : 0, 1)} overall · {ret} of {sold}
            </span>
          </div>
          {bySize.size ? (
            <StackedBars rows={product.sizes.filter((x) => bySize.has(x)).map((x) => ({ key: x, label: x, counts: bySize.get(x)! }))} />
          ) : (
            <p className="muted small">No classified feedback yet.</p>
          )}
        </div>
        <div className="card">
          <div className="panel-title">
            <h3>Recent feedback</h3>
            <Link href={`/app/feedback?product=${product.id}`} className="small burgundy">All {mine.length} →</Link>
          </div>
          <div className="stack">
            {mine
              .slice(-6)
              .reverse()
              .map((f) => (
                <div key={f.id} className="ticket">
                  <div className="row between tiny muted">
                    <span>Size {f.size} · {f.receivedAt.slice(0, 10)}</span>
                    <span>{f.classification ? FEEDBACK_LABELS[f.classification.category] : "Unclassified"}</span>
                  </div>
                  <div style={{ marginTop: 4 }}>“{f.text}”</div>
                </div>
              ))}
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 24 }}>
        <ImagePanel productId={product.id} imageKey={product.imageKey} rightsConfirmed={product.imageRightsConfirmed} s3={s3Configured()} />
      </div>
    </>
  );
}
