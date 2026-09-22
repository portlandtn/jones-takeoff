# Calculation reference

This document describes `dist/engine.mjs`. It specifies the implemented estimating model; it is not an installation specification. All lengths below are inches unless stated otherwise. Default values are defined in `DEFAULT_RULES` and summarized in the README. Application and workbook references supply technical context, not approval of each allowance.

## Notation and rounding

| Symbol | Meaning |
| --- | --- |
| `L`, `W` | Building length and width |
| `Hf`, `Hb`, `Hr` | Front eave, back eave, and ridge heights |
| `p`, `q` | Front and back rise per 12 horizontal inches |
| `a`, `b` | Front and back horizontal runs to ridge |
| `Si` | Roof slope length on plane `i` |
| `k` | Roof planes: two for gable, one for single slope |
| `Cr`, `Cw` | Roof and wall coverage widths |
| `B` | Roof bays per plane, `ceil(L / Cr)` |
| `ni` | Purlin row count on plane `i`, excluding low-eave support |
| `J` | Total panel endlaps across roof planes and bays |
| `fs`, `fm` | Screw and mastic factors: `1 + wastePercent/100` |
| `P(R,T,l)` | Stock pieces for run `R`, stock `T`, lap `l` |

Except where indicated, whole quantities use `ceil(x)`. The engine implements this as `Math.ceil(x − 1e-9)`. Ordered lengths use `ceil(16x)/16` with that same tolerance. Geometric positions retain floating-point precision; display formatting uses nearest-sixteenth rounding. Ordered length rounding can therefore add a small amount beyond geometric section coordinates. Counts are individual pieces, screws, rolls, or tubes, not shipping packages.

## Coordinates and roof geometry

Front/back sidewalls have span `L`; left/right endwalls have span `W`. Opening and wall bay offsets start at the left corner while looking at the wall from outside. On the left endwall, local coordinate `x` increases from front to back. On the right endwall, use `u = W − x` to mirror that viewpoint; on the left use `u = x`.

For symmetric gables, `a = b = W/2`, `Hb = Hf`, and `Hr = Hf + ap/12`. For asymmetric gables, `b` and `Hb` are inputs, `a = W − b`, `Hr = Hf + ap/12`, and `q = 12(Hr − Hb)/b`.

```text
Sf = hypot(a, Hr − Hf)
Sb = hypot(b, Hr − Hb)
```

For single slope, `a = W`, `Hb = Hf + Wp/12`, and `S = hypot(W, Hb − Hf)`. There is no gable ridge.

Sidewall top heights are constant: `Hf` on front, `Hb` on back. For a gable endwall:

```text
h(u) = Hf + up/12               for 0 ≤ u ≤ a
h(u) = Hb + (W − u)q/12         for a < u ≤ W
```

For single slope, `h(u) = Hf + up/12` throughout.

### Linked asymmetric edits

Editing the front pitch, back pitch, or width keeps both eave heights and the other pitch fixed and solves:

```text
b = (pW − 12(Hb − Hf)) / (p + q)
```

Editing either eave height or `b` keeps the front pitch and recalculates the back pitch. The editor rejects an out-of-footprint ridge, nonpositive roof rise, or a back eave below the front eave. General saved-job validation accepts either ordering of eave heights provided the ridge is above both; this differs from the stricter interactive linked editor. Browser automation merges its allowed dimension fields directly and recalculates, rather than using the editor's linked-pitch preservation function.

### Areas

Roof area is `L × sum(Si) / 144`.

One gable endwall's gross area is the sum of two trapezoids:

```text
Ae = a(Hf + Hr)/2 + b(Hb + Hr)/2
```

For single slope, `Ae = W(Hf + Hb)/2`. Gross wall area is `L(Hf + Hb) + 2Ae`; net wall square feet subtract `sum(openingWidth × openingHeight)` and divide by 144. Every opening is subtracted regardless of Cut Panels. Areas exclude allowances, panel overlaps, stock-width excess, and length overrides.

## Panel generation

### Roof bays

Each plane has `B = ceil(L/Cr)` bays. Bay `j` (zero-based) covers `[jCr, min((j+1)Cr,L)]`. Each section of the slope generates one panel in every bay. The order retains full coverage `Cr` even when the last bay is narrower. Total roof pieces equal the sum of all plane/bay sections. `J = roofPieces − Bk`.

Total unsplit roof length is `Si + roofAllowance`. A nonpositive total fails calculation. Roof section coordinates run upward from the low eave; purlin offsets run downward from the ridge/high eave.

### Purlin rows

Let `o` be first-row offset and `d` typical spacing. If `o ≥ Si`, there are no rows and a warning is emitted. Spacing mode generates `o + jd` while less than `Si − 1e-6`; an initial calculated count over 200 is rejected.

Count mode uses the requested `n` rows. For one row, the position is `o`. Otherwise:

```text
last = max(o, (Si + o)/2, Si − min(12, (Si − o)/2))
position(j) = o + (last − o)j/(n − 1), j = 0…n−1
```

