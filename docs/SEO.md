# ZenithW SEO — 7 October 2026

## Observed starting point

The authenticated Search Console property `sc-domain:zenithw.space` showed
24 clicks, 166 impressions, 14.5% CTR and an average position of 6.9 for the
selected three-month window (6 July–4 October 2026). These aggregates do not
mean the site ranks sixth for broad video-downloader searches. The query
report contained very little useful non-brand traffic.

The indexing report last updated 4 October showed 13 indexed URLs and 79
excluded URLs. Sixty-one were discovered but not yet indexed. The count suggests that many
are release archives, but individual examples in this category were not audited. Redirected aliases and the separate API origin do not need to be
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

## Publication and Google submission

Commit `3c170012d77e39971922b8bd81955150e768c7f5` was pushed to main on 7 October.
Cloudflare production deployment `114d4b92-7fda-42b0-ad64-223d4c81a712` succeeded.
The live homepage and Turkish/English guides returned 200; a missing route
returned the new 404. The sitemap returned 200 with 87 canonical entries.
The new content-hashed guide stylesheet returned `CF-Cache-Status: HIT` and
`Cache-Control: public, max-age=31536000, immutable`. API health remained 204
with private/no-store headers.

Search Console confirmed that the updated sitemap was submitted successfully
on 7 October. Its last processed count still showed 76 URLs, dated 5 October;
the new 87-entry count will appear only after Google processes the update.
Google's live inspection found `/guides` available for indexing and detected
one valid breadcrumb item. The indexing request was accepted. Requests for `/en/guides`, `/app` and
the updated homepage were also accepted. The homepage was already indexed;
the other inspected pages were not yet indexed. A request does not mean a new
page has already been indexed.

The `www.zenithw.space` hostname had no DNS answer at publication time.
The canonical apex domain worked normally. A proxied A record for `www` was created using Cloudflare's documented redirect-only
address `192.0.2.1`. Single Redirect rule `77ed6ca106ec4e5f8c2b123447c6cb7e`
only matches `http.host eq "www.zenithw.space"`; it redirects permanently to
`concat("https://zenithw.space", http.request.uri.path)` and preserves the query
string. Public DNS returned the new Cloudflare addresses. Both HTTP and HTTPS
requests returned 301 to the correct path and query, using the published DNS
address while the local resolver still had its earlier negative cache.
The apex, API and mail records were not changed.

## Free follow-up work

The updated sitemap and the four priority page requests have been submitted.
Let Google process them before repeating requests. A submission is a request
for crawling, not proof of indexing or ranking.

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

- [Cloudflare www redirect and DNS setup](https://developers.cloudflare.com/pages/how-to/www-redirect/)

## Other search engines and IndexNow (7 October 2026)

The homepage was submitted through Brave's official refetch form, which returned
Success. Brave runs an independent index: Google or Bing submissions are not
proof of Brave indexing. No indexing or ranking date is promised.

The Bing Webmaster Tools property was verified using a DNS-only CNAME:
`d6137e7058838f47ca81b0be7659c149.zenithw.space` -> `verify.bing.com`.
The 87-entry sitemap was submitted; Bing initially showed Processing and zero
discovered URLs, which is not an error or an indexing confirmation.

`scripts/indexnow.json` contains a public site-verification key and the 27 newly
updated canonical pages selected for notification. Old release archives are
discoverable in the sitemap but are not included in this initial notification.
The matching root text file is included in Pages output. The existing cache
generator excludes that exact static file from the maintenance Function so that
domain validation remains available during maintenance. No API, tokens, query
strings, downloads, settings or user history are submitted.

Preview a notification with `python3 scripts/submit_indexnow.py`. After publishing
the changed pages and key file, explicitly notify with
`python3 scripts/submit_indexnow.py --submit`.
For a later edit, use `--path /guides --path /app --submit` with only the changed
canonical paths. Notifications are not run on builds or repeated by a scheduler.
The tool checks the published key before posting to the official IndexNow API.
HTTP 200 means received; 202 means received with key validation pending.
Neither response guarantees indexing. DuckDuckGo obtains many traditional web
results from Bing, so improving Bing discovery can help that route too.

Sources:
- https://search.brave.com/help/brave-search-crawler
- https://search.brave.com/submit-url
- https://www.indexnow.org/documentation
- https://duckduckgo.com/duckduckgo-help-pages/results/sources
