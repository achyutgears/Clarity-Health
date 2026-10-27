// Builds map destination URLs from a supplied facility name and address.
// Returns null when no address is supplied so callers never link to a guessed place.
export interface MapDestination {
  name: string;
  address: string;
}

function query(d: MapDestination): string | null {
  const address = d.address.trim();
  if (!address) return null;
  const name = d.name.trim();
  return name ? `${name}, ${address}` : address;
}

export function appleMapsUrl(d: MapDestination): string | null {
  const q = query(d);
  return q ? `https://maps.apple.com/?q=${encodeURIComponent(q)}` : null;
}

export function googleMapsUrl(d: MapDestination): string | null {
  const q = query(d);
  return q ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}` : null;
}

// Coordinate-based builders for facilities that come with a known position.
// Return null for missing or out-of-range coordinates so callers never link to a guessed place.
export interface MapCoordinates {
  lat: number;
  lng: number;
}

function validCoords(c: MapCoordinates): boolean {
  return (
    Number.isFinite(c.lat) &&
    Number.isFinite(c.lng) &&
    Math.abs(c.lat) <= 90 &&
    Math.abs(c.lng) <= 180
  );
}

function fmt(n: number): string {
  return String(Number(n.toFixed(6)));
}

export function googleMapsDirectionsUrl(c: MapCoordinates): string | null {
  if (!validCoords(c)) return null;
  return `https://www.google.com/maps/dir/?api=1&destination=${fmt(c.lat)},${fmt(c.lng)}`;
}

export function appleMapsDirectionsUrl(c: MapCoordinates): string | null {
  if (!validCoords(c)) return null;
  return `https://maps.apple.com/?daddr=${fmt(c.lat)},${fmt(c.lng)}`;
}

// OpenStreetMap embed (no API key) centred on the point with a marker.
// `span` is the half-width of the visible box in degrees.
export function osmEmbedUrl(c: MapCoordinates, span = 0.006): string | null {
  if (!validCoords(c) || !(span > 0)) return null;
  const clampLat = (v: number) => Math.max(-90, Math.min(90, v));
  const clampLng = (v: number) => Math.max(-180, Math.min(180, v));
  const bbox = [
    clampLng(c.lng - span),
    clampLat(c.lat - span),
    clampLng(c.lng + span),
    clampLat(c.lat + span),
  ]
    .map(fmt)
    .join(",");
  const marker = `${fmt(c.lat)},${fmt(c.lng)}`;
  return `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik&marker=${encodeURIComponent(marker)}`;
}

export function osmViewUrl(c: MapCoordinates): string | null {
  if (!validCoords(c)) return null;
  return `https://www.openstreetmap.org/?mlat=${fmt(c.lat)}&mlon=${fmt(c.lng)}#map=17/${fmt(c.lat)}/${fmt(c.lng)}`;
}
