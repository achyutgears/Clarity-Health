// Nearby care search. Real public data only:
// - OpenStreetMap (default, no key): Nominatim for geocoding, Overpass API for facilities.
// - Google Places API (New): used only when VITE_GOOGLE_MAPS_API_KEY is configured.
// The user's coordinates are rounded to 3 decimals (~110 m) before leaving the browser
// and are never persisted by this module.

export type CareCategory = "hospital" | "clinic" | "urgent_care" | "doctor";
export type CareSource = "openstreetmap" | "google";

export interface LatLng {
  lat: number;
  lng: number;
}

export interface CareFacility {
  id: string;
  name: string;
  category: CareCategory;
  lat: number;
  lng: number;
  address: string | null;
  distanceKm: number;
  phone: string | null;
  website: string | null;
  /** Raw hours as listed by the source. Never interpreted as "open now". */
  openingHours: string | null;
  /** Google only. */
  rating: number | null;
  /** Google only. */
  ratingCount: number | null;
  /** Google only: Google's own "open now" flag. Always null for OpenStreetMap. */
  openNow: boolean | null;
  source: CareSource;
}

export interface GeocodeResult {
  label: string;
  lat: number;
  lng: number;
}

export const CARE_CATEGORIES: readonly CareCategory[] = [
  "hospital",
  "urgent_care",
  "clinic",
  "doctor",
];

export const CATEGORY_LABELS: Record<CareCategory, string> = {
  hospital: "Hospital",
  urgent_care: "Urgent care",
  clinic: "Clinic",
  doctor: "Doctor",
};

export const RADIUS_OPTIONS_KM = [2, 5, 10, 25] as const;
export const OVERPASS_RESULT_LIMIT = 80;

export const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
export const OVERPASS_URLS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
] as const;
export const GOOGLE_PLACES_URL = "https://places.googleapis.com/v1/places:searchText";
export const GOOGLE_FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.location",
  "places.types",
  "places.rating",
  "places.userRatingCount",
  "places.currentOpeningHours.openNow",
  "places.googleMapsUri",
].join(",");

// ---------- errors ----------

export type NearbyCareErrorCode =
  "empty_query" | "network" | "busy" | "http" | "invalid_response" | "config";

export class NearbyCareError extends Error {
  readonly code: NearbyCareErrorCode;
  readonly status: number | null;
  constructor(code: NearbyCareErrorCode, message: string, status: number | null = null) {
    super(message);
    this.name = "NearbyCareError";
    this.code = code;
    this.status = status;
  }
  /** Whether trying the same request again might succeed. */
  get retryable(): boolean {
    return this.code === "network" || this.code === "busy" || this.code === "http";
  }
}

export function isAbortError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "name" in err &&
    (err as { name: unknown }).name === "AbortError"
  );
}

export function errorForStatus(status: number, service: string): NearbyCareError {
  if (status === 429 || status === 502 || status === 503 || status === 504) {
    return new NearbyCareError(
      "busy",
      `The ${service} is busy right now. Wait a few seconds and try again.`,
      status,
    );
  }
  if (status === 401 || status === 403) {
    return new NearbyCareError(
      "config",
      `The ${service} rejected the request (HTTP ${status}). Check the API key configuration.`,
      status,
    );
  }
  return new NearbyCareError(
    "http",
    `The ${service} returned an error (HTTP ${status}). Please try again.`,
    status,
  );
}

async function fetchJson(
  url: string,
  init: RequestInit,
  service: string,
  fetchImpl: typeof fetch,
): Promise<unknown> {
  let res: Response;
  try {
    res = await fetchImpl(url, init);
  } catch (err) {
    if (isAbortError(err)) throw err;
    throw new NearbyCareError(
      "network",
      `Couldn't reach the ${service}. Check your internet connection and try again.`,
    );
  }
  if (!res.ok) throw errorForStatus(res.status, service);
  try {
    return (await res.json()) as unknown;
  } catch (err) {
    if (isAbortError(err)) throw err;
    throw new NearbyCareError(
      "invalid_response",
      `The ${service} sent a response we couldn't read. Please try again.`,
    );
  }
}

