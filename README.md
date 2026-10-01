# Jones Building Takeoff Calculator

Jones Building Takeoff is a browser-based material quantity calculator for rectangular metal buildings. It produces roof and wall panel cut lists, individual panel layouts, trim and accessory quantities, and an Excel workbook that can reopen the job later. A three-dimensional preview helps check the building shape and opening locations.

**The output is an estimating takeoff.** It does not calculate structural capacity, select engineered fastening patterns, design drainage, determine code compliance, or produce a priced quotation. Quantities and part prefixes require review against the project drawings, current manufacturer requirements, and supplier selections before ordering. The project does not claim manufacturer endorsement or certification.

## Contents

- [Run locally](#run-locally)
- [Workflow](#workflow)
- [Supported buildings and materials](#supported-buildings-and-materials)
- [Mathematics and calculation conventions](#mathematics-and-calculation-conventions)
- [Defaults and overrides](#defaults-and-overrides)
- [Excel and saved jobs](#excel-and-saved-jobs)
- [Architecture and privacy](#architecture-and-privacy)
- [Development and verification](#development-and-verification)
- [Limitations and references](#limitations-and-references)

Cloudflare hosting and GitHub publishing setup: [deployment guide](docs/CLOUDFLARE.md).

Detailed supporting documents:

| Document | Purpose |
| --- | --- |
| [Calculation reference](docs/CALCULATIONS.md) | Equations, coordinates, panel splitting, and every accessory quantity rule |
| [Architecture](docs/ARCHITECTURE.md) | Modules, state flow, server boundary, workbook format, and validation |
| [Security](SECURITY.md) | Data handling, import limits, dependency findings, and reporting guidance |
| [Contributing](CONTRIBUTING.md) | Local development and expectations for calculation changes |
| [Public release checklist](docs/RELEASING.md) | Repeatable file, staged-content, dependency, and history review |
| [Verification record](docs/VERIFICATION.md) | Checks actually performed and remaining review limits |
| [Third-party notices](THIRD_PARTY_NOTICES.md) | Bundled library versions and licenses |

## Run locally

Use Node.js 24 and npm. The application is served over HTTP; opening `index.html` as a local file is not supported. A browser with ES modules, import maps, and WebGL 2 is required for the preview.

```sh
npm ci --ignore-scripts
npm test
npm start
```

Open **http://127.0.0.1:3000**. Stop with Ctrl+C. The checked-in browser libraries allow `node server.mjs` to serve the application without installing npm dependencies; dependency installation is needed for tests and refreshing vendor assets.

The server accepts these optional environment variables:

| Variable | Default | Meaning |
| --- | --- | --- |
| `HOST` | `127.0.0.1` | Listening interface; loopback by default |
| `PORT` | `3000` | HTTP listening port |

For example, `PORT=3001 npm start` uses another local port. Hosting, TLS, access controls, and operational configuration belong to the deployment environment. This repository contains no installation-specific service or routing configuration. Static hosting must serve `dist/` at the origin root because asset URLs start with `/`.

## Workflow

1. **Enter the building.** Set length, width, front/low eave height, roof shape, and rise per 12 inches of horizontal run. Enable asymmetric gable for an offset ridge or unequal eaves.
2. **Select panels.** Choose roof and wall profiles. Preview colors affect the model only; they do not select ordering finishes.
3. **Set purlins.** Enter the first-row offset and typical spacing, measured along the roof slope from the ridge or high eave. Alternatively enter row counts for each roof side. The low-eave support is separate.
4. **Add openings.** Choose a wall, type, width, height, sill height, and offset from the left corner as viewed from outside that wall. Front/back walls run along building length; left/right walls span building width.
5. **Choose whether to cut panels.** The per-opening **Cut Panels** setting determines whether fully covered panel bays are shortened. It defaults on for roll-up and general/rough openings, and off for walk doors, double walk doors, windows, and overhead doors.
6. **Review quantities.** Inspect the cut list, individual layout, trim and hardware, and all takeoff notes. Resolve unspecified profiles and estimating allowances. Adjust settings or explicit overrides where appropriate.
7. **Export Excel to save.** There is no automatic job storage. Reopen the original exported workbook with **Open Excel job** or drag and drop before continuing a previous job.

Measurement fields accept `20` as **20 feet**, `20' 2"`, `20′ 2 1/2″`, or `6"`. Inch fractions support halves, quarters, eighths, and sixteenths. When feet are present, the inches component must be below 12. Signed lengths are useful for the allowance fields; building dimensions must remain positive.

For asymmetric gables, editing either slope or the building width moves the ridge while preserving both eave heights and the other slope. Editing an eave height or ridge position preserves the front slope and recalculates the back slope. Impossible linked edits are rejected. In the interactive editor, the back eave must be at least as high as the front eave. A single-slope roof derives the back/high eave from the front height, width, and slope.

## Supported buildings and materials

Buildings have a rectangular footprint and a symmetric gable, asymmetric gable, or single-slope roof. The ridge runs along the building length. Openings are rectangular and may not overlap or extend beyond their wall or roof line.

These values are the application's fixed profile mappings, not a statement of current product availability:

| Use | Profile | Coverage | Gauge | Part prefix |
| --- | --- | --- | --- | --- |
| Roof | Loc Seam, not swaged | 16 in | 24 | `LSN24-` |
| Roof | Loc Seam, swaged | 16 in | 24 | `LSS24-` |
| Roof | R-panel | 36 in | 26 | `RPR26-1` |
| Roof | Standing Seam 360 | 24 in | 24 | `SS324-` |
| Wall | A-panel | 36 in | 26 | `APW26-` |
| Wall | R-panel | 36 in | 26 | `RPW26-` |
| Wall | Reverse R-panel | 36 in | 26 | `RRW26-` |

Part prefixes are incomplete ordering identifiers. Finish, actual length, compatible accessories, and project-specific details remain to be selected. CFR and insulation roll takeoffs are not implemented. There is no price table, live pricing request, sales tax, labor rate, freight estimate, or currency calculation.

## Mathematics and calculation conventions

All internal lengths are **inches**. Square inches are divided by 144 for square feet; inches are divided by 12 for linear feet. Let `L` be building length, `W` width, `Hf` front eave height, and `p` the front roof rise per 12. Let `ceil(x)` mean rounding upward to a whole number.

### Roof geometry

For a symmetric gable:

```text
horizontal run on each side = W / 2
rise                       = (W / 2) × p / 12
ridge height               = Hf + rise
slope length S             = sqrt((W / 2)² + rise²)
roof area in square feet   = L × (2S) / 144
```

For a single slope, replace the half-width run with `W`; the high eave is `Hf + Wp/12` and roof area is `LS/144`.

For an asymmetric gable, let `b` be the horizontal distance from the back wall to the ridge and `Hb` the back eave height:

```text
front run a     = W − b
ridge height Hr = Hf + a × p / 12
back pitch q    = 12 × (Hr − Hb) / b
front length Sf = sqrt(a² + (Hr − Hf)²)
back length Sb  = sqrt(b² + (Hr − Hb)²)
roof area       = L × (Sf + Sb) / 144
```

Both roof planes must rise toward the ridge. When the two pitches are held fixed, the linked ridge position is `b = (pW − 12(Hb − Hf)) / (p + q)`.

### Panel coverage and lengths

Roof bays per plane are `ceil(L / roofCoverage)`. Wall bays are `ceil(wallSpan / wallCoverage)`. A final partial-width bay still requires a full stock-width panel for field trimming. Offcuts are not reused.

A roof panel follows the slope length plus the roof allowance. Each endwall bay uses the **highest roof point over the whole bay**, including the ridge if it falls inside that bay. Endwall panels are subsequently field cut to slope. Full-height wall lengths include the net wall allowance.

Ordered panel lengths round upward to 1/16 inch:

```text
ordered length = ceil(16 × required length) / 16
```

The implementation subtracts a small floating-point tolerance before `ceil` to avoid an extra increment from numerical noise. Formatting an arbitrary measurement uses nearest-sixteenth rounding; calculating an order length uses upward rounding.

With **Cut Panels** enabled, only bays wholly contained within an opening's horizontal interval are shortened. Material is retained below raised openings and above the opening. Partially intersected bays retain material for field cutting. Net wall area subtracts every opening regardless of its Cut Panels flag; area and ordered panel footage therefore answer different questions.

### Overlength panels and trim

Roof runs exceeding the maximum panel length split at configured purlin positions plus the lower-panel end offset. The algorithm takes the farthest permitted boundary within the maximum length, includes the lap, and repeats. It fails if no valid next boundary exists. Count-mode purlins are distributed estimates and must be checked against actual framing.

Wall sections use equal lengths with a lap. For total length `T`, maximum `M`, and lap `l`:

```text
section count n = ceil((T − l) / (M − l))    when T > M
section length  = (T + (n − 1)l) / n
```

Wall girts are not modeled. Without order rounding, the sum of section lengths minus `(n − 1) × lap` reconstructs the original run.

For a trim run `R`, stock length `T`, and lap `l`:

```text
pieces = 0                              if R ≤ 0
pieces = 1                              if 0 < R ≤ T
pieces = 1 + ceil((R − T) / (T − l))     otherwise
```

Each separate run is rounded independently. There is no nesting or reuse of leftover trim stock.

### Fasteners and accessories

Wall screws use ordered wall panel footage `F`, including section laps and panel-length overrides. With total rate `r`, #12 share `s` as a fraction, and waste fraction `w`:

```text
#12 screws = ceil(F × r × s × (1 + w))
#14 screws = ceil(F × r × (1 − s) × (1 + w))
```

Defaults are `r = 1.8`, `s = 0.60`, and `w = 0.05`. Each count is rounded separately. These are editable estimating allowances, not engineered attachment requirements.

Standing-seam interior clips equal `(roof bays − 1) × purlin rows`, summed across roof planes. Rake clips are counted separately. R-panel support screws include purlin intersections and the low-eave support. Roof ends and endlaps have a separate screw allowance. Mastic divides estimated application length by reference roll length, adds waste, and rounds up to rolls. Downspouts use a maximum roof-run spacing allowance; this is not a rainfall or hydraulic calculation.

The [full calculation reference](docs/CALCULATIONS.md) specifies each hardware row, trim run, support count, mastic path, drainage allowance, area formula, and override interaction.

### Worked example

The initial example is 100 ft long × 50 ft wide, with 16 ft eaves, a symmetric 1:12 gable, R-panel roof and walls, and no openings:

```text
L = 1,200 in; W = 600 in; Hf = 192 in
run = 300 in; rise = 25 in
slope length = sqrt(300² + 25²) ≈ 301.039864 in
ordered unsplit roof length = 301.0625 in = 25 ft 1 1/16 in
roof bays per plane = ceil(1,200 / 36) = 34
roof pieces = 2 × 34 = 68
wall pieces = 2 × ceil(1,200 / 36) + 2 × ceil(600 / 36) = 102
purlin distances from ridge = 18, 78, 138, 198, 258 in on each plane
roof surface area ≈ 5,017.331074 sq ft
net wall area = 4,904.166667 sq ft (no openings)
```

The automated tests check the counts, slope, ordered length, ridge-spanning wall panels, and purlin rows independently.

## Defaults and overrides

| Setting | Starting value |
| --- | --- |
| Maximum panel length | 480 in / 40 ft |
| Roof, net wall, above-opening allowances | 0 in each |
| Roof / wall section lap | 6 in each |
| Lower roof panel end offset from support | 12 in |
| First purlin offset / typical spacing | 18 in / 60 in |
| Trim and gutter stock / lap | 121 in / 2 in |
| Extra header length | 4 in total per opening |
| Roof run per downspout | 480 in / 40 ft |
| Downspout stock / bottom clearance | 120 in / 6 in |
| Gutter hanger / downspout strap spacing | 36 in / 120 in |
| Wall screws per panel LF / #12 share | 1.8 / 60% |
| R-panel support screws per intersection | 4 |
| R-panel sidelap screw spacing | 24 in |
| Screws per interior clip / roof end or endlap | 2 / 10 |
| Screw / mastic waste | 5% each |
| Standing-seam clip offset | Short |

The zero net wall allowance represents a nominal 1½-inch base extension offset by a 1½-inch upper setback. Those dimensions are an estimating convention, not individually modeled construction details.

All material checkboxes start selected. Items specific to standing seam are omitted for R-panel. Thermal blocks and foam spacers both start selected on standing seam; confirm which the insulation assembly requires.

**Hardware quantity overrides** remain fixed by material ID until reset. They affect the displayed/exported row only; dependent hardware counts continue to use the calculated geometry and counts. Unselected and inapplicable rows remain omitted even if an override exists.

**Panel length overrides** apply to every piece with the same original calculated size, area, profile, gauge, and part prefix. They change panel footage and wall screw quantities, but do not relocate supports or change building geometry, openings, roof area, or section coordinates. Matching overrides persist until reset, including if a size disappears and later reappears. Lengths above the configured maximum generate a warning.

## Excel and saved jobs

Export produces eight worksheets:

| Worksheet | Contents |
| --- | --- |
| Summary | Building inputs, geometric areas, piece counts, calculation version, warnings |
| Panel Cut List | Grouped quantities, selected and calculated lengths, linear footage, profiles |
| Panel Layout | One row per piece, face, bay, horizontal interval, section coordinates, field-cut notes |
| Trim and Hardware | Selected and calculated quantities, units, stock lengths, rule status, basis |
| Openings | Dimensions, wall, position, sill, Cut Panels choice |
| Settings | Allowances, purlin settings, material selections, hardware overrides |
| Sources | Technical reference links and rule descriptions |
| Job Data | Hidden serialized job used for reopening, including panel-length overrides |

Reopening restores **Job Data**, not edits made to output cells in Excel. The hidden sheet is not encryption or an access control: anyone with the file can read its contents, including the job name and dimensions. Preserve the original file if using a separate workbook for pricing or annotations.

Only this application's `.xlsx` job format is supported. Import validates the format, version, saved inputs, and resulting takeoff before replacing the current job. Limits include a 5 MiB file size, 300 ZIP entries, 32 MiB declared expanded ZIP size, 100 openings, and 20,000 calculated panel pieces. See [Security](SECURITY.md) for limitations of those safeguards.

## Architecture and privacy

There is no framework build step. The files under `dist/` are the maintained application source, alongside checked-in vendor libraries.

| File | Responsibility |
| --- | --- |
| `dist/engine.mjs` | Defaults, validation, geometry, panel layout, hardware quantities |
| `dist/measurements.mjs` | Feet/inches input parsing and formatting |
| `dist/app.mjs` | Form state, recalculation, result rendering, import/export interactions |
| `dist/viewer.mjs` | Three.js preview and camera controls |
| `dist/workbook.mjs` | Excel output and saved-job import |
| `dist/index.html`, `dist/style.css` | Page structure and styling |
| `server.mjs` | Static HTTP serving and `/healthz` |
| `scripts/vendor.mjs` | Copies pinned library assets and license files |
| `scripts/public-audit.mjs` | Repeatable public-file and staged-content checks |
| `tests/` | Calculation, measurement, workbook, server, and audit regression tests |

Calculations and workbook processing occur in the browser. Application code has no job upload endpoint, analytics, database, account system, or automatic local-storage persistence. Libraries load from the same origin. Reference links are visited only when the user opens them; hosting infrastructure may independently log ordinary HTTP requests.

If supported by the browser, the app registers `read_building_takeoff` and `set_building_dimensions` through `document.modelContext`. These expose current job information and validated dimension updates to the browser's automation integration. They are not HTTP endpoints. See [Architecture](docs/ARCHITECTURE.md) for the exact scope.

## Development and verification

```sh
npm ci --ignore-scripts
npm run vendor
npm run check:vendor
npm test
npm run check:public
npm audit
```

`npm run vendor` refreshes bundled assets from installed dependency versions. `check:vendor` compares every bundled file byte-for-byte with that installed source. Commit vendor changes with the corresponding dependency and lockfile changes. Do not assume a lockfile update patches a prebuilt browser bundle.

Tests cover roof shapes and linked dimensions, measurements, coverage counts, opening cut rules, panel splits and rounding, accessory quantities, overrides, malformed saved jobs, Excel round trips, and the server boundary. Tests verify the implemented model; they do not certify a building design or supplier compatibility. Current verification results and open dependency findings are in [the verification record](docs/VERIFICATION.md).

Before publication, follow [the release checklist](docs/RELEASING.md). The automated public-file check is a heuristic safeguard, not proof that all sensitive information has been found. An exact staged-file review and history review are separate requirements.

## Limitations and references

- The model excludes structural members, load calculations, wind zones, engineered fastening, gutters sized from rainfall, labor, pricing, and insulation roll layouts.
- No panel or trim offcut reuse is attempted. Sloped top cuts and partial opening cuts are field operations.
- Wall girts are not modeled; roof count mode supplies assumed support positions.
- Preview geometry is illustrative; the cut list and calculation rules define the estimate. The preview does not constitute fabrication drawings.
- Profiles, stock lengths, laps, swage choices, sealant paths, clip assemblies, and attachment conditions require project-specific confirmation.
- Exported files contain the job inputs. Refreshing or closing an unsaved page can lose the current job.
- Current catalog availability and manufacturer requirements are not checked automatically.

The `SOURCES` map in `dist/engine.mjs` supplies the app and workbook reference lists. References identify relevant product families or technical context; they do not establish that every associated quantity rule is manufacturer-specified. The wall screw rate is explicitly identified as an editable estimating allowance. No private reference workbook is needed to run the application.

Bundled third-party software retains its own licenses; see [Third-party notices](THIRD_PARTY_NOTICES.md). No license for this project's original code has yet been selected. Public visibility should not be interpreted as an open-source license grant.
