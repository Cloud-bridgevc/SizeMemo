import type { DemoRequest } from "../types";

/*
 * HubSpot CRM sync for demo requests. Uses a private app token and the CRM v3
 * objects API. When no token is configured the request is stored locally and
 * marked "skipped" — nothing leaves the server.
 *
 * Mapping (see docs/HUBSPOT.md for the full workflow plan):
 *   contact  ← name, email, role, sizememo_consent
 *   company  ← company, sizememo_segment (fashion_brand | ecommerce_retailer | marketplace | other), sizememo_sku_band
 *   deal     ← "SizeMemo demo — <company>" in the demo pipeline, associated to both
 */

const BASE = "https://api.hubapi.com";

async function hs(path: string, body: unknown) {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.HUBSPOT_PRIVATE_APP_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`HubSpot ${path} ${res.status}: ${await res.text()}`);
  return res.json() as Promise<{ id: string }>;
}

export function hubspotConfigured() {
  return Boolean(process.env.HUBSPOT_PRIVATE_APP_TOKEN);
}

export async function syncDemoRequest(r: DemoRequest): Promise<DemoRequest["hubspotSync"]> {
  if (!hubspotConfigured()) return "skipped";
  try {
    const [firstname, ...rest] = r.name.trim().split(/\s+/);
    const contact = await hs("/crm/v3/objects/contacts", {
      properties: {
        email: r.email,
        firstname,
        lastname: rest.join(" "),
        jobtitle: r.role,
        company: r.company,
        lifecyclestage: "marketingqualifiedlead",
        sizememo_consent: String(r.consent),
        sizememo_demo_message: r.message.slice(0, 2000),
      },
    });
    const company = await hs("/crm/v3/objects/companies", {
      properties: { name: r.company, sizememo_segment: r.companyType, sizememo_sku_band: r.skuCount },
    });
    await hs("/crm/v3/objects/deals", {
      properties: {
        dealname: `SizeMemo demo — ${r.company}`,
        pipeline: process.env.HUBSPOT_DEMO_PIPELINE_ID || "default",
        dealstage: process.env.HUBSPOT_DEMO_STAGE_ID || "appointmentscheduled",
        sizememo_segment: r.companyType,
      },
      associations: [
        { to: { id: contact.id }, types: [{ associationCategory: "HUBSPOT_DEFINED", associationTypeId: 3 }] },
        { to: { id: company.id }, types: [{ associationCategory: "HUBSPOT_DEFINED", associationTypeId: 5 }] },
      ],
    });
    return "synced";
  } catch (e) {
    console.error("HubSpot sync failed", e);
    return "failed";
  }
}