// ---------- geometry & formatting ----------

const EARTH_RADIUS_KM = 6371.0088;
const toRad = (d: number) => (d * Math.PI) / 180;

export function haversineKm(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function roundCoord(n: number, decimals = 3): number {
  const f = 10 ** decimals;
  return Math.round(n * f) / f;
}

export function roundLatLng(c: LatLng, decimals = 3): LatLng {
  return { lat: roundCoord(c.lat, decimals), lng: roundCoord(c.lng, decimals) };
}

export function isValidLatLng(c: LatLng): boolean {
  return (
    Number.isFinite(c.lat) &&
    Number.isFinite(c.lng) &&
    Math.abs(c.lat) <= 90 &&
    Math.abs(c.lng) <= 180
  );
}

export const KM_PER_MILE = 1.609344;

export function formatDistance(km: number): string {
  const mi = km / KM_PER_MILE;
  const f = (v: number) => (v < 10 ? v.toFixed(1) : Math.round(v).toString());
  return `${f(km)} km · ${f(mi)} mi`;
}

// ---------- list helpers ----------

export function filterByCategory(
  list: readonly CareFacility[],
  categories: readonly CareCategory[],
): CareFacility[] {
  if (categories.length === 0) return [...list];
  const set = new Set(categories);
  return list.filter((f) => set.has(f.category));
}

export function sortByDistance(list: readonly CareFacility[]): CareFacility[] {
  return [...list].sort((a, b) => a.distanceKm - b.distanceKm || a.name.localeCompare(b.name));
}

export function withinRadius(list: readonly CareFacility[], radiusKm: number): CareFacility[] {
  return list.filter((f) => f.distanceKm <= radiusKm);
}

export function countByCategory(list: readonly CareFacility[]): Record<CareCategory, number> {
  const counts: Record<CareCategory, number> = {
    hospital: 0,
    urgent_care: 0,
    clinic: 0,
    doctor: 0,
  };
  for (const f of list) counts[f.category] += 1;
  return counts;
}

// ---------- OpenStreetMap ----------

export function buildOverpassQuery(center: LatLng, radiusM: number): string {
  const { lat, lng } = roundLatLng(center);
  const r = Math.max(1, Math.round(radiusM));
  const around = `(around:${r},${lat},${lng})`;
  return [
    "[out:json][timeout:25];",
    "(",
    `  nwr["amenity"~"^(hospital|clinic|doctors)$"]${around};`,
    `  nwr["healthcare"~"^(hospital|clinic|doctor|urgent_care)$"]${around};`,
    ");",
    `out center tags ${OVERPASS_RESULT_LIMIT};`,
  ].join("\n");
}

type Tags = Record<string, string>;

const URGENT_NAME = /\burgent[\s-]*care\b|\bwalk[\s-]*in\b/i;

export function categorizeOsmTags(tags: Tags, name: string): CareCategory | null {
  const amenity = tags["amenity"];
  const healthcare = tags["healthcare"];
  const isHospital = amenity === "hospital" || healthcare === "hospital";
  const isClinic = amenity === "clinic" || healthcare === "clinic";
  const isDoctor = amenity === "doctors" || healthcare === "doctor";
  const urgent =
    healthcare === "urgent_care" ||
    tags["urgent_care"] === "yes" ||
    (tags["healthcare:speciality"] ?? "").split(";").some((s) => s.trim() === "urgent_care");
  if (urgent && !isHospital) return "urgent_care";
  if (isHospital) return "hospital";
  if ((isClinic || isDoctor) && URGENT_NAME.test(name)) return "urgent_care";
  if (isClinic) return "clinic";
  if (isDoctor) return "doctor";
  if (urgent) return "urgent_care";
  return null;
}

export function osmAddress(tags: Tags): string | null {
  const street = tags["addr:street"]?.trim();
  const house = tags["addr:housenumber"]?.trim();
  const city = tags["addr:city"]?.trim();
  const postcode = tags["addr:postcode"]?.trim();
  const streetLine = street ? [house, street].filter(Boolean).join(" ") : null;
  const parts = [streetLine, city, postcode].filter((p): p is string => !!p);
  return parts.length > 0 ? parts.join(", ") : null;
}

export function normalizeWebsite(raw: string | undefined): string | null {
  const v = raw?.split(";")[0]?.trim();
  if (!v) return null;
  const candidate = /^[a-z][a-z0-9+.-]*:/i.test(v) ? v : `https://${v}`;
  try {
    const u = new URL(candidate);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    if (!u.hostname.includes(".")) return null;
    return u.toString();
  } catch {
    return null;
  }
}

export function normalizePhone(raw: string | undefined): string | null {
  const v = raw?.split(";")[0]?.trim();
  if (!v) return null;
  const digits = v.replace(/\D/g, "");
  return digits.length >= 3 ? v : null;
}

/** Digits and a leading + only, for tel: links. */
export function telHref(phone: string): string {
  const trimmed = phone.trim();
  const plus = trimmed.startsWith("+") ? "+" : "";
  return `tel:${plus}${trimmed.replace(/\D/g, "")}`;
}

interface OverpassElement {
  type?: unknown;
  id?: unknown;
  lat?: unknown;
  lon?: unknown;
  center?: { lat?: unknown; lon?: unknown } | null;
  tags?: unknown;
}

const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

function infoScore(f: CareFacility): number {
  return [f.address, f.phone, f.website, f.openingHours].filter((v) => v !== null).length;
}

export function dedupeFacilities(list: readonly CareFacility[]): CareFacility[] {
  const byKey = new Map<string, CareFacility>();
  for (const f of list) {
    const key = `${f.name.trim().toLowerCase()}|${roundCoord(f.lat)}|${roundCoord(f.lng)}`;
    const prev = byKey.get(key);
    if (!prev || infoScore(f) > infoScore(prev)) byKey.set(key, f);
  }
  return [...byKey.values()];
}

export function parseOverpass(json: unknown, center: LatLng): CareFacility[] {
  if (
    typeof json !== "object" ||
    json === null ||
    !Array.isArray((json as { elements?: unknown }).elements)
  ) {
    throw new NearbyCareError(
      "invalid_response",
      "The OpenStreetMap directory sent a response we couldn't read. Please try again.",
    );
  }
  const elements = (json as { elements: unknown[] }).elements;
  const out: CareFacility[] = [];
  for (const raw of elements) {
    if (typeof raw !== "object" || raw === null) continue;
    const el = raw as OverpassElement;
    if (typeof el.tags !== "object" || el.tags === null) continue;
    const tags = el.tags as Tags;
    const name = (tags["name"] ?? tags["name:en"] ?? tags["official_name"] ?? "").trim();
    if (!name) continue;
    const lat = isNum(el.lat) ? el.lat : el.center && isNum(el.center.lat) ? el.center.lat : null;
    const lng = isNum(el.lon) ? el.lon : el.center && isNum(el.center.lon) ? el.center.lon : null;
    if (lat === null || lng === null) continue;
    const category = categorizeOsmTags(tags, name);
    if (!category) continue;
    out.push({
      id: `osm:${String(el.type ?? "node")}/${String(el.id ?? `${lat},${lng}`)}`,
      name,
      category,
      lat,
      lng,
      address: osmAddress(tags),
      distanceKm: haversineKm(center, { lat, lng }),
      phone: normalizePhone(tags["phone"] ?? tags["contact:phone"]),
      website: normalizeWebsite(tags["website"] ?? tags["contact:website"] ?? tags["url"]),
      openingHours: tags["opening_hours"]?.trim() || null,
      rating: null,
      ratingCount: null,
      openNow: null,
      source: "openstreetmap",
    });
  }
  return dedupeFacilities(out);
}

// ---------- Google Places (New) ----------

export const GOOGLE_TEXT_QUERIES: Record<CareCategory, string> = {
  hospital: "hospital",
  urgent_care: "urgent care",
  clinic: "medical clinic",
  doctor: "doctor",
};

interface GooglePlace {
  id?: unknown;
  displayName?: { text?: unknown } | null;
  formattedAddress?: unknown;
  location?: { latitude?: unknown; longitude?: unknown } | null;
  types?: unknown;
  rating?: unknown;
  userRatingCount?: unknown;
  currentOpeningHours?: { openNow?: unknown } | null;
}

export function categorizeGoogleTypes(
  types: readonly string[],
  name: string,
  queried: CareCategory | null,
): CareCategory {
  if (types.includes("urgent_care") || URGENT_NAME.test(name)) return "urgent_care";
  if (types.includes("hospital") || types.includes("general_hospital")) return "hospital";
  if (queried) return queried;
  if (types.includes("medical_clinic")) return "clinic";
  if (types.includes("doctor")) return "doctor";
  return "clinic";
}

export function parseGooglePlaces(
  json: unknown,
  center: LatLng,
  queried: CareCategory | null = null,
): CareFacility[] {
  if (typeof json !== "object" || json === null) {
    throw new NearbyCareError(
      "invalid_response",
      "Google Places sent a response we couldn't read. Please try again.",
    );
  }
  const places = (json as { places?: unknown }).places;
  if (places === undefined) return []; // Google omits `places` when nothing matched.
  if (!Array.isArray(places)) {
    throw new NearbyCareError(
      "invalid_response",
      "Google Places sent a response we couldn't read. Please try again.",
    );
  }
  const out: CareFacility[] = [];
  for (const raw of places) {
    if (typeof raw !== "object" || raw === null) continue;
    const p = raw as GooglePlace;
    const name = typeof p.displayName?.text === "string" ? p.displayName.text.trim() : "";
    const lat = p.location?.latitude;
    const lng = p.location?.longitude;
    if (!name || !isNum(lat) || !isNum(lng) || typeof p.id !== "string") continue;
    const types = Array.isArray(p.types)
      ? p.types.filter((t): t is string => typeof t === "string")
      : [];
    const address =
      typeof p.formattedAddress === "string" && p.formattedAddress.trim()
        ? p.formattedAddress.trim()
        : null;
    out.push({
      id: `google:${p.id}`,
      name,
      category: categorizeGoogleTypes(types, name, queried),
      lat,
      lng,
      address,
      distanceKm: haversineKm(center, { lat, lng }),
      phone: null,
      website: null,
      openingHours: null,
      rating: isNum(p.rating) ? p.rating : null,
      ratingCount: isNum(p.userRatingCount) ? p.userRatingCount : null,
      openNow:
        typeof p.currentOpeningHours?.openNow === "boolean" ? p.currentOpeningHours.openNow : null,
      source: "google",
    });
  }
  return out;
}

export function getGoogleMapsApiKey(): string | null {
  const key = (import.meta.env["VITE_GOOGLE_MAPS_API_KEY"] as string | undefined)?.trim();
  return key ? key : null;
}

export function activeProvider(): CareSource {
  return getGoogleMapsApiKey() ? "google" : "openstreetmap";
}

// ---------- network calls ----------

const NOMINATIM_MIN_INTERVAL_MS = 1100;
let lastNominatimAt = 0;

function wait(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new DOMException("Aborted", "AbortError"));
    const t = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(t);
        reject(new DOMException("Aborted", "AbortError"));
      },
      { once: true },
    );
  });
}

