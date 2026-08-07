import { SeverityBadge } from "./Badge";
import { facilityById, type HealthEvent } from "@/lib/mockData";

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 60) return `il y a ${mins} min`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `il y a ${hours} h`;
  return `il y a ${Math.round(hours / 24)} j`;
}

export function FeedItem({ event }: { event: HealthEvent }) {
  const facility = facilityById(event.facility_id);
  return (
    <li className="feed-item">
      <div className="feed-item-top">
        <p className="feed-title">{event.incident_type}</p>
        <SeverityBadge severity={event.severity} />
      </div>
      <p className="feed-desc">{event.description}</p>
      <p className="feed-meta">
        <span>{facility ? `${facility.name} · ${facility.wilaya}` : event.facility_id}</span>
        <span aria-hidden="true"> · </span>
        <time dateTime={event.created_at}>{relativeTime(event.created_at)}</time>
      </p>
    </li>
  );
}
