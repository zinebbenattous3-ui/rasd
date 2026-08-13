import { useState } from "react";
import { SeverityBadge } from "./Badge";
import { facilityById, type HealthEvent } from "@/lib/mockData";
import { PatientProofViewer } from "@/components/medical/PatientProofViewer";
import { formatDateTime } from "@/lib/utils";

interface EventRowProps {
  event: HealthEvent;
  onView: (event: HealthEvent) => void;
}

export function EventRow({ event, onView }: EventRowProps) {
  const facility = facilityById(event.facility_id);
  const [viewerOpen, setViewerOpen] = useState(false);

  return (
    <>
      <tr>
        <th scope="row" className="cell-primary">
          <span className="cell-title">{event.reportable_disease?.name || "Maladie"}</span>
          <SeverityBadge severity={event.severity} />
        </th>
        <td>
          {facility?.name ?? event.facility_id}
          <span className="cell-sub">{facility?.wilaya}</span>
        </td>
        <td>
          <time dateTime={event.created_at}>
            {formatDateTime(event.created_at)}
          </time>
        </td>
        <td>
          {event.patient_proof_url ? (
            <button
              type="button"
              className="link"
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, font: 'inherit' }}
              onClick={() => setViewerOpen(true)}
            >
              Justificatif
            </button>
          ) : (
            <span className="muted">—</span>
          )}
        </td>
        <td className="cell-action">
          <button type="button" className="btn-ghost" onClick={() => onView(event)}>
            Consulter<span className="sr-only"> {event.reportable_disease?.name || "Maladie"}</span>
          </button>
        </td>
      </tr>

      <PatientProofViewer
        open={viewerOpen}
        onClose={() => setViewerOpen(false)}
        storagePath={event.patient_proof_url ?? null}
        healthEventId={event.id}
      />
    </>
  );
}