function preferredLanguage(): string {
  if (typeof navigator !== "undefined" && navigator.language) return navigator.language;
  return "en";
}

export function parseNominatim(json: unknown): GeocodeResult[] {
  if (!Array.isArray(json)) {
    throw new NearbyCareError(
      "invalid_response",
      "The place search sent a response we couldn't read. Please try again.",
    );
  }
  const out: GeocodeResult[] = [];
  for (const raw of json) {
    if (typeof raw !== "object" || raw === null) continue;
    const r = raw as { lat?: unknown; lon?: unknown; display_name?: unknown };
    const lat = typeof r.lat === "string" ? Number.parseFloat(r.lat) : isNum(r.lat) ? r.lat : NaN;
    const lng = typeof r.lon === "string" ? Number.parseFloat(r.lon) : isNum(r.lon) ? r.lon : NaN;
    const label = typeof r.display_name === "string" ? r.display_name.trim() : "";
    if (!label || !isValidLatLng({ lat, lng })) continue;
    out.push({ label, lat, lng });
  }
  return out;
}

/** Geocode free text (city, ZIP, address) with Nominatim. Call only from a user action. */
export async function geocodeQuery(
  text: string,
  signal?: AbortSignal,
  fetchImpl: typeof fetch = fetch,
): Promise<GeocodeResult[]> {
  const q = text.trim();
  if (!q) throw new NearbyCareError("empty_query", "Enter a city, ZIP code, or address.");
  const elapsed = Date.now() - lastNominatimAt;
  if (elapsed < NOMINATIM_MIN_INTERVAL_MS) await wait(NOMINATIM_MIN_INTERVAL_MS - elapsed, signal);
  lastNominatimAt = Date.now();
  const params = new URLSearchParams({
    format: "jsonv2",
    limit: "5",
    q: q.slice(0, 200),
    "accept-language": preferredLanguage(),
  });
  const init: RequestInit = { headers: { Accept: "application/json" } };
  if (signal) init.signal = signal;
  const json = await fetchJson(
    `${NOMINATIM_URL}?${params.toString()}`,
    init,
    "place search",
    fetchImpl,
  );
  return parseNominatim(json);
}

