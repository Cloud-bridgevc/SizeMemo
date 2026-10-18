-- SizeMemo PostgreSQL schema (PostgreSQL 15+, e.g. Amazon RDS / Aurora PostgreSQL).
-- All measurements are centimetres. Circumferences are full circumference.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS organizations (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Brand "blocks": the established garment spec per size for a category + fit.
CREATE TABLE IF NOT EXISTS size_charts (
  id          text PRIMARY KEY,
  org_id      uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name        text NOT NULL,
  category    text NOT NULL CHECK (category IN ('tops','bottoms','outerwear','dresses')),
  fit_intent  text NOT NULL CHECK (fit_intent IN ('slim','regular','relaxed')),
  sizes       text[] NOT NULL,
  tolerances  jsonb NOT NULL DEFAULT '{}'::jsonb,   -- { "chest": 2, ... } cm
  notes       text NOT NULL DEFAULT '',
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS size_chart_specs (
  chart_id    text NOT NULL REFERENCES size_charts(id) ON DELETE CASCADE,
  size        text NOT NULL,
  pom         text NOT NULL,
  target_cm   numeric(6,1) NOT NULL CHECK (target_cm > 0),
  PRIMARY KEY (chart_id, size, pom)
);

CREATE TABLE IF NOT EXISTS products (
  id                      text PRIMARY KEY,
  org_id                  uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  sku                     text NOT NULL,
  name                    text NOT NULL,
  category                text NOT NULL CHECK (category IN ('tops','bottoms','outerwear','dresses')),
  fit_intent              text NOT NULL CHECK (fit_intent IN ('slim','regular','relaxed')),
  fabric                  text NOT NULL DEFAULT '',
  stretch                 boolean NOT NULL DEFAULT false,
  colourway               text NOT NULL DEFAULT '',
  size_chart_id           text REFERENCES size_charts(id),
  sizes                   text[] NOT NULL,
  status                  text NOT NULL DEFAULT 'active' CHECK (status IN ('active','draft')),
  -- Only populated once usage rights for the image are confirmed.
  image_key               text,
  image_rights_confirmed  boolean NOT NULL DEFAULT false,
  created_at              timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, sku),
  CHECK (image_key IS NULL OR image_rights_confirmed)
);

CREATE TABLE IF NOT EXISTS garment_measurements (
  product_id  text NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  size        text NOT NULL,
  pom         text NOT NULL,
  value_cm    numeric(6,1) NOT NULL CHECK (value_cm > 0),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (product_id, size, pom)
);

-- Append-only audit of measurement edits (who changed what, from/to).
CREATE TABLE IF NOT EXISTS measurement_revisions (
  id          bigserial PRIMARY KEY,
  product_id  text NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  size        text NOT NULL,
  pom         text NOT NULL,
  old_cm      numeric(6,1),
  new_cm      numeric(6,1),
  edited_by   text NOT NULL,
  edited_at   timestamptz NOT NULL DEFAULT now()
);

-- Sales and return outcomes per product + size (typically loaded nightly from commerce).
CREATE TABLE IF NOT EXISTS sales_outcomes (
  product_id      text NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  size            text NOT NULL,
  period_start    date NOT NULL DEFAULT date_trunc('quarter', now())::date,
  units_sold      integer NOT NULL CHECK (units_sold >= 0),
  units_returned  integer NOT NULL CHECK (units_returned >= 0),
  PRIMARY KEY (product_id, size, period_start)
);

CREATE TABLE IF NOT EXISTS return_feedback (
  id                      text PRIMARY KEY,
  org_id                  uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  product_id              text NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  size                    text NOT NULL,
  order_ref               text NOT NULL DEFAULT '',
  text                    text NOT NULL,
  source                  text NOT NULL,
  received_at             timestamptz NOT NULL,
  -- Classification (null until classified). method: bedrock | rules | manual
  category                text CHECK (category IN ('too_small','too_large','too_long','too_short','unexpected_fit','not_fit_related')),
  area                    text,
  confidence              numeric(3,2),
  rationale               text,
  method                  text CHECK (method IN ('bedrock','rules','manual')),
  model                   text,
  classified_at           timestamptz,
  reviewed                boolean NOT NULL DEFAULT false,
  import_file_key         text      -- S3 key of the CSV this row came from, if any
);
CREATE INDEX IF NOT EXISTS return_feedback_product_idx ON return_feedback (product_id, size);
CREATE INDEX IF NOT EXISTS return_feedback_unclassified_idx ON return_feedback (org_id) WHERE category IS NULL;

-- Fictional / opted-in customer fit profiles used for demonstrations and saved preferences.
CREATE TABLE IF NOT EXISTS customer_profiles (
  id          text PRIMARY KEY,
  org_id      uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  label       text NOT NULL,
  body        jsonb NOT NULL,          -- { "chest": 100, "waist": 88, ... } cm, self-reported
  preference  text NOT NULL CHECK (preference IN ('fitted','regular','relaxed')),
  note        text NOT NULL DEFAULT ''
);

-- Every recommendation served, for outcome analysis (did the customer keep it?).
CREATE TABLE IF NOT EXISTS recommendation_log (
  id                 bigserial PRIMARY KEY,
  org_id             uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  product_id         text NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  mode               text NOT NULL,
  recommended_size   text,
  confidence         text NOT NULL,
  inputs             jsonb NOT NULL,
  created_at         timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS stored_files (
  key           text PRIMARY KEY,         -- S3 object key
  org_id        uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  kind          text NOT NULL CHECK (kind IN ('product_image','feedback_csv','tech_pack','other')),
  content_type  text NOT NULL,
  rights_note   text NOT NULL DEFAULT '',
  uploaded_at   timestamptz NOT NULL DEFAULT now()
);

-- Nightly output of the consistency Lambda, for trend reporting.
CREATE TABLE IF NOT EXISTS consistency_snapshots (
  id           bigserial PRIMARY KEY,
  product_id   text NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  status       text NOT NULL CHECK (status IN ('consistent','measurement_only','feedback_only','potential_inconsistency')),
  summary      text NOT NULL,
  detail       jsonb NOT NULL,
  taken_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS demo_requests (
  id            text PRIMARY KEY,
  name          text NOT NULL,
  email         text NOT NULL,
  company       text NOT NULL,
  role          text NOT NULL DEFAULT '',
  company_type  text NOT NULL,
  sku_count     text NOT NULL DEFAULT '',
  message       text NOT NULL DEFAULT '',
  consent       boolean NOT NULL,
  hubspot_sync  text NOT NULL DEFAULT 'skipped',
  created_at    timestamptz NOT NULL DEFAULT now()
);

COMMIT;
