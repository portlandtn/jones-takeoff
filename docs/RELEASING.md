# Public release checklist

This checklist applies to the exact files and history that will be published. A clean working tree scan is not a clean-history guarantee. Repeat these steps after changes; do not reuse an old result for new contents.

## 1. Verify the application and dependencies

```sh
npm ci --ignore-scripts
npm run check:vendor
npm test
npm run check:public
npm audit
```

If vendor assets are intentionally updated, run `npm run vendor`, review the generated changes, and repeat the checks. Review the dependency finding in `SECURITY.md`: the current audit is not clean. Decide and record remediation or a justified release disposition rather than treating that failure as a pass.

Perform a browser smoke test of a default job, single slope, asymmetric gable edits, opening Cut Panels, quantity/length overrides, and Excel export/reopen. Broader browser and engineering review remain separate from automated tests.

## 2. Review the publication surface

Expected public contents are application modules and vendor licenses in `dist/`, tests, scripts, documentation, package manifests, `.gitignore`, and `server.mjs`. Optional CI files belong under `.github/` and still require review.

Exclude credentials, environment files, private package registry configuration, service units, personal domains, deployment routes, customer jobs, private reference documents, exports, archives, backups, and dependency directories. The working-tree audit skips known local-only paths; physically inspect those boundaries and ensure they cannot enter the publication.

Review URLs separately. Technical reference links, registry download URLs, library notices, standards links, and advisory links have different purposes from operational endpoints. Confirm every remaining application URL is intentional. Review prose, fixtures, screenshots, author metadata, filenames, and workbook examples for personal or business-sensitive content that a token scanner would miss.

Do not put secrets in `dist/`, even if ignored by Git: the local static server serves that directory. `.gitignore` is a publication safeguard, not a web-server access control.

## 3. Inspect the exact Git index

If this directory has not yet been initialized, initialize a new repository only when preparing the first commit. Stage explicit public paths rather than indiscriminately adding everything. No remote is needed for these checks.

```sh
git status --short --untracked-files=all
git diff --cached --stat
git diff --cached --check -- . ':!dist/vendor/'
git diff --cached
npm run check:staged
git ls-files
```

The whitespace check excludes byte-preserved upstream vendor files, which contain upstream whitespace warnings. Vendor integrity is checked separately with `check:vendor`.

`check:staged` reads every blob in the Git index, including already tracked files. It rejects private paths even if they were force-added despite `.gitignore`. Reading the index matters: cleaning a working copy does not clean a previously staged secret. Repeat the checks after any additional staging.

Run an established secret scanner over the candidate tree as a separate check. Review findings; do not commit scanner reports containing matched values. Keep local audit tooling, private reports, and temporary artifacts outside the publication directory.

## 4. Inspect history and repository metadata

For a new repository with no commits, there is no history to scan. After committing, and whenever bringing in existing commits or tags, inspect all publishable refs, commit messages, author/committer names and email addresses, and a full-history secret scan. Choose the intended public commit identity before creating the first commit. Do not assume rewriting the current file removes prior disclosures.

Review the remote URL before pushing. It should identify the intended repository and contain no embedded credential. A future remote and its existing history cannot be certified before they exist or have been inspected. Do not merge a prepopulated remote's history without reviewing it.

If a real credential is found, remove it from the publication contents and rotate it through its issuing service. History cleanup and credential rotation are separate actions. Keep any incident details private.

## 5. Resolve release decisions

- Select a license for the original code if an open-source license grant is intended. The included library licenses do not make that choice.
- Record the known dependency advisory's disposition and avoid claiming a vulnerability-free release.
- Have the quantity rules, provisional profiles, and construction assumptions reviewed by the appropriate estimator or project professional before using outputs for ordering.
- Enable the repository's available secret-protection and private-reporting features where appropriate; these supplement local review.
- Record the checks actually performed, their scope, and remaining limitations in `docs/VERIFICATION.md`.

Only publish the reviewed snapshot. Connecting a remote or pushing is a separate operation from preparing these local files.
