import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import {
  AlertTriangle,
  ChevronDown,
  Loader2,
  LocateFixed,
  MapPin,
  RotateCw,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { GeolocationError, requestCurrentPosition } from "@/lib/geolocation";
import {
  activeProvider,
  countByCategory,
  filterByCategory,
  geocodeQuery,
  isAbortError,
  NearbyCareError,
  OVERPASS_RESULT_LIMIT,
  RADIUS_OPTIONS_KM,
  searchNearbyCare,
  type CareCategory,
  type CareFacility,
  type CareSource,
  type GeocodeResult,
  type LatLng,
} from "@/lib/nearby-care";
import { FacilityCard } from "./facility-card";
import { FacilityMap } from "./facility-map";

type Phase = "idle" | "locating" | "geocoding" | "searching" | "done" | "error";

interface Origin {
  center: LatLng;
  label: string;
  kind: "device" | "search";
}

interface FinderError {
  kind: "denied" | "location" | "search" | "not_found" | "config";
  message: string;
  retry: (() => void) | null;
}

const CHIPS: { value: CareCategory; label: string }[] = [
  { value: "hospital", label: "Hospitals" },
  { value: "clinic", label: "Clinics" },
  { value: "urgent_care", label: "Urgent care" },
  { value: "doctor", label: "Doctors" },
];

const PROVIDER_NAME: Record<CareSource, string> = {
  openstreetmap: "the OpenStreetMap directory",
  google: "Google Places",
};

const fieldClass =
  "h-11 w-full rounded-md border border-input bg-card px-3 text-sm aria-[invalid=true]:border-destructive";

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export function NearbyCareFinder({
  onSave,
  savedIds,
}: {
  onSave?: ((f: CareFacility) => void) | undefined;
  savedIds?: ReadonlySet<string> | undefined;
}) {
  const provider = activeProvider();
  const [phase, setPhase] = useState<Phase>("idle");
  const [query, setQuery] = useState("");
  const [queryError, setQueryError] = useState<string | null>(null);
  const [radiusKm, setRadiusKm] = useState<number>(5);
  const [cats, setCats] = useState<CareCategory[]>([]);
  const [origin, setOrigin] = useState<Origin | null>(null);
  const [alternatives, setAlternatives] = useState<GeocodeResult[]>([]);
  const [results, setResults] = useState<CareFacility[]>([]);
  const [source, setSource] = useState<CareSource>(provider);
  const [searchedRadius, setSearchedRadius] = useState<number>(5);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState<FinderError | null>(null);

  const controllerRef = useRef<AbortController | null>(null);
  const runRef = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const radiusRef = useRef(radiusKm);
  const mapRef = useRef<HTMLDivElement>(null);

  // Cancel any in-flight request on unmount.
  useEffect(
    () => () => {
      runRef.current += 1;
      controllerRef.current?.abort();
    },
    [],
  );

  const begin = () => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    runRef.current += 1;
    return { controller, run: runRef.current };
  };

  const fail = (run: number, err: FinderError) => {
    if (run !== runRef.current) return;
    setError(err);
    setPhase("error");
  };

  const runSearch = async (o: Origin, radius: number) => {
    const { controller, run } = begin();
    setOrigin(o);
    setError(null);
    setPhase("searching");
    try {
      const res = await searchNearbyCare({
        center: o.center,
        radiusKm: radius,
        signal: controller.signal,
      });
      if (run !== runRef.current) return;
      setResults(res.facilities);
      setSource(res.source);
      setSearchedRadius(radius);
      setSelectedId(res.facilities[0]?.id ?? null);
      setPhase("done");
    } catch (err) {
      if (isAbortError(err)) return;
      const retry = () => void runSearch(o, radius);
      if (err instanceof NearbyCareError) {
        fail(run, {
          kind: err.code === "config" ? "config" : "search",
          message: err.message,
          retry: err.code === "config" ? null : retry,
        });
      } else {
        fail(run, {
          kind: "search",
          message: "Something went wrong while searching. Please try again.",
          retry,
        });
      }
    }
  };

  const locateMe = async () => {
    const { run } = begin();
    setError(null);
    setPhase("locating");
    try {
      const center = await requestCurrentPosition();
      if (run !== runRef.current) return;
      setAlternatives([]);
      await runSearch(
        { center, label: "your current location", kind: "device" },
        radiusRef.current,
      );
    } catch (err) {
      if (err instanceof GeolocationError) {
        fail(run, {
          kind: err.code === "denied" ? "denied" : "location",
          message: err.message,
          retry: err.code === "denied" || err.code === "unsupported" ? null : () => void locateMe(),
        });
      } else if (!isAbortError(err)) {
        fail(run, {
          kind: "location",
          message: "We couldn't get your location.",
          retry: () => void locateMe(),
        });
      }
    }
  };

  const searchPlace = async (text: string) => {
    const { controller, run } = begin();
    setError(null);
    setPhase("geocoding");
    try {
      const places = await geocodeQuery(text, controller.signal);
      if (run !== runRef.current) return;
      const [first, ...rest] = places;
      if (!first) {
        fail(run, {
          kind: "not_found",
          message: `No place matched “${text.trim()}”. Try a city name, ZIP code, or full street address.`,
          retry: null,
        });
        return;
      }
      setAlternatives(rest.slice(0, 3));
      await runSearch(
        { center: { lat: first.lat, lng: first.lng }, label: first.label, kind: "search" },
        radiusRef.current,
      );
    } catch (err) {
      if (isAbortError(err)) return;
      const message =
        err instanceof NearbyCareError
          ? err.message
          : "Something went wrong looking up that place.";
      const retryable = !(err instanceof NearbyCareError) || err.retryable;
      fail(run, {
        kind: "search",
        message,
        retry: retryable ? () => void searchPlace(text) : null,
      });
    }
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const text = query.trim();
    if (text.length < 2) {
      setQueryError("Enter a city, ZIP code, or address.");
      inputRef.current?.focus();
      return;
    }
    if (text.length > 200) {
      setQueryError("Keep the search under 200 characters.");
      return;
    }
    setQueryError(null);
    void searchPlace(text);
  };

  const changeRadius = (value: number) => {
    setRadiusKm(value);
    radiusRef.current = value;
    if (origin && phase !== "locating" && phase !== "geocoding") void runSearch(origin, value);
  };

  const toggleCat = (c: CareCategory) =>
    setCats((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));

  const visible = useMemo(() => filterByCategory(results, cats), [results, cats]);
  const counts = useMemo(() => countByCategory(results), [results]);
  const selected = visible.find((f) => f.id === selectedId) ?? visible[0] ?? null;

  const select = (id: string) => {
    setSelectedId(id);
    if (typeof window !== "undefined" && !window.matchMedia("(min-width: 1024px)").matches) {
      mapRef.current?.scrollIntoView({
        behavior: prefersReducedMotion() ? "auto" : "smooth",
        block: "nearest",
      });
    }
  };

  const busy = phase === "locating" || phase === "geocoding" || phase === "searching";
  const nextRadius = RADIUS_OPTIONS_KM.find((r) => r > searchedRadius);
  const catNames = cats
    .map((c) => CHIPS.find((x) => x.value === c)?.label.toLowerCase())
    .join(" or ");

  let status = "";
  if (phase === "locating") status = "Waiting for your browser to share your location…";
  else if (phase === "geocoding") status = `Looking up “${query.trim()}”…`;
  else if (phase === "searching") status = `Searching for care within ${radiusKm} km…`;
  else if (phase === "done") {
    const n = results.length;
    status =
      n === 0
        ? `No facilities found within ${searchedRadius} km.`
        : `${n} ${n === 1 ? "facility" : "facilities"} found within ${searchedRadius} km` +
          (cats.length > 0 ? `, ${visible.length} shown after filters.` : ".");
  } else if (phase === "error" && error) status = error.message;

  return (
    <div className="space-y-6">
      <section aria-labelledby="finder-controls" className="surface p-4 sm:p-6">
        <h2 id="finder-controls" className="sr-only">
          Choose where to search
        </h2>
        <div className="grid gap-6 md:grid-cols-[minmax(0,16rem)_minmax(0,1fr)] md:gap-8">
          <div>
            <Button
              type="button"
              onClick={() => void locateMe()}
              disabled={phase === "locating"}
              className="h-11 w-full"
            >
              {phase === "locating" ? (
                <Loader2 className="animate-spin motion-reduce:animate-none" />
              ) : (
                <LocateFixed />
              )}
              Use my location
            </Button>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              Used once to find care near you. It is rounded to about 100 m before being sent to{" "}
              {PROVIDER_NAME[provider]} and is never stored.
            </p>
          </div>

          <form onSubmit={onSubmit} noValidate role="search" className="min-w-0">
            <label htmlFor="care-query" className="text-sm font-medium">
              Or search a city, ZIP code, or address
            </label>
            <div className="mt-1.5 flex flex-col gap-2 sm:flex-row">
              <input
                ref={inputRef}
                id="care-query"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="e.g. Austin, TX or 94110"
                enterKeyHint="search"
                maxLength={200}
                aria-invalid={!!queryError}
                aria-describedby={queryError ? "care-query-err" : undefined}
                className={cn(fieldClass, "min-w-0 flex-1")}
              />
              <Button
                type="submit"
                variant="outline"
                className="h-11 sm:w-auto"
                disabled={phase === "geocoding"}
              >
                {phase === "geocoding" ? (
                  <Loader2 className="animate-spin motion-reduce:animate-none" />
                ) : (
                  <Search />
                )}
                Search
              </Button>
            </div>
            {queryError && (
              <p id="care-query-err" className="mt-1 text-xs text-destructive">
                {queryError}
              </p>
            )}
          </form>
        </div>

        <div className="mt-6 flex flex-col gap-4 border-t pt-5 sm:flex-row sm:flex-wrap sm:items-end sm:gap-x-8">
          <div>
            <label htmlFor="care-radius" className="eyebrow block">
              Search radius
            </label>
            <div className="relative mt-1.5 w-full sm:w-36">
              <select
                id="care-radius"
                value={radiusKm}
                onChange={(e) => changeRadius(Number(e.target.value))}
                className={cn(fieldClass, "cursor-pointer appearance-none pr-9")}
              >
                {RADIUS_OPTIONS_KM.map((r) => (
                  <option key={r} value={r}>
                    {r} km ({(r / 1.609344).toFixed(r < 10 ? 1 : 0)} mi)
                  </option>
                ))}
              </select>
              <ChevronDown
                aria-hidden
                className="pointer-events-none absolute right-3 top-3.5 h-4 w-4 text-muted-foreground"
              />
            </div>
          </div>
          <div className="min-w-0">
            <span id="care-type-label" className="eyebrow block">
              Type of care
            </span>
            <div
              role="group"
              aria-labelledby="care-type-label"
              className="mt-1.5 flex flex-wrap gap-2"
            >
              <Chip pressed={cats.length === 0} onClick={() => setCats([])}>
                All{phase === "done" && <Count n={results.length} />}
              </Chip>
              {CHIPS.map((c) => (
                <Chip
                  key={c.value}
                  pressed={cats.includes(c.value)}
                  onClick={() => toggleCat(c.value)}
                >
                  {c.label}
                  {phase === "done" && <Count n={counts[c.value]} />}
                </Chip>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p role="status" aria-live="polite" className="text-sm font-medium">
          {status}
        </p>
        {origin && phase !== "idle" && (
          <p className="min-w-0 text-sm text-muted-foreground">
            <MapPin aria-hidden className="mr-1 inline h-3.5 w-3.5 align-[-2px]" />
            Near {origin.kind === "device" ? "your current location (approximate)" : origin.label}
          </p>
        )}
      </div>

      {alternatives.length > 0 && origin?.kind === "search" && !busy && (
        <div className="-mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>Not the right place?</span>
          {alternatives.map((a) => (
            <button
              key={`${a.lat},${a.lng}`}
              type="button"
              onClick={() => {
                setAlternatives((prev) => [
                  ...prev.filter((x) => x !== a),
                  ...(origin
                    ? [{ label: origin.label, lat: origin.center.lat, lng: origin.center.lng }]
                    : []),
                ]);
                void runSearch(
                  { center: { lat: a.lat, lng: a.lng }, label: a.label, kind: "search" },
                  radiusKm,
                );
              }}
              className="min-h-10 max-w-full truncate rounded-full border bg-card px-3 text-left hover:border-foreground/40"
            >
              {a.label}
            </button>
          ))}
        </div>
      )}

      {phase === "idle" && (
        <div className="surface flex flex-col items-center gap-3 px-6 py-14 text-center">
          <MapPin aria-hidden className="h-7 w-7 text-primary" />
          <h2 className="font-display text-2xl">Where should we look?</h2>
          <p className="max-w-md text-sm text-muted-foreground">
            Use your location or search a city, ZIP code, or address to list hospitals, clinics,
            urgent care, and doctors nearby.
          </p>
        </div>
      )}

      {busy && <LoadingState />}

      {phase === "error" && error && (
        <div className="surface flex flex-col items-start gap-3 border-l-2 border-l-warning p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <AlertTriangle
              aria-hidden
              className="mt-0.5 h-5 w-5 shrink-0 text-warning-foreground"
            />
            <div>
              <h2 className="font-medium">
                {error.kind === "denied"
                  ? "Location access is off"
                  : error.kind === "not_found"
                    ? "Place not found"
                    : error.kind === "config"
                      ? "Search provider not configured"
                      : "Search didn't finish"}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">{error.message}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 sm:pl-8">
            {error.retry && (
              <Button type="button" onClick={error.retry} className="h-10">
                <RotateCw /> Try again
              </Button>
            )}
            {(error.kind === "denied" ||
              error.kind === "location" ||
              error.kind === "not_found") && (
              <Button
                type="button"
                variant="outline"
                className="h-10"
                onClick={() => inputRef.current?.focus()}
              >
                <Search /> {error.kind === "not_found" ? "Edit search" : "Search by place instead"}
              </Button>
            )}
          </div>
        </div>
      )}

      {phase === "done" && results.length === 0 && (
        <div className="surface flex flex-col items-center gap-3 px-6 py-12 text-center">
          <h2 className="font-display text-2xl">No facilities found within {searchedRadius} km</h2>
          <p className="max-w-md text-sm text-muted-foreground">
            Try a larger radius. {PROVIDER_NAME[source].replace(/^the /, "The ")} may not list every
            facility in this area.
          </p>
          {nextRadius && origin && (
            <Button type="button" className="h-10" onClick={() => changeRadius(nextRadius)}>
              Search within {nextRadius} km
            </Button>
          )}
        </div>
      )}

      {phase === "done" && results.length > 0 && (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:items-start">
          <div className="lg:sticky lg:top-6 lg:order-2">
            <FacilityMap ref={mapRef} facility={selected} />
          </div>
          <div className="min-w-0 lg:order-1">
            {visible.length === 0 ? (
              <div className="surface flex flex-col items-start gap-3 p-6">
                <p className="text-sm">No {catNames} in these results.</p>
                <Button
                  type="button"
                  variant="outline"
                  className="h-10"
                  onClick={() => setCats([])}
                >
                  Show all types
                </Button>
              </div>
            ) : (
              <ol aria-label="Facilities, nearest first" className="space-y-3">
                {visible.map((f) => (
                  <li key={f.id} className="animate-rise motion-reduce:animate-none">
                    <FacilityCard
                      facility={f}
                      selected={selected?.id === f.id}
                      onSelect={() => select(f.id)}
                      onSave={onSave && f.address ? () => onSave(f) : undefined}
                      saved={savedIds?.has(f.id)}
                    />
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      )}

      {(phase === "done" || phase === "searching") && (
        <p className="text-xs leading-relaxed text-muted-foreground">
          {source === "google" ? (
            <>Facility data © Google (Places API). </>
          ) : (
            <>
              Facility data ©{" "}
              <a
                href="https://www.openstreetmap.org/copyright"
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2 hover:text-foreground"
              >
                OpenStreetMap contributors
              </a>
              , via the Overpass API. Up to {OVERPASS_RESULT_LIMIT} listings per search; a smaller
              radius gives the most complete nearby list.{" "}
            </>
          )}
          Place search by Nominatim. Map © OpenStreetMap. Listings may be incomplete or out of date
          — call ahead to confirm services and hours.
        </p>
      )}
    </div>
  );
}

function Chip({
  pressed,
  onClick,
  children,
}: {
  pressed: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={cn(
        "inline-flex min-h-10 cursor-pointer items-center gap-1.5 rounded-full border px-3.5 text-sm transition-colors",
        pressed
          ? "border-ink bg-ink text-ink-foreground"
          : "border-border bg-card text-foreground hover:border-foreground/40",
      )}
    >
      {children}
    </button>
  );
}

function Count({ n }: { n: number }) {
  return <span className="font-mono text-[11px] opacity-70">{n}</span>;
}

function LoadingState() {
  return (
    <div aria-hidden className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="surface space-y-3 p-5">
            <div className="h-4 w-20 animate-pulse rounded-full bg-muted motion-reduce:animate-none" />
            <div className="h-6 w-2/3 animate-pulse rounded bg-muted motion-reduce:animate-none" />
            <div className="h-4 w-1/2 animate-pulse rounded bg-muted motion-reduce:animate-none" />
            <div className="flex gap-2">
              <div className="h-10 w-28 animate-pulse rounded-md bg-muted motion-reduce:animate-none" />
              <div className="h-10 w-24 animate-pulse rounded-md bg-muted motion-reduce:animate-none" />
            </div>
          </div>
        ))}
      </div>
      <div className="surface hidden h-[28rem] animate-pulse bg-muted motion-reduce:animate-none lg:block" />
    </div>
  );
}