async function searchOverpass(
  center: LatLng,
  radiusM: number,
  signal: AbortSignal | undefined,
  fetchImpl: typeof fetch,
): Promise<CareFacility[]> {
  const body = "data=" + encodeURIComponent(buildOverpassQuery(center, radiusM));
  let lastErr: unknown = null;
  for (const url of OVERPASS_URLS) {
    const timed = withTimeout(signal, OVERPASS_TIMEOUT_MS);
    const init: RequestInit = {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8" },
      body,
      signal: timed.signal,
    };
    try {
      const json = await fetchJson(url, init, "OpenStreetMap directory", fetchImpl).catch(
        (err: unknown) => {
          // Our own timeout aborts the fetch; report it as "busy" so the next source is tried.
          if (isAbortError(err) && timed.timedOut()) {
            throw new NearbyCareError(
              "busy",
              "The OpenStreetMap directory is taking too long to respond. Please try again.",
            );
          }
          throw err;
        },
      );
      const remark = (json as { remark?: unknown } | null)?.remark;
      const elements = (json as { elements?: unknown } | null)?.elements;
      if (
        typeof remark === "string" &&
        /runtime error|timed out|out of memory/i.test(remark) &&
        Array.isArray(elements) &&
        elements.length === 0
      ) {
        throw new NearbyCareError(
          "busy",
          "The OpenStreetMap directory is busy right now. Wait a few seconds and try again.",
        );
      }
      return parseOverpass(json, center);
    } catch (err) {
      if (isAbortError(err)) throw err;
      // Public Overpass servers are often at capacity (502), slow, or reject a client (406):
      // any failure moves on to the next source.
      lastErr = err;
    } finally {
      timed.clear();
    }
  }
  throw lastErr;
}

