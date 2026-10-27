import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  __resetGeocodeThrottle,
  buildOverpassQuery,
  categorizeOsmTags,
  filterByCategory,
  formatDistance,
  geocodeQuery,
  haversineKm,
  NearbyCareError,
  normalizeWebsite,
  osmAddress,
  OVERPASS_URLS,
  parseGooglePlaces,
  parseNominatimPois,
  parseOverpass,
  searchNearbyCare,
  viewboxAround,
  sortByDistance,
  telHref,
  withinRadius,
  type CareFacility,
} from "./nearby-care";

const center = { lat: 40.0, lng: -75.0 };

// Fixture shaped like a real Overpass `out center tags` response (values are test fixtures only).
const overpassFixture = {
  version: 0.6,
  elements: [
    {
      type: "node",
      id: 1,
      lat: 40.001,
      lon: -75.0,
      tags: {
        amenity: "clinic",
        name: "Fixture Family Clinic",
        "addr:housenumber": "12",
        "addr:street": "Main Street",
        "addr:city": "Testville",
        "addr:postcode": "19000",
        opening_hours: "Mo-Fr 08:00-17:00",
        phone: "+1 555-0100",
        website: "fixture-clinic.example.org",
      },
    },
    {
      type: "way",
      id: 2,
      center: { lat: 40.02, lon: -75.0 },
      tags: { amenity: "hospital", name: "Fixture General Hospital" },
    },
    { type: "node", id: 3, lat: 40.005, lon: -75.0, tags: { amenity: "doctors" } }, // unnamed → skipped
    {
      type: "node",
      id: 4,
      lat: 40.003,
      lon: -75.0,
      tags: { healthcare: "clinic", amenity: "clinic", name: "Fixture Urgent Care" },
    },
    {
      type: "node",
      id: 5,
      lat: 40.5,
      lon: -75.0,
      tags: { amenity: "doctors", name: "Far Away Doctor" },
    },
    // Duplicate of node 1 mapped as a building outline (same name, same rounded coords).
    {
      type: "way",
      id: 6,
      center: { lat: 40.0011, lon: -75.0001 },
      tags: { healthcare: "clinic", name: "Fixture Family Clinic" },
    },
    {
      type: "node",
      id: 7,
      lat: 40.004,
      lon: -75.0,
      tags: { healthcare: "doctor", name: "Dr. Fixture" },
    },
  ],
};

