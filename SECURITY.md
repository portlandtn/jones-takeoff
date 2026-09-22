# Security and privacy

## Data boundary

The application calculates and handles Excel files in the browser. It has no server-side job storage, upload route, account system, or analytics integration. Browser assets are served from the same origin. Opening a reference link contacts the referenced external site. Hosting infrastructure may log ordinary HTTP requests independently of the app.

Jobs are held in memory until exported. Exported workbooks contain the job name, dimensions, openings, allowances, and overrides in visible and hidden sheets. Hidden sheets provide no confidentiality. Browser automation can read the current job when the documented `document.modelContext` integration is available. Do not put credentials or unrelated confidential metadata in a job file.

The static server binds to loopback by default, allows only GET/HEAD, and restricts canonical file paths to `dist/`. It does not provide TLS, authentication, or a production perimeter. Keep operational secrets and private exports outside the static root. Security response headers are set, but inline scripts/styles remain allowed by the current CSP.

## Workbook safeguards and limits

Before ExcelJS loads a workbook, the app checks a 5 MiB compressed-file limit, a 300-entry ZIP limit, a 32 MiB **declared** uncompressed-size limit, and rejects encrypted entries and unsupported/damaged ZIP structures. It then validates the hidden job marker, schema version, JSON size, inputs, and calculated result. Import does not replace the active job until these checks succeed.

The ZIP check relies on central-directory metadata. It is not a streaming decompression limit, worker sandbox, antivirus scanner, or comprehensive defense against malformed archive resource exhaustion. Workbook parsing runs on the browser's main thread, so a hostile or complex file can consume memory or stall the page. Use trusted job files. The current output-piece limit also runs after layout generation rather than acting as a computation budget.

## Dependency finding recorded 2026-09-22

`npm audit` reports two moderate affected-package entries: `uuid` 8.3.2 and its parent `exceljs` 4.4.0. They reflect one underlying advisory, [GHSA-w5hq-g745-h8pq](https://github.com/advisories/GHSA-w5hq-g745-h8pq), concerning missing output-buffer bounds checks in certain UUID methods.

Local source inspection found ExcelJS calling UUID `v4()` without an output buffer in its conditional-formatting transform. No application call to the advisory's affected UUID methods was found. This is a reachability observation, not proof that the dependency is free of vulnerabilities. The audit remains nonzero and must not be reported as clean.

The checked-in ExcelJS browser asset is the upstream prebuilt bundle and contains bundled UUID code. Updating or overriding a Node dependency alone does not patch that asset. `npm run check:vendor` confirms origin consistency, not absence of vulnerabilities. Before claiming a clean dependency audit, update or rebuild the browser dependency with a reviewed fix and verify import/export compatibility. A forced major-version downgrade from `npm audit fix --force` has not been applied.

## Public-file controls

`.gitignore` excludes local credentials/configuration, operational files, private workbooks, document exports, archives, backups, and dependencies. Ignore rules do not remove already tracked files or historical commits.

`npm run check:public` scans working-tree public candidates. `npm run check:staged` scans the entire Git index, reading staged blobs rather than working copies. The checks reject paths outside the public-file policy, symbolic links, unexpected binary content, and selected patterns for credentials and private infrastructure. The working-tree check deliberately excludes known local/private paths; the staged check rejects them if added to Git.

These are heuristic checks. They do not detect every secret format, personal name, sensitive business fact, endpoint, or encoded value. They do not inspect Git history. Follow the separate [release checklist](docs/RELEASING.md), manually inspect the exact publication contents, and repeat scans whenever files or history change.

## Reporting a vulnerability

Use the repository's private vulnerability reporting channel if the owner has enabled it, or an established private contact with the maintainer. Do not put credentials, customer workbooks, or exploit data containing private information in public issues. Include affected version, a minimal synthetic reproduction, expected behavior, actual behavior, and impact. No response-time guarantee or external security certification is claimed.
