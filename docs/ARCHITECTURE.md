# SizeMemo — AWS architecture

## Principles

- **Deterministic sizing.** Size recommendations and consistency checks are plain arithmetic in
  `src/lib/sizing/`. The same inputs always give the same output, and every number is shown to the user.
- **AI as a support layer.** Amazon Bedrock (Claude, via the Bedrock Mantle Messages endpoint) is used for two
  things only: classifying unstructured return feedback, and phrasing an explanation of a calculation that
  has already been made. Both have deterministic fallbacks (`src/lib/ai/rules.ts`, `templateExplanation`).
- **No body measurement from photos.** Images in S3 are for catalogue display only, and are accepted only once
  usage rights are confirmed (enforced by a DB `CHECK` constraint too).

## Components

```
            ┌──────────────── CloudFront + WAF ────────────────┐
 Browser ──▶│  Next.js app (ECS Fargate or Amplify Hosting)     │
            │   • public site  • /app dashboard  • /api/*        │
            └──────┬──────────────┬──────────────┬──────────────┘
                   │              │              │
          RDS PostgreSQL     Amazon S3       Amazon Bedrock
          (measurements,     (images,        (classification,
           outcomes,          feedback CSV,   explanations)
           feedback)          tech packs)          ▲
                   ▲              │ ObjectCreated   │
                   │              ▼                 │
                   └──── AWS Lambda workers ────────┘
                         • feedbackImport      (S3 event)
                         • classifyBacklog     (EventBridge, every 15 min)
                         • consistencySnapshot (EventBridge, nightly)
                                   │
                                  SQS DLQ on each function
```

| Concern | Service | Notes |
|---|---|---|
| Product measurements, size charts, sales/return outcomes, feedback, recommendation log | **RDS / Aurora PostgreSQL 15+** | Schema in `db/schema.sql`. Private subnets, RDS Proxy for Lambda connections, credentials in Secrets Manager. |
| Product images, feedback CSV exports, tech packs | **Amazon S3** | Private bucket, Block Public Access, default SSE-KMS, lifecycle rule expiring `feedback_csv/` after 90 days. Browser uploads via 5-minute presigned PUT (`src/lib/integrations/s3.ts`). |
| Feedback classification, explanations | **Amazon Bedrock** | `@anthropic-ai/bedrock-sdk` `AnthropicBedrockMantle`, model `anthropic.claude-opus-5-5` (override with `BEDROCK_MODEL_ID`). Structured outputs (Zod schema) for classification, low effort. |
| Background processing | **AWS Lambda** (Node 22) | `lambda/handlers.ts`. Concurrency-limited (4 parallel Bedrock calls per invocation). |
| Scheduling | **EventBridge Scheduler** | Backlog classification and nightly consistency snapshots. |
| Secrets | **Secrets Manager** | DB URL, HubSpot private app token. |
| Observability | CloudWatch Logs (structured JSON), alarms on Lambda errors and DLQ depth. |

## Data flow: return feedback

1. A returns export is pasted into **Import feedback**, or uploaded to S3 under `<org>/feedback_csv/…`.
2. `parseFeedbackCsv` validates every row against the catalogue (SKU and size must exist). Bad rows are reported, not guessed.
3. Each comment goes to `classifyFeedback`: Bedrock returns `{category, area, confidence, rationale}`
   validated against a schema. Refusals, errors or invalid output fall back to the keyword rules.
4. Rows are stored with `method` (`bedrock` / `rules` / `manual`). Confidence < 0.6 lands in the review queue.
   A reviewer's correction is stored as `manual` and always wins.
5. `assessCatalogue` (counting only, no AI) combines the classifications with measurement deviations.

## Data flow: size recommendation

`recommendFromBody` / `recommendFromReference` → `explainRecommendation`. The engine output (size, confidence,
per-POM breakdown) is final before Bedrock is called. The prompt instructs the model to use only the numbers given and
never change the size; if Bedrock is off or fails, the template explanation is used and labelled as such.

## IAM (least privilege)

- **App task role:** `s3:PutObject`/`GetObject` on `arn:aws:s3:::<bucket>/<org>/*`; `bedrock:InvokeModel*` on the
  configured model; `secretsmanager:GetSecretValue` on its two secrets.
- **Lambda role:** `s3:GetObject` on `*/feedback_csv/*`; `bedrock:InvokeModel*`; `rds-db:connect` via RDS Proxy; SQS send to its DLQ.

## Deploying the Lambda workers

```bash
npx esbuild lambda/handlers.ts --bundle --platform=node --target=node22 --outfile=lambda/dist/index.js --external:@aws-sdk/*
```

Handlers: `index.feedbackImport`, `index.classifyBacklog`, `index.consistencySnapshot`.
Environment: `DATABASE_URL`, `SIZEMEMO_ORG_ID`, `AWS_REGION`, `BEDROCK_ENABLED=true`, `BEDROCK_MODEL_ID`.

## Before production

- **Authentication.** The `/app` dashboard has no login in this build. Put it behind Amazon Cognito (or the
  retailer's SSO) and scope every query by `org_id` from the session, not the env var.
- `/app/leads` shows demo-request contact details; restrict it to sales staff.
- Rate-limit `/api/demo-request` at WAF.
- Tune `EASE_RANGES` per brand with fit-session data, and log recommendation outcomes (kept vs returned) to
  `recommendation_log` to measure accuracy.
