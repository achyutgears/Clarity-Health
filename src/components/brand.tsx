import { cn } from "@/lib/utils";

/** Clarity Health wordmark: a clear-lens mark plus serif wordmark. */
export function Wordmark({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <svg viewBox="0 0 28 28" className="h-7 w-7 shrink-0" aria-hidden>
        <circle cx="14" cy="14" r="12.5" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.35" />
        <path d="M14 5.5v17M5.5 14h17" stroke="var(--sidebar-primary)" strokeWidth="2.25" strokeLinecap="round" />
        <circle cx="14" cy="14" r="3" fill="currentColor" />
      </svg>
      {!compact && (
        <span className="font-display text-[1.6rem] leading-none tracking-tight">
          Clarity<span className="italic text-sidebar-primary"> Health</span>
        </span>
      )}
    </span>
  );
}

/** Abstract line art: an ECG trace flowing into structured lines. Decorative. */
export function ClinicalLineArt({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 480 480" className={className} aria-hidden fill="none">
      {Array.from({ length: 9 }).map((_, i) => (
        <circle key={i} cx="240" cy="240" r={40 + i * 26} stroke="currentColor" strokeOpacity={0.05 + i * 0.012} />
      ))}
      <path
        d="M20 260 H150 L168 230 L186 300 L210 150 L232 330 L252 240 H300"
        stroke="var(--sidebar-primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
      />
      {[0, 1, 2, 3].map((i) => (
        <g key={i}>
          <circle cx="320" cy={196 + i * 28} r="3" fill="var(--sidebar-primary)" opacity={1 - i * 0.18} />
          <path d={`M334 ${196 + i * 28} H${440 - i * 24}`} stroke="currentColor" strokeOpacity="0.45" strokeWidth="2" strokeLinecap="round" />
        </g>
      ))}
    </svg>
  );
}
