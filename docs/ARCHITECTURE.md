# Architecture

```text
File picker / drop / paste → content sniff → React queue → codec worker → ImageMagick WASM
                                          ↓                    ↓
                                     validation        output Blob + object URL
                                                               ↓
                                                   download / lazy ZIP worker
```

The Vite SPA has no backend, API, database, account, upload, or analytics. `App.tsx` owns source `File`s, queue state, conversion settings, completed `Blob`s, and cleanup. Operations are sequential. A completed job records a copy of its options and output dimensions; requeue clears that output but retains the source. Previews are created only after inspection succeeds. Removing a job, clearing outputs, reconverting, and unmounting revoke associated object URLs. Individual download URLs are short-lived.

`src/formats.ts` is the capability source of truth for MIME, extensions, input/output, alpha, lossy behaviour, and browser preview; tests compare it to the README. Animated GIF and multipage TIFF/HEIF use only the first image. The UI warns when the codec reports multiple frames. `src/lib/formatDetection.ts` sniffs content; extensions and clipboard MIME do not confer support.

`workerClient.ts` owns the codec worker protocol and restarts the worker after cancellation. `converter.worker.ts` lazily loads the hashed WASM asset, checks input size and settings, and calls `magickAdapter.ts`. The adapter validates decoded dimensions and calculated resize dimensions before invoking ImageMagick resize. The worker also checks the resulting byte count. UI validation gives immediate feedback, while codec validation protects the worker boundary. Progress represents stages, not encoded bytes.

`zipClient.ts` starts `zip.worker.ts` only for ZIP download. The worker uses ZIP STORE because the image outputs are already encoded. Completed outputs above 75 MB cannot be zipped. ZIP generation temporarily duplicates data, so the threshold is lower than the retained 150 MB output ceiling.

## Browser memory limits

| Resource                 |   Limit | Reason                                      |
| ------------------------ | ------: | ------------------------------------------- |
| Files in queue           |      30 | Bounds retained objects and UI work         |
| One source               |  50 MiB | Bounds transfer and decoder input           |
| Retained sources         | 150 MiB | Bounds batch memory                         |
| Source pixels            |   40 MP | Bounds decoded raster memory                |
| Requested output axis    | 8192 px | Bounds resize allocations                   |
| Calculated output pixels |   40 MP | Bounds intermediate resize, including cover |
| Retained outputs         | 150 MiB | Bounds downloadable Blob memory             |
| ZIP eligible outputs     |  75 MiB | Allows room for archive generation          |

Compressed inputs can still expand substantially, and the WASM runtime itself uses memory. These values aim to keep common desktop and mobile batches practical; they do not guarantee success on every device.

## Deployment and security

Vercel serves static `dist` files at `/`. `vercel.json` applies `nosniff`, referrer and permissions policies, and a CSP allowing same-origin scripts/workers, WebAssembly compilation, and blob previews. The preview server applies security headers for local browser checks; a configuration test checks cache rules. Hashed assets are immutable; HTML, manifest, favicon, and theme bootstrap revalidate on Vercel. `frame-ancestors 'none'` blocks embedding. User files never leave the device. A malicious image can still exercise browser or codec bugs; see [security](../SECURITY.md).

## Production asset trade-off

The verified build emits approximately 14,828 kB raw / 5,344 kB gzip of WASM, 197 kB codec worker JavaScript, 99 kB ZIP worker JavaScript, 253 kB main JavaScript, and 12 kB CSS. The WASM and ZIP worker load lazily. `npm run size:check` enforces raw budgets of 16 MB WASM, 300 kB codec worker, 160 kB ZIP worker, and 350 kB main JavaScript.
