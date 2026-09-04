"use client";

import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import Link from "next/link";
import "leaflet/dist/leaflet.css";

export interface MapLead {
  business_id: string;
  name: string;
  lat: number;
  lng: number;
  score: number | null;
  category: string | null;
  phone: string | null;
  lead_status: string | null;
  reason: string | null;
  review_count: number | null;
}

/** Same ramp as the score badges, so the map reads like the queue. */
function colorFor(score: number | null): string {
  const s = score ?? 0;
  if (score === null) return "#a1a1aa";
  if (s >= 70) return "#dc2626";
  if (s >= 50) return "#ea580c";
  if (s >= 25) return "#ca8a04";
  if (s > 0) return "#3f6212";
  return "#a1a1aa";
}

export default function LeadMap({ leads }: { leads: MapLead[] }) {
  const center: [number, number] = leads.length
    ? [
        leads.reduce((a, l) => a + l.lat, 0) / leads.length,
        leads.reduce((a, l) => a + l.lng, 0) / leads.length,
      ]
    : [32.7767, -96.797];

  return (
    <MapContainer
      center={center}
      zoom={11}
      scrollWheelZoom
      style={{ height: "100%", width: "100%" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {leads.map((l) => (
        <CircleMarker
          key={l.business_id}
          center={[l.lat, l.lng]}
          // Bigger circle = more reviews = more revenue behind the lead.
          radius={6 + Math.min(10, Math.log10((l.review_count ?? 1) + 1) * 4)}
          pathOptions={{
            color: colorFor(l.score),
            fillColor: colorFor(l.score),
            fillOpacity: 0.65,
            weight: 1.5,
          }}
        >
          <Popup>
            <div style={{ minWidth: 190 }}>
              <strong>{l.name}</strong>
              <div style={{ fontSize: 12, color: "#666" }}>
                {l.category} · score {l.score ?? "—"} · {l.lead_status ?? "new"}
              </div>
              {l.reason && <div style={{ fontSize: 12, marginTop: 4 }}>{l.reason}</div>}
              {l.phone && (
                <div style={{ fontSize: 12, marginTop: 4 }}>
                  <a href={`tel:${l.phone}`}>{l.phone}</a>
                </div>
              )}
              <Link href={`/leads/${l.business_id}`} style={{ fontSize: 12 }}>
                Open lead →
              </Link>
            </div>
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
