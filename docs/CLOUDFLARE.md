# Cloudflare deployment

This deployment serves checked-in browser assets from Cloudflare storage. The Worker handles the root URL, health endpoint, and errors; it never fetches a home server. No database, server disk, tunnel, or home-hosted runner is required after cutover. The original local server remains available for rollback.

## Build and stage

Use Node 24 and `npm ci --ignore-scripts`, then run `npm test`, `npm run check:vendor`, `npm run check:public`, and `npm run build:cloudflare`. `npx wrangler deploy --dry-run` validates packaging. Generated assets and local runtime state are ignored. The generated header file preserves the local server's CSP, no-sniff, referrer, and cache policies.

Authenticate with `npx wrangler login`, or use a scoped Cloudflare API token and account ID supplied securely through environment variables. `npm run deploy:cloudflare` creates/updates only the named Worker. The checked-in configuration intentionally has no production route, account ID, or personal hostname. Confirm account selection before deploying.

Validate the resulting workers.dev staging URL: root, index.html, every asset, healthz, unknown paths, HEAD and unsupported methods, security headers, calculator edits, and Excel export/reopen. Confirm TLS before changing the public route.

## Same-hostname cutover and rollback

First inspect and privately record the existing hostname's DNS record, matching Worker routes, and tunnel ingress/origin mapping. Proxy response headers alone do not establish the origin. Do not alter shared tunnel configuration or other hostnames.

With staging verified, add an exact-hostname Worker route covering every path on the existing proxied hostname. Keep its DNS and old origin available. This places the Cloudflare-hosted assets ahead of the old origin without waiting for a DNS change or replacing the existing certificate. Verify the public response against staged asset hashes, health, browser workflows, and Cloudflare's actual route mapping. Do not stop the local service to test independence.

Rollback is removal of that new exact-hostname route (or restoration of its previous mapping if one existed). The retained DNS and tunnel then continue serving the original site. Record route IDs and prior values privately. Do not remove the local service until separately authorized.

For GitHub publishing, configure repository secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`. Use an account-scoped Workers deployment token with only the permissions needed to deploy this Worker. For automatic publishing, set repository variables `CLOUDFLARE_ROUTE` to the verified exact hostname followed by `/*`, and `CLOUDFLARE_ZONE_ID` to its zone ID. The deployment token also needs route-edit permission restricted to that zone. The deployment script refuses GitHub deployment without these values, and generates a temporary ignored configuration so future deploys retain the route. The workflow runs verification on PRs and deploys main using GitHub-hosted runners. A production environment can apply repository protections. Confirm one successful production workflow before declaring automatic publishing operational. A route managed outside Wrangler must be verified after the first workflow deployment; do not assume it survived configuration reconciliation.

## Capacity and verification status

No paid subscription is required for initial deployment. Check the account's current Workers plan and quotas before cutover. Static asset requests are free; Worker invocations for the root URL, health, and errors are subject to the account's Workers limits. Select failure behavior deliberately when adding a route; origin fallback would still depend on home availability.

Local verification on 2026-10-01: 25 existing tests passed; vendor integrity passed; Cloudflare dry-run passed. Chrome against the local Cloudflare runtime verified default results, switching single-slope/gable, workbook download and reopening the original job, with no page errors. Production staging, routing, TLS cutover, and publishing remain unverified until account access is available.

The dependency audit remains nonzero: two moderate entries for ExcelJS/uuid (previously documented) and a high brace-expansion advisory in the installed dependency tree. This migration does not change the checked-in browser bundles. Do not describe the dependency audit as clean.
