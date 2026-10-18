import type { ConsistencyStatus } from "@/lib/sizing/consistency";
import type { Confidence } from "@/lib/sizing/recommend";

const STATUS: Record<ConsistencyStatus, { label: string; cls: string; icon: string }> = {
  potential_inconsistency: { label: "Potential inconsistency", cls: "bad", icon: "▲" },
  measurement_only: { label: "Off-spec measurements", cls: "warn", icon: "◆" },
  feedback_only: { label: "Feedback signal only", cls: "warn", icon: "●" },
  consistent: { label: "Consistent", cls: "good", icon: "✓" },
};

export function ConsistencyBadge({ status }: { status: ConsistencyStatus }) {
  const s = STATUS[status];
  return (
    <span className={`badge ${s.cls}`}>
      <span aria-hidden>{s.icon}</span>
      {s.label}
    </span>
  );
}

export function ConfidenceBadge({ confidence }: { confidence: Confidence }) {
  const cls = confidence === "high" ? "good" : confidence === "medium" ? "warn" : "bad";
  return (
    <span className={`badge ${cls}`}>
      <span aria-hidden>{confidence === "high" ? "✓" : confidence === "medium" ? "◆" : "▲"}</span>
      {confidence[0].toUpperCase() + confidence.slice(1)} confidence
    </span>
  );
}
