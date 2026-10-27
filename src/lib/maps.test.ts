import { describe, expect, it } from "vitest";
import {
  appleMapsDirectionsUrl,
  appleMapsUrl,
  googleMapsDirectionsUrl,
  googleMapsUrl,
  osmEmbedUrl,
  osmViewUrl,
} from "./maps";

const d = { name: "Riverside Clinic", address: "12 Main St, Springfield & Co" };

describe("map links", () => {
  it("Apple Maps uses maps.apple.com/?q= with the encoded name and address", () => {
    expect(appleMapsUrl(d)).toBe(
      "https://maps.apple.com/?q=Riverside%20Clinic%2C%2012%20Main%20St%2C%20Springfield%20%26%20Co",
    );
  });
  it("Google Maps uses the search API URL with the encoded query", () => {
    expect(googleMapsUrl(d)).toBe(
      "https://www.google.com/maps/search/?api=1&query=Riverside%20Clinic%2C%2012%20Main%20St%2C%20Springfield%20%26%20Co",
    );
  });
  it("returns no link when the address is missing", () => {
    expect(appleMapsUrl({ name: "Clinic", address: "  " })).toBeNull();
    expect(googleMapsUrl({ name: "Clinic", address: "" })).toBeNull();
  });
});

describe("coordinate map links", () => {
  const c = { lat: 37.7749, lng: -122.4194 };

  it("Google directions use the dir API with the destination coordinates", () => {
    expect(googleMapsDirectionsUrl(c)).toBe(
      "https://www.google.com/maps/dir/?api=1&destination=37.7749,-122.4194",
    );
  });

  it("Apple Maps directions use daddr", () => {
    expect(appleMapsDirectionsUrl(c)).toBe("https://maps.apple.com/?daddr=37.7749,-122.4194");
  });

  it("trims coordinate precision to 6 decimals", () => {
    expect(appleMapsDirectionsUrl({ lat: 1.123456789, lng: 2.987654321 })).toBe(
      "https://maps.apple.com/?daddr=1.123457,2.987654",
    );
  });

  it("returns null for non-finite or out-of-range coordinates", () => {
    for (const bad of [
      { lat: Number.NaN, lng: 1 },
      { lat: 1, lng: Number.POSITIVE_INFINITY },
      { lat: 91, lng: 0 },
      { lat: 0, lng: -181 },
    ]) {
      expect(googleMapsDirectionsUrl(bad)).toBeNull();
      expect(appleMapsDirectionsUrl(bad)).toBeNull();
      expect(osmEmbedUrl(bad)).toBeNull();
      expect(osmViewUrl(bad)).toBeNull();
    }
  });

  it("OSM embed centres a bbox on the point and adds a marker", () => {
    const url = osmEmbedUrl({ lat: 10, lng: 20 }, 0.01);
    expect(url).toBe(
      "https://www.openstreetmap.org/export/embed.html?bbox=19.99%2C9.99%2C20.01%2C10.01&layer=mapnik&marker=10%2C20",
    );
  });

  it("OSM view link opens the marker on openstreetmap.org", () => {
    expect(osmViewUrl({ lat: 10, lng: 20 })).toBe(
      "https://www.openstreetmap.org/?mlat=10&mlon=20#map=17/10/20",
    );
  });
});