function mockResponse(body: unknown, status = 200): Response {
  return new Response(typeof body === "string" ? body : JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("haversineKm", () => {
  it("is zero for the same point", () => {
    expect(haversineKm(center, center)).toBe(0);
  });
  it("matches a known distance (~111.2 km per degree of latitude)", () => {
    expect(haversineKm({ lat: 0, lng: 0 }, { lat: 1, lng: 0 })).toBeCloseTo(111.2, 1);
  });
  it("is symmetric", () => {
    const a = { lat: 51.5, lng: -0.12 };
    const b = { lat: 48.85, lng: 2.35 };
    expect(haversineKm(a, b)).toBeCloseTo(haversineKm(b, a), 9);
    expect(haversineKm(a, b)).toBeGreaterThan(330);
    expect(haversineKm(a, b)).toBeLessThan(350);
  });
});

describe("formatDistance", () => {
  it("shows km and miles", () => {
    expect(formatDistance(1.609344)).toBe("1.6 km · 1.0 mi");
    expect(formatDistance(24)).toBe("24 km · 15 mi");
    expect(formatDistance(0.4)).toBe("0.4 km · 0.2 mi");
  });
});

describe("buildOverpassQuery", () => {
  it("rounds coordinates to 3 decimals and includes both tag filters", () => {
    const q = buildOverpassQuery({ lat: 40.123456, lng: -75.987654 }, 5000);
    expect(q).toContain("[out:json][timeout:25];");
    expect(q).toContain(
      'nwr["amenity"~"^(hospital|clinic|doctors)$"](around:5000,40.123,-75.988);',
    );
    expect(q).toContain(
      'nwr["healthcare"~"^(hospital|clinic|doctor|urgent_care)$"](around:5000,40.123,-75.988);',
    );
    expect(q).toContain("out center tags 80;");
    expect(q).not.toContain("40.123456");
  });
});

describe("OSM tag helpers", () => {
  it("categorizes by tags, with urgent care taking precedence over clinic", () => {
    expect(categorizeOsmTags({ amenity: "hospital" }, "A")).toBe("hospital");
    expect(categorizeOsmTags({ healthcare: "urgent_care" }, "A")).toBe("urgent_care");
    expect(categorizeOsmTags({ amenity: "clinic", urgent_care: "yes" }, "A")).toBe("urgent_care");
    expect(categorizeOsmTags({ amenity: "clinic" }, "Downtown Urgent Care")).toBe("urgent_care");
    expect(categorizeOsmTags({ amenity: "clinic" }, "A")).toBe("clinic");
    expect(categorizeOsmTags({ amenity: "doctors" }, "A")).toBe("doctor");
    expect(categorizeOsmTags({ amenity: "pharmacy" }, "A")).toBeNull();
  });
  it("builds an address only from tags that are present", () => {
    expect(osmAddress({})).toBeNull();
    expect(osmAddress({ "addr:housenumber": "5" })).toBeNull();
    expect(osmAddress({ "addr:street": "Oak Ave", "addr:city": "Town" })).toBe("Oak Ave, Town");
    expect(
      osmAddress({
        "addr:housenumber": "5",
        "addr:street": "Oak Ave",
        "addr:city": "Town",
        "addr:postcode": "12345",
      }),
    ).toBe("5 Oak Ave, Town, 12345");
  });
  it("normalizes websites and rejects non-http schemes", () => {
    expect(normalizeWebsite("example.org")).toBe("https://example.org/");
    expect(normalizeWebsite("http://example.org/a")).toBe("http://example.org/a");
    expect(normalizeWebsite("javascript:alert(1)")).toBeNull();
    expect(normalizeWebsite("")).toBeNull();
  });
  it("builds tel links from digits", () => {
    expect(telHref("+1 (555) 010-0100")).toBe("tel:+15550100100");
  });
});

describe("parseOverpass", () => {
  const list = parseOverpass(overpassFixture, center);

  it("skips unnamed elements and dedupes the same facility", () => {
    const names = list.map((f) => f.name).sort();
    expect(names).toEqual([
      "Dr. Fixture",
      "Far Away Doctor",
      "Fixture Family Clinic",
      "Fixture General Hospital",
      "Fixture Urgent Care",
    ]);
  });

  it("maps fields and uses way centers", () => {
    const clinic = list.find((f) => f.name === "Fixture Family Clinic");
    expect(clinic).toMatchObject({
      id: "osm:node/1",
      category: "clinic",
      address: "12 Main Street, Testville, 19000",
      openingHours: "Mo-Fr 08:00-17:00",
      phone: "+1 555-0100",
      website: "https://fixture-clinic.example.org/",
      rating: null,
      openNow: null,
      source: "openstreetmap",
    });
    const hospital = list.find((f) => f.name === "Fixture General Hospital");
    expect(hospital?.lat).toBe(40.02);
    expect(hospital?.address).toBeNull();
    expect(hospital?.distanceKm).toBeCloseTo(2.22, 1);
  });

  it("categorizes urgent care by name", () => {
    expect(list.find((f) => f.name === "Fixture Urgent Care")?.category).toBe("urgent_care");
  });

  it("throws a typed error for invalid payloads", () => {
    expect(() => parseOverpass({ nope: true }, center)).toThrow(NearbyCareError);
    expect(() => parseOverpass(null, center)).toThrow(/couldn't read/);
  });
});

describe("parseGooglePlaces", () => {
  const fixture = {
    places: [
      {
        id: "abc",
        displayName: { text: "Fixture Medical Center" },
        formattedAddress: "1 Test Rd, Testville",
        location: { latitude: 40.01, longitude: -75.0 },
        types: ["hospital", "health", "point_of_interest"],
        rating: 4.1,
        userRatingCount: 210,
        currentOpeningHours: { openNow: true },
      },
      {
        id: "def",
        displayName: { text: "Fixture Walk-In Care" },
        location: { latitude: 40.002, longitude: -75.0 },
        types: ["doctor"],
      },
      { id: "bad", displayName: { text: "No location" } },
    ],
  };

  it("maps places, keeps Google-only fields, and skips malformed entries", () => {
    const list = parseGooglePlaces(fixture, center, "clinic");
    expect(list).toHaveLength(2);
    expect(list[0]).toMatchObject({
      id: "google:abc",
      category: "hospital",
      address: "1 Test Rd, Testville",
      rating: 4.1,
      ratingCount: 210,
      openNow: true,
      source: "google",
    });
    expect(list[1]).toMatchObject({ category: "urgent_care", address: null, rating: null });
  });

  it("treats a missing places array as no results", () => {
    expect(parseGooglePlaces({}, center)).toEqual([]);
  });

  it("rejects non-object payloads", () => {
    expect(() => parseGooglePlaces("oops", center)).toThrow(NearbyCareError);
  });
});

describe("list helpers", () => {
  const mk = (
    name: string,
    category: CareFacility["category"],
    distanceKm: number,
  ): CareFacility => ({
    id: name,
    name,
    category,
    lat: 0,
    lng: 0,
    address: null,
    distanceKm,
    phone: null,
    website: null,
    openingHours: null,
    rating: null,
    ratingCount: null,
    openNow: null,
    source: "openstreetmap",
  });
  const list = [mk("C", "clinic", 3), mk("A", "hospital", 1), mk("B", "doctor", 12)];

  it("sorts by distance", () => {
    expect(sortByDistance(list).map((f) => f.name)).toEqual(["A", "C", "B"]);
  });
  it("drops results beyond the radius", () => {
    expect(withinRadius(list, 5).map((f) => f.name)).toEqual(["C", "A"]);
  });
  it("filters by category (empty = all)", () => {
    expect(filterByCategory(list, ["hospital", "doctor"]).map((f) => f.name)).toEqual(["A", "B"]);
    expect(filterByCategory(list, [])).toHaveLength(3);
  });
});

describe("searchNearbyCare (OpenStreetMap)", () => {
  beforeEach(() => {
    vi.stubEnv("VITE_GOOGLE_MAPS_API_KEY", "");
    __resetGeocodeThrottle();
  });
  afterEach(() => vi.unstubAllEnvs());

  it("POSTs a rounded Overpass query and returns sorted, radius-filtered results", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(mockResponse(overpassFixture));
    const res = await searchNearbyCare({
      center: { lat: 40.00012, lng: -75.00049 },
      radiusKm: 5,
      fetchImpl,
    });
    expect(res.source).toBe("openstreetmap");
    expect(res.facilities.map((f) => f.name)).toEqual([
      "Fixture Family Clinic",
      "Fixture Urgent Care",
      "Dr. Fixture",
      "Fixture General Hospital",
    ]);
    const [url, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(OVERPASS_URLS[0]);
    expect(init.method).toBe("POST");
    const body = decodeURIComponent(String(init.body).replace(/^data=/, ""));
    expect(body).toContain("around:5000,40,-75");
    expect(body).not.toContain("40.00012");
  });

  it("filters by requested categories", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(mockResponse(overpassFixture));
    const res = await searchNearbyCare({
      center,
      radiusKm: 5,
      categories: ["hospital"],
      fetchImpl,
    });
    expect(res.facilities.map((f) => f.name)).toEqual(["Fixture General Hospital"]);
  });

  it("maps 429 to a 'busy' error after trying the mirror and the Nominatim fallback", async () => {
    const fetchImpl = vi
      .fn()
      .mockImplementation(() => Promise.resolve(mockResponse("slow down", 429)));
    const err = await searchNearbyCare({ center, radiusKm: 2, fetchImpl }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(NearbyCareError);
    expect((err as NearbyCareError).code).toBe("busy");
    expect((err as NearbyCareError).retryable).toBe(true);
    expect((err as NearbyCareError).message).toMatch(/busy/);
    // Every Overpass server, then the first Nominatim fallback request (which also fails).
    expect(fetchImpl).toHaveBeenCalledTimes(OVERPASS_URLS.length + 1);
  });

  it("falls back to the mirror when the primary returns 504", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(mockResponse("gateway timeout", 504))
      .mockResolvedValueOnce(mockResponse(overpassFixture));
    const res = await searchNearbyCare({ center, radiusKm: 5, fetchImpl });
    expect(res.facilities.length).toBeGreaterThan(0);
    expect((fetchImpl.mock.calls[1] as [string])[0]).toBe(OVERPASS_URLS[1]);
  });

  it("maps network failures to a friendly error", async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));
    const err = await searchNearbyCare({ center, radiusKm: 2, fetchImpl }).catch((e: unknown) => e);
    expect((err as NearbyCareError).code).toBe("network");
    expect((err as NearbyCareError).message).toMatch(/internet connection/);
  });

  it("maps unreadable JSON to invalid_response", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response("<html>", { status: 200 }));
    const err = await searchNearbyCare({ center, radiusKm: 2, fetchImpl }).catch((e: unknown) => e);
    expect((err as NearbyCareError).code).toBe("invalid_response");
  });

  it("does not wrap abort errors", async () => {
    const abort = new DOMException("Aborted", "AbortError");
    const fetchImpl = vi.fn().mockRejectedValue(abort);
    const err = await searchNearbyCare({ center, radiusKm: 2, fetchImpl }).catch((e: unknown) => e);
    expect(err).toBe(abort);
  });
});

