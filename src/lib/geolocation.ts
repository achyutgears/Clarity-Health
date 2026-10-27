// Wraps the browser Geolocation API. Call only from a user gesture (e.g. a button click);
// the position is returned to the caller and never stored by this module.
export interface Coordinates {
  lat: number;
  lng: number;
}

export type GeolocationErrorCode = "unsupported" | "denied" | "unavailable" | "timeout";

const MESSAGES: Record<GeolocationErrorCode, string> = {
  unsupported:
    "This browser can't share your location. Search by city, ZIP code, or address instead.",
  denied:
    "Location access is blocked. Allow it in your browser's site settings, or search by city, ZIP code, or address instead.",
  unavailable:
    "Your device couldn't determine a location right now. Try again, or search by city, ZIP code, or address.",
  timeout:
    "Finding your location took too long. Try again, or search by city, ZIP code, or address.",
};

export class GeolocationError extends Error {
  readonly code: GeolocationErrorCode;
  constructor(code: GeolocationErrorCode) {
    super(MESSAGES[code]);
    this.name = "GeolocationError";
    this.code = code;
  }
}

export const GEOLOCATION_OPTIONS: PositionOptions = {
  enableHighAccuracy: false,
  timeout: 10_000,
  maximumAge: 5 * 60_000,
};

// GeolocationPositionError codes: 1 PERMISSION_DENIED, 2 POSITION_UNAVAILABLE, 3 TIMEOUT.
export function geolocationErrorCode(code: number): GeolocationErrorCode {
  if (code === 1) return "denied";
  if (code === 3) return "timeout";
  return "unavailable";
}

export function requestCurrentPosition(): Promise<Coordinates> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new GeolocationError("unsupported"));
      return;
    }
    try {
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => reject(new GeolocationError(geolocationErrorCode(err.code))),
        GEOLOCATION_OPTIONS,
      );
    } catch {
      reject(new GeolocationError("unsupported"));
    }
  });
}
