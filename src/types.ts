export interface Business {
  id: string;
  /** Google Place ID. Stable across runs; absent for CSV-sourced rows. */
  placeId?: string;
  name: string;
  category: string;
  website?: string;
  phone?: string;
  address?: string;
  rating?: number;
  reviewCount?: number;
  mapsUrl?: string;
  lat?: number;
  lng?: number;
  source: "places" | "csv";
}

export interface Signal {
  key: string;
  label: string;
  /** Points added to the "needs help" score when this signal fires. */
  weight: number;
  fired: boolean;
  detail?: string;
}

export interface ScanResult {
  business: Business;
  finalUrl?: string;
  status: "scanned" | "no-website" | "unreachable" | "timeout";
  error?: string;
  builder?: string;
  copyrightYear?: number;
  loadMs?: number;
  pageBytes?: number;
  title?: string;
  /** Best contact email found on the site, if any. Not scored. */
  email?: string;
  signals: Signal[];
  /** 0–100. Higher = more likely to need a new site. */
  score: number;
  /** Human-readable summary of the top reasons. */
  reasons: string[];
  screenshotPath?: string;
  scannedAt: string;
}

export interface Source {
  name: string;
  search(query: string, city: string, limit: number): Promise<Business[]>;
}
