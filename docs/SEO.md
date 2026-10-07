# ZenithW SEO — 7 October 2026

## Observed starting point

The authenticated Search Console property `sc-domain:zenithw.space` showed
24 clicks, 166 impressions, 14.5% CTR and an average position of 6.9 for the
selected three-month window (6 July–4 October 2026). These aggregates do not
mean the site ranks sixth for broad video-downloader searches. The query
report contained very little useful non-brand traffic.

The indexing report last updated 4 October showed 13 indexed URLs and 79
excluded URLs. Sixty-one were discovered but not yet indexed, mostly release
archives. Redirected aliases and the separate API origin do not need to be
indexed. The old `/info` URL was the one reported 404; there is no matching
public page in this repository, so it is not redirected to unrelated content.

Live inspection also showed these actionable issues:

- No H1 or useful explanatory content on the downloader homepage.
- About, privacy, terms and copyright article bodies required JavaScript.
- Unknown URLs returned homepage HTML with status 200, because Pages used its
  default SPA fallback without a top-level `404.html`.
- Archived releases redirected to a trailing-slash URL while their canonical
  and sitemap entries used the address without that slash.
- Most page previews lacked consistent title, description and image metadata.
- Comparison pages included unverified competitor claims and did not explain
  the current YouTube web limitation consistently.

## Implemented

`scripts/build-seo.mjs` generates HTML from the trusted source content. It:

- Pre-renders the existing Turkish article copy on the public information pages.
- Adds visible homepage instructions, FAQs and ordinary HTML navigation links.
- Generates four product-specific guides in Turkish and English, with separate
  self-canonical URLs and reciprocal `hreflang` links, plus two guide hubs.
- Produces consistent Open Graph, Twitter, Organization, WebSite, WebPage,
  breadcrumb and appropriate application/article structured data.
- Derives the sitemap from the actual canonical HTML routes, excluding private
  UI, 404/maintenance pages, redirected physical aliases and the latest-release
  duplicate. Unknown archive modification dates are not invented.

`scripts/build-updates.mjs` and the release navigation use the actual archive
URLs with trailing slashes. Old version URLs continue to redirect normally.
`frontend/404.html` provides the Pages missing-route response, with `noindex`.
The new guide stylesheet is content-hashed by the existing cache builder.
Guides use system fonts, semantic HTML and no client JavaScript dependency.
Download behavior, private API cache bypasses and maintenance handling remain
under their existing controls.

Build the checked-in Pages output with `npm run build`. For an isolated SEO
content edit, run `npm run build:seo`, then `npm run build:cache`. Cloudflare
currently deploys the checked-in `frontend/` directory, so generated HTML,
headers, asset manifest and shared CSP/cache files must be committed together.
Keep the eight guide articles in `scripts/seo-content.mjs` aligned with the
actual interface. Change their date only when their content meaningfully changes.

No fabricated ratings, testimonials, keyword stuffing, bought links or automated
directory submissions are used. Visible FAQs help readers; Google retired FAQ
rich results in May 2026, so they are not treated as a rich-result opportunity.

## Free follow-up work

After the updated deployment is live, submit `https://zenithw.space/sitemap.xml`
in the existing Search Console property. Inspect the homepage and representative
guide/app pages, and request indexing where appropriate. A submission is a
request for crawling, not proof of indexing or ranking.

Use Search Console's query/page reports to check relevant impressions and clicks
after Google has recrawled. Track guide traffic separately from release notes.
The property does not yet have enough Core Web Vitals field data; use Google's
free PageSpeed Insights for lab diagnostics without inventing performance scores.

Keep the official GitHub project, Android/Windows pages and actual brand social
profiles linked consistently. Publish original demonstrations through the user's
own channels when authorized. A useful product demonstration or detailed answer
in a relevant community is more valuable than unrelated link drops.

## Primary sources

- [Google SEO starter guide](https://developers.google.com/search/docs/fundamentals/seo-starter-guide)
- [Helpful, reliable content](https://developers.google.com/search/docs/fundamentals/creating-helpful-content)
- [Localized page versions](https://developers.google.com/search/docs/specialty/international/localized-versions)
- [Sitemap generation and accurate lastmod](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap)
- [Software application structured data](https://developers.google.com/search/docs/appearance/structured-data/software-app)
- [Google documentation updates, including retired FAQ rich results](https://developers.google.com/search/updates)
- [Cloudflare Pages routing and 404 behavior](https://developers.cloudflare.com/pages/configuration/serving-pages/)
