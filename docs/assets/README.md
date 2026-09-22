# Screenshot sources

`desktop.png` and `mobile.png` are captured from the production build in Chromium with a real fixture conversion. `social-preview.png` and `public/og-image.png` are 1200 × 630 viewport captures of the same application. Regenerate them with `CAPTURE_DOCS=1 npm run test:e2e -- --project=chromium-desktop --project=chromium-mobile` after building.
