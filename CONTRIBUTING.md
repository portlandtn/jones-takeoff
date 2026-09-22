# Contributing

Use Node.js 24 and npm. Read the README, calculation reference, and architecture document before changing formulas or saved-job behavior. Keep examples synthetic and operational configuration outside the repository.

```sh
npm ci --ignore-scripts
npm run check:vendor
npm test
npm run check:public
npm start
```

There is no application build step: edit the modules in `dist/`. The `dist/vendor/` directory is generated from installed dependencies with `npm run vendor`; do not hand-edit those bundles. Commit dependency versions, lockfile, regenerated assets, and applicable license notices together.

For calculation changes, describe the input that triggers the change and the expected quantity or geometry. Add independent numerical expectations and boundary cases: coverage remainders, ridge-spanning bays, opening edges, zero quantities, overlaps, rounding thresholds, and split feasibility are especially important. Avoid tests that merely repeat the production formula without checking its physical meaning. Preserve saved-job compatibility or document a migration.

Update `docs/CALCULATIONS.md` and `rulesVersion` when rules change. Explain whether changes affect ordered lengths, geometric coordinates, hardware, or previously saved overrides. Keep estimating assumptions visibly distinct from manufacturer requirements.

For UI changes, exercise desktop and narrow layouts, keyboard controls, validation messages, and import/export interactions in a browser. Record the browsers and checks actually run. Do not describe automated unit tests as a visual or independent review.

Before submitting changes, inspect the diff, run appropriate tests, run the publication checks, and review `npm audit`. The known dependency advisory is documented in `SECURITY.md`; do not conceal it by suppressing or misreporting the audit. Include relevant validation and unresolved limitations in the change description. Never submit actual customer jobs, private reference workbooks, tokens, or installation-specific service files.
