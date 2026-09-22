# Architecture and data contract

## Runtime

The application is a static ES-module page. There is no bundler, transpiler, backend calculation API, database, authentication service, or build-time configuration injection. `dist/` is maintained source, not disposable build output. Three.js supplies the WebGL preview; ExcelJS supplies workbook serialization. Both are bundled locally with their license files.

`server.mjs` is a Node standard-library HTTP server. It serves files from `dist/`, supports GET and HEAD, and exposes a fixed `/healthz` JSON response. Other HTTP methods return 405; missing, malformed, out-of-root, and non-file paths return 404. Canonical filesystem paths are checked so a symlink to a file outside the static root cannot expose it. Never place confidential material inside the static root: all regular files there are potentially public.

Defaults are loopback and port 3000, configurable by `HOST` and `PORT`. The server has no TLS termination, account access control, or upload endpoint. Cache control is `no-cache`. Responses set `nosniff`, a no-referrer policy, and a content security policy. Inline scripts/styles are currently allowed to support the inline import map and page styling; this is not a strict nonce-based CSP. Server errors are logged without application job data. Reverse proxies and hosting infrastructure may have separate logs.

## State flow

1. `defaultJob()` creates a new in-memory job when the page loads.
2. `app.mjs` parses form inputs and updates the job. Specialized asymmetric roof edits use `editRoofDimension()` and preserve the prior job on invalid linked changes.
3. `calculate(job)` validates, computes roof geometry, creates panel pieces, groups cut-list rows, and calculates hardware. It returns errors instead of a usable takeoff for invalid jobs.
4. Valid results update the preview, area/count cards, and result tables. Invalid forms show errors, disable export, and leave the last valid preview visible.
5. Export builds an Excel workbook from the current job and downloads a browser Blob.
6. Import reads a local file, preflights its ZIP metadata, loads its hidden job data, validates and recalculates it, then replaces current state only after success.

No job is automatically written to local storage, IndexedDB, cookies, or the server. A page refresh creates a fresh default job. Inputs may still be visible to browser extensions or browser-integrated automation, and users control their downloaded workbook files.

## Job format

Job schema version is `1`. Values are inches unless stated otherwise. The schema version controls import compatibility; `rulesVersion` in the calculation result identifies the estimating-rule set and is a separate value.

| Fields | Meaning |
| --- | --- |
| `version`, `name` | Format version and job label (up to 120 characters) |
| `length`, `width`, `height` | Footprint and front eave height |
| `shape`, `slope` | `gable` or `single`; front rise per 12 |
| `asymmetric`, `backHeight`, `ridgeFromBack` | Optional asymmetric gable geometry |
| `roofPanel`, `wallPanel` | Keys in `ROOFS` and `WALLS` |
| `roofColor`, `wallColor` | Six-digit hexadecimal preview colors |
| `purlinMode` | `spacing` or `count` |
| `purlinOffset`, `purlinSpacing`, `purlinCounts` | Along-slope layout; two count entries |
| `openings` | Array of unique-ID rectangular openings |
| `include` | Boolean for each key in `ACCESSORIES` |
| `rules` | Every field defined in `DEFAULT_RULES` |
| `overrides` | Hardware ID to nonnegative integer quantity |
| `panelLengths` | Optional calculated-group key to ordered inch length |
| `showPurlins` | Preview preference |

Each opening contains `id`, `wall`, `type`, `width`, `height`, `offset`, `sill`, and `cutPanels`. The latter is an explicit boolean: type affects the initial UI default, not later cutting logic.

Older version-1 jobs without asymmetric fields or panel-length overrides remain supported. Import validation is not a strict unknown-field removal step: additional JSON properties can remain in a saved and re-exported job. Only the documented fields participate in calculations. Avoid adding confidential metadata to a job file on the assumption that it will be discarded.

## Input and output limits

| Item | Accepted range / limit |
| --- | --- |
| Building length and width | 12–12,000 in |
| Input eave heights | 12–1,440 in |
| Front pitch | 0.125–12 per 12 |
| Asymmetric ridge distance | 1–`width−1` in |
| Back pitch | Derived and positive; not independently capped by saved-job validation |
| Purlin offset and spacing | 1–600 in |
| Requested purlin counts | Integers 1–200 per plane |
| Openings | Up to 100; width 1–12,000 in, height 1–1,440 in, inside wall bounds |
| Hardware overrides | Up to 150 keys, integer quantities 0–1,000,000 |
| Panel-length overrides | Up to 20,000 keys, lengths greater than 0 and at most 12,000 in |
| Calculated panel pieces | At most 20,000 accepted output pieces |

Most numeric rules allow 0–12,000; the three net-length allowances permit −48–12,000. Required stock lengths/spacings must be positive. Maximum panel length is at least 12 inches, panel laps must be below the maximum, trim lap must be below trim stock, and percentage rules are capped at 100. Input limits are software limits, not engineering acceptance criteria. The panel-output limit is checked after layout generation; it does not guarantee a bounded execution time for every hostile input.

## Workbook serialization

`createWorkbook()` produces styled tables with frozen header rows, autofilters, and numeric inch/foot columns. Output cells are values; this app does not generate an Excel formula-based calculator.

The `Job Data` sheet has state `veryHidden`:

- `A1`: `JONES_BUILDING_JOB` format marker.
- `A2`: numeric schema version.
- `A3` onward: JSON string chunks, each up to 24,000 characters.

Import checks the marker, schema version, maximum 60 data rows, and maximum 1,000,000 reconstructed JSON characters. It does not interpret changes to visible output worksheets. Hidden job data is readable by anyone with the workbook and must not be treated as protected storage. Formula cells in the saved JSON region are rejected because chunks must be strings; ExcelJS is not used as a formula execution engine.

Panel Layout `from` and `to` are coverage positions along the wall or building length. `start` and `end` are original geometric section coordinates: height above slab for wall pieces, distance up from the low eave for roof sections. They are not rewritten when an ordered length is overridden. For roof pieces, the workbook's generic “Section bottom/top” labels mean these along-slope coordinates.

## Browser automation

When `document.modelContext.registerTool` exists, two tools are registered:

| Tool | Scope |
| --- | --- |
| `read_building_takeoff` | Returns cloned current job and result, including job label, geometry, quantities, and warnings |
| `set_building_dimensions` | Accepts only `length`, `width`, `height`, `slope`, and `shape`; merges values, recalculates, and updates state only if valid |

The latter does not call the linked asymmetric dimension editor. It can therefore change the other derived pitch while leaving the saved ridge position fixed. Tool registrations are aborted when the page is hidden through `pagehide`. These integrations are exposed to the browser's automation environment; the application provides no additional authorization prompt and does not create remote HTTP tool endpoints.

## Versioning changes

Change calculation formulas and their tests together. Update `rulesVersion` when the estimating rules change. A validation or documentation correction alone does not necessarily change that value. Change the saved-job schema version only with a documented compatibility or migration strategy; keep tests for accepted older job shapes. Library changes must update lockfile and browser assets together.
