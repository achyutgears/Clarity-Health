import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, type FormEvent } from "react";
import { ExternalLink, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { PageHeader, Notice } from "@/components/app-shell";
import { NearbyCareFinder } from "@/components/nearby/nearby-care-finder";
import { Button } from "@/components/ui/button";
import { appleMapsUrl, googleMapsUrl } from "@/lib/maps";
import { activeProvider, type CareFacility } from "@/lib/nearby-care";
import { pageMeta } from "@/lib/seo";

export const Route = createFileRoute("/locations")({
  head: () =>
    pageMeta(
      "Find nearby care",
      "Find hospitals, clinics, urgent care, and doctors near you from public OpenStreetMap listings, with directions.",
    ),
  component: Locations,
});

interface Loc {
  id: string;
  name: string;
  address: string;
  facilityId?: string;
}

const schema = z.object({
  name: z.string().trim().min(1, "Enter the facility name.").max(120),
  address: z
    .string()
    .trim()
    .min(5, "Enter the full street address so the map opens the right place.")
    .max(300),
});

function Locations() {
  const [locs, setLocs] = useState<Loc[]>([]);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [errors, setErrors] = useState<{
    name?: string | undefined;
    address?: string | undefined;
  }>({});
  const provider = activeProvider();

  const savedIds = useMemo(
    () => new Set(locs.flatMap((l) => (l.facilityId ? [l.facilityId] : []))),
    [locs],
  );

  const add = (e: FormEvent) => {
    e.preventDefault();
    const r = schema.safeParse({ name, address });
    if (!r.success) {
      const f = r.error.flatten().fieldErrors;
      return setErrors({ name: f.name?.[0], address: f.address?.[0] });
    }
    setErrors({});
    setLocs((l) => [...l, { id: crypto.randomUUID(), ...r.data }]);
    setName("");
    setAddress("");
  };

  const saveFacility = (f: CareFacility) => {
    if (!f.address || savedIds.has(f.id)) return;
    const address = f.address;
    setLocs((l) => [...l, { id: crypto.randomUUID(), name: f.name, address, facilityId: f.id }]);
    toast.success(`Saved ${f.name}`, { description: "Listed under “Your saved places” below." });
  };

  const input =
    "mt-1.5 w-full rounded-md border border-input bg-card px-3 py-2.5 text-sm aria-[invalid=true]:border-destructive";

  return (
    <>
      <PageHeader
        eyebrow="Care · Nearby"
        title="Find nearby care"
        description={
          provider === "google"
            ? "Lists hospitals, clinics, urgent care, and doctors from Google Places. Listings can be incomplete or out of date, so call ahead to confirm services and hours."
            : "Lists hospitals, clinics, urgent care, and doctors from OpenStreetMap, a community-maintained public map. Listings can be incomplete or out of date, so call ahead to confirm services and hours."
        }
      />

      <div className="mb-8">
        <Notice tone="warning">
          <strong className="font-semibold">
            In an emergency, call your local emergency number
          </strong>{" "}
          (911 in the US). This list is not a recommendation.
        </Notice>
      </div>

      <NearbyCareFinder onSave={saveFacility} savedIds={savedIds} />

      <section aria-labelledby="saved-heading" className="mt-16 rule-top">
        <h2 id="saved-heading" className="font-display text-3xl">
          Your saved places (this tab only)
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Save a facility from the results above, or add one you already know. Only places you save
          or enter appear here, and they disappear when you close this tab.
        </p>
        <div className="mt-8 grid gap-12 lg:grid-cols-[22rem_1fr]">
          <form onSubmit={add} noValidate className="space-y-4 self-start">
            <h3 className="font-display text-2xl">Add a verified location</h3>
            <div>
              <label htmlFor="name" className="text-sm font-medium">
                Facility name
              </label>
              <input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                aria-invalid={!!errors.name}
                aria-describedby={errors.name ? "name-err" : undefined}
                className={input}
              />
              {errors.name && (
                <p id="name-err" className="mt-1 text-xs text-destructive">
                  {errors.name}
                </p>
              )}
            </div>
            <div>
              <label htmlFor="address" className="text-sm font-medium">
                Street address
              </label>
              <input
                id="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                aria-invalid={!!errors.address}
                aria-describedby={errors.address ? "address-err" : undefined}
                className={input}
              />
              {errors.address && (
                <p id="address-err" className="mt-1 text-xs text-destructive">
                  {errors.address}
                </p>
              )}
            </div>
            <Button type="submit" className="h-10 w-full">
              Add location
            </Button>
            <p className="text-xs text-muted-foreground">Kept in this browser tab only.</p>
          </form>
          <section aria-label="Saved locations">
            {locs.length === 0 ? (
              <Notice>
                No saved places yet. Save a facility from the results above, or add one with its
                full address to get map links.
              </Notice>
            ) : (
              <ul className="border-t border-foreground">
                {locs.map((l) => {
                  const apple = appleMapsUrl(l),
                    google = googleMapsUrl(l);
                  return (
                    <li key={l.id} className="flex flex-wrap items-start gap-4 border-b py-5">
                      <div className="min-w-0 flex-1">
                        <div className="font-display text-2xl leading-tight">{l.name}</div>
                        <div className="mt-1 text-sm text-muted-foreground">{l.address}</div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {apple && (
                          <Button asChild variant="outline" size="sm" className="h-10">
                            <a
                              href={apple}
                              target="_blank"
                              rel="noopener noreferrer"
                              aria-label={`Open ${l.name} in Apple Maps (new tab)`}
                            >
                              Apple Maps <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          </Button>
                        )}
                        {google && (
                          <Button asChild variant="outline" size="sm" className="h-10">
                            <a
                              href={google}
                              target="_blank"
                              rel="noopener noreferrer"
                              aria-label={`Open ${l.name} in Google Maps (new tab)`}
                            >
                              Google Maps <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-10 w-10"
                          aria-label={`Remove ${l.name}`}
                          onClick={() => setLocs((x) => x.filter((y) => y.id !== l.id))}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      </section>
    </>
  );
}
