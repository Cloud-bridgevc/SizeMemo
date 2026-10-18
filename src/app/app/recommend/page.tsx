import { loadWorkspace } from "@/lib/load";
import { RecommendClient } from "./RecommendClient";

export const metadata = { title: "Fit recommendation" };

export default async function RecommendPage({ searchParams }: { searchParams: Promise<{ product?: string }> }) {
  const { product } = await searchParams;
  const { products, profiles } = await loadWorkspace();
  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow">Fit recommendation engine</div>
          <h1>Recommend a size</h1>
          <p>
            Deterministic matching of garment measurements against a shopper&apos;s measurements and fit preference, or against a garment they
            already own. Every step of the calculation is shown.
          </p>
        </div>
      </div>
      <RecommendClient
        products={products.map((p) => ({ id: p.id, name: p.name, category: p.category, sizes: p.sizes, sku: p.sku }))}
        profiles={profiles}
        initialProductId={product ?? "p-linden"}
      />
    </>
  );
}
