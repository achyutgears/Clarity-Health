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
