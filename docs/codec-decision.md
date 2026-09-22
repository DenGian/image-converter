# Codec decision record

Date: 2026-09-22

## Decision

Use `@imagemagick/magick-wasm` 0.0.43 behind one module Web Worker. Vite imports `magick.wasm?url`, so the hashed asset honours the configured `/image-converter/` base. The worker is emitted separately and the 14.8 MB WASM binary is fetched only when the first image is inspected.

## Production spike results

The spike used the package's distributed x86 WASM—not system ImageMagick—to generate and validate bytes. The Vite production build emitted:

- worker JavaScript: about 195 kB raw;
- ImageMagick WASM: 14,828 kB raw, 5,344 kB gzip;
- correct hashed URLs below `/image-converter/assets/`.

Fixture tests verified JPEG, PNG, WebP, AVIF, GIF, BMP, TIFF, and ICO encoding. JPEG, PNG, WebP, AVIF, GIF, BMP, TIFF, and HEIC decoding were verified. ICO decode and HEIC encode were not dependable in this distributed build and are not advertised.

## Alternatives considered

Focused `@jsquash/*` codecs offer smaller, independently lazy chunks for JPEG/PNG/WebP/AVIF, but do not cover the whole useful matrix. GIF, BMP, TIFF, ICO, and HEIC would need additional implementations with separate loading behaviour, transform semantics, memory profiles, and licences. The resulting adapter surface was less reliable for this project's broad conversion goal.

`heic-to` 1.5.2 is actively maintained and decodes HEIC, but is LGPL-3.0 and unnecessary here because the distributed ImageMagick WASM successfully decodes the tested HEIC fixture. Avoiding it reduces both code and licensing complexity.

## Trade-offs

The chosen engine is Apache-2.0 and consistently handles orientation, alpha flattening, resizing, stripping, and encoding. Its main cost is the large initial codec download and WebAssembly memory use. The app mitigates memory risk through a 50 MB file limit, 40 megapixel decoded limit, 30-file batch limit, sequential execution, cancellation by worker termination, and early object-URL revocation.