const OVERPASS_TIMEOUT_MS = 8_000;

/** Abort after `ms`, or when the caller's signal aborts; `timedOut()` tells the two apart. */
function withTimeout(parent: AbortSignal | undefined, ms: number) {
  const controller = new AbortController();
  let timedOut = false;
  const onAbort = () => controller.abort();
  if (parent?.aborted) controller.abort();
  else parent?.addEventListener("abort", onAbort, { once: true });
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, ms);
  return {
    signal: controller.signal,
    timedOut: () => timedOut,
    clear: () => {
      clearTimeout(timer);
      parent?.removeEventListener("abort", onAbort);
    },
  };
}

/** Nominatim `amenity` values that cover each category (urgent care is tagged as a clinic). */
const NOMINATIM_AMENITIES: Record<CareCategory, string> = {
  hospital: "hospital",
  clinic: "clinic",
  urgent_care: "clinic",
  doctor: "doctors",
};

/** Bounding box around `center` that contains the search circle: left,top,right,bottom. */
export function viewboxAround(center: LatLng, radiusM: number): string {
  const { lat, lng } = roundLatLng(center);
  const dLat = radiusM / 111_320;
  const dLng = radiusM / (111_320 * Math.max(0.01, Math.cos(toRad(lat))));
  return [lng - dLng, lat + dLat, lng + dLng, lat - dLat].map((n) => n.toFixed(4)).join(",");
}

