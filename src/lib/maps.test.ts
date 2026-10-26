import { describe, expect, it } from "vitest";
import { appleMapsUrl, googleMapsUrl } from "./maps";

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
