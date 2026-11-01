# River's Edge Poker: phone audit and redesign plan

Audit date: Oct 30, 2026, against https://poker.marlylabs.app (commit b7ac037).
Method: headless Chrome via Playwright, iPhone user agent, `isMobile`, `hasTouch`, DPR 3.
Sizes were measured from DOM bounding boxes and computed styles. Effective font px = CSS font-size × the on-screen scale.
Screenshots are in `shots/`: `audit-portrait-start.png`, `audit-portrait-setup.png`, `audit-landscape-start.png`, `audit-landscape-setup.png` and `audit-landscape-inhand.png`.

## 1. Audit findings

### Portrait 390×844
- Every screen is the "Landscape mode required" gate (`App.tsx`, `portrait-gatekeeper`). The only other visible elements are the Install and Share buttons.
- A hand can't be played in portrait at all, so there is nothing more to measure.

### Landscape 844×390 (in a live hand: 4 players, pre-flop, the user to act)
The whole table is a fixed 1200×600 px "Game Stage Wrapper", shrunk with `transform: scale(tableScale)`.
On this phone `tableScale = 0.42`, so everything on the felt is drawn at 42% of its designed size. The stage occupies x 170–674, y 14–266.

**Overlaps** (rects are x, y, w×h in CSS px):
| Element A | Element B | Overlap |
|---|---|---|
| Top seat (Vanessa) pocket cards 395,16 34×47 and 415,16 34×47 | Header **MIC** button 378,8 74×40 | 34×32 each (cards poke up under the header) |
| Top seat name tag "VANESSA" 383,68 77×20 | **TOTAL POT** label 383,69 78×10 | 77×10 (pot label fully hidden) |
| User seat name tag "PLAYER 1" 383,177 78×21 | Community card slots 2–4 (341/393/445,122 58×81) | 16×21, 58×21, 16×21 |
| Left seat name tag "BRUNSON" 268,130 79×19 | Community card slots 1–2 | 58×19, 6×19 |
| Right seat name tag "DANIEL" 513,130 63×20 | Community card slot 5 496,122 58×81 | 41×20 |
| Community card slots 1↔2↔3↔4↔5 | neighbours | 6–7×81 each (cards touch or overlap) |
| Splash "Fullscreen experience optimized" footer 332,336 200×12 | **TAP TO PLAY** button 297,209 251×168 | 200×12; it blocks the tap on the button's lower edge (Playwright had to force the click) |

**Off-screen or clipped:**
| Element | Rect | Clipped |
|---|---|---|
| Header **FULL SCREEN** button | 759,11 107×34 | 22 px past the right edge |
| Header **FORFEIT** button | 873,11 73×34 | entirely off-screen (starts 29 px past the 844 px edge; 102 px beyond) |

At 844 px wide the app uses the *desktop* header (`md:` breakpoint): Mute, Guide, Tips and Mic on the left, then Pause, Exp, Help, Full screen and Forfeit, which doesn't fit.
The top seat's cards also rise above the felt into the header band.

### Sizes (landscape 844×390)
| Item | Size |
|---|---|
| Opponent pocket cards (on felt) | **34×47 px** (32×45 on the left seat). Card backs only |
| User pocket cards on the felt (seat) | **34×47 px**; rank **12.6 px**, suit **22.3 px** |
| User hand in the HUD (bottom-left) | **56×80 px**; rank **18 px**, suit **29.9 px** |
| Community card slots | **58×81 px** (face-down placeholders pre-flop). Faces are designed at 42/72 px rank/suit at md and appear ≈ 17.6/30 px |
| Seat name tags | **11.8–12.3 px** |
| Pot label / pot amount | **9.6 px** / ≈ **12.6 px** (30 px × 0.42) |
| Standings panel (right): names, chips, "BET: $x" | **7.9–8.2 px** |
| Action log (left) | 11 px |
| "Your balance" label / amount | 12 px / 24 px |
| Hand strength ("HIGH CARD - KINGS") | 14 px |
| Action buttons Fold / Call / Raise / All in | 85×33, 85×33, 125×33, 85×33 px; text 14 / 16 / 16 / 14 px |
| Bet presets 0.5X / 1X / 2X | 60×31, 47×31, 49×31 px; text 11 px |
| Header buttons Mute / Guide / Tips / Mic | 74–86×40, text 16 px |
| Header buttons Pause / Exp / Help / Full screen / Forfeit | 65–107×34, text 7.6 px (Pause 13.6 px) |

