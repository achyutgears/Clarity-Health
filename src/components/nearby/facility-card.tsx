import {
  Bookmark,
  BookmarkCheck,
  Clock,
  ExternalLink,
  Globe,
  MapPin,
  Navigation,
  Phone,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { appleMapsDirectionsUrl, googleMapsDirectionsUrl } from "@/lib/maps";
import {
  CATEGORY_LABELS,
  formatDistance,
  telHref,
  type CareCategory,
  type CareFacility,
} from "@/lib/nearby-care";

const BADGE_TONE: Record<CareCategory, string> = {
  hospital: "border-destructive/30 bg-destructive/10 text-destructive",
  urgent_care: "border-warning/40 bg-warning-soft text-warning-foreground",
  clinic: "border-primary/30 bg-teal-soft text-accent-foreground",
  doctor: "border-border bg-muted text-foreground",
};

export function CategoryBadge({ category }: { category: CareCategory }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider",
        BADGE_TONE[category],
      )}
    >
      {CATEGORY_LABELS[category]}
    </span>
  );
}

function hostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "Website";
  }
}

const action = "relative z-10 h-10 px-3 text-xs";

export function FacilityCard({
  facility: f,
  selected,
  onSelect,
  onSave,
  saved,
}: {
  facility: CareFacility;
  selected: boolean;
  onSelect: () => void;
  onSave?: (() => void) | undefined;
  saved?: boolean | undefined;
}) {
  const google = googleMapsDirectionsUrl(f);
  const apple = appleMapsDirectionsUrl(f);

  return (
    <article
      className={cn(
        "surface relative p-4 transition-colors sm:p-5",
        selected
          ? "border-primary bg-teal-soft/40 ring-1 ring-primary"
          : "hover:border-foreground/30",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
        <CategoryBadge category={f.category} />
        <span className="whitespace-nowrap font-mono text-xs text-muted-foreground">
          {formatDistance(f.distanceKm)}
        </span>
      </div>

      <h3 className="mt-2 font-display text-[1.45rem] leading-tight">
        {/* Stretched button: the whole card selects the facility, while the action links stay on top. */}
        <button
          type="button"
          onClick={onSelect}
          aria-pressed={selected}
          className="cursor-pointer text-left after:absolute after:inset-0 after:rounded-lg after:content-[''] focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-ring"
        >
          {f.name}
          <span className="sr-only">{selected ? " (shown on map)" : " — show on map"}</span>
        </button>
      </h3>

      <dl className="mt-2 space-y-1.5 text-sm">
        <div className="flex gap-2">
          <dt className="sr-only">Address</dt>
          <MapPin aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <dd className={cn("min-w-0 break-words", !f.address && "italic text-muted-foreground")}>
            {f.address ?? "Address not listed"}
          </dd>
        </div>
        {f.openingHours && (
          <div className="flex gap-2">
            <dt className="sr-only">Listed hours</dt>
            <Clock aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <dd className="min-w-0 break-words">
              <span className="text-muted-foreground">Listed hours: </span>
              <span className="font-mono text-xs">{f.openingHours}</span>
            </dd>
          </div>
        )}
        {f.source === "google" && (f.rating !== null || f.openNow !== null) && (
          <div className="flex gap-2">
            <dt className="sr-only">Google listing</dt>
            <Star aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <dd className="text-muted-foreground">
              {f.rating !== null && (
                <span>
                  {f.rating.toFixed(1)} Google rating
                  {f.ratingCount !== null && ` (${f.ratingCount.toLocaleString()} reviews)`}
                </span>
              )}
              {f.rating !== null && f.openNow !== null && " · "}
              {f.openNow !== null && (
                <span>Google lists it as {f.openNow ? "open" : "closed"} now</span>
              )}
            </dd>
          </div>
        )}
      </dl>

      <div className="mt-4 flex flex-wrap gap-2">
        {google && (
          <Button asChild size="sm" className={action}>
            <a
              href={google}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Directions to ${f.name} in Google Maps (opens in new tab)`}
            >
              <Navigation className="h-3.5 w-3.5" /> Directions
            </a>
          </Button>
        )}
        {apple && (
          <Button asChild variant="outline" size="sm" className={action}>
            <a
              href={apple}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Directions to ${f.name} in Apple Maps (opens in new tab)`}
            >
              Apple Maps <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </Button>
        )}
        {f.phone && (
          <Button asChild variant="outline" size="sm" className={action}>
            <a href={telHref(f.phone)} aria-label={`Call ${f.name} at ${f.phone}`}>
              <Phone className="h-3.5 w-3.5" /> {f.phone}
            </a>
          </Button>
        )}
        {f.website && (
          <Button asChild variant="outline" size="sm" className={action}>
            <a
              href={f.website}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${f.name} website (opens in new tab)`}
            >
              <Globe className="h-3.5 w-3.5" />
              <span className="max-w-[12rem] truncate">{hostname(f.website)}</span>
            </a>
          </Button>
        )}
        {onSave && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={action}
            onClick={onSave}
            disabled={saved}
            aria-label={
              saved ? `${f.name} is in your saved places` : `Save ${f.name} to your places`
            }
          >
            {saved ? (
              <BookmarkCheck className="h-3.5 w-3.5" />
            ) : (
              <Bookmark className="h-3.5 w-3.5" />
            )}
            {saved ? "Saved" : "Save"}
          </Button>
        )}
      </div>
    </article>
  );
}
