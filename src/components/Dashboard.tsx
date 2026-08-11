import { useMemo, useState } from "react";
import logo from "@/assets/rased-logo.png.asset.json";
import { KpiCard } from "./KpiCard";
import { FeedItem } from "./FeedItem";
import { EventRow } from "./EventRow";
import { SeverityBadge, StatusBadge } from "./Badge";
import {
  facilityById,
  healthEvents,
  kpis,
  wilayaCoverage,
  type EventStatus,
  type HealthEvent,
} from "@/lib/mockData";

interface DashboardProps {
  role: string;
  demo: boolean;
  onLogout: () => void;
}

const roleLabel: Record<string, string> = {
  demo: "Mode démonstration",
  health_authority: "Autorité sanitaire",
  doctor: "Médecin déclarant",
  admin: "Administrateur",
};

const nextStatus: Record<EventStatus, EventStatus> = {
  pending: "under_review",
  under_review: "confirmed",
  confirmed: "closed",
  closed: "pending",
};

export function Dashboard({ role, demo, onLogout }: DashboardProps) {
  const [events, setEvents] = useState<HealthEvent[]>(healthEvents);
  const [selected, setSelected] = useState<HealthEvent | null>(null);
  const [audit, setAudit] = useState<string[]>([]);

  const alerts = useMemo(
    () =>
      [...events]
        .filter((e) => e.severity === "HIGH" || e.severity === "CRITICAL")
        .sort((a, b) => b.created_at.localeCompare(a.created_at)),
    [events],
  );
  const maxCoverage = Math.max(...wilayaCoverage.map((w) => w.events));
  const current = selected ? events.find((e) => e.id === selected.id) ?? null : null;

  function toggleStatus(event: HealthEvent) {
    const to = nextStatus[event.status];
    setEvents((prev) => prev.map((e) => (e.id === event.id ? { ...e, status: to } : e)));
    setAudit((prev) => [
      `${new Date().toLocaleTimeString("fr-FR")} — ${event.reportable_disease?.name || "Maladie"} : ${event.status} → ${to}`,
      ...prev,
    ]);
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand">
          <img src={logo.url} alt="Rased" className="brand-logo" />
        </div>
        <div className="header-right">
          {demo ? <span className="demo-chip">Données de démonstration</span> : null}
          <span className="role-chip">{roleLabel[role] ?? role}</span>
          <button type="button" className="btn-ghost" onClick={onLogout}>
            Se déconnecter
          </button>
        </div>
      </header>

      <main className="app-main">
        <div className="page-head">
          <h1>Tableau de bord de surveillance</h1>
          <p className="page-sub">
            Situation consolidée des événements sanitaires déclarés sur le réseau national.
          </p>
        </div>

        <section aria-labelledby="kpi-title" className="section">
          <h2 id="kpi-title" className="sr-only">
            Indicateurs clés
          </h2>
          <div className="kpi-grid">
            <KpiCard label="Cas actifs" value={kpis.activeCases} hint="Suivi en cours" />
            <KpiCard label="Épidémies suivies" value={kpis.epidemics} hint="Foyers déclarés" />
            <KpiCard label="Wilayas couvertes" value={kpis.wilayasCovered} hint="Sur 58" />
            <KpiCard label="Alertes ouvertes" value={kpis.alerts} hint="Gravité élevée ou critique" tone="alert" />
          </div>
        </section>

        <div className="two-col">
          <section aria-labelledby="alerts-title" className="panel">
            <div className="panel-head">
              <h2 id="alerts-title">Alertes en direct</h2>
              <span className="panel-count">{alerts.length}</span>
            </div>
            <ul className="feed">
              {alerts.map((event) => (
                <FeedItem key={event.id} event={event} />
              ))}
            </ul>
          </section>

          <section aria-labelledby="coverage-title" className="panel">
            <div className="panel-head">
              <h2 id="coverage-title">Couverture par wilaya</h2>
              <span className="panel-hint">Événements déclarés (30 j)</span>
            </div>
            <ul className="bars">
              {wilayaCoverage.map((w) => (
                <li key={w.wilaya} className="bar-row">
                  <span className="bar-label">{w.wilaya}</span>
                  <span className="bar-track">
                    <span
                      className="bar-fill"
                      style={{ width: `${(w.events / maxCoverage) * 100}%` }}
                    />
                  </span>
                  <span className="bar-value">{w.events}</span>
                </li>
              ))}
            </ul>
            <p className="panel-note">
              Emplacement réservé à la carte interactive des wilayas.
            </p>
          </section>
        </div>

        <section aria-labelledby="events-title" className="panel">
          <div className="panel-head">
            <h2 id="events-title">Événements sanitaires</h2>
            <span className="panel-hint">{events.length} enregistrements</span>
          </div>
          <div className="table-wrap">
            <table className="data-table">
              <caption className="sr-only">
                Liste des événements sanitaires déclarés avec leur statut
              </caption>
              <thead>
                <tr>
                  <th scope="col">Maladie</th>
                  <th scope="col">Établissement</th>
                  <th scope="col">Statut</th>
                  <th scope="col">Déclaré le</th>
                  <th scope="col">Justificatif</th>
                  <th scope="col">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {events.map((event) => (
                  <EventRow key={event.id} event={event} onView={setSelected} />
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {current ? (
          <section aria-labelledby="detail-title" className="panel detail">
            <div className="panel-head">
              <h2 id="detail-title">{current.reportable_disease?.name || "Maladie"}</h2>
              <button type="button" className="btn-ghost" onClick={() => setSelected(null)}>
                Fermer
              </button>
            </div>
            <div className="detail-badges">
              <SeverityBadge severity={current.severity} />
              <StatusBadge status={current.status} />
            </div>
            <p className="detail-desc">{current.description}</p>
            <dl className="detail-grid">
              <div>
                <dt>Établissement</dt>
                <dd>{facilityById(current.facility_id)?.name ?? current.facility_id}</dd>
              </div>
              <div>
                <dt>Wilaya</dt>
                <dd>{facilityById(current.facility_id)?.wilaya ?? "—"}</dd>
              </div>
              <div>
                <dt>NIN patient</dt>
                <dd>{current.patient_nin}</dd>
              </div>
              <div>
                <dt>Médecin déclarant</dt>
                <dd>{current.doctor_id}</dd>
              </div>
            </dl>
            <button type="button" className="btn-primary btn-inline" onClick={() => toggleStatus(current)}>
              Passer au statut suivant
            </button>
            {audit.length > 0 ? (
              <div className="audit" aria-live="polite">
                <h3>Journal des changements (local)</h3>
                <ul>
                  {audit.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </section>
        ) : null}
      </main>
    </div>
  );
}
