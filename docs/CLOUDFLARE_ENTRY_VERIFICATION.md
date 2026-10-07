# Browser entry verification

Enabled on 7 October 2026 at the user's request.
Custom rule: `ZenithW browser entry verification`
Rule ID: `5f4f062938b744c196b6cd3d34f2dab0`
Action: **Non-Interactive Challenge**. Status: **Active**.

The rule matches GET document navigations on `zenithw.space` when the browser
sends `Sec-Fetch-Mode: navigate`, `Sec-Fetch-Dest: document` and an Accept header
containing `text/html`. Paths must be extensionless or end in `.html`.
Verified bots are excluded. API/download prefixes, sockets and maintenance
status are excluded. API subdomains, fetch/XHR requests, static assets, robots,
sitemap and domain verification files do not match this rule.

This scope deliberately preserves ordinary search crawler requests, including
Brave's crawler which does not advertise a unique user agent. It does not claim
to identify every crawler or force every legacy browser through a challenge.
The browser headers are a compatibility filter, not an authentication mechanism.
Existing independent Cloudflare protections still apply to all requests.

The in-app browser displayed the security verification page on the homepage
and then automatically reached the homepage without an interactive checkbox.
A valid clearance cookie can prevent the screen appearing on every subsequent
navigation. The existing Challenge Passage setting was left unchanged.
Browsers without working JavaScript can fail the non-interactive check.

A global Under Attack mode was not enabled because the zone also serves a
native-app/API backend. No backend code or frontend interface was changed for
this challenge. A future switch to Managed Challenge should be reviewed for
compatibility; Cloudflare recommends Managed Challenge for general bot defense,
but the user specifically requested automatic entry verification.

Official reference:
https://developers.cloudflare.com/cloudflare-challenges/challenge-types/challenge-pages/
