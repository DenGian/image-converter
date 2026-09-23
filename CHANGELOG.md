# Changelog

## 1.0.0 — 2026-09-23

- Browser-only batch conversion with content-based format detection, resize and metadata controls, retry, and reconversion.
- JPEG, PNG, WebP, AVIF, GIF, BMP, and TIFF input and output; HEIC/HEIF input and ICO output.
- Individual downloads and size-limited ZIP downloads, with resource limits for browser memory.
- System, light, and dark themes; file picker, drag and drop, and clipboard paste.
- Static Vercel deployment with security headers and automated browser and codec checks.

Animated and multipage inputs use only the first frame or page. SVG input, animated output, multipage preservation, and offline use are unsupported. The first codec load downloads a large WebAssembly asset; conversion can exhaust memory on some devices despite the resource limits.
