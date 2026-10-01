# Cloudflare deployment

This deployment serves checked-in browser assets from Cloudflare storage. The Worker handles the root URL, health endpoint, and errors; it never fetches a home server. No database, server disk, tunnel, or home-hosted runner is required after cutover. The original local server remains available for rollback.

## Build and stage

Use Node 24 and `npm ci --ignore-scripts`, then run `npm test`, `npm run check:vendor`, `npm run check:public`, and `npm run build:cloudflare`. `npx wrangler deploy --dry-run` validates packaging. Generated assets and local runtime state are ignored. The generated header file preserves the local server's CSP, no-sniff, referrer, and cache policies.

## Native GitHub integration

Connect only the intended repository to Cloudflare Workers Builds. No GitHub Actions deployment secrets are needed: Cloudflare supplies its build authentication. The Worker name must be `jones-takeoff`, matching `wrangler.json`. Use repository root `/` and Node 24 (build variable `NODE_VERSION=24`). GitHub Actions performs verification only.

Build command: `npm ci --ignore-scripts && npm test && npm run check:vendor && npm run check:public && npm run build:cloudflare`.

For initial staging, select the migration branch as the deployment branch and use deploy command `npm run deploy:cloudflare:staging`. Do not set route variables yet. This deploys only the workers.dev endpoint, with no production routes. Disable builds for other branches during setup; do not point preview branches at the production deployment command.

After staging passes and the existing route is recorded, set Cloudflare **build variables** `CLOUDFLARE_ROUTE` to the verified exact hostname followed by `/*` and `CLOUDFLARE_ZONE_ID` to its zone ID. These are build configuration, not runtime Worker bindings or GitHub secrets. Change the deploy command to `npm run deploy:cloudflare`. Its generated ignored Wrangler configuration includes that exact route on every production deployment. Missing, partial, or wildcard-host routes fail before deployment. Ensure Cloudflare's build token has Workers Scripts edit for the account and Workers Routes edit limited to the target zone. A permission failure must be resolved in the build token; do not fall back to a route-less deployment.

After the reviewed PR is merged, switch the Cloudflare deployment branch to `main` and verify a successful native build and deployment. The same production command and build variables must remain configured. Do not return to the staging command after cutover: staging intentionally removes routes. Local operators can use Wrangler login and the same commands/variables if needed. Plain `npx wrangler deploy` is for dry-run verification only after cutover; use the wrapper to preserve routing.

Validate the resulting workers.dev staging URL: root, index.html, every asset, healthz, unknown paths, HEAD and unsupported methods, security headers, calculator edits, and Excel export/reopen. Confirm TLS before changing the public route.

## Same-hostname cutover and rollback

First inspect and privately record the existing hostname's DNS record, matching Worker routes, and tunnel ingress/origin mapping. Proxy response headers alone do not establish the origin. Do not alter shared tunnel configuration or other hostnames.

With staging verified, add an exact-hostname Worker route covering every path on the existing proxied hostname. Keep its DNS and old origin available. This places the Cloudflare-hosted assets ahead of the old origin without waiting for a DNS change or replacing the existing certificate. Verify the public response against staged asset hashes, health, browser workflows, and Cloudflare's actual route mapping. Do not stop the local service to test independence.

Rollback is removal of that new exact-hostname route (or restoration of its previous mapping if one existed). The retained DNS and tunnel then continue serving the original site. Record route IDs and prior values privately. Do not remove the local service until separately authorized.

Confirm one successful native production build before declaring automatic publishing operational. Verify the exact route in Cloudflare after that deployment, along with public asset hashes and TLS. See [Workers Builds configuration](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/) for native build authentication and settings.

## Capacity and verification status

No paid subscription is required for initial deployment. Check the account's current Workers plan and quotas before cutover. Static asset requests are free; Worker invocations for the root URL, health, and errors are subject to the account's Workers limits. Select failure behavior deliberately when adding a route; origin fallback would still depend on home availability.

Local verification on 2026-10-01: 25 existing tests passed; vendor integrity passed; Cloudflare dry-run passed. Chrome against the local Cloudflare runtime verified default results, switching single-slope/gable, workbook download and reopening the original job, with no page errors. Production staging, routing, TLS cutover, and publishing remain unverified until account access is available.

The dependency audit remains nonzero: two moderate entries for ExcelJS/uuid (previously documented) and a high brace-expansion advisory in the installed dependency tree. This migration does not change the checked-in browser bundles. Do not describe the dependency audit as clean.

Native integration revision: three deployment configuration tests cover exact-route retention, missing/broad-route rejection, and staging isolation. Native online deployment remains pending authenticated setup.
