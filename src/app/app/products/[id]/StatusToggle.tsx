"use client";

import { useTransition } from "react";
import { updateProductStatusAction } from "../../actions";

export function StatusToggle({ id, status }: { id: string; status: "active" | "draft" }) {
  const [pending, start] = useTransition();
  const next = status === "draft" ? "active" : "draft";
  return (
    <button className="btn ghost sm" disabled={pending} onClick={() => start(() => updateProductStatusAction(id, next))}>
      {pending ? "Saving…" : status === "draft" ? "Publish (set active)" : "Move to draft"}
    </button>
  );
}
