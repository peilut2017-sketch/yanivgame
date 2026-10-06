# Yaniv · Mediterranean Card Club

Hebrew / RTL casual card-game PWA. Plain HTML, CSS and JavaScript; Supabase provides the existing multiplayer transport. No build step or runtime npm dependencies.

## Run

With Node.js installed: `npm run dev`, then open http://127.0.0.1:4173.

## Verify

`npm ci`, `npx playwright install chromium`, then `npm test`, `npm run verify`, `npm run test:online`, and `npm run test:cpu`.

To use an installed Chrome instead, set `BROWSER_CHANNEL=chrome` before running verification. The test runner starts its own local server on port 4174. Screenshots and its JSON report go into ignored `artifacts/`.

Verification exercises the 375×812, 390×844, 393×852 and 430×932 layouts, five/seven-card hands, card selection, valid/invalid discards, drawing from both sources, a real CPU turn, Yaniv/Assaf scoring, next-round dealing, menus, keyboard dialogs, reduced motion, timer expiry, third-idle forfeiture and audio unlock. Test-only deterministic state is injected by Playwright; there is no debug route or altered game logic in production.

Live Supabase multiplayer and physical-device frame rates are not covered by these browser tests. Test fixtures do not create online rooms or write to Supabase.

## Presentation

- `styles.css`: design tokens, scene, game pieces, controls and responsive layout.
- `index.html`: game model, menus and presentation helpers.
- `turn-engine.js`: pure turn, timeout, forfeiture and scoring transitions.
- `turn-controller.js`: direct select/draw interaction, deadline HUD and revision-checked online commits.
- `card-rules.js`: legal combinations, run ordering and selection completion.
- `cpu-strategy.js`: easy/medium/hard decisions using only visible information.
- `CPU-STRATEGY.md`: algorithm audit, seeded benchmark, levels and round-flow behavior.
- `assets/*.webp`: original generated environment and portrait atlas, optimized to approximately 427 KiB combined.
- `ART-DIRECTION.md`: audit, decisions, asset provenance and testing limits.

Deploy the static files together. `sw.js` precaches the stylesheet and artwork for offline use; keep its cache version in sync with future asset changes.

## Turn behavior

Select cards, then click the deck or an eligible end card of the previous discard. The selection is discarded and one replacement is drawn as a single move. Each turn lasts 15 seconds; an expired turn discards one random card and draws from the deck. A timely move resets the idle counter. Three consecutive expired turns forfeit that player; the remaining players continue.

Online integration tests intercept requests to a fictional host. Production database records are never created by the test suite. Timer enforcement runs in active clients with revision-checked writes, not in a server scheduler.

Selections stay legal; a run may auto-complete with cards in the hand. The final five seconds tick when sound is enabled. Ordinary expiry has no notification. A new round starts automatically six seconds after Yaniv/Assaf unless the match ended. The first starter is random; subsequent rounds start with the previous winner (including the Assaf catcher). CPU profiles vary per match, and each seat displays a level.