describe("searchNearbyCare (Google, mocked)", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("uses Places searchText with key + field mask when a key is configured", async () => {
    vi.stubEnv("VITE_GOOGLE_MAPS_API_KEY", "test-key");
    const fetchImpl = vi.fn().mockImplementation(() =>
      Promise.resolve(
        mockResponse({
          places: [
            {
              id: "p1",
              displayName: { text: "Fixture Hospital" },
              location: { latitude: 40.01, longitude: -75.0 },
              types: ["hospital"],
            },
          ],
        }),
      ),
    );
    const res = await searchNearbyCare({
      center: { lat: 40.00049, lng: -75.0 },
      radiusKm: 5,
      categories: ["hospital", "clinic"],
      fetchImpl,
    });
    expect(res.source).toBe("google");
    expect(res.facilities).toHaveLength(1); // deduped across category queries
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    const [url, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://places.googleapis.com/v1/places:searchText");
    const headers = init.headers as Record<string, string>;
    expect(headers["X-Goog-Api-Key"]).toBe("test-key");
    expect(headers["X-Goog-FieldMask"]).toContain("places.currentOpeningHours.openNow");
    const body = JSON.parse(String(init.body)) as {
      textQuery: string;
      locationBias: { circle: { center: { latitude: number }; radius: number } };
      maxResultCount: number;
    };
    expect(body.textQuery).toBe("hospital");
    expect(body.locationBias.circle.center.latitude).toBe(40);
    expect(body.locationBias.circle.radius).toBe(5000);
    expect(body.maxResultCount).toBe(20);
  });

  it("reports auth failures as a configuration error", async () => {
    vi.stubEnv("VITE_GOOGLE_MAPS_API_KEY", "bad-key");
    const fetchImpl = vi.fn().mockResolvedValue(mockResponse({ error: {} }, 403));
    const err = await searchNearbyCare({ center, radiusKm: 2, fetchImpl }).catch((e: unknown) => e);
    expect((err as NearbyCareError).code).toBe("config");
  });
});