This is a distributed estimating layout. It is not a framing design and does not include the low-eave support.

### Roof splitting

For purlin distance `d` from the high end, a candidate section endpoint measured from the low eave is `Si − d + endLapOffset`. Candidates must be inside the total run.

Starting at `start = 0`, while the remaining total exceeds `maxPanel` (with a `1e-7` comparison tolerance), choose the farthest candidate satisfying:

```text
boundary > start + roofLap + 1/16
boundary ≤ start + maxPanel + 1e-7
boundary < total − 1e-7
```

Emit `[start,boundary]`, then set `start = boundary − roofLap`. If no boundary is available, fail with an explanatory error. Emit the remaining section when it fits. More than 200 split iterations are rejected. Final ordered lengths round upward separately; the maximum comparison is on unrounded geometry, so arbitrary fractional maximum settings can be exceeded by order rounding. Confirm final order lengths.

### Wall bays and openings

A wall of span `D` has `ceil(D/Cw)` bays, with the final interval clipped to `D`. For each bay, take the maximum top height at both endpoints. Also include `Hr` if a gable endwall bay contains the ridge. Add `wallAllowance` to form the full panel top.

Only openings with `cutPanels === true` participate in cutting. An opening must fully contain the bay's horizontal interval (within `1e-6`) to shorten its panels. Qualifying openings are sorted by sill height. Retain the vertical bands below, between, and above those openings. Add `doorAllowance` only to the final retained band above qualifying openings; it is not added below or between them. Nonpositive retained bands fail calculation. An opening that partly overlaps a bay does not remove that bay's remaining material.

Door types require zero sill; windows and general openings can have raised sills. Openings may touch but not overlap. The roof-line check uses the opening's two upper corners; the supported roof shapes have no intervening valley.

For each retained band longer than `maxPanel`, choose equal sections with `wallLap`:

```text
n = ceil((bandLength − wallLap) / (maxPanel − wallLap))
sectionLength = (bandLength + (n−1)wallLap) / n
```

Section coordinates include the band's bottom height. Girt positions are not used. All generated wall lengths round upward independently.

### Grouping and length edits

The cut-list key is `area | profile name | calculated rounded length | gauge | part prefix`. Faces and bay identifiers do not participate in grouping. A manual length replaces every matching piece's ordered length and is rounded upward to 1/16 inch. Groups with different original calculated sizes remain separate even if edited to the same length.

Linear footage is `sum(orderedLength)/12`, including overlaps. Wall screw quantities use wall-only footage. Manual length edits do not change section start/end coordinates, building geometry, purlin positions, bay count, roof laps, or geometric areas. Overrides for absent groups remain saved but inactive. An edit above `maxPanel` emits a warning.

## Stock counting and trim runs

```text
P(R,T,l) = 0                             if R ≤ 0
P(R,T,l) = 1                             if 0 < R ≤ T
P(R,T,l) = 1 + ceil((R−T)/(T−l))          if R > T
```

All trim uses `trimStock` and `trimLap`. Sum stock counts per separate run, not after combining lengths. Each listed material must also be selected in `job.include`.

| Row | Separate runs |
| --- | --- |
| Header | One `openingWidth + headerExtra` per opening |
| Jamb | Two `openingHeight` runs per opening |
| Jamb flashing | Two `openingHeight` runs per opening |
| Base | Remaining base intervals after all zero-sill openings on each wall |
| Corner | `Hf, Hf, Hb, Hb` |
| Rake | Two of each roof slope length `Si` |
| Ridge / high eave | One `L` |
| Low-eave trim | `k` runs of `L` |
| Gutter | `k` runs of `L` |

All openings affect trim, regardless of Cut Panels. Header extension is a total extra length, not an allowance on each end. Base trim excludes all zero-sill openings, not just door types. Trim profile choices and the shared stock length are estimating assumptions.

## Drainage accessories

Let `D = max(1,ceil(L/downspoutSpacing))` be drops per low-eave run. There are `kD` drops. For gables, use eave heights `[Hf,Hb]`; for single slope, `[Hf]`. For each eave use drop length `vi = max(1, heighti − downspoutClearance)`.

| Row | Calculated quantity |
| --- | --- |
| Gutter stock | `k × P(L,trimStock,trimLap)` |
| Gutter hangers | `k × (ceil(L/gutterHangerSpacing)+1)` |
| Gutter end caps | `2k` |
| Downspout stock | `D × sum(P(vi,downspoutStock,0))` |
| Outlets | `kD` |
| Elbows | `3kD` |
| Straps | `D × sum(max(2,ceil(vi/strapSpacing)+1))` |

Drop stock excludes offset runs and uses no stock lap. Three elbows per drop is an allowance. Counts are not based on rainfall, roof tributary area, gutter capacity, or outlet hydraulics. Downspout selection is independent of gutter selection; a warning identifies downspouts selected without gutters.

## Closures and standing-seam components