type NominatimPoi = {
  osm_type?: unknown;
  osm_id?: unknown;
  lat?: unknown;
  lon?: unknown;
  name?: unknown;
  type?: unknown;
  address?: Record<string, unknown>;
  extratags?: Record<string, unknown> | null;
};

const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : undefined);

/** Parse Nominatim structured `amenity=` results into facilities (real OSM points of interest). */
export function parseNominatimPois(json: unknown, center: LatLng): CareFacility[] {
  if (!Array.isArray(json)) {
    throw new NearbyCareError(
      "invalid_response",
      "The OpenStreetMap search sent a response we couldn't read. Please try again.",
    );
  }
  const out: CareFacility[] = [];
  for (const raw of json) {
    if (typeof raw !== "object" || raw === null) continue;
    const r = raw as NominatimPoi;
    const name = str(r.name);
    const lat = typeof r.lat === "string" ? Number.parseFloat(r.lat) : NaN;
    const lng = typeof r.lon === "string" ? Number.parseFloat(r.lon) : NaN;
    if (!name || !isValidLatLng({ lat, lng })) continue;
    const tags: Tags = {};
    for (const [k, v] of Object.entries(r.extratags ?? {})) {
      const s = str(v);
      if (s) tags[k] = s;
    }
    const amenity = str(r.type);
    if (amenity) tags["amenity"] = amenity;
    const a = r.address ?? {};
    const addr: Record<string, string | undefined> = {
      "addr:housenumber": str(a["house_number"]),
      "addr:street": str(a["road"]),
      "addr:city": str(a["city"]) ?? str(a["town"]) ?? str(a["village"]),
      "addr:postcode": str(a["postcode"]),
    };
    for (const [k, v] of Object.entries(addr)) if (v) tags[k] = v;
    const category = categorizeOsmTags(tags, name);
    if (!category) continue;
    out.push({
      id: `osm:${String(r.osm_type ?? "node")}/${String(r.osm_id ?? `${lat},${lng}`)}`,
      name,
      category,
      lat,
      lng,
      address: osmAddress(tags),
      distanceKm: haversineKm(center, { lat, lng }),
      phone: normalizePhone(tags["phone"] ?? tags["contact:phone"]),
      website: normalizeWebsite(tags["website"] ?? tags["contact:website"] ?? tags["url"]),
      openingHours: tags["opening_hours"] ?? null,
      rating: null,
      ratingCount: null,
      openNow: null,
      source: "openstreetmap",
    });
  }
  return out;
}

/** Fallback when Overpass is unavailable: Nominatim's POI search, one request per amenity. */
async function searchNominatimPois(
  center: LatLng,
  radiusM: number,
  categories: readonly CareCategory[],
  signal: AbortSignal | undefined,
  fetchImpl: typeof fetch,
): Promise<CareFacility[]> {
  const amenities = [...new Set(categories.map((c) => NOMINATIM_AMENITIES[c]))];
  const viewbox = viewboxAround(center, radiusM);
  const out: CareFacility[] = [];
  for (const amenity of amenities) {
    const elapsed = Date.now() - lastNominatimAt;
    if (elapsed < NOMINATIM_MIN_INTERVAL_MS)
      await wait(NOMINATIM_MIN_INTERVAL_MS - elapsed, signal);
    lastNominatimAt = Date.now();
    const params = new URLSearchParams({
      format: "jsonv2",
      amenity,
      viewbox,
      bounded: "1",
      limit: "40",
      addressdetails: "1",
      extratags: "1",
      "accept-language": preferredLanguage(),
    });
    const init: RequestInit = { headers: { Accept: "application/json" } };
    if (signal) init.signal = signal;
    const json = await fetchJson(
      `${NOMINATIM_URL}?${params.toString()}`,
      init,
      "OpenStreetMap search",
      fetchImpl,
    );
    out.push(...parseNominatimPois(json, center));
  }
  return dedupeFacilities(out);
}

