/**
 * Distance utilities. We anchor everything to Morning Vista
 * (40.4847, -111.8814) so each listing has a single straight-line "how far
 * from Wayne's house" number that's safe to sort and filter by.
 *
 * Haversine is straight-line "as the crow flies", not driving distance.
 * Good enough for a local search radius decision; for actual commute time
 * you'd swap in Mapbox or Google directions later.
 */

export const MORNING_VISTA = { lat: 40.4847, lon: -111.8814 } as const;

const EARTH_RADIUS_MI = 3959;

/** Great-circle distance in miles, rounded to 2 decimal places. */
export function distanceMi(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(EARTH_RADIUS_MI * c * 100) / 100;
}

export function distanceToMorningVista(lat: number, lon: number): number {
  return distanceMi(lat, lon, MORNING_VISTA.lat, MORNING_VISTA.lon);
}
