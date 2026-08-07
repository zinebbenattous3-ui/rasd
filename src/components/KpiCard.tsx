import type { ReactNode } from "react";

interface KpiCardProps {
  label: string;
  value: number | string;
  hint?: string;
  icon?: ReactNode;
  tone?: "default" | "alert";
}

export function KpiCard({ label, value, hint, icon, tone = "default" }: KpiCardProps) {
  return (
    <article className={`kpi-card${tone === "alert" ? " kpi-card-alert" : ""}`}>
      <div className="kpi-head">
        <h3 className="kpi-label">{label}</h3>
        {icon ? (
          <span className="kpi-icon" aria-hidden="true">
            {icon}
          </span>
        ) : null}
      </div>
      <p className="kpi-value">{value}</p>
      {hint ? <p className="kpi-hint">{hint}</p> : null}
    </article>
  );
}
