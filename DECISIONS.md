# Decision Log

Decisions already made, with alternatives considered and why they lost.
**Do not relitigate without new information.** New decisions get appended
below; existing ones are never rewritten.

**D1. Name: Dead HTML Tag Society.**
*Considered:* Brine Ring, Insert Coin, Attract Mode, The Blink Ring, The
56k Ring, Under Construction Ring, neon variants.
*Why:* DHTS is a concept strangers want to join — the Dead Poets riff
gives warmth and the theme generates copy, badges, and the patron-tag
mechanic for free. Brine Ring was uniquely Josh's but less legible to
outsiders, and stays reserved for the agent-fleet domain. Neon/arcade
names are crowded space among existing rings.

**D2. Member integration: plain HTML links only. No JS widget in v1.**
*Considered:* (a) onionring.js-style widget, (b) hybrid links + optional
widget (was the v1 doc's answer), (c) frozen `widget-v1.js` with SRI
pinning.
*Why:* A widget means every member executes code served from this repo on
every page load — a repo/account/deploy compromise becomes attacker JS
(e.g. cryptojacking) on all member sites at once, plus a
widget-rendering XSS surface from ring data. SRI mitigates tampering but
breaks silently on every legitimate update and can't cover
runtime-fetched `ring.json`. Plain links have none of these properties,
are more old-school-authentic, and delete two whole security sections.
*Revisit trigger:* members actually asking — then only as frozen,
versioned, SRI-pinned `widget-v1.js`.

**D3. Hosting: GitHub Pages + Actions, fully static.**
*Considered:* Cloudflare Worker (`/next?from=`), any dynamic backend.
*Why:* Zero cost, zero servers, and a Worker is more infra than a ring
needs. Static means the attack surface is the repo, nothing else.

**D4. Redirect mechanism: build-time meta-refresh pages per member.**
*Considered:* client-side JS resolution (onionring model), edge redirects.
*Why:* Works with JS disabled, visible-link fallback, `noindex` keeps
stubs out of search, and the ring re-wires itself on every merge without
members touching their sites — the one genuinely nice property of the
onionring model, kept without its JS.

**D5. Membership = PR to `ring.json`. The ring is a repo.**
*Considered:* form/email intake (common in Neocities rings).
*Why:* Open source, self-serve, auditable history, and CI can validate
before a human ever looks. Ordering = array order, append-only, wrap at
ends — deterministic and diff-friendly.

**D6. Random lives on the hub with ~5 lines of inline JS; `?from=` filters
only.**
*Considered:* build-time rotation (no JS at all), no random.
*Why:* True randomness needs JS somewhere; confining it to the hub keeps
member sites at zero JS. `?from` never becomes a redirect target → no
open-redirect. `<noscript>` degrades to the member list. Random excludes
the current site because bouncing back to yourself is a bad hop.

**D7. Domain: `ring.pickles.dev`.**
*Considered:* neutral new domain, bare github.io.
*Why:* Free (existing domain + DNS CNAME), memorable, no new renewal to
babysit. A neutral domain can come later without breaking anything except
embedded links (acceptable at current scale).

**D8. Co-admins from day one (technicalpickles + noizwaves).**
*Why:* Bus factor on a two-person ring, and it signals community project
rather than personal fiefdom.

**D9. Patron tag: required membership field, curated `dead-tags.json`,
duplicates only once all tags are claimed.**
*Why:* It's the theme made mechanical; curation keeps it to genuinely
dead tags; the unclaimed-tag list doubles as recruitment bait.

**D10. Badges: member-supplied PNG/GIF only, 88×31, ≤100 KB, CI
re-encodes; no member SVG.**
*Why:* SVG can carry script; re-encoding strips metadata and defeats
polyglot files. Build-generated default badges may be SVG because they're
first-party.

**D11. CI security posture: changed-file allowlist for non-maintainer
PRs; base-branch code runs against PR data; `pull_request` trigger only;
SHA-pinned actions; least-privilege `permissions:`; CODEOWNERS + branch
protection.**
*Why:* Directly closes the "PR edits the workflow and mines bitcoin in my
Actions" attack, and its data-only-contributions principle is what makes
stranger PRs safe at all.

**D12. Rendering rule: every member string is build-time escaped through
one tested helper; schema charsets as second layer.**
*Why:* Defense in depth against injection via ring data, and it's the
precondition D2's revisit path depends on.

**D13. Tooling: Node 22+/npm/`tsx`/vitest, CI-only deps (`ajv`, image
lib), zero runtime deps in output. License: MIT.**
*Why:* Low contributor friction (npm over pnpm), boring and durable. MIT
is clean because the widget was cut and nothing is vendored from
onionring.js (which is CNPL).

**D14. Link-checker: weekly, string-match for `ring.pickles.dev`, 7-day
grace for new members, opens/auto-closes issues, removal stays human.**
*Why:* Grace period solves the join-time chicken-and-egg (can't link to
redirects that don't exist yet); auto-removal is too hostile for a cozy
ring.

**D15. Third-party Action pins shipped as version tags with an inline
comment noting the tag's resolved version, not full commit SHAs.**
*Considered:* full commit SHA pins (the v1 design doc's stated
requirement).
*Why:* The build environment that produced the initial implementation had
no network path to `api.github.com` to resolve tags to their current
commit SHAs, and guessing a 40-character hex string risks silently
pinning to the wrong (if real) commit — worse than a visible, honest tag
pin. **Follow-up required before this is considered done:** a maintainer
(or a tool like `pin-github-action`) should resolve `actions/checkout@v4`,
`actions/setup-node@v4`, `actions/upload-pages-artifact@v3`,
`actions/deploy-pages@v4` to commit SHAs, and Dependabot should be
configured for the `github-actions` ecosystem to keep them current. Until
then, the changed-file allowlist + `pull_request`-only trigger + branch
protection remain the load-bearing controls from §9.1 — SHA-pinning is
defense-in-depth on top of those, not the only thing standing between a
malicious PR and the runner.

**D16. Hardening pass from an adversarial review: SSRF guard on member-URL
fetches, dead-link-issue pagination, future-`joined` rejection, inline-JS
escaping extended to U+2028/U+2029, charset tightened against control and
bidi-override characters, `build.ts` re-validates before writing, and the
allowlist-skip gate keys off the two named maintainers instead of
`author_association`.**
*Why:* An adversarial review (assuming bugs existed rather than confirming
none did) found that `checkSitesReachable`/`warnMissingBacklinks`/the
link-checker followed redirects on attacker-controlled `url` values with
no check against private/link-local/CGNAT ranges — a stranger's PR could
point a member `url` at a public host that 302s to `169.254.169.254` or
an internal address, and CI would follow it. Fixed with `src/safe-fetch.ts`:
manual redirect handling, a DNS-resolved IP blocklist re-checked at every
hop, a redirect cap, and a response-size cap. Also found and fixed: the
weekly link-checker's issue lookup fetched only page 1 of `dead-link`
issues (open+closed), so past 100 ever-opened issues it would silently
start duplicating/failing to auto-close; a `joined` date with no
past-only constraint let a member set `"2099-01-01"` and never be checked
by the weekly link-checker at all; `JSON.stringify` in `/random/`'s inline
script didn't escape U+2028/U+2029 (harmless on ES2019+ engines, escaped
anyway for older ones) alongside the existing `<`/`>`/`&` script-breakout
escaping; the charset regex allowed control characters and Unicode bidi
overrides (e.g. U+202E) that don't trip HTML escaping but can visually
spoof a member's displayed name; `build.ts` trusted `ring.json` was
already schema-valid rather than re-checking, which is only true because
of workflow step ordering, not anything enforced in code; and the
changed-file allowlist skip condition matched GitHub's `author_association`
(MEMBER/COLLABORATOR) rather than the specific two names in
`.github/CODEOWNERS`, which is a looser bar than "maintainer."
