# Smart Relabeling — interactive project showcase

A browser-based case study of a desktop labeling and model-training tool designed and built by Jukree Donkittikun at Baksters Co., Ltd. This is an original HTML/CSS/JavaScript recreation for explaining the workflow, not the desktop application's source code.

## Open it

Open `index.html` in a recent desktop browser. No installation, build, account or server is required. Keep `styles.css`, `samples.js` and `app.js` beside the HTML file.

## Try the workflow

The workspace has three tabs, matching the requested application flow:

1. **Dataset selection:** choose Bottles, Cars or Spare parts. Each has 10 distinct, initially unlabeled synthetic images. Each dataset retains its own labels, class name, dataset name and review progress while the page is open. Reset demo clears all three datasets.
2. **Label & review:** draw or edit boxes, mark images reviewed and run auto-labeling in the same tab. Bottles/cars illustrate initial suggestions for pretrained COCO classes. Spare parts represent a custom class: manually label an example first. After human edits, run auto-labeling again to illustrate fine-tuning and updating only unedited images. The workspace shows an updated image immediately; edited and reviewed images remain protected. Scripted AI results are labeled as simulations.
3. **Model building:** after reviewing an image, preview augmentation, training and a model-run summary. Cancel or restart the preview, then download its JSON summary. Data changes and dataset switching invalidate an old preview; no trained weights are generated.

Within Label & review:

- Select a box to move it, or choose Draw a box to label an object. Coordinate fields allow keyboard editing and resizing; Add centered box is an alternative to drawing.
- The confidence slider filters suggestion visibility without deleting data. Human-edited boxes stay visible.
- Mark reviewed automatically opens the next unreviewed image, skipping reviewed images and wrapping to the start if needed. Once all images are reviewed, it stays on the last image and shows a completion message. Reopen review stays on the current image.
- Export annotation JSON includes normalized YOLO coordinates and per-image YOLO text. It contains no image pixels and is not a zipped YOLO training dataset.
- Optional local image uploads stay in the selected dataset's page memory and receive no scripted predictions. Label them manually. Up to 20 images including the 10 samples are allowed per dataset.

Use the arrow keys, Home and End within the workflow tabs. A selected box can be deleted with Delete while focus is in the demo, outside a form field. State lasts only until the page is reset or closed.

## Working versus simulated

| Working browser behavior | Illustrated behavior |
| --- | --- |
| Local image preview; drawing, moving, deleting and numerically resizing boxes | YOLO suggestions are fixed synthetic fixtures |
| Confidence filtering and reviewed/edited-label protection | Fine-tuning and relabeling use scripted examples |
| Annotation JSON and demo run-summary downloads | Training progress and loss curve are illustrative |
| Cancellation, reset and stale-result invalidation | No GPU inference, model weights, measured accuracy or real model export |

The inspected desktop application includes image/video input, class mapping, initial YOLO suggestions, human review, quick fine-tuning, relabeling of unedited images, augmentation, training and versioned model records. This showcase focuses on the central review/relabel/build loop rather than recreating every desktop control.

## Business value and evidence

- Problem: repetitive labeling delayed detection-dataset and customer-demo preparation.
- Contribution: sole developer of the desktop UI, architecture and application logic.
- Architecture choice: local processing supports private customer datasets.
- Reported outcome: the team labeled **8,000 images in under two days** using the application. This is a user/team-reported outcome, not an independently reproduced benchmark or a performance claim about this HTML demo.
- The showcase intentionally does not display an invented model-accuracy result or confuse exact item-count correctness with mAP.

The browser implementation contains no copied company application code, customer imagery, credentials, private data, or model weights. Its sample shelf illustrations are original SVG drawings generated in JavaScript. Local images are kept in page memory; there are no upload requests, analytics, CDNs or external runtime dependencies.

## Checks

JavaScript syntax:

```sh
node --check app.js
```

Behavioral checks require Node.js and a test-only `jsdom` installation (no effect on using the site). Install jsdom in a separate test directory or use an existing installation, then run:

```sh
NODE_PATH=/path/to/node_modules node tests/workflow.cjs
```

The checks exercise all three 10-image datasets, initially unlabeled images, auto-labeling in the review tab, custom-class seeding, separate dataset progress, reviewed-label protection, filtering, edits, exports, cancellation, stale-result invalidation, reset, escaped input and keyboard behavior. jsdom cannot verify rendered layout or real image decoding; those need a real browser.
