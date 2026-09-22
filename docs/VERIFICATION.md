# Verification record

Local preparation date: 2026-09-22. These results describe local checks, not an independent review, penetration test, manufacturer approval, or future GitHub repository.

## Automated checks

| Check | Result |
| --- | --- |
| Node runtime | 24.21.0; npm 11.19.0 |
| Unit and integration tests | 25 passing, zero failures |
| Bundled library consistency | Six library/license files match installed pinned packages byte-for-byte |
| Dependency audit | Two moderate affected-package entries, one underlying UUID advisory; unresolved, documented in `SECURITY.md` |
| Clean installation | `npm ci --ignore-scripts`, vendor consistency, and all 25 tests passed in a separate candidate directory |
| Working-tree and simulated Git index | 32 candidate files passed the publication policy; no credential-pattern findings |
| Separate secret scanner | detect-secrets 1.5.0, network verification disabled; findings confined to unchanged upstream vendor constants |
| Documentation links | All relative file links resolve locally |
| Calculation example | Default counts and geometric areas agree with the README example |

Tests include geometry, measurement round trips, asymmetric linked edits, openings, panel splits, hardware and length overrides, saved-job import/export, malformed job structures, static-server method/path boundaries, symlink escape rejection, and staged-secret detection. Security tests use synthetic fixtures and a temporary Git index.

## Publication review

There was no `.git` repository at the start of preparation, so there was no existing local commit history or remote to inspect. Installation-specific configuration and identifying deployment references were removed from public candidates. No customer workbook or price dataset is included. Public profile identifiers and technical reference links remain intentionally present.

Three complementary publication checks were performed: manual inventory/content review, heuristic checks of the working tree and a simulated first Git index, and a separate detect-secrets scan of the tracked candidate files. The scanner reported 401 entropy findings, all in the byte-identical upstream ExcelJS bundle (cryptographic constants and bundled data); none were in original application code or documentation. No project credentials were identified. This is a bounded review, not a guarantee that a scanner can identify every sensitive business fact.

The Git whitespace check passed for original files. Two upstream vendor whitespace warnings were left unchanged to preserve byte-for-byte package identity. The actual first-publication index and remote were subsequently reviewed as recorded below. Repeat these checks for future changes.

## Remaining limits

The moderate dependency advisory is still open. Local source inspection found the dependency using UUID v4 without an output buffer; this is not a guarantee that all library paths are safe. The prebuilt browser bundle must be considered separately from lockfile remediation.

A browser smoke test was attempted, but the browser-control environment exposed no connected browsers. No visual browser check was completed. No independent Claude/Copilot review, manufacturer review, broad browser compatibility campaign, load test, or engineering certification was performed. Archive guards check declared ZIP sizes and do not establish an actual streaming expansion limit. The release checklist distinguishes public-file inspection from full-history scanning and production deployment review.

No remote was connected or content published during the initial local preparation. An original-code license has not been selected.

## First-publication checks

The supplied GitHub repository, `portlandtn/jones-takeoff`, was verified public and empty before initialization. The local repository uses `main`, with a repository-local GitHub no-reply commit identity. The actual 32-file Git index passed the publication policy and original-file whitespace checks; all 25 tests and vendor consistency checks passed again. No pre-existing commits or tags were available to introduce older content.

This initial public source release retains the disclosed dependency advisory and browser-validation limitation. It is not a claim of production security certification or engineering approval. Future changes must repeat staged-content and history checks.
