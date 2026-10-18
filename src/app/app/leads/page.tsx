import { getRepository } from "@/lib/data";
import { hubspotConfigured } from "@/lib/integrations/hubspot";

export const metadata = { title: "Demo requests" };

const SEGMENT: Record<string, string> = {
  fashion_brand: "Fashion brand",
  ecommerce_retailer: "E-commerce retailer",
  marketplace: "Marketplace",
  other: "Other",
};

export default async function LeadsPage() {
  const repo = await getRepository();
  const leads = await repo.listDemoRequests();
  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow">CRM</div>
          <h1>Demo requests</h1>
          <p>
            Submissions from the public site. {hubspotConfigured() ? "Each one is synced to HubSpot as a contact, company and deal." : "HubSpot is not configured, so requests are stored here only."} See
            docs/HUBSPOT.md for the onboarding workflows.
          </p>
        </div>
      </div>
      {leads.length === 0 ? (
        <div className="card muted">No demo requests yet. Submit one from <a href="/request-demo" className="burgundy">/request-demo</a>.</div>
      ) : (
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Received</th>
                <th>Name</th>
                <th>Company</th>
                <th>Segment</th>
                <th>SKUs</th>
                <th>Message</th>
                <th>HubSpot</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((l) => (
                <tr key={l.id}>
                  <td className="small mono">{l.createdAt.slice(0, 16).replace("T", " ")}</td>
                  <td className="small">{l.name}<div className="tiny muted">{l.role}</div></td>
                  <td className="small">{l.company}</td>
                  <td className="small">{SEGMENT[l.companyType]}</td>
                  <td className="small">{l.skuCount}</td>
                  <td className="small muted">{l.message}</td>
                  <td>
                    <span className={`badge ${l.hubspotSync === "synced" ? "good" : l.hubspotSync === "failed" ? "bad" : ""}`}>{l.hubspotSync}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
