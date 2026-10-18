"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { importFeedbackAction, presignUploadAction } from "../../actions";
import { FEEDBACK_LABELS } from "@/lib/types";
import { catColor } from "@/components/charts";

type Result = Awaited<ReturnType<typeof importFeedbackAction>>;

export function ImportClient({ sample, s3 }: { sample: string; s3: boolean }) {
  const [csv, setCsv] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [pending, start] = useTransition();
  const [s3Status, setS3Status] = useState<string | null>(null);

  async function readFile(file: File) {
    setCsv(await file.text());
    setResult(null);
  }

  async function sendToS3(file: File) {
    setS3Status("Requesting upload URL…");
    const r = await presignUploadAction("feedback_csv", file.name, file.type || "text/csv");
    if (!r.ok) return setS3Status(r.error);
    const put = await fetch(r.url, { method: "PUT", body: file, headers: { "Content-Type": file.type || "text/csv" } });
    setS3Status(put.ok ? "Uploaded. The import Lambda will classify it; results appear in Return feedback within a few minutes." : `Upload failed (${put.status}).`);
  }

  return (
    <div className="stack">
      <div className="grid g2" style={{ alignItems: "start" }}>
        <div className="card stack">
          <div className="row between">
            <h3 style={{ margin: 0 }}>Paste or open a CSV</h3>
            <button className="linkish small" onClick={() => (setCsv(sample), setResult(null))}>Use fictional sample</button>
          </div>
          <textarea
            rows={10}
            value={csv}
            onChange={(e) => setCsv(e.target.value)}
            placeholder="sku,size,order_ref,received_at,feedback"
            style={{ fontFamily: "ui-monospace, Menlo, monospace", fontSize: 12 }}
            aria-label="CSV content"
          />
          <div className="row between">
            <input type="file" accept=".csv,text/csv" onChange={(e) => e.target.files?.[0] && readFile(e.target.files[0])} aria-label="Open CSV file" />
            <button className="btn burg" disabled={!csv.trim() || pending} onClick={() => start(async () => setResult(await importFeedbackAction(csv)))}>
              {pending ? "Importing & classifying…" : "Import & classify"}
            </button>
          </div>
        </div>
        <div className="card beige stack small">
          <h3>Format</h3>
          <p>
            Required columns: <span className="mono">sku</span>, <span className="mono">size</span>, <span className="mono">feedback</span>.
            Optional: <span className="mono">order_ref</span>, <span className="mono">received_at</span>, <span className="mono">source</span>.
          </p>
          <p className="muted">
            Only include the free-text reason and order reference. Do not include customer names, emails or addresses — they are not needed for
            fit analysis.
          </p>
          <hr className="rule" />
          <h3>Background import via S3</h3>
          <p className="muted">For exports over a few hundred rows. The file goes straight to the private bucket; a Lambda parses and classifies it.</p>
          <input type="file" accept=".csv,text/csv" disabled={!s3} onChange={(e) => e.target.files?.[0] && sendToS3(e.target.files[0])} aria-label="Upload CSV to S3" />
          {!s3 && <p className="tiny muted">S3 is not configured in this environment.</p>}
          {s3Status && <p className="tiny">{s3Status}</p>}
        </div>
      </div>

      {result && (
        <div className="card">
          <div className="panel-title">
            <h3>
              Imported {result.imported} row{result.imported === 1 ? "" : "s"}
              {result.errors.length ? `, ${result.errors.length} skipped` : ""}
            </h3>
            <Link href="/app/feedback?filter=pending" className="small burgundy">Review queue →</Link>
          </div>
          {result.errors.length > 0 && (
            <ul className="small" style={{ color: "var(--bad)" }}>
              {result.errors.map((e) => (
                <li key={e.line}>Line {e.line}: {e.message}</li>
              ))}
            </ul>
          )}
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>SKU / size</th>
                  <th>Feedback</th>
                  <th>Classification</th>
                  <th>Why</th>
                </tr>
              </thead>
              <tbody>
                {result.results.map((r) => (
                  <tr key={r.id}>
                    <td className="mono small">{r.sku} · {r.size}</td>
                    <td className="small">“{r.text}”</td>
                    <td className="small">
                      {r.classification && (
                        <span className="row" style={{ gap: 6 }}>
                          <i className="dot" style={{ background: catColor(r.classification.category) }} />
                          {FEEDBACK_LABELS[r.classification.category]} · {r.classification.area}
                          <span className="muted">({Math.round(r.classification.confidence * 100)}%, {r.classification.method})</span>
                        </span>
                      )}
                    </td>
                    <td className="small muted">{r.classification?.rationale}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