/** Overpass first (richer tags); Nominatim POI search if every Overpass server fails. */
async function searchOpenStreetMap(
  center: LatLng,
  radiusM: number,
  categories: readonly CareCategory[],
  signal: AbortSignal | undefined,
  fetchImpl: typeof fetch,
): Promise<CareFacility[]> {
  try {
    return await searchOverpass(center, radiusM, signal, fetchImpl);
  } catch (err) {
    if (isAbortError(err)) throw err;
    try {
      return await searchNominatimPois(center, radiusM, categories, signal, fetchImpl);
    } catch (fallbackErr) {
      if (isAbortError(fallbackErr)) throw fallbackErr;
      throw err;
    }
  }
}

async function searchGoogle(
  apiKey: string,
  center: LatLng,
  radiusM: number,
  categories: readonly CareCategory[],
  signal: AbortSignal | undefined,
  fetchImpl: typeof fetch,
): Promise<CareFacility[]> {
  const c = roundLatLng(center);
  const results = await Promise.all(
    categories.map(async (category) => {
      const init: RequestInit = {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask": GOOGLE_FIELD_MASK,
        },
        body: JSON.stringify({
          textQuery: GOOGLE_TEXT_QUERIES[category],
          locationBias: {
            circle: {
              center: { latitude: c.lat, longitude: c.lng },
              radius: Math.min(50_000, radiusM),
            },
          },
          maxResultCount: 20,
        }),
      };
      if (signal) init.signal = signal;
      const json = await fetchJson(GOOGLE_PLACES_URL, init, "Google Places service", fetchImpl);
      return parseGooglePlaces(json, center, category);
    }),
  );
  const byId = new Map<string, CareFacility>();
  for (const f of results.flat()) if (!byId.has(f.id)) byId.set(f.id, f);
  return [...byId.values()];
}

export interface NearbySearchOptions {
  center: LatLng;
  radiusKm: number;
  categories?: readonly CareCategory[];
  signal?: AbortSignal;
  fetchImpl?: typeof fetch;
  /** Override provider selection (defaults to Google when a key is configured). */
  provider?: CareSource;
}

export interface NearbySearchResult {
  facilities: CareFacility[];
  source: CareSource;
  radiusKm: number;
}

export async function searchNearbyCare(opts: NearbySearchOptions): Promise<NearbySearchResult> {
  const { center, radiusKm, signal } = opts;
  if (!isValidLatLng(center)) {
    throw new NearbyCareError(
      "invalid_response",
      "That location couldn't be used. Try another search.",
    );
  }
  const fetchImpl = opts.fetchImpl ?? fetch;
  const categories =
    opts.categories && opts.categories.length > 0 ? opts.categories : CARE_CATEGORIES;
  const radiusM = radiusKm * 1000;
  const key = getGoogleMapsApiKey();
  const source: CareSource = opts.provider ?? (key ? "google" : "openstreetmap");
  let raw: CareFacility[];
  if (source === "google") {
    if (!key) {
      throw new NearbyCareError(
        "config",
        "Google Places isn't configured. Set VITE_GOOGLE_MAPS_API_KEY.",
      );
    }
    raw = await searchGoogle(key, center, radiusM, categories, signal, fetchImpl);
  } else {
    raw = await searchOpenStreetMap(center, radiusM, categories, signal, fetchImpl);
  }
  const facilities = sortByDistance(withinRadius(filterByCategory(raw, categories), radiusKm));
  return { facilities, source, radiusKm };
}

/** Test helper: reset the Nominatim throttle. */
export function __resetGeocodeThrottle(): void {
  lastNominatimAt = 0;
}
