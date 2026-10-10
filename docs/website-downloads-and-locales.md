# Downloads and localized website

The public hub is `/downloads`. `/app` and `/pc-app` (including `.html` and language-prefixed aliases) permanently redirect to its Android and Windows sections. Queries are preserved. The Cloudflare Function applies these redirects before maintenance checks; `_redirects` provides the static-host fallback.

`shared/site-config.json` is the source for versions, release files, platform requirements, distribution status and Telegram. A missing Telegram URL removes generated links. A pending distribution has no fabricated store destination. Windows 4.1.0 and Android 2.1.3 EXE/APK asset URLs returned HTTP 200 with matching sizes on 2026-10-10. Store approvals must be checked before changing their status to `available`.

## Build and languages

Run `npm install`, then `npm run build` with Python 3 available. The build generates 75 routes in Turkish, English, German, French, Russian, Vietnamese, Chinese and Japanese: main pages, four guides and release archives. Output contains self-canonicals, reciprocal hreflang, translated metadata and JSON-LD without relying on JavaScript. Chinese uses `zh-CN` for HTML/SEO and `zh` for internal routing. The sitemap contains 607 actual canonical URLs. Original privacy/terms/DMCA canonicals are retained until their legal translations are reviewed; no invented translations or modification dates are indexed.

Explicit language URLs override browser/saved preferences. Settings remains the only language selector and returns to the same page after a change. Root pages continue to detect browser language. API, downloader and maintenance/cache boundaries remain covered by existing tests.

The four simplified workspaces use native selects/file inputs and progressively enhanced `details` menus. All distribution providers remain visible on Downloads; only EXE/APK file variants open a chooser. Its glass panels use two static gradient-backed blur surfaces (reduced blur on mobile) and short opacity/transform animations, with reduced-motion/transparency fallbacks. There is no animation loop or extra graphics dependency. JavaScript adds outside-click/Escape dismissal to contact/download popups. Native format selection uses the existing conversion state, including the legacy homepage modal. Reduced-motion preferences disable decorative transitions. Local processing requirements are available beside the processing selector; the existing explicit consent before server fallback is preserved.

## Verification

Run the website tests with:

```
node --test tests/downloads-seo.test.mjs tests/workspace-choices.test.mjs tests/site-language.test.mjs tests/about-locales.test.mjs tests/updates-static.test.mjs tests/cloudflare-cache.test.mjs tests/local-media.test.mjs
node scripts/build-cache-assets.mjs --check
```

The tests verify all 600 localized pages, full translated guides/release archives, real sitemap paths, permanent redirects, release links/pending labels, safe Telegram links, language navigation, conversion selection compatibility, popup dismissal, local track copying and Cloudflare cache/CSP boundaries. Browser review covers desktop/mobile layouts and synthetic-file processing. On 2026-10-10 all 29 tests and the CSP/cache check passed; a repeated SEO build changed zero frontend outputs. The browser converted a synthetic MP4 to M4A and downloaded it successfully, and remux reached its save dialog.

## Search Console after deployment

Submit `https://zenithw.space/sitemap.xml`. Inspect `/downloads`, one language counterpart such as `/en/downloads`, a translated guide and an archive URL. Request indexing for the updated hub and key pages. Confirm canonical selection and crawl status after Google recrawls; deployment itself does not guarantee ranking or indexing.

## Brand asset provenance

Store logos are optimized copies of official artwork, not badges asserting publication or endorsement:

- Microsoft Store: `https://get.microsoft.com/images/en-us%20dark.svg`
- F-Droid: `https://f-droid.org/assets/fdroid-logo-text_S0MUfk_FsnAYL7n2MQye-34IoSNm6QM6xYjDnMqkufo=.svg`
- Uptodown: `https://stc.utdstc.com/img/svgs/logo-uptodown.svg`
- Telegram: `https://telegram.org/img/website_icon.svg?4`
