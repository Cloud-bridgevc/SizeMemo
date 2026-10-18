# SizeMemo — HubSpot CRM workflow plan

The demo request form (`/request-demo`) posts to `/api/demo-request`, which validates the input and, when
`HUBSPOT_PRIVATE_APP_TOKEN` is set, creates a **contact**, **company** and **deal** via the CRM v3 API
(`src/lib/integrations/hubspot.ts`). Without a token, requests are stored locally and marked `skipped`.

## Custom properties to create

| Object | Property | Type | Values |
|---|---|---|---|
| Company | `sizememo_segment` | Dropdown | `fashion_brand`, `ecommerce_retailer`, `marketplace`, `other` |
| Company | `sizememo_sku_band` | Dropdown | `Under 250`, `250–2,500`, `2500+` |
| Contact | `sizememo_consent` | Single checkbox | true/false (form consent) |
| Contact | `sizememo_demo_message` | Multi-line text | |
| Deal | `sizememo_segment` | Dropdown | as above |
| Deal | `sizememo_plan_interest` | Dropdown | Atelier, Studio, Maison |
| Company | `sizememo_onboarding_stage` | Dropdown | see onboarding pipeline |
| Company | `sizememo_styles_loaded`, `sizememo_feedback_classified` | Number | updated from product usage |

## Pipelines

**1. Demo pipeline** (`HUBSPOT_DEMO_PIPELINE_ID`)
Demo requested → Demo scheduled → Demo held → Data pilot (sample size chart + returns export) → Proposal → Closed won / Closed lost.

**2. Customer onboarding pipeline** (a second deal or ticket pipeline, created on Closed won)
Kick-off → Size charts loaded → Product measurements loaded → First feedback import classified → Recommendation widget live → 30-day fit review → Onboarded.

## Workflows

### W1 — New demo request (all segments)
Trigger: deal created in Demo pipeline.
1. Rotate owner by segment: fashion brands → brand team; retailers and marketplaces → retail team.
2. Create task "Book demo within 1 working day" for the owner.
3. Send confirmation email with a link to the public fit demo.
4. If no meeting booked after 3 days → reminder email; after 7 days → owner task to call.

### W2 — Fashion brands
Enrol: `sizememo_segment = fashion_brand`.
- Pre-demo email asking for one size chart (block) and one returns export, explaining that customer names/emails should be removed.
- Demo agenda template: measurement editor → consistency monitoring → product comparison.
- After demo: send the "Linden shirt" case write-up (feedback + measurements → sizing flag).

### W3 — E-commerce retailers
Enrol: `sizememo_segment = ecommerce_retailer`.
- Pre-demo email asking which brands drive the most fit returns.
- Demo agenda template: recommendation engine with working shown → return analysis by supplier → reports.
- After demo: send the recommendation API/widget overview and the methodology & limitations page.

### W4 — Marketplaces
Enrol: `sizememo_segment = marketplace` or `sizememo_sku_band = 2500+`.
- Route to an enterprise owner; create a security/data-residency questionnaire task.

### W5 — Data pilot
Trigger: deal stage = Data pilot.
- Create a time-limited workspace task for solutions; ticket for "load sample size chart", "classify sample returns".
- At pilot end, owner task to send the written findings summary.

### W6 — Customer onboarding
Trigger: deal Closed won.
1. Create onboarding record; set `sizememo_onboarding_stage = Kick-off`.
2. Product events (later, via a SizeMemo → HubSpot sync job) advance the stage:
   first size chart saved → *Size charts loaded*; ≥ 25 products with measurements → *Product measurements loaded*;
   first import classified → *First feedback import classified*.
3. If a stage hasn't advanced in 14 days → CSM task.
4. Day 30 → schedule fit review; send report exports.

### W7 — Consent and hygiene
- Only contacts with `sizememo_consent = true` enter marketing emails; others get the transactional confirmation only.
- Unsubscribes and deletion requests suppress the contact across all workflows.

## Implementation notes

- Use a **private app** with scopes `crm.objects.contacts.write`, `crm.objects.companies.write`, `crm.objects.deals.write`.
- The current sync creates new records each time. Before going live, search contacts by email and companies by
  domain first (`/crm/v3/objects/contacts/search`) to avoid duplicates, or use the batch upsert endpoints keyed on email.
- Sync failures are recorded as `hubspot_sync = failed` on the stored request so they can be replayed.
