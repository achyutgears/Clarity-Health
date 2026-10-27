import { forwardRef } from "react";
import { ExternalLink, Map as MapIcon } from "lucide-react";
import { osmEmbedUrl, osmViewUrl } from "@/lib/maps";
import type { CareFacility } from "@/lib/nearby-care";

// OpenStreetMap embed (no API key) centred on the selected facility.
export const FacilityMap = forwardRef<HTMLDivElement, { facility: CareFacility | null }>(
  function FacilityMap({ facility }, ref) {
    const src = facility ? osmEmbedUrl(facility) : null;
    const view = facility ? osmViewUrl(facility) : null;
    return (
      <div ref={ref} className="surface scroll-mt-4 overflow-hidden">
        <div className="relative h-64 bg-muted sm:h-80 lg:h-[28rem]">
          {src && facility ? (
            <iframe
              key={facility.id}
              src={src}
              title={`Map showing the location of ${facility.name}`}
              loading="lazy"
              referrerPolicy="strict-origin-when-cross-origin"
              className="absolute inset-0 h-full w-full border-0"
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center text-sm text-muted-foreground">
              <MapIcon aria-hidden className="h-6 w-6" />
              Select a facility to see it on the map.
            </div>
          )}
        </div>
        {facility && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-t px-4 py-3 text-sm">
            <span className="min-w-0 truncate">
              <span className="eyebrow mr-2">On map</span>
              {facility.name}
            </span>
            {view && (
              <a
                href={view}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-10 items-center gap-1.5 text-xs text-primary underline-offset-4 hover:underline"
              >
                Larger map <ExternalLink aria-hidden className="h-3.5 w-3.5" />
                <span className="sr-only">(opens openstreetmap.org in a new tab)</span>
              </a>
            )}
          </div>
        )}
      </div>
    );
  },
);