### How the user's own hand is shown
It is shown **twice**:
- as two tiny 34×47 face-up cards at the bottom seat of the felt (scaled), under the "PLAYER 1" tag;
- as two 56×80 cards at the bottom-left of the HUD next to "Your balance".

Neither can be enlarged. The felt copy collides with the board, and the HUD copy is the only readable one.

### Where things sit
- **Action buttons:** a single bottom-right row at y 342–375 (Fold, Call, Raise, All in). The bet presets and slider sit above them at y 295–326, with the slider value "$300" at the far right.
- **Opponents' cards:** card-back pairs around the oval, positioned by percentage via `getSeatCoordinates()`.
  - Top seat: at the top rail, intruding into the header.
  - Left and right seats: outside the rail ends, with name tags pushed inward onto the board area.
- **Panels:** a duplicate standings list is docked at the right edge (x 717+), and the action log at the left edge (x 8–132).

## 2. Files responsible for layout and cards
| File | What it does | Spots to change |
|---|---|---|
| `src/components/PokerTable.tsx` (2,797 lines) | The whole in-game UI: header, felt, seats, pot, board, side panels, HUD, action bar, settings and modals | `getSeatCoordinates()` (l.17–77); scale logic `updateScale` / `setTableScale` (l.246–276; 1200×600/750 stage, base 950/800/700); `TABLE_COLORS` (l.408); desktop header (l.1442–1619) and mobile header (l.1620–1795, only below `md`); Game Stage Wrapper (l.1797); felt and rail (l.1839–1873; felt texture from external `transparenttextures.com`); pot (l.1875–1884); seats, cards and name tags (l.1886–2000; cards `!w-[72px] !h-[102px] md:!w-[80px] md:!h-[112px]`, tags `text-[22–28px]` before scaling, `minWidth 140px`); board (l.2002–2065); desktop side panels (l.2127–2258); mobile action log (l.2259) and right standings panel (l.2292; `w-[90–130px]`); HUD and action bar (l.2387–2680; user cards `w-[57px] h-[80px]` / `w-[76px] h-[106px]`) |
| `src/components/Card.tsx` | Card face and back; 13 back designs | Size and typography are guessed by **sniffing class strings** (`className.includes('[72px]')` etc., l.121–160). That's fragile and is why sizes are inconsistent |
| `src/index.css` | Tailwind v4 theme plus custom classes | `@theme` (l.8); `.table-felt`, `.poker-rail`, `.card-shadow`, `.gold-glow`, `.community-card` (and its media query at l.274), `.player-name` / `.player-balance` / `.main-pot-amount` media rules (l.284–306) |
| `src/App.tsx` | Gates and splash | Portrait gate (`portrait-gatekeeper`), "Tap to play" splash and its overlapping footer, fullscreen and orientation lock |
| `src/components/ChipStack.tsx` | Chip piles | Reuse for bets in front of seats |
| `src/components/LandingPage.tsx` | Setup screen | Restyle to match (phase 3) |
| `public/manifest.json` | `"orientation": "landscape"` | Change to `"any"` if portrait play ships |

## 3. Redesign plan

### (a) Fully visible and readable on a phone. Recommendation: **support portrait play** and keep landscape
- Phones are held upright for one-handed play, and iPhone Safari has no Fullscreen or orientation-lock API, so the landscape gate is the biggest barrier.
- Portrait gives a tall felt, a big hand area and a natural thumb zone.
- Landscape stays supported with its own layout. The gate becomes an optional tip, not a blocker.
- Replace the scaled 1200 px stage with a **responsive layout** built from CSS grid, flex and `clamp()` size tokens. Nothing shrinks below its target px; the seats move instead.
- Desktop can keep the current stage scaling as its own branch at first.

**Portrait layout (390×844 reference; also checked at 360 and 430 wide):**
```
┌ top bar 48px: Hand #, pot chip, Mic, Pause, ☰ menu ┐
│  opponents on the upper arc (up to 5)              │
│  felt + wood rail (stadium, ~56% height)           │
│      pot  ·  5 board cards  ·  last action         │
│  hero seat plate (name · chips · bet)              │
│  hero hand: compact stack (tap to fan)             │
├ action bar (thumb zone, bottom 26%) ───────────────┤
│  [ FOLD ]  [ CHECK/CALL $x ]  [ RAISE ▸ ]          │
│  raise sheet: ½ pot · pot · 2× · slider · All in   │
└────────────────────────────────────────────────────┘
```

