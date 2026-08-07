import { StatusBadge, SeverityBadge } from "./Badge";
import { facilityById, type HealthEvent } from "@/lib/mockData";

interface EventRowProps {
  event: HealthEvent;
  onView: (event: HealthEvent) => void;
}

export function EventRow({ event, onView }: EventRowProps) {
  const facility = facilityById(event.facility_id);
  const created = new Date(event.created_at);
  return (
    <tr>
      <th scope="row" className="cell-primary">
        <span className="cell-title">{event.incident_type}</span>
        <SeverityBadge severity={event.severity} />
      </th>
      <td>
        {facility?.name ?? event.facility_id}
        <span className="cell-sub">{facility?.wilaya}</span>
      </td>
      <td>
        <StatusBadge status={event.status} />
      </td>
      <td>
        <time dateTime={event.created_at}>
          {created.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}{" "}
          {created.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
        </time>
      </td>
      <td>
        {event.patient_proof_url ? (
          <a className="link" href={event.patient_proof_url} target="_blank" rel="noreferrer">
            Justificatif
          </a>
        ) : (
          <span className="muted">—</span>
        )}
      </td>
      <td className="cell-action">
        <button type="button" className="btn-ghost" onClick={() => onView(event)}>
          Consulter<span className="sr-only"> {event.incident_type}</span>
        </button>
      </td>
    </tr>
  );
}
