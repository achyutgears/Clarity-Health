import { afterEach, describe, expect, it, vi } from "vitest";
import { GEOLOCATION_OPTIONS, GeolocationError, requestCurrentPosition } from "./geolocation";

const original = Object.getOwnPropertyDescriptor(navigator, "geolocation");

function mockGeolocation(impl: Geolocation["getCurrentPosition"] | undefined) {
  Object.defineProperty(navigator, "geolocation", {
    configurable: true,
    value: impl ? { getCurrentPosition: impl } : undefined,
  });
}

afterEach(() => {
  if (original) Object.defineProperty(navigator, "geolocation", original);
  else delete (navigator as unknown as Record<string, unknown>)["geolocation"];
});

describe("requestCurrentPosition", () => {
  it("resolves coordinates and passes privacy-friendly options", async () => {
    const spy = vi.fn(
      (success: PositionCallback, _err?: PositionErrorCallback | null, opts?: PositionOptions) => {
        expect(opts).toEqual(GEOLOCATION_OPTIONS);
        success({ coords: { latitude: 12.5, longitude: -3.25 } } as GeolocationPosition);
      },
    );
    mockGeolocation(spy as unknown as Geolocation["getCurrentPosition"]);
    await expect(requestCurrentPosition()).resolves.toEqual({ lat: 12.5, lng: -3.25 });
    expect(GEOLOCATION_OPTIONS).toEqual({
      enableHighAccuracy: false,
      timeout: 10_000,
      maximumAge: 300_000,
    });
  });

  it.each([
    [1, "denied"],
    [2, "unavailable"],
    [3, "timeout"],
  ] as const)("maps error code %i to %s", async (code, expected) => {
    mockGeolocation(((_s: PositionCallback, err?: PositionErrorCallback | null) => {
      err?.({ code, message: "x" } as GeolocationPositionError);
    }) as unknown as Geolocation["getCurrentPosition"]);
    const e = await requestCurrentPosition().catch((x: unknown) => x);
    expect(e).toBeInstanceOf(GeolocationError);
    expect((e as GeolocationError).code).toBe(expected);
    expect((e as GeolocationError).message).toMatch(/city, ZIP code, or address/);
  });

  it("reports unsupported when the API is missing", async () => {
    mockGeolocation(undefined);
    await expect(requestCurrentPosition()).rejects.toMatchObject({ code: "unsupported" });
  });
});
