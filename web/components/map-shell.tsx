"use client";

import dynamic from "next/dynamic";
import type { MapLead } from "./lead-map";

// Leaflet touches `window` on import, so it can only load in the browser.
// `ssr: false` is only permitted inside a Client Component, which is the whole
// reason this thin wrapper exists.
const LeadMap = dynamic(() => import("./lead-map"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-sm" style={{ color: "var(--muted)" }}>
      Loading map…
    </div>
  ),
});

export function MapShell({ leads }: { leads: MapLead[] }) {
  return <LeadMap leads={leads} />;
}
