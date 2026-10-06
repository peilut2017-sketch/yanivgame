# Mediterranean Card Club — visual audit and implementation

Base: main at 324881d114e03eea71d0f074a8d560f3321178bc.
Audit performed against the running product in Chrome, including home, settings, online selection, two/four-player games and selection.

## Before
The pale table dominated the image while playing cards occupied little space. Opponents clustered at the top, leaving the center empty. The same heavy bevel, gold outline and capsule treatment appeared on navigation, names, scores, hints and controls, making every element equally loud. The startup toast obscured the top opponent. Card selection rebuilt the entire table, interrupting transitions. Existing announcement starbursts and abundant particles were visually disproportionate.

## Direction
Original Mediterranean seaside illustration and a twelve-character portrait atlas respond to the user's subsequent reference images. The table is a deep turquoise playing surface with a sand-colored rail, contact shadow and restrained textile texture. Ivory cards carry the strongest contrast. Terracotta belongs to the Yaniv action and events. Composition puts opponents on the perimeter, physical deck/discards in the middle and a broad shallow fan toward the player. Hebrew interface remains RTL; cards and numeric fragments retain explicit logical direction.

## Changed components
Game scene and table; PlayingCard (rank typography and pip layouts); CardHand (overlap, per-position rotation, selection lift); deck and discard stack; PlayerStation and avatar atlas; compact score/turn HUD; persistent action dock; Yaniv token; announcements and results; home, settings, table selection and waiting-room presentation. Styles moved into styles.css, with tokens for palette, type, spacing, depth, timing and layer order.

## Motion
Selection now updates existing card nodes instead of repainting the scene. Card flights follow a slight arc and finish at the destination card angle. Deal stagger is shorter. Active-turn breathing uses transform and opacity. Yaniv and Assaf use a brief ribbon impact with a restrained particle count. Reduced-motion preference also governs JavaScript card flights, event particles and score counts.

## Follow-up gameplay request
The user subsequently requested direct select-and-draw turns, appropriate sounds, a 15-second turn deadline, a random discard/deck draw on expiry, and elimination after three consecutive missed turns. These changes intentionally expand the original presentation-only scope.

- turn-engine.js contains pure, immutable turn and round transitions.
- turn-controller.js commits a complete discard/draw together. Online updates compare the existing updated_at revision before writing, preventing duplicate timeout actions across clients. No schema or database migrations were needed.
- Deadlines are absolute timestamps. Card selection and redraws do not extend the turn. A completed move in time resets consecutive idle strikes.
- On the third miss, the player forfeits. Remaining participants keep their seat indexes and continue; a last remaining player wins. An inactive host transfers to a remaining player.
- Paper foley, soft card impacts, a two-note turn cue, restrained end-of-round tones and the final-five-second tick use Web Audio and honor the existing sound preference. No music autoplays.
- Slapdown was explained as a rule variant, but is not enabled without a choice from the user.

## Validation
The timed-turn milestone was verified with 16 transition tests, 44 browser checks and six isolated online checks. The subsequent selection/round-flow/CPU refinement passed 25 logic tests, 56 browser checks, eight isolated online checks, 624 simulated rounds and offline loading. See CPU-STRATEGY.md for the current behavior and benchmark limits.
The online checks use the real Supabase SDK with intercepted HTTP responses: competing timeout observers, double-click prevention, deadline/action conflict, network failure rollback, inactive-host forfeiture, and no browser errors. They do not create production database records.
Actual Chrome screenshots cover home, settings, online selection, waiting room, normal/selected hands, ready-to-call Yaniv, announcements, results, timer warning and forfeiture.
The initial presentation-only milestone also compared 35 core functions to the starting commit. That comparison is historical: the later user-requested timed-turn workflow intentionally changes turn orchestration and online write coordination.
No live Supabase multiplayer match or real-device 60fps measurement was performed. The deadline is processed by an active browser; if every client is suspended/offline, overdue handling resumes when a client returns. This is not a server-scheduled timer.

## Assets and provenance
Generated with the built-in image_gen tool, then compressed to WebP. CSS positions the portrait atlas without per-frame processing. Combined shipped artwork is about 427 KiB. Assets:
- assets/mediterranean-terrace.webp
- assets/club-portraits.webp

### Environment generation prompt
Use case: stylized-concept. Asset type: original portrait mobile casual card game environment background, 1024x1536. Create a richly hand-painted polished commercial casual game illustration, appealing tactile 2.5D painted forms with confident sculpted shapes and soft detailed brush texture. Mediterranean seaside card club terrace at golden afternoon, luminous turquoise bay and distant ivory coastal village, lush olive and lemon foliage framing upper corners and sides, small terracotta pots, blue and cream ceramic tile accents, warm limestone terrace foreground. Composition: a vertical mobile backdrop with huge uncluttered quiet open central region for a game title and UI; architecture and foliage stay at edges, horizon at upper 40%, sunny blue sky top half, stone terrace bottom quarter and bay middle. Sophisticated warm, social, inviting mood. Deep Mediterranean blue, turquoise, warm ivory, sand, terracotta and restrained golden sunlight. Render with high craft comparable to a bestselling illustrated mobile board game, not flat vector art, not a photo, not generic gradient. No table, no playing cards, no people, no text, no UI, no buttons, no logos, no numbers, no watermark. Full bleed.

### Portrait generation prompt
Use case: stylized-concept. Asset type: production portrait avatar atlas for a Mediterranean casual mobile card game. One single 4-column by 3-row regular grid, exactly twelve equally sized square cells, no gutters, no text, no frames. Each cell holds one different charming adult character bust perfectly centered, head and shoulders filling 85 percent of square; face entirely inside central 70%. Twelve friendly expressive distinctive people, varied skin tones, hairstyles, male and female, curly-haired woman, bearded man, older silver-haired woman, young olive-skinned man, woman with bun, man in navy cap, long-haired woman, glasses man, dark-skinned curly-haired man, woman with bob, older moustache man, short-haired woman. Sophisticated polished hand-painted 2.5D mobile game character illustration with lively expressive large eyes, sculpted rounded forms, soft painterly texture, excellent shading and warm sunlight, relaxed coastal outfits. Plain solid alternating muted turquoise, sand, terracotta, Mediterranean blue cell backgrounds. Consistent head scale and light direction. NOT emoji, not vector icons, not realistic photographs, not children, no jewelry overload, no logos, no words. Atlas aspect ratio 4:3, evenly spaced grid exact.

## Further craft work
A bespoke painted royal-card set could further improve the court cards. Validate loading, touch feel, safe-area behavior and frame pacing on real iOS/Android devices. Multiplayer presence remains the existing global reconnect indicator; individual connection states should only be exposed after reliable backend presence exists.

