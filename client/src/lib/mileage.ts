export const IRS_MILEAGE_RATE_2026 = 0.70;

export const hasOrsKey = !!(import.meta.env.VITE_ORS_API_KEY as string | undefined);

export function calcMileageAmount(miles: number, rate = IRS_MILEAGE_RATE_2026): number {
  return parseFloat((miles * rate).toFixed(2));
}

async function geocode(address: string): Promise<[number, number]> {
  const key = import.meta.env.VITE_ORS_API_KEY as string;
  const url =
    `https://api.openrouteservice.org/geocode/search` +
    `?api_key=${encodeURIComponent(key)}&text=${encodeURIComponent(address)}&size=1`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Geocode request failed (${res.status})`);
  const data = await res.json();
  const features: { geometry: { coordinates: [number, number] } }[] = data?.features ?? [];
  if (!features.length) throw new Error("Address not found — try a more specific address");
  return features[0].geometry.coordinates; // [longitude, latitude]
}

export async function fetchDrivingDistance(from: string, to: string): Promise<number> {
  const key = import.meta.env.VITE_ORS_API_KEY as string;
  const [fromCoord, toCoord] = await Promise.all([geocode(from), geocode(to)]);
  const url =
    `https://api.openrouteservice.org/v2/directions/driving-car` +
    `?api_key=${encodeURIComponent(key)}` +
    `&start=${fromCoord[0]},${fromCoord[1]}` +
    `&end=${toCoord[0]},${toCoord[1]}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Couldn't calculate route — enter miles manually");
  const data = await res.json();
  const meters: number | undefined =
    data?.features?.[0]?.properties?.segments?.[0]?.distance;
  if (meters == null) throw new Error("Couldn't calculate route — enter miles manually");
  return parseFloat((meters / 1609.344).toFixed(2)); // meters → miles
}
