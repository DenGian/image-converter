# Contributing

Thanks for helping improve Local Lens.

1. Fork the repository and create a focused branch.
2. Install the locked dependencies with `npm ci`.
3. Make the change with tests. Format support changes must update `src/formats.ts`, codec fixtures, integration tests, and the README matrix together.
4. Run `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, and `npm run test:e2e`.
5. Open a pull request explaining user impact, browser coverage, and any bundle-size change.

Please keep processing local, avoid tracking or analytics, and never advertise a format without a passing fixture test.