describe("geocodeQuery", () => {
  beforeEach(() => __resetGeocodeThrottle());

  it("rejects empty input without a request", async () => {
    const fetchImpl = vi.fn();
    await expect(geocodeQuery("   ", undefined, fetchImpl)).rejects.toMatchObject({
      code: "empty_query",
    });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("calls Nominatim with jsonv2, limit 5, and accept-language, then parses results", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      mockResponse([
        { lat: "40.1", lon: "-75.2", display_name: "Testville, Fixture County" },
        { lat: "bad", lon: "-75.2", display_name: "Broken" },
      ]),
    );
    const res = await geocodeQuery("Testville", undefined, fetchImpl);
    expect(res).toEqual([{ label: "Testville, Fixture County", lat: 40.1, lng: -75.2 }]);
    const url = new URL((fetchImpl.mock.calls[0] as [string])[0]);
    expect(url.origin + url.pathname).toBe("https://nominatim.openstreetmap.org/search");
    expect(url.searchParams.get("format")).toBe("jsonv2");
    expect(url.searchParams.get("limit")).toBe("5");
    expect(url.searchParams.get("q")).toBe("Testville");
    expect(url.searchParams.get("accept-language")).toBeTruthy();
  });

  it("maps HTTP 429 to busy", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(mockResponse("", 429));
    await expect(geocodeQuery("x", undefined, fetchImpl)).rejects.toMatchObject({ code: "busy" });
  });
});

// Fixture shaped like a Nominatim jsonv2 structured `amenity=` response (test values only).
const nominatimHospitals = [
  {
    osm_type: "way",
    osm_id: 900,
    lat: "40.010",
    lon: "-75.000",
    name: "Fixture Memorial Hospital",
    type: "hospital",
    address: { house_number: "1", road: "Care Road", city: "Testville", postcode: "19001" },
    extratags: { website: "https://hospital.example", "contact:phone": "+1 555 0100" },
  },
  { osm_type: "node", osm_id: 901, lat: "40.002", lon: "-75.000", name: "", type: "hospital" },
];
const nominatimClinics = [
  {
    osm_type: "node",
    osm_id: 902,
    lat: "40.003",
    lon: "-75.001",
    name: "Fixture Walk-In",
    type: "clinic",
    address: { road: "Side Street", town: "Testville" },
    extratags: { healthcare: "urgent_care", opening_hours: "Mo-Su 08:00-20:00" },
  },
];

