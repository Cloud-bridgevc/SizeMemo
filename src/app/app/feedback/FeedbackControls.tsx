"use client";

import { useState, useTransition } from "react";
import { classifyPendingAction, reviewClassificationAction } from "../actions";
import { BODY_AREAS, FEEDBACK_CATEGORIES, FEEDBACK_LABELS, type BodyArea, type FeedbackCategory } from "@/lib/types";

export function ClassifyPendingButton({ count }: { count: number }) {
  const [pending, start] = useTransition();
  const [done, setDone] = useState<number | null>(null);
  return (
    <button
      className="btn"
      disabled={pending || count === 0}
      onClick={() => start(async () => setDone((await classifyPendingAction()).classified))}
    >
      {pending ? "Classifying…" : done != null ? `Classified ${done}` : `Classify ${count} unclassified`}
    </button>
  );
}

export function ReviewControls({ id, category, area, reviewed }: { id: string; category?: FeedbackCategory; area?: BodyArea; reviewed: boolean }) {
  const [cat, setCat] = useState<FeedbackCategory | "">(category ?? "");
  const [ar, setAr] = useState<BodyArea>(area ?? "overall");
  const [pending, start] = useTransition();
  const [ok, setOk] = useState(reviewed);
  const changed = cat !== (category ?? "") || ar !== (area ?? "overall");

  return (
    <div className="row" style={{ gap: 6, flexWrap: "nowrap" }}>
      <select value={cat} onChange={(e) => (setCat(e.target.value as FeedbackCategory), setOk(false))} aria-label="Category" style={{ height: 32, fontSize: 13, minWidth: 130 }}>
        <option value="" disabled>Category…</option>
        {FEEDBACK_CATEGORIES.map((c) => (
          <option key={c} value={c}>{FEEDBACK_LABELS[c]}</option>
        ))}
      </select>
      <select value={ar} onChange={(e) => (setAr(e.target.value as BodyArea), setOk(false))} aria-label="Area" style={{ height: 32, fontSize: 13, minWidth: 96 }}>
        {BODY_AREAS.map((a) => (
          <option key={a}>{a}</option>
        ))}
      </select>
      {ok && !changed ? (
        <span className="badge good" title="Reviewed">✓</span>
      ) : (
        <button
          className="btn sm"
          disabled={!cat || pending}
          onClick={() => start(async () => (await reviewClassificationAction(id, cat as FeedbackCategory, ar), setOk(true)))}
        >
          {changed ? "Save" : "Confirm"}
        </button>
      )}
    </div>
  );
}
