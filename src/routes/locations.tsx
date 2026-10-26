import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { ExternalLink, MapPin, Trash2 } from "lucide-react";
import { PageHeader, Notice } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { pageMeta } from "@/lib/seo";

export const Route = createFileRoute("/locations")({
  head: () => pageMeta("Locations", "Verified care locations with map links."),
  component: Locations,
});

interface Loc { id: string; name: string; address: string }

function Locations() {
  const [locs, setLocs] = useState<Loc[]>([]);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");

  const add = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !address.trim()) return;
    setLocs((l) => [...l, { id: crypto.randomUUID(), name: name.trim(), address: address.trim() }]);
    setName(""); setAddress("");
  };

  return (
    <>
      <PageHeader eyebrow="Directory" title="Locations" description="Only locations you supply are shown. Clarity Health does not invent or guess addresses." />
      <div className="grid gap-6 lg:grid-cols-3">
        <form onSubmit={add} className="surface space-y-3 p-5">
          <h2 className="font-display text-xl">Add a verified location</h2>
          <div>
            <label htmlFor="name" className="eyebrow">Name</label>
            <input id="name" value={name} onChange={(e) => setName(e.target.value)} required className="mt-1 w-full rounded-md border border-input px-3 py-2 text-sm" />
          </div>
          <div>
            <label htmlFor="address" className="eyebrow">Address</label>
            <input id="address" value={address} onChange={(e) => setAddress(e.target.value)} required className="mt-1 w-full rounded-md border border-input px-3 py-2 text-sm" />
          </div>
          <Button type="submit" className="w-full">Add location</Button>
          <p className="text-xs text-muted-foreground">Stored in this browser session only.</p>
        </form>
        <section className="lg:col-span-2">
          {locs.length === 0 ? (
            <Notice>No verified locations have been supplied yet.</Notice>
          ) : (
            <ul className="space-y-3">
              {locs.map((l) => (
                <li key={l.id} className="surface flex items-start gap-3 p-4">
                  <MapPin className="mt-0.5 h-5 w-5 text-primary" aria-hidden />
                  <div className="flex-1">
                    <div className="font-medium">{l.name}</div>
                    <div className="text-sm text-muted-foreground">{l.address}</div>
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(l.address)}`}
                      target="_blank" rel="noopener noreferrer"
                      className="mt-2 inline-flex items-center gap-1 text-sm text-primary underline-offset-4 hover:underline"
                    >Open in maps <ExternalLink className="h-3.5 w-3.5" aria-hidden /></a>
                  </div>
                  <Button variant="ghost" size="icon" aria-label={`Remove ${l.name}`} onClick={() => setLocs((x) => x.filter((y) => y.id !== l.id))}><Trash2 className="h-4 w-4" /></Button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
