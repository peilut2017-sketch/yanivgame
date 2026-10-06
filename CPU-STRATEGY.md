# CPU strategy audit and reproducible benchmark

The previous CPU used greedy point removal with incomplete combination enumeration. Its hard level sometimes waited before calling Yaniv using a random probability. That did not establish a reliable strength ordering. Joker-assisted groups/runs and shorter subsets of a run were missing from its candidate generator.

The new decision module receives only its own hand, exposed discard cards, opponents' card counts and configured rules. It receives neither other hands nor the real deck or its order. `card-rules.js` supplies the same exhaustive legal combinations to selection, sorting and CPU decisions, including wildcards. Runs are ordered before exposing their endpoints.

## Difficulty

| Level | Discard and draw | Calling Yaniv |
| --- | --- | --- |
| Easy | Random legal combination. Sometimes takes an exposed card worth at most two. | Calls when eligible. |
| Medium | Removes the highest total immediately, preferring more cards on ties. Takes an exposed card worth at most three. | Calls when eligible. |
| Hard | Compares every legal discard with each eligible pile endpoint and an expectation over unseen deck faces. Evaluates current points, cards left and the best following discard. | Calls on a very low hand; otherwise can defer if an opponent has at most two cards and the chosen move has a lower expected total. |

Assaf is automatic in the rules engine, not a separate CPU button or decision: a human's Yaniv is caught if an active opponent has an equal or smaller hand total. The CPU can also call Yaniv and be caught by a human. Both directions and ties are regression-tested.

## Results

Run `npm run test:cpu`. The default benchmark uses 100 fixed seeds per matchup, replayed with the two policies swapping seats: 200 rounds per matchup, alternating five- and seven-card openings. Every turn checks conservation of all 54 physical cards. Results are in `artifacts/cpu-benchmark.json`.

| Matchup | Wins | Assaf rounds | Unresolved at 240 turns |
| --- | --- | --- | --- |
| Medium vs easy | 198–2 | 1 | 0 |
| Hard vs medium | 123–77 (61.5% hard) | 33 | 0 |
| Hard vs easy | 200–0 | 1 | 0 |

Another 12 three-player and 12 four-player rounds completed without unresolved games. The longest measured decision in this desktop run was about 95 ms; it is not a mobile-device performance measurement.

These are round outcomes against synthetic opponents, not full-match win rates or a human skill rating. Hard has a measured advantage over medium on this fixed benchmark, but remains a one-step heuristic, not optimal play. It does not track long-term opponent discard/pickup history or optimize the match score and score-halving targets. Human playtesting and a larger held-out seed set are the next useful strength checks. Easy is intentionally very weak on this benchmark.

## Profiles and levels

Each new CPU match samples names without duplicates from 32 names and portraits without duplicates from the existing 12-character atlas. Players without a configured name receive a generated guest identity. Configured human identities are preserved. Profiles stay stable across rounds.

The level beside a human name is their local XP level at entry; online profiles synchronize this field and the avatar through the existing JSON state. CPU levels are generated character attributes (easy 1–5, medium 6–14, hard 15–30). The selected difficulty controls strategy; the decorative number does not change move strength. CPUs are explicitly labeled as computers. These levels are not authenticated ratings.

## Round flow

Selection never leaves an invalid combination. When adding a card can form a legal run with other cards already in hand, the smallest legal completion is selected. If deselecting a middle card would break a run, the remaining selection is reduced to a legal subset.

Turns remain 15 seconds. A tick plays once per second for the active human's last five seconds, honoring sound settings. Ordinary expiry silently performs the random discard/deck draw. Third-idle elimination still explains the loss.

The first player is random among active seats. Subsequent rounds start with the previous Yaniv winner or Assaf catcher. A persisted deadline starts the next round about six seconds after the declaration, without a button. Final match results do not auto-restart. All active online clients may advance the round with the existing revision check, so an absent host does not block it; competing writes advance it only once. As before, clients must be awake for deadline processing.

Validation: 25 logic/strategy tests, 56 browser checks at four mobile sizes, eight isolated SDK/HTTP online checks, 624 simulated rounds and offline reload. No live production multiplayer match or physical mobile timing test was performed.
