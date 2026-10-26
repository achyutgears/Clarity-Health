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
