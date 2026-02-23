export interface GeocoderResult {
  displayName: string;
  city: string;
  region: string;
  country: string;
  lat: number;
  lng: number;
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
