# Runtime: Zero Stage Design Memo

This memo defines the 8-stage structure and the hidden Gem hint policy.

## Design Principles

- Each stage emphasizes exactly one primary gimmick.
- Stage clear time target: roughly 1-2 minutes.
- Hidden Gem count: 3 per stage (total 24).
- Hinting rule: provide visual clues without showing a direct answer path.

## Stage Lineup

1. **Boot Sector**
- Theme gimmick: Spring chain
- Learning goal: movement basics + timing jumps with bounce chaining
- Gem hint style: vertical spring rhythm and suspicious high ledges

2. **Cache Fields**
- Theme gimmick: Rotator floor
- Learning goal: rhythm movement under lateral force changes
- Gem hint style: misaligned coin arcs and noisy floor edges

3. **Wind Tunnel**
- Theme gimmick: Wind streams
- Learning goal: trajectory control in horizontal/vertical wind
- Gem hint style: floating cycle trails and flicker marks in airflow lanes

4. **Socket Pipes**
- Theme gimmick: Port/Socket warp
- Learning goal: route reading and short teleport chain execution
- Gem hint style: blinking socket halos and off-route entry markers

5. **Flooded Bus**
- Theme gimmick: Vertical water flow
- Learning goal: inertia adaptation in up/down current zones
- Gem hint style: submerged shimmer and sparse cycle breadcrumbs

6. **Leak Factory**
- Theme gimmick: Collapsing platforms
- Learning goal: commit timing, short reaction window traversal
- Gem hint style: cracked tiles and delayed flicker near unstable routes

7. **Bit-Rot Ruins**
- Theme gimmick: Moving platforms
- Learning goal: route planning with platform phase differences
- Gem hint style: offset rails and brief glimpse windows

8. **Kernel Descent**
- Theme gimmick: Gravity invert fields
- Learning goal: orientation adaptation under gravity inversion
- Gem hint style: anomaly glow around inversion boundaries

## Gem Hint Policy

- Allowed hints:
  - non-uniform wall crack/noise pattern
  - unnatural cycle placement arcs
  - tiny background glitches/flicker around hidden routes
  - partial line-of-sight (Gem silhouette or shimmer)
- Not allowed:
  - exposing exact hidden entrance
  - direct arrow markers to Gem solution path
  - mandatory blind leap with no prior visual clue

## Difficulty Intent

Difficulty presets adjust experience by placement cadence and timing margins, not HP inflation:

- **Chill**: gentler enemy pressure, wider coyote/buffer margins
- **Standard**: baseline
- **Mean**: tighter margins, faster threats, denser pressure points

## Future Expansion Notes

- Keep stage data-driven (`src/game/data/stages.ts`) so gimmick and hint tuning remains content-first.
- Reserve optional sub-areas (Port/Socket branches) for future collectibles and ranking challenges.
