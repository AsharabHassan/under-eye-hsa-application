@AGENTS.md

# HSA Under-Eye Analyzer — working notes

- Prices and treatment copy live ONLY in `TREATMENTS` / `CONCERNS` in `lib/constants.ts`. The result screen, PDF and GoHighLevel payload all read from there. Prices are not yet confirmed by HSA: never invent them; `priceFrom: 0` means "not published" and must never render as "£0".
- Treatment routing rules live ONLY in `lib/plan.ts` (`decideTreatment`) and are tested in `test/plan.test.ts`. Puffiness routes to Cool Bleph and must never route to filler.
- Locations: `london` (default, `/` and `/london`) and `glasgow` (`/glasgow`).
- The Claude system prompt (`lib/prompts/system-undereye.ts`) must stay byte-stable for prompt caching — no interpolation.
- Brand tokens keep the old names (`peach` = gold accent, `cream` = dark surface, `sage` = cool secondary). Re-value them in `app/globals.css`; do not rename classes.
- Sides are named as they appear in the IMAGE (`left` = image-left). Claude, `lib/face-regions.ts` and the UI all use that convention.
- No Meta pixel id is hard-coded. Never add one; use `NEXT_PUBLIC_META_PIXEL_ID` / `META_DATASET_ID`.
- Before claiming done: `npm test`, `npx tsc --noEmit`, `npm run lint`, `npm run build`.
