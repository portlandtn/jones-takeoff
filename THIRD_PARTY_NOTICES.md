# Third-party notices

| Component | Pinned package | Bundled files | License |
| --- | --- | --- | --- |
| Three.js | `three` 0.180.0 | `three.module.js`, `three.core.js`, `OrbitControls.js` | MIT; [included notice](dist/vendor/THREE-LICENSE.txt) |
| ExcelJS | `exceljs` 4.4.0 | `exceljs.min.js` | MIT; [included notice](dist/vendor/EXCELJS-LICENSE.txt) |

Files are copied without modification from their npm package distributions by `scripts/vendor.mjs`. `scripts/check-vendor.mjs` compares all six assets and license files with the installed packages. The ExcelJS prebuilt browser distribution contains bundled dependencies; retain its embedded notices. The npm lockfile separately records installed transitive dependencies and available license metadata. Updating that lockfile alone does not rebuild the browser distribution.

Panel designations such as R-panel, A-panel, and standing seam are generic industry terms for common profiles. The calculator does not reference a manufacturer's products, part numbers, or catalog, and no affiliation, certification, or endorsement is claimed. Profile compatibility and ordering information must be confirmed with the supplier for the project.

The original application code has no selected distribution license in this repository. The third-party licenses above apply to their respective components and do not select a license for the original project.
