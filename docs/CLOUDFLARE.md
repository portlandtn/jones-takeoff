# Cloudflare Pages deployment

The browser application is unchanged. Cloudflare Pages hosts its static files; a single Pages Function implements `/healthz`. `_routes.json` invokes Functions only for that endpoint, so ordinary calculator requests use static hosting. The app does not fetch the home server and needs no database, secrets, KV, R2, or runtime bindings.

## Native GitHub setup

Connect only the intended repository using the existing Cloudflare Pages GitHub connection. Use Pages (not Workers Builds), project name `jones-takeoff`, framework preset None, repository root, and build variable `NODE_VERSION=24`.

Build command: `npm ci --ignore-scripts && npm test && npm run check:vendor && npm run check:public && npm run build:cloudflare`.

Build output directory: `.local/pages-assets`.

There is no deploy command, GitHub deployment secret, separate user-created API token, or production route variable. Pages automatically builds the repository-root `functions/` directory and deploys the build output. The build generates `_headers`, `_routes.json`, and a `404.html` to prevent accidental SPA fallback. Application files in `dist/` are copied without modification. GitHub Actions runs verification only.

Initially select `migration/cloudflare` as the Pages production branch, with no custom domain. Stage on the assigned pages.dev URL. After the PR is reviewed and merged, change the Pages production branch to `main`, trigger and verify its deployment, then confirm that later main pushes deploy automatically. Native Pages domain association persists across builds; no Wrangler route reconciliation is involved.

## Verify before cutover

On the real pages.dev deployment verify root and all assets, security headers, GET/HEAD health, POST rejection, and missing-path 404. Test default calculations, single-slope/gable switching, workbook export and reopen. Compare asset bytes with the reviewed commit. Pages normally redirects `/index.html` to `/`; this preserves access but differs from the local server's direct 200. Missing paths use an HTML content type with the text `Not found`.

For local verification: `npm run build:cloudflare`, `npm run check:cloudflare`, and `npx wrangler pages dev .local/pages-assets --compatibility-date=2026-09-30`. `check:cloudflare` compiles the health Function without deploying.

## Same-hostname cutover and rollback

Privately record the existing exact DNS record, proxy/TTL settings, tunnel mapping, and any matching Worker routes before changing the hostname. The existing Jones-only DNS rollback snapshot is preserved outside tracked files. Do not alter other hostnames or shared tunnel ingress.

First associate the existing hostname under the Pages project's Custom domains. Follow the dashboard's activation flow; do not point DNS at pages.dev before associating the custom domain, because this can produce a 522. Inspect any proposed automatic DNS replacement before accepting it. Verify the existing edge certificate covers the hostname and the Pages domain is ready for activation; do not assume a pages.dev certificate proves custom-hostname readiness. Keep the old origin running throughout. If the dashboard cannot provide a safe activation sequence, stop before DNS cutover and resolve that uncertainty.

When ready, change only the existing hostname's CNAME target to the project's actual pages.dev hostname, retaining proxy status and TTL. Some dashboard flows do this as part of domain activation; avoid a duplicate edit. Verify custom-domain status, public HTTPS, health, asset hashes, and browser workflows immediately. Never stop the local service as an independence test.

Rollback: restore the saved exact CNAME target, proxy flag, and TTL, leaving tunnel and local service running. Verify public HTTPS and health against the original service. Remove the Pages custom-domain association only if necessary after DNS recovery; do not delete the Pages project or other DNS records. DNS rollback may take time to propagate, so it is not a substitute for pre-cutover validation.

## Verification and limits

Local Pages verification on 2026-10-01: default calculator results, single-slope/gable switching, and Excel export/reopen passed in Chrome without page errors. Root, assets, HEAD, health, 404, and unsupported methods behaved as described, with the original security policies. The health Function compiles successfully. Online deployment, custom-domain TLS/cutover, and native auto-publishing still require verification.

Static requests use Pages hosting; health Function invocations use the account's Functions quota. Check the existing account plan and limits before cutover. No new paid subscription has been started.

The dependency audit remains nonzero: two moderate entries for ExcelJS/uuid and a high brace-expansion entry. Browser vendor bundles are unchanged. This is not a clean dependency audit or an independent review.

References: [Pages Git integration](https://developers.cloudflare.com/pages/configuration/git-integration/), [Function routing](https://developers.cloudflare.com/pages/functions/routing/), [custom domains](https://developers.cloudflare.com/pages/configuration/custom-domains/).