| Row | Calculated quantity / rule |
| --- | --- |
| Wall inside closures | Sum `ceil(baseSegment/Cw)` over remaining base intervals |
| Wall outside closures | `2ceil(L/Cw) + 2ceil(W/Cw)` |
| Roof inside closures | `Bk` |
| Roof outside closures | `Bk` |
| Interior panel clips | `C = sum(ni × max(0,B−1))` |
| Rake clips | `sum(2ni)` |
| Eave plates | `k × ceil(L/108)`; 108-inch stock with butt joints |
| Backup plates | `J + Bk` |
| Thermal blocks | `sum(niB)` |
| Foam spacers | `sum(niB)` |

R-panel uses foam roof closures and omits clips, eave plates, backup plates, thermal blocks, and spacers. Standing-seam mappings depend on roof profile and selected clip offset. Boundary details, component compatibility, and the choice between blocks and spacers remain project selections. Thermal blocks and spacers are counts per module/support intersection; their actual length and insulation requirements are not solved.

## Screws

Let `F` be ordered wall panel linear feet, `r` the wall rate, `s = wallScrew12Share/100`, `C` the calculated interior clip count, and `I = sum((ni+1)B)` the roof panel/support intersections including low eaves.

| Row | Quantity before final upward whole-count rounding |
| --- | --- |
| Wall #12 | `F × r × s × fs` |
| Wall #14 | `F × r × (1−s) × fs` |
| R-panel support | `I × roofSupportScrews × fs` |
| R-panel sidelap stitch | `max(0,B−1) × sum(ceil(Si/roofStitchSpacing)+1) × fs` |
| Standing-seam interior clip screws | `C × clipScrews × fs` |
| Roof ends / endlaps | `(2Bk + J) × roofEndScrews × fs` |

Clip screw quantities use interior clips only; rake-clip attachment screws are not separately modeled. Roof ends and endlaps are a separate allowance alongside support screws and may need adjustment to match the selected assembly. Screws are counted individually and are not rounded to box sizes. These rules do not select fastener length, coating, substrate suitability, or engineered attachment patterns.

## Mastic and sealant

Define low-eave total `E = kL`, rake total `R = 2sum(Si)`, and gutter stock count `G = kP(L,trimStock,trimLap)`.

Wall sidelap allowance `V` is the sum over walls of `max(0,ceil(span/Cw)−1)` multiplied by that wall's greatest top height. This uses the ridge height for gable endwalls, and the high endpoint for single-slope ends. It does not subtract openings or integrate the exact height of each seam.

| Material | Estimated application length | Roll length |
| --- | --- | --- |
| Double-bead `H3000`, R-panel only | `2E + JCr` | 300 in |
| Triple-bead `H3001`, standing seam only | `2E + JCr` | 360 in |
| Flat tape `H3010` | `V + max(0,B−1)sum(Si)` for R-panel, or `V` for standing seam; add `E` if gutter selected | 600 in |
| Rake double-bead `H3020` | `R` if rake selected, otherwise zero | 240 in |

Each roll quantity is `ceil(applicationLength / rollLength × fm)`. The mastic material selection must be enabled. Closure selections do not independently remove the roof closure-path mastic allowance.

Sealant opening length is `sum(2height + width + (window ? width : 0))`. Add `24 × max(0,G−k)` inches if gutter is selected, representing an allowance per splice. Tube quantity is `ceil(totalLength/276 × fm)`, using 23 LF/tube at the stated nominal bead. The caulk selection controls this row independently of mastic selection.

## Hardware overrides and row applicability

The engine first checks the selection and positive raw quantity. If a row is applicable, it computes the rounded quantity, then substitutes a saved override for that ID if present. A zero override keeps an applicable row with quantity zero. An override cannot create a row that has zero calculated quantity or is not applicable.

Hardware overrides do not cascade: overriding clips does not change clip screws; overriding gutter stock does not change splice sealant; overriding downspouts does not change outlets. Each affected row must be reviewed independently. The export preserves both calculated and overridden values.

## Worked checks

For the default 100 × 50 ft symmetric 1:12 building:

- Roof planes each have `hypot(300,25) = 301.039864…` inches of slope and order 301.0625-inch panels.
- R-panel gives 34 bays per plane, 68 roof pieces, and 102 wall pieces before any openings or splits.
- Roof area is approximately 5,017.331074 square feet; net wall area is 4,904.166667 square feet.
- A front-wall opening from 36 to 96 inches contains the 36–72-inch bay and only partly intersects the 72–108-inch bay. With Cut Panels enabled, the first bay shortens and the second retains full-height material.
- For a 700-inch wall band, 480-inch maximum, and 6-inch lap: two 353-inch pieces provide `353 + 353 − 6 = 700` inches.
- For 121-inch trim stock with 2-inch lap: a 240-inch run needs two pieces; a 241-inch run needs three.

Tests provide executable examples. The accepted numeric limits in `validate()` are software input limits, not proof of structural or manufacturing feasibility.
