import type { Severity, EventStatus } from "@/lib/mockData";

const severityLabel: Record<Severity, string> = {
  LOW: "Faible",
  MEDIUM: "Modérée",
  HIGH: "Élevée",
  CRITICAL: "Critique",
};

export function SeverityBadge({ severity }: { severity: Severity }) {
  return (
    <span className={`badge badge-${severity.toLowerCase()}`}>
      <span aria-hidden="true" className="badge-dot" />
      {severityLabel[severity]}
    </span>
  );
}

const statusLabel: Record<EventStatus, string> = {
  pending: "En attente",
  under_review: "En examen",
  confirmed: "Confirmé",
  closed: "Clôturé",
};

export function StatusBadge({ status }: { status: EventStatus }) {
  return <span className={`badge badge-status badge-${status}`}>{statusLabel[status]}</span>;
}