**Landscape layout (844×390):**
- Felt takes the left ~64% of the width at full height under a 40 px top bar.
- The action column on the right (thumb zone) holds Fold, Check/Call and Raise stacked as 56 px-tall buttons.
- The hero hand stack sits bottom-left.
- The standings and log panels move into the ☰ menu or drawers (no permanent side panels).

**Header:**
- One compact bar: Hand #, pot, Mic and Pause as 40×40 icons, plus ☰.
- Everything else (Mute, Guide, Tips, Exp/Settings, Help, Full screen, Forfeit) goes in the menu sheet. This fixes the clipped Full screen and off-screen Forfeit.

**No overlaps rule:**
- Seat plates sit **outside** the board zone.
- The pot sits above the board with its own row.
- The board row reserves 5 card widths plus gaps.
- Each layout gets automated bounding-box checks (see QA).

### (b) Target sizes (CSS px)
| Item | Portrait 390 | Landscape 844×390 | Now |
|---|---|---|---|
| Board card | **58×82**, rank **20**, suit **30** (5 × 58 + 4 × 6 = 314 px fits the felt) | **54×76**, rank 19, suit 28 | 58×81 slots, faces ≈ 17.6/30 |
| Hero hand, collapsed stack | **70×98** each, overlapped 60%; rank **24**, suit **32** | 60×84 | 34×47 felt / 56×80 HUD |
| Hero hand, expanded fan | **150×210** each, centered, ±8° fan; rank **44**, suit **72** | 130×182 | none |
| Opponent mini stack | **24×34** backs, 2 overlapped; face-up at showdown **36×50** (rank 14, suit 18) | same | 34×47 |
| Seat name / chips | **13 / 13 px** (tabular), bet chip label **12 px** | 12 / 12 | 11.8–12.3 / 7.9 |
| Pot label / amount | **12 / 22 px** | 11 / 20 | 9.6 / 12.6 |
| Action buttons | **≥108×56**, text **18 px**; gap 8 | **≥120×52** stacked, text 17 | 85×33, 14–16 px |
| Raise sheet presets and slider | **≥64×44**, text **15 px**; thumb 28 px | same | 47–60×31, 11 px |
| Top-bar icons | **40×40** (44 px hit area) | same | text 7.6 px |
| Minimum text anywhere | **12 px** (11 px only for uppercase micro-labels) | same | 7.6 px |

### (c) Red Dead Redemption 2-style saloon look
- **Felt:** warm, slightly worn green (`#2f5b3c` center → `#1f3f2a` edge) with a soft vignette and a self-hosted subtle cloth noise (no external texture URL).
- **Rail:** dark oak or walnut wood rail (`#5a3a22` → `#3a2414`, grain via layered gradients) with a thin brass inlay line (`#c9a45c`).
- **Cards:** off-white "paper" faces (`#f4ecd8`) with deep red / near-black suits and slightly rounded 6 px corners.
- **Type:** a serif rank face for headings and card ranks (self-hosted, e.g. Playfair Display or a Western display face for titles only). Body text keeps a clean sans with tabular numerals for chips.
- **Chips:** clay-style chips (red / blue / green / black) with rim stripes, reusing `ChipStack`.
- **Lighting:** a warm lamp glow from the top (radial amber at 6–8% opacity) and a dim background ("dark saloon wood" or plain `#120c08`).
- **Hero hand:**
  - A compact stack sits at the bottom center.
  - **Tap** it to expand into a large centered fan over a dimmed backdrop.
  - Tap again, tap outside, press Esc or swipe down to collapse.
  - It must not block actions: the action bar stays visible, and the fan auto-collapses when it's the user's turn and the timer is below ~5 s.
  - Respect `prefers-reduced-motion` (no spring, just fade).
- **Opponents:**
  - Small card-back stacks around the upper arc. Each has a wood or brass name plate (name 13 px, chips 13 px) and a bet chip in front of the seat toward the pot.
  - The current actor gets a warm glow ring. Folded seats dim to 40%. Busted seats show "OUT".
  - The dealer "D" chip sits on the plate edge.
