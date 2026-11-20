# Fiber Angle Inspection — interactive project showcase

The second project showcase for Jukree Donkittikun's portfolio. It explains a customer QC web demo developed at Baksters Co., Ltd.: customer discovery, fiber recovery-angle inspection, job metadata integration and traceable reporting.

## Open and try

Open `index.html` directly in a recent browser. Keep its CSS/JavaScript files and `assets/` folder alongside it. No server, installation, account or internet connection is needed.

1. In **Inspection dashboard**, choose a fictional job and click **Load sample job**. Metadata and example tolerances appear in the same workspace as the image.
2. Click **Inspect sample**. Five fixture positions appear with geometric opening angles and example tolerance comparisons.
3. Try **Fixture B** for measured, empty and unresolved positions; **Fixture C** has no reliable angles and cannot be saved by itself.
4. Under **Explore the synthetic geometry**, change a fictional fiber's opening angle. Re-inspect after changing the sample, job or measurement context.
5. Confirm that you reviewed the example results and **Save demo batch**.
6. In **Saved batches & reports**, select a snapshot, choose English or Chinese report labels, download CSV/JSON, or use **Print / Save as PDF**. PDF output uses the browser's print dialog; choose Save as PDF there.
7. **Create a corrected demo batch** loads a new draft linked to the selected record. Add an explanation and inspect/review/save it. The original batch remains unchanged.

Saved demo records last only until reload or Reset demo, with a limit of 50 batches. Export anything you want to keep. No local storage, network requests, database credentials, application source or model weights are included. The real-image gallery is a read-only display of saved camera images and V7 output overlays; it does not feed them into the synthetic inspection workflow.

## Real image results

The third view contains **one representative V7 physical-camera example**, `physical-1920-r1` at 1920×1080, with its saved source image, final overlay and five per-fiber records.

- Toggle between Original photograph and V7 result overlay. Search, filters, selection and pagination are removed for this single-example view.
- Open either image at full resolution or download the matching saved V7 records and provenance JSON. The table displays angles to two decimals and retains source values in JSON/tooltips.
- Source: `data/evaluation/resolution-bundle-foundation-20260827/run-two-mode-20260827-v2`. Both image files and the result JSON are verified against its artifact manifest; image pixels are copied unchanged.
- These are saved, uncalibrated V7 evaluation outputs. No live browser inference or production/accuracy validation is claimed. The gallery is separate from the synthetic dashboard and contains the approved representative sample.

## What is real here?

The generic vector-angle mathematics, example tolerance checks, null/empty handling, immutable in-memory snapshots, linked corrections, exports and UI controls work. Dashboard fixture illustrations and jobs are newly created synthetic examples. The Real image results tab instead displays an approved representative camera source image and its saved V7 output. Demonstration tolerance limits apply only to the synthetic dashboard; no customer QC limits are inferred for the real photograph.

This does **not** execute camera capture, OpenCV fiber detection, ArUco registration, calibration or MSSQL queries. Illustrative corner markers are not decoded ArUco tags. Dashboard angles come from synthetic arm vectors. The real-image gallery displays saved V7 pipeline angles without recalculating them. No measurement accuracy or production acceptance is claimed.

The original application uses React/TypeScript, FastAPI, OpenCV and SQL Server integration, with immutable history, corrections and English/Chinese PDF/XLSX reports. This standalone showcase uses new HTML/CSS/JavaScript, browser printing and CSV/JSON exports instead of the original backend.

## Contribution and outcome

I gathered customer requirements and independently developed the UI and measurement workflow, then adapted the demo from a development PC for a mini PC. The project demonstrated an alternative to manual measurement and repeated job-information entry. Delivery was reported with customer feedback still pending; no reduction in measurement time, calibrated accuracy or production outcome was established.

## Verification

```sh
node --check geometry.js
node --check app.js
NODE_PATH=/path/to/test/node_modules node tests/workflow.cjs
```

Behavioral checks need a test-only `jsdom` installation. They cover angle math, missing data, tolerance boundaries, job/context invalidation, review/save gating, immutable snapshots, corrections, report escaping, CSV formula protection, exports, language labels, print invocation, filtering and keyboard tabs. jsdom does not verify rendered layout or printed PDF appearance.
