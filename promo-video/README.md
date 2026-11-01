# ZenithW promotional video

The separate Remotion/React project for ZenithW promotional compositions. It is not loaded by the website or included in the Windows app. Web **17.0** is documented in the [main project](../README.md); compositions and rendered videos have their own lifecycle.

## Local commands

```sh
npm ci --ignore-scripts
npm run dev
npm run lint
npm run build
```

`dev` opens Remotion Studio. `lint` runs ESLint and TypeScript. `build` creates a browser bundle in the ignored `build/` directory; it does not render video. For rendering, use the installed CLI with your composition ID and output path; see the [render documentation](https://www.remotion.dev/docs/cli/render).

## Versions and security

Remotion packages are aligned to **4.0.539**. Zod is overridden to **4.6.7** to avoid [GHSA-mrhx-c7xc-m3w5](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5). Remotion warns that it expects Zod 4.5.4; clean install, lint/types and bundling pass with the patched override. A full render has not been validated. Keep Remotion packages aligned when updating.

The npm audit reports no high/critical findings, with 12 moderate dependency-path findings remaining. See the [audit report](../docs/full-code-audit-2026-11-02.md) for scope and limitations. Update the lockfile with dependencies; do not commit generated bundles or rendered media.

## Licensing

The package remains private and marked `UNLICENSED`. Dependencies retain their own licenses. Review the [Remotion license](https://github.com/remotion-dev/remotion/blob/main/LICENSE.md) for organizational/commercial use. The main project's [third-party notices](../THIRD_PARTY_NOTICES.md) cover separately distributed components.