describe("parseNominatimPois", () => {
  it("builds facilities from named POIs and categorizes urgent care", () => {
    const list = parseNominatimPois([...nominatimHospitals, ...nominatimClinics], center);
    expect(list.map((f) => [f.name, f.category])).toEqual([
      ["Fixture Memorial Hospital", "hospital"],
      ["Fixture Walk-In", "urgent_care"],
    ]);
    expect(list[0]?.address).toBe("1 Care Road, Testville, 19001");
    expect(list[0]?.website).toBe("https://hospital.example/");
    expect(list[1]?.openingHours).toBe("Mo-Su 08:00-20:00");
    expect(list[1]?.address).toBe("Side Street, Testville");
  });

  it("rejects a non-array response", () => {
    expect(() => parseNominatimPois({ error: "x" }, center)).toThrow(NearbyCareError);
  });
});

describe("viewboxAround", () => {
  it("contains the search circle and uses rounded coordinates", () => {
    const [left, top, right, bottom] = viewboxAround({ lat: 40.00049, lng: -75.0004 }, 5000)
      .split(",")
      .map(Number);
    expect(top! - bottom!).toBeCloseTo(0.0898, 3);
    expect(left!).toBeLessThan(-75);
    expect(right!).toBeGreaterThan(-75);
    expect((left! + right!) / 2).toBeCloseTo(-75, 3);
  });
});

describe("searchNearbyCare (Overpass unavailable)", () => {
  beforeEach(() => {
    vi.stubEnv("VITE_GOOGLE_MAPS_API_KEY", "");
    __resetGeocodeThrottle();
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.useRealTimers();
  });

  const nominatimByAmenity = (url: string) => {
    const amenity = new URL(url).searchParams.get("amenity");
    if (amenity === "hospital") return mockResponse(nominatimHospitals);
    if (amenity === "clinic") return mockResponse(nominatimClinics);
    return mockResponse([]);
  };

  it("falls back to Nominatim POI search when every Overpass server fails", async () => {
    vi.useFakeTimers();
    const fetchImpl = vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      return Promise.resolve(
        url.includes("nominatim") ? nominatimByAmenity(url) : mockResponse("at capacity", 502),
      );
    });
    const pending = searchNearbyCare({ center, radiusKm: 5, fetchImpl });
    await vi.runAllTimersAsync();
    const res = await pending;
    expect(res.source).toBe("openstreetmap");
    expect(res.facilities.map((f) => f.name)).toEqual([
      "Fixture Walk-In",
      "Fixture Memorial Hospital",
    ]);
    const nominatimUrls = fetchImpl.mock.calls
      .map(([u]) => String(u))
      .filter((u) => u.includes("nominatim"));
    expect(nominatimUrls.map((u) => new URL(u).searchParams.get("amenity"))).toEqual([
      "hospital",
      "clinic",
      "doctors",
    ]);
    expect(new URL(nominatimUrls[0]!).searchParams.get("bounded")).toBe("1");
  });

  it("times out a hanging Overpass server and moves on", async () => {
    vi.useFakeTimers();
    const fetchImpl = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("nominatim")) return Promise.resolve(nominatimByAmenity(url));
      return new Promise<Response>((_, reject) => {
        init?.signal?.addEventListener("abort", () =>
          reject(new DOMException("Aborted", "AbortError")),
        );
      });
    });
    const pending = searchNearbyCare({ center, radiusKm: 5, fetchImpl });
    await vi.runAllTimersAsync();
    const res = await pending;
    expect(res.facilities.length).toBe(2);
    expect(fetchImpl.mock.calls.filter(([u]) => !String(u).includes("nominatim")).length).toBe(
      OVERPASS_URLS.length,
    );
  });

  it("still lets the caller abort", async () => {
    const controller = new AbortController();
    const fetchImpl = vi.fn((_input: RequestInfo | URL, init?: RequestInit) => {
      return new Promise<Response>((_, reject) => {
        init?.signal?.addEventListener("abort", () =>
          reject(new DOMException("Aborted", "AbortError")),
        );
      });
    });
    const pending = searchNearbyCare({ center, radiusKm: 5, fetchImpl, signal: controller.signal });
    controller.abort();
    const err = await pending.catch((e: unknown) => e);
    expect((err as DOMException).name).toBe("AbortError");
  });
});
