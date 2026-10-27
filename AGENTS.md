<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture
- Business logic lives in `src/lib/` (placeholder rule logic, synthetic data); route files only render UI — so the real extraction/evaluation engine can replace `src/lib` without touching pages.
- All sample content must be labeled synthetic; never hardcode metrics or claim AI/clinical validation — the product's trust depends on it.
- Auth uses Lovable Cloud email/password via `src/lib/auth.tsx` (AuthProvider + `requireAuth(reason, action)` opens a sign-in dialog); only account features (saved instructions) require sign-in — public tools stay open.
- Map links come only from `src/lib/maps.ts` builders, which return null without an address (or without finite coordinates for the directions builders) — never link to guessed destinations.
- Find Care (`src/lib/nearby-care.ts`) shows only facilities returned by a live provider: OpenStreetMap by default, Google Places (New) when `VITE_GOOGLE_MAPS_API_KEY` is set. Location is requested only on a user click, rounded before leaving the browser, and never stored.
- My Care Calendar (`src/lib/calendar`) uses the `calendar_events` table (RLS, owner-only) when signed in and the migration is applied, otherwise browser storage — and says which. Entries are personal notes, never bookings; reminders are in-app only.
- Database changes are additive SQL files in `drizzle/migrations` plus a `meta/_journal.json` entry; keep `src/integrations/supabase/types.ts` in step.
- `vite.config.ts` gives every dev-server WebSocket an error listener; removing it lets one malformed frame crash `npm run dev`.
