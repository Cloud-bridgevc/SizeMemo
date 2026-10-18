import type { Metadata } from "next";
import { getRepository } from "@/lib/data";
import { bedrockEnabled, modelId } from "@/lib/ai/bedrock";
import { TooltipLayer } from "@/components/TooltipLayer";
import { Sidebar } from "./Sidebar";

export const metadata: Metadata = { title: { default: "Dashboard", template: "%s · SizeMemo" } };
export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const repo = await getRepository();
  const dataMode = repo.kind === "postgres" ? "PostgreSQL" : "in-memory demo (fictional)";
  const aiMode = bedrockEnabled() ? `Amazon Bedrock (${modelId()})` : "keyword rules (Bedrock off)";
  return (
    <div className="app">
      <Sidebar dataMode={dataMode} aiMode={aiMode} />
      <main className="main">{children}</main>
      <TooltipLayer />
    </div>
  );
}
