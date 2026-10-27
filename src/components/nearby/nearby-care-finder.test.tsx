import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { NearbyCareFinder } from "./nearby-care-finder";
import { __resetGeocodeThrottle } from "@/lib/nearby-care";

// Fixture responses shaped like Nominatim / Overpass (test data only).
const geocode = [{ lat: "40.0", lon: "-75.0", display_name: "Testville, Fixture County" }];
const overpass = {
  elements: [
    {
      type: "node",
      id: 1,
      lat: 40.001,
      lon: -75.0,
      tags: { amenity: "clinic", name: "Fixture Clinic", "addr:street": "Main St" },
    },
    {
      type: "node",
      id: 2,
      lat: 40.01,
      lon: -75.0,
      tags: { amenity: "hospital", name: "Fixture Hospital", opening_hours: "24/7" },
    },
  ],
};

const json = (body: unknown, status = 200) =>
  Promise.resolve(new Response(JSON.stringify(body), { status }));

beforeEach(() => {
  __resetGeocodeThrottle();
  vi.stubEnv("VITE_GOOGLE_MAPS_API_KEY", "");
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("NearbyCareFinder", () => {
  it("searches a place, lists results nearest first, filters, and shows the map", async () => {
    const fetchMock = vi.fn((url: string) =>
      url.includes("nominatim") ? json(geocode) : json(overpass),
    );
    vi.stubGlobal("fetch", fetchMock);
    render(<NearbyCareFinder />);

    expect(screen.getByText("Where should we look?")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/search a city, ZIP code, or address/i), {
      target: { value: "Testville" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^search$/i }));

    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent("2 facilities found within 5 km"),
    );
    const list = screen.getByRole("list", { name: /nearest first/i });
    const names = within(list)
      .getAllByRole("heading", { level: 3 })
      .map((h) => h.textContent);
    expect(names[0]).toMatch(/Fixture Clinic/);
    expect(names[1]).toMatch(/Fixture Hospital/);
    expect(screen.getByText("Listed hours:")).toBeInTheDocument();
    expect(screen.getByTitle(/Map showing the location of Fixture Clinic/)).toHaveAttribute(
      "loading",
      "lazy",
    );
    const directions = screen.getByRole("link", { name: /Directions to Fixture Clinic in Google/ });
    expect(directions).toHaveAttribute(
      "href",
      "https://www.google.com/maps/dir/?api=1&destination=40.001,-75",
    );
    expect(directions).toHaveAttribute("rel", expect.stringContaining("noopener"));

    fireEvent.click(screen.getByRole("button", { name: /^Hospitals/ }));
    expect(within(list).getAllByRole("heading", { level: 3 })).toHaveLength(1);
    expect(screen.getByTitle(/Map showing the location of Fixture Hospital/)).toBeInTheDocument();
    expect(screen.getByText(/OpenStreetMap contributors/)).toBeInTheDocument();
  });

  it("shows a retryable error when the directory and its fallback are busy", async () => {
    // Geocoding works; Overpass and the Nominatim POI fallback (amenity=…) are both busy.
    const fetchMock = vi.fn((url: string) =>
      url.includes("nominatim") && !url.includes("amenity=") ? json(geocode) : json({}, 429),
    );
    vi.stubGlobal("fetch", fetchMock);
    render(<NearbyCareFinder />);
    fireEvent.change(screen.getByLabelText(/search a city/i), { target: { value: "Testville" } });
    fireEvent.click(screen.getByRole("button", { name: /^search$/i }));
    // The fallback waits out Nominatim's one-request-per-second limit after geocoding.
    await waitFor(() => expect(screen.getByText("Search didn't finish")).toBeInTheDocument(), {
      timeout: 4000,
    });
    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
  });

  it("guides the user to manual search when location is denied", async () => {
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: {
        getCurrentPosition: (_s: PositionCallback, err: PositionErrorCallback) =>
          err({ code: 1, message: "denied" } as GeolocationPositionError),
      },
    });
    render(<NearbyCareFinder />);
    fireEvent.click(screen.getByRole("button", { name: /use my location/i }));
    await waitFor(() => expect(screen.getByText("Location access is off")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: /search by place instead/i }));
    expect(screen.getByLabelText(/search a city/i)).toHaveFocus();
  });
});
