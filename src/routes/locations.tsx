import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { ExternalLink, Trash2 } from "lucide-react";
import { z } from "zod";
import { PageHeader, Notice } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { appleMapsUrl, googleMapsUrl } from "@/lib/maps";
import { pageMeta } from "@/lib/seo";

export const Route = createFileRoute("/locations")({
  head: () => pageMeta("Locations", "Verified care locations with Apple Maps and Google Maps links."),
  component: Locations,
});

interface Loc { id: string; name: string; address: string }

const schema = z.object({
  name: z.string().trim().min(1, "Enter the facility name.").max(120),
  address: z.string().trim().min(5, "Enter the full street address so the map opens the right place.").max(300),
});

function Locations() {
  const [locs, setLocs] = useState<Loc[]>([]);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [errors, setErrors] = useState<{ name?: string; address?: string }>({});

  const add = (e: FormEvent) => {
    e.preventDefault();
    const r = schema.safeParse({ name, address });
    if (!r.success) {
      const f = r.error.flatten().fieldErrors;
      return setErrors({ name: f.name?.[0], address: f.address?.[0] });
    }
    setErrors({});
    setLocs((l) => [...l, { id: crypto.randomUUID(), ...r.data }]);
    setName(""); setAddress("");
  };

  const input = "mt-1.5 w-full rounded-md border border-input bg-card px-3 py-2.5 text-sm aria-[invalid=true]:border-destructive";

  return (
    <>
      <PageHeader eyebrow="05 · Directory" title="Locations" description="Only locations you supply appear here. Clarity Health never invents or guesses an address." />
      <div className="grid gap-12 lg:grid-cols-[22rem_1fr]">
        <form onSubmit={add} noValidate className="space-y-4 self-start rule-top">
          <h2 className="font-display text-2xl">Add a verified location</h2>
          <div>
            <label htmlFor="name" className="text-sm font-medium">Facility name</label>
            <input id="name" value={name} onChange={(e) => setName(e.target.value)} aria-invalid={!!errors.name} aria-describedby={errors.name ? "name-err" : undefined} className={input} />
            {errors.name && <p id="name-err" className="mt-1 text-xs text-destructive">{errors.name}</p>}
          </div>
          <div>
            <label htmlFor="address" className="text-sm font-medium">Street address</label>
            <input id="address" value={address} onChange={(e) => setAddress(e.target.value)} aria-invalid={!!errors.address} aria-describedby={errors.address ? "address-err" : undefined} className={input} />
            {errors.address && <p id="address-err" className="mt-1 text-xs text-destructive">{errors.address}</p>}
          </div>
          <Button type="submit" className="w-full">Add location</Button>
          <p className="text-xs text-muted-foreground">Kept in this browser tab only.</p>
        </form>
        <section aria-label="Locations">
          {locs.length === 0 ? (
            <Notice>No verified locations yet. Add a facility with its full address to get map links.</Notice>
          ) : (
            <ul className="border-t border-foreground">
              {locs.map((l) => {
                const apple = appleMapsUrl(l), google = googleMapsUrl(l);
                return (
                  <li key={l.id} className="flex flex-wrap items-start gap-4 border-b py-5">
                    <div className="min-w-0 flex-1">
                      <div className="font-display text-2xl leading-tight">{l.name}</div>
                      <div className="mt-1 text-sm text-muted-foreground">{l.address}</div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {apple && (
                        <Button asChild variant="outline" size="sm">
                          <a href={apple} target="_blank" rel="noopener noreferrer" aria-label={`Open ${l.name} in Apple Maps (new tab)`}>Apple Maps <ExternalLink className="h-3.5 w-3.5" /></a>
                        </Button>
                      )}
                      {google && (
                        <Button asChild variant="outline" size="sm">
                          <a href={google} target="_blank" rel="noopener noreferrer" aria-label={`Open ${l.name} in Google Maps (new tab)`}>Google Maps <ExternalLink className="h-3.5 w-3.5" /></a>
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" aria-label={`Remove ${l.name}`} onClick={() => setLocs((x) => x.filter((y) => y.id !== l.id))}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
