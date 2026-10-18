import { z } from "zod";
import { getRepository } from "@/lib/data";
import { syncDemoRequest } from "@/lib/integrations/hubspot";
import type { DemoRequest } from "@/lib/types";

const Schema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(200),
  company: z.string().trim().min(1).max(160),
  role: z.string().trim().max(120).default(""),
  companyType: z.enum(["fashion_brand", "ecommerce_retailer", "marketplace", "other"]),
  skuCount: z.string().trim().max(40).default(""),
  message: z.string().trim().max(2000).default(""),
  consent: z.literal(true),
});

export async function POST(req: Request) {
  const parsed = Schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    const field = parsed.error.issues[0]?.path[0];
    return Response.json({ error: field === "consent" ? "Please confirm consent to be contacted." : `Please check the ${String(field ?? "form")} field.` }, { status: 400 });
  }
  const request: DemoRequest = {
    id: crypto.randomUUID(),
    ...parsed.data,
    createdAt: new Date().toISOString(),
    hubspotSync: "skipped",
  };
  request.hubspotSync = await syncDemoRequest(request);
  const repo = await getRepository();
  await repo.addDemoRequest(request);
  return Response.json({ ok: true });
}
