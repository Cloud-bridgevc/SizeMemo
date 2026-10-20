import { notFound } from "next/navigation";
import { getRepository } from "@/lib/data";
import { CATEGORY_POMS, type SizeChart } from "@/lib/types";
import { SizeChartEditor } from "./SizeChartEditor";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (id === "new") return { title: "New size chart" };
  return { title: (await (await getRepository()).getSizeChart(id))?.name ?? "Size chart" };
}

export default async function SizeChartPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const repo = await getRepository();
  let chart: SizeChart | null;
  if (id === "new") {
    chart = {
      id: `chart-${Date.now().toString(36)}`,
      name: "",
      category: "tops",
      fitIntent: "regular",
      sizes: ["XS", "S", "M", "L", "XL"],
      specs: {},
      tolerances: { chest: 2, waist: 2.5, shoulder: 1, length: 1.5, sleeve: 1.5 },
      notes: "",
    };
  } else {
    chart = await repo.getSizeChart(id);
  }
  if (!chart) notFound();
  const products = (await repo.listProducts()).filter((p) => p.sizeChartId === chart.id);
  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow">Size chart manager</div>
          <h1>{id === "new" ? "New block" : chart.name}</h1>
          <p>Target garment measurements per size, and how far a product may deviate before it is flagged.</p>
        </div>
      </div>
      <SizeChartEditor chart={chart} isNew={id === "new"} categoryPoms={CATEGORY_POMS} productNames={products.map((p) => p.name)} />
    </>
  );
}
