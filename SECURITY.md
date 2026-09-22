# Security policy

## Reporting

Please report suspected vulnerabilities privately through GitHub's **Security → Report a vulnerability** flow. Do not open a public issue for an unpatched vulnerability. Include reproduction steps, affected browsers, and a minimal sample when safe to share.

## Scope and model

Local Lens has no backend: files remain in the browser and no analytics are present. This materially reduces exposure, but it does not make malformed image files harmless. Decoders, WebAssembly memory, browser APIs, and ZIP generation can still contain defects or exhaust device resources.

The app limits batches to 30 files, individual files to 50 MB, and decoded images to 40 megapixels. Processing is sequential and cancellable. Users should still avoid untrusted files, keep browsers updated, and close the tab if memory pressure becomes noticeable.

Dependency and codec advisories are handled through Dependabot and regular lockfile review.