- **Actions in the thumb zone:**
  - Fold (muted red, outline), Check/Call (brass), Raise (green).
  - Raise opens a bottom sheet with ½ pot, pot, 2×, the slider and All in.
  - The turn timer is a thin brass bar on top of the action bar.

### Changes per file
1. **`src/index.css`**
   - Add design tokens (felt, wood, brass, paper colours; card sizes via CSS vars such as `--card-board-w`; type scale; radii; shadows).
   - Add saloon textures with gradients and a self-hosted noise SVG.
   - Remove the `.community-card` and `.player-*` media hacks, and any external texture.
2. **`src/components/Card.tsx`**
   - Add an explicit `size?: 'mini' | 'seat' | 'board' | 'hand' | 'fan'` prop mapped to token classes.
   - Remove the class-string sniffing.
   - Add the paper face styling. Keep all back designs and `highlight`.
3. **`src/components/PokerTable.tsx`**: split the presentation into new components and keep all state, effects and handlers where they are. Only the JSX moves.
   - `table/TopBar.tsx`: compact bar plus `MenuSheet` (replaces the desktop and mobile headers on phones).
   - `table/Felt.tsx`: rail, felt and lamp.
   - `table/Seat.tsx`: plate, mini stack, bet chip, dealer chip.
   - `table/Board.tsx`: pot plus 5 card slots.
   - `table/HeroHand.tsx`: stack plus tap-to-fan overlay.
   - `table/ActionBar.tsx`: Fold / Check-Call / Raise plus `RaiseSheet` (presets, slider, all in) plus timer.
   - `table/layout.ts`: portrait and landscape seat maps (replaces the percentage `getSeatCoordinates` for phones) and a `useTableLayout()` hook (portrait / landscape / desktop from the container size, not the user agent).
   - Move the standings and action log into drawers on phones.
   - Keep the desktop path at first (stage scaling) to limit risk.
4. **`src/App.tsx`**
   - Turn the portrait gate into an optional, dismissible "Rotate for a wider table" tip.
   - Fix the splash footer overlapping Tap to Play (give the footer its own row, or add `pointer-events-none`).
   - Don't require fullscreen on iOS.
5. **`src/components/ChipStack.tsx`**: clay chip styling and a `size` prop for seat bets and the pot.
6. **`public/manifest.json`**: `"orientation": "any"`.
7. **`src/components/LandingPage.tsx`** (phase 3): saloon skin to match. No flow changes.
8. **New `test/layout-e2e.mjs`**: Playwright at 360×780, 390×844, 430×932, 667×375, 844×390, 932×430 and 1280×800.
   - Assert no overlaps between seats, board, pot, hero hand and action bar.
   - Assert nothing off-screen.
   - Assert the minimum font size (≥ 12 px) and tap targets (≥ 44 px).
   - Play one hand.

### Phasing
1. **Fix-now** (small, low risk): header overflow (menu sheet), splash footer overlap, pot / name-tag collision, minimum font sizes.
2. **Core:** `Card` size prop and tokens; `ActionBar` plus `RaiseSheet`; `HeroHand` stack and fan.
3. **Portrait layout** plus the landscape re-flow; remove the gate.
4. **Saloon skin** (felt, rail, chips, cards, landing page) and QA across the sizes.

### Risks
- **One giant component:** `PokerTable.tsx` is ~2,800 lines and mixes many modes (desktop / mobile, light theme, tips, rabbit hunt, voice overlay, first-hand guide, pause, elimination modals). Moving JSX can break conditions that look unrelated.
  - Mitigation: extract components 1:1 first, then restyle, and take screenshots after each step.
- **Card sizes depend on class strings:** changing classes without the `size` prop silently changes the typography.
- **Portrait seating:** with 6 players, five opponents on a 390 px arc means mini stacks only (24×34); face-up showdown cards need a temporary reveal row.
- **Fan vs. actions:** a fan overlay must never cover the action bar or trap taps (needs dismiss logic, auto-collapse and screen-reader labels).
- **iOS:** no Fullscreen API on iPhone; rely on PWA standalone mode (Install button) and the safe-area insets (notch, home bar).
- **Performance:** blur, large shadows and motion springs on older phones. Prefer gradients and transforms, and respect reduced motion.
- **Existing saved settings** (theme light/dark, table colour, card back) must keep working. Map the light theme and table colours onto the new tokens or hide them on phones.
- **No tests:** the repo has no existing tests; the new layout e2e test is the safety net.
