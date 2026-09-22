# Roadmap

Version 1 is entirely browser-based. It has no backend, API, database, account, upload, or server conversion. The phases below are research and possible future work, not promises of shipped support.

## 1. Research and prototype

Compare native ImageMagick with libvips and publish a fixture-backed server capability matrix. Confirm HEIC/HEIF delegate availability and licensing; examine animated and multipage behaviour. Benchmark CPU, memory, output quality, and startup time. Draft an API contract without production integration. Build a Docker proof of concept with health and capability endpoints, and threat-model untrusted image input.

## 2. Limited advanced conversion API

If research justifies uploads, consider a Dockerized FastAPI service with a synchronous endpoint, strict format allowlist, content sniffing, temporary files with guaranteed cleanup, processing timeouts, and source, output, pixel, and memory limits. Add rate limits and concurrency control. Run as non-root with a read-only root filesystem where practical. Use structured logs without filenames or content, frontend-restricted CORS, OpenAPI documentation, and malformed-input integration tests.

Candidate server-only uses: animated GIF/WebP preservation, multipage TIFF, HEIC/HEIF output, JPEG 2000, improved ICC handling, and larger controlled conversions.

## 3. Advanced formats

Only add formats with fixtures and cross-conversion tests: camera RAW decoding, PDF-to-image, image-to-PDF, JPEG XL, PSD flattening, multipage document output, archive input/output, advanced colour conversion, finer metadata preservation, and optimisation presets. SVG, PDF, PSD, and RAW require additional resource limits, external-reference isolation, parser hardening, and sandbox review.

## 4. Asynchronous jobs

For longer operations, investigate signed temporary uploads, S3-compatible expiring object storage, job records, dedicated workers and queue, a status endpoint, polling or server-sent events, cancellation, retries and idempotency, expiring result URLs, automatic deletion, retention guarantees, dead-letter handling, and privacy-safe audit events.

## 5. Production hardening

Before opening a server to broad use: abuse prevention, quotas, per-IP and global rate limits, cost ceilings, metrics/tracing, sanitised errors, dependency and container scans, decoder sandboxing, autoscaling limits, load tests, cleanup verification, privacy-policy updates, and service-level objectives.

## 6. Hybrid frontend

Offer explicit Local and Advanced modes. Explain why an upload is needed, request consent, show retention terms and job progress/cancellation, and fall back gracefully when the backend is unavailable. Local mode remains automatic whenever it can handle the request. No silent upload.

## Other candidates

Version 1.1 may add a real offline PWA: service worker, WASM caching, offline fallback, cache invalidation, 192/512 px icons, installability tests, and first-load behaviour. Other candidates are locally stored presets, shareable settings without files, a CLI sharing capability definitions, a public API after abuse/cost controls, and accounts only if persistent jobs or paid usage justify them.
