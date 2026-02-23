export interface GeocoderResult {
  displayName: string;
  city: string;
  region: string;
  country: string;
  lat: number;
  lng: number;
  /** Google place_id when using Google Geocoding API; used to build Maps URL for venues */
  placeId?: string;
}

export interface Geocoder {
  search(query: string): Promise<GeocoderResult[]>;
}

interface NominatimAddress {
  city?: string;
  town?: string;
  village?: string;
  hamlet?: string;
  state?: string;
  county?: string;
  country?: string;
}

interface NominatimResult {
  display_name: string;
  lat: string;
  lon: string;
  address: NominatimAddress;
}

export function createNominatimGeocoder(): Geocoder {
  return {
    async search(query: string): Promise<GeocoderResult[]> {
      const url = new URL("https://nominatim.openstreetmap.org/search");
      url.searchParams.set("q", query);
      url.searchParams.set("format", "jsonv2");
      url.searchParams.set("addressdetails", "1");
      url.searchParams.set("limit", "5");

      const response = await fetch(url, {
        headers: { "User-Agent": "MusicApp/1.0" },
      });

      if (!response.ok) {
        return [];
      }

      const data: NominatimResult[] = await response.json();

      return data.map((item) => ({
        displayName: item.display_name,
        city:
          item.address.city ??
          item.address.town ??
          item.address.village ??
          item.address.hamlet ??
          "",
        region: item.address.state ?? item.address.county ?? "",
        country: item.address.country ?? "",
        lat: parseFloat(item.lat),
        lng: parseFloat(item.lon),
      }));
    },
  };
}

// Google Geocoding API types (subset we use)
interface GoogleAddressComponent {
  long_name: string;
  short_name: string;
  types: string[];
}

interface GoogleGeocodeResult {
  place_id: string;
  formatted_address: string;
  geometry: { location: { lat: number; lng: number } };
  address_components: GoogleAddressComponent[];
}

interface GoogleGeocodeResponse {
  status: string;
  results?: GoogleGeocodeResult[];
}

function getComponent(
  components: GoogleAddressComponent[],
  type: string,
): string {
  const c = components.find((x) => x.types.includes(type));
  return c?.long_name ?? "";
}

export function createGoogleGeocoder(apiKey: string): Geocoder {
  return {
    async search(query: string): Promise<GeocoderResult[]> {
      const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
      url.searchParams.set("address", query);
      url.searchParams.set("key", apiKey);

      let response: Response;
      try {
        response = await fetch(url.toString());
      } catch {
        return [];
      }

      if (!response.ok) {
        return [];
      }

      let data: GoogleGeocodeResponse;
      try {
        data = await response.json();
      } catch {
        return [];
      }

      if (data.status !== "OK" || !data.results?.length) {
        return [];
      }

      return data.results.slice(0, 5).map((item) => {
        const comp = item.address_components;
        const city =
          getComponent(comp, "locality") ||
          getComponent(comp, "sublocality") ||
          getComponent(comp, "postal_town") ||
          getComponent(comp, "administrative_area_level_2");
        const region =
          getComponent(comp, "administrative_area_level_1") ||
          getComponent(comp, "administrative_area_level_2");
        const country = getComponent(comp, "country");

        return {
          displayName: item.formatted_address,
          city,
          region,
          country,
          lat: item.geometry.location.lat,
          lng: item.geometry.location.lng,
          placeId: item.place_id,
        };
      });
    },
  };
}
