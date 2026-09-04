import type { Business, Source } from "../types.js";

/**
 * Google Places API (New) — Text Search.
 * Docs: https://developers.google.com/maps/documentation/places/web-service/text-search
 *
 * Cost note: we request only the "Pro" field-mask tier fields we need. Each page
 * (up to 20 results) is one billable request. $200/mo free credit covers thousands.
 */
const ENDPOINT = "https://places.googleapis.com/v1/places:searchText";
const FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.websiteUri",
  "places.nationalPhoneNumber",
  "places.rating",
  "places.userRatingCount",
  "places.googleMapsUri",
  "places.primaryType",
  "nextPageToken",
].join(",");

interface PlacesResponse {
  places?: Array<{
    id: string;
    displayName?: { text: string };
    formattedAddress?: string;
    websiteUri?: string;
    nationalPhoneNumber?: string;
    rating?: number;
    userRatingCount?: number;
    googleMapsUri?: string;
    primaryType?: string;
  }>;
  nextPageToken?: string;
  error?: { message: string; status: string };
}

export class PlacesSource implements Source {
  name = "places";
  constructor(private apiKey: string) {
    if (!apiKey) throw new Error("GOOGLE_PLACES_API_KEY is not set");
  }

  async search(query: string, city: string, limit: number): Promise<Business[]> {
    const out: Business[] = [];
    let pageToken: string | undefined;

    while (out.length < limit) {
      const body: Record<string, unknown> = {
        textQuery: `${query} in ${city}`,
        pageSize: Math.min(20, limit - out.length),
      };
      if (pageToken) body.pageToken = pageToken;

      const res = await fetch(ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": this.apiKey,
          "X-Goog-FieldMask": FIELD_MASK,
        },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as PlacesResponse;
      if (!res.ok || data.error) {
        throw new Error(`Places API error: ${data.error?.message ?? res.statusText}`);
      }

      for (const p of data.places ?? []) {
        out.push({
          id: p.id,
          placeId: p.id,
          name: p.displayName?.text ?? "(unnamed)",
          category: query,
          website: p.websiteUri,
          phone: p.nationalPhoneNumber,
          address: p.formattedAddress,
          rating: p.rating,
          reviewCount: p.userRatingCount,
          mapsUrl: p.googleMapsUri,
          source: "places",
        });
      }

      pageToken = data.nextPageToken;
      if (!pageToken || !data.places?.length) break;
      // Google asks for a short delay before the next page token is valid.
      await new Promise((r) => setTimeout(r, 1500));
    }
    return out.slice(0, limit);
  }
}
