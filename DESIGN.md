# Dead HTML Tag Society — Design Doc (v2)

A webring for personal sites, in loving memory of `<blink>`.

**Domain:** `ring.pickles.dev` · **Repo:** `technicalpickles/webring` (public, MIT) · **Maintainers:** technicalpickles + noizwaves (co-admins from day one)

## 1. Goals

- An old-school webring connecting personal sites, starting with `pickles.dev` and `noizwaves.com`.
- **Zero hosting cost:** GitHub Pages + GitHub Actions only. No servers, no databases, no workers.
- **Zero JavaScript on member sites:** members integrate with four plain `<a>` tags. The ring never executes code on a member's page.
- **Open source & self-serve:** the ring *is* a git repo. Joining = opening a PR. Forkable by anyone who wants their own ring.
- **Security-minded by construction:** see §9. Untrusted contributions can only ever be data, never code.

### Non-goals (v1)

- JS embed widget (deliberately cut — see §9 rationale), RSS planet, stats/analytics, member auth. See §12.

## 2. Architecture

```
ring.json ──(build script, GitHub Actions on merge to main)──► static site (dist/)
                                                               ├── index.html         home + directory + join snippet
                                                               ├── 404.html           links back to directory
                                                               ├── badges/*.png|gif|svg
                                                               ├── random/index.html  random-site hop
                                                               └── {slug}/
                                                                   ├── next/index.html
                                                                   └── prev/index.html
```

- **Source of truth:** `ring.json` at repo root, validated by `ring.schema.json`.
- **Build:** small TypeScript script (Node 22+, run via `tsx`), no framework. Reads `ring.json` + HTML templates, emits `dist/`. Deployed via `actions/deploy-pages` on push to `main`.
- **Domain:** `CNAME` file for `ring.pickles.dev`; DNS CNAME → `technicalpickles.github.io`. HTTPS enforced in Pages settings.
- **No member-side JS, no runtime data fetches.** The only JS anywhere is ~5 inline lines on the hub's own `/random/` page (§5).

## 3. Data model

```json
{
  "name": "Dead HTML Tag Society",
  "url": "https://ring.pickles.dev",
  "members": [
    {
      "slug": "pickles",
      "name": "pickles.dev",
      "url": "https://pickles.dev",
      "owner": "technicalpickles",
      "tag": "blink",
      "badge": "badges/pickles.png",
      "rss": "https://pickles.dev/feed.xml",
      "joined": "2026-07-09"
    }
  ]
}
```

- `slug`: unique, `^[a-z0-9-]{1,32}$`, used in redirect paths.
- `tag` (**patron tag**, required): each member adopts a dead HTML tag, validated against `dead-tags.json` — a curated list in the repo (`blink`, `marquee`, `center`, `font`, `big`, `strike`, `tt`, `acronym`, `frameset`, `frame`, `applet`, `dir`, `basefont`, `isindex`, `plaintext`, `xmp`, `keygen`, `menuitem`, ...). Duplicates allowed once all tags are claimed; directory shows it as `<blink>` next to the member's name.
- `name`/`owner`: strict charset (printable, no `<>&"'`) — belt-and-suspenders even though all rendering is build-time escaped.
- Ring order = array order; new members append. Wrap-around at the ends.
- `badge`/`rss` optional. Badges: 88×31 px, PNG or GIF only from members (no member-supplied SVG — SVG can carry script), ≤100 KB.

## 4. Static redirects & member snippet

Per member, generate `/{slug}/next/index.html` and `/{slug}/prev/index.html`:

```html
<!doctype html>
<meta name="robots" content="noindex">
<meta http-equiv="refresh" content="0; url=https://noizwaves.com/">
<link rel="canonical" href="https://noizwaves.com/">
<p>Next stop: <a href="https://noizwaves.com/">noizwaves.com</a></p>
```

Meta-refresh works without JS; the visible link is the fallback; `noindex` keeps stubs out of search. Membership changes re-generate everything, so the ring re-wires itself on every merge with no action from members.

**Member snippet** (the directory renders each member's copy with their slug filled in):

```html
<p class="dhts">
  <a href="https://ring.pickles.dev/pickles/prev/" aria-label="previous site in the Dead HTML Tag Society">←</a>
  <a href="https://ring.pickles.dev/">Dead HTML Tag Society</a>
  <a href="https://ring.pickles.dev/random/?from=pickles" aria-label="random site in the ring">🎲</a>
  <a href="https://ring.pickles.dev/pickles/next/" aria-label="next site in the Dead HTML Tag Society">→</a>
</p>
```

Members may restyle/reword freely; the requirement is just working prev/next links plus a link to the hub, reachable from their homepage.

## 5. Random (`/random/`)

Build inlines the member list (urls + slugs) into the page with ~5 lines of inline JS: read `?from=`, filter that slug out, `location.replace()` a random pick. `?from` **only filters — it is never a redirect target** (no open-redirect surface). `<noscript>` fallback: the full member list as plain links. This is the one JS in the project and it runs only on the hub, never on member sites.

Edge cases: 1 member → self is fine; unknown `from` → ignore the filter.

## 6. Homepage / directory

Hand-rolled retro HTML/CSS from a template — lean into the theme (a tasteful CSS blink is permitted, as a treat):

- What this is; short eulogy for the dead tags.
- **Directory:** each member — 88×31 badge (default generated if absent, see §8), linked name, patron tag rendered as `<blink>`, owner, joined date, plus their personalized copy-paste snippet behind a details toggle.
- **How to join:** summary + link to `JOINING.md`.
- The Society's own 88×31 badge (idea: `</blink>` on a tombstone), downloadable. Claude Code generates a starter SVG→PNG; humans can replace it later.
- List of still-unclaimed dead tags, as recruitment bait.

## 7. Membership flow

1. Fork, append yourself to `ring.json` (picking an available patron tag), optionally add `badges/{slug}.png`, open a PR. Membership PRs may touch **only** `ring.json` and `badges/` (enforced, §9).
2. CI validation on PR — see §9 for the security-relevant checks; functionally: schema + charset + unique slug + valid patron tag, site returns 200 over https, badge is 88×31 PNG/GIF ≤100 KB (re-encoded by CI).
3. Soft check (warn, don't fail): member homepage links to `ring.pickles.dev`. Chicken-and-egg — redirects don't exist for them until merged; admins verify shortly after merge. The link-checker (§10) skips members with `joined` < 7 days ago.
4. Human review + merge by either admin → auto build/deploy → ring re-wired.
5. Leaving = PR removing your entry. Emergency removal = admin revert, one commit.

`JOINING.md` rules: personal/indie sites; ring links reachable from homepage; no commercial/ad-farm/malware/hate; admins may remove at discretion; be kind.

## 8. Badges

- Members: PNG/GIF, 88×31, ≤100 KB. CI **re-encodes** every submitted image (strips metadata, defeats polyglot files) and commits nothing that fails to decode.
- No badge → build generates a default: member name on an 88×31 tombstone-gray SVG (build-time generated, first-party, so SVG is fine here).

## 9. Security model

Threat model: strangers send PRs; the hub serves assets that other people's sites link to. Ordered by blast radius:

**9.1 CI / supply-chain (the "bitcoin miner in my Actions" scenario).**
- Changed-file allowlist: a first CI job diffs the PR; non-maintainer PRs touching anything outside `ring.json` + `badges/` fail immediately.
- Validation always runs **base-branch code against PR data**. Never check out and execute PR code. Use `pull_request` trigger only — never `pull_request_target` with a head checkout.
- Repo settings: require approval for first-time contributors' workflow runs; default `GITHUB_TOKEN` read-only; per-workflow `permissions:` blocks (link-checker gets `issues: write`, deploy gets Pages perms, validation gets nothing).
- Pin all third-party actions to full commit SHAs.
- CODEOWNERS: `src/`, `.github/`, `dead-tags.json`, `ring.schema.json` require maintainer review. Branch protection on `main` (required checks + review).
- Maintainer account hygiene is part of the perimeter: 2FA/passkeys required for both admins.

**9.2 Injection via ring data.**
- All HTML generation escapes member-provided strings at build time (single escape helper, tested). Schema charset restrictions are the second layer.
- Redirect targets come only from schema-validated `https://` member URLs in merged `ring.json` — no user-controlled redirect exists. `/random/?from=` only filters.

**9.3 Malicious/compromised member sites.**
- Human review to join; content policy; documented one-revert removal path.
- Weekly checker (§10) can optionally add a Safe Browsing lookup later.
- Honest limit: the ring links to third-party sites; we vet at join time and monitor, but can't control their content moment-to-moment.

**9.4 Badge files.** Covered by §8 re-encoding + format allowlist.

**9.5 Why no JS widget (decision record).** An embed widget means every member executes code served from this repo on every page load — a supply-chain compromise of the repo/account/deploy would run attacker JS (e.g. cryptojacking) on all member sites at once, and widget rendering creates an XSS surface from ring data. SRI pinning mitigates but adds silent-breakage operational cost. Cut entirely: plain links have zero of these properties. Revisit only with a frozen, SRI-pinned `widget-v1.js` policy (see §12).

## 10. Dead-link checker

Weekly cron workflow (`workflow_dispatch` too, for testing):
- GET each member URL (follow redirects, 2 retries w/ backoff).
- Check response HTML contains `ring.pickles.dev` (string match; skip members joined <7 days).
- Failures → open/update a `dead-link` issue per member; auto-close on recovery. Removal is a human decision.
- Permissions: `issues: write` only.

## 11. Repo layout & tooling

```
webring/
├── ring.json
├── ring.schema.json
├── dead-tags.json
├── badges/
├── src/
│   ├── build.ts            # ring.json + templates → dist/
│   ├── escape.ts           # the one HTML-escape helper
│   └── templates/          # index, redirect, random, 404
├── dist/                   # gitignored, built in CI
├── .github/
│   ├── CODEOWNERS
│   └── workflows/          # deploy.yml, validate.yml, linkcheck.yml
├── JOINING.md
├── DECISIONS.md            # §14 of this doc, kept living in-repo
├── README.md
├── CNAME
└── LICENSE                 # MIT
```

- Node 22+, npm, `tsx` to run, vitest for tests (redirect generation + wrap-around, escaping, schema validation, changed-file allowlist logic).
- CI-only deps allowed: `ajv`, `image-size`/`sharp` (badge checks/re-encode). `dist/` output has zero runtime dependencies.
- `npm run dev` = build + `npx serve dist`.
- Hostname policy: member URLs are canonical as written; `www.` and apex treated as equivalent in the link-checker.

## 12. Later (v1.1+)

- RSS planet page + OPML export (`rss` field already exists).
- Safe Browsing check in the link-checker.
- Frozen `widget-v1.js` with SRI-pinned snippet, *only if members ask* — per §9.5.
- Keyboard ring-hopping on the directory.

## 13. Acceptance criteria (v1 done when…)

- [ ] Deploys to `ring.pickles.dev` with pickles.dev + noizwaves.com as members with patron tags.
- [ ] `/{slug}/next/` and `/{slug}/prev/` correct for both members, wrapping.
- [ ] `/random/?from=slug` excludes the source site; works sans JS via noscript list.
- [ ] Directory shows badges (incl. generated default), patron tags, per-member snippets, unclaimed-tag list.
- [ ] Validation workflow: blocks out-of-allowlist file changes, malformed JSON, bad tags/slugs, dead sites, bad badges. Runs base code against PR data.
- [ ] Link-checker opens and auto-closes issues; respects 7-day grace.
- [ ] CODEOWNERS + branch protection + SHA-pinned actions + least-privilege workflow permissions in place.
- [ ] README + JOINING.md good enough for a stranger to join unassisted.
- [ ] noizwaves.com and pickles.dev both display the snippet (post-deploy coordination task).

## 14. Decision Log

Decisions already made, with alternatives considered and why they lost. **Do not relitigate without new information.** Lives in-repo as `DECISIONS.md`; new decisions get appended, never rewritten.

**D1. Name: Dead HTML Tag Society.**
*Considered:* Brine Ring, Insert Coin, Attract Mode, The Blink Ring, The 56k Ring, Under Construction Ring, neon variants.
*Why:* DHTS is a concept strangers want to join — the Dead Poets riff gives warmth and the theme generates copy, badges, and the patron-tag mechanic for free. Brine Ring was uniquely Josh's but less legible to outsiders, and stays reserved for the agent-fleet domain. Neon/arcade names are crowded space among existing rings.

**D2. Member integration: plain HTML links only. No JS widget in v1.**
*Considered:* (a) onionring.js-style widget, (b) hybrid links + optional widget (was the v1 doc's answer), (c) frozen `widget-v1.js` with SRI pinning.
*Why:* A widget means every member executes code served from this repo on every page load — a repo/account/deploy compromise becomes attacker JS (e.g. cryptojacking) on all member sites at once, plus a widget-rendering XSS surface from ring data. SRI mitigates tampering but breaks silently on every legitimate update and can't cover runtime-fetched `ring.json`. Plain links have none of these properties, are more old-school-authentic, and delete two whole security sections. *Revisit trigger:* members actually asking — then only as frozen, versioned, SRI-pinned `widget-v1.js` (§9.5, §12).

**D3. Hosting: GitHub Pages + Actions, fully static.**
*Considered:* Cloudflare Worker (`/next?from=`), any dynamic backend.
*Why:* Zero cost, zero servers, and a Worker is more infra than a ring needs. Static means the attack surface is the repo, nothing else.

**D4. Redirect mechanism: build-time meta-refresh pages per member.**
*Considered:* client-side JS resolution (onionring model), edge redirects.
*Why:* Works with JS disabled, visible-link fallback, `noindex` keeps stubs out of search, and the ring re-wires itself on every merge without members touching their sites — the one genuinely nice property of the onionring model, kept without its JS.

**D5. Membership = PR to `ring.json`. The ring is a repo.**
*Considered:* form/email intake (common in Neocities rings).
*Why:* Open source, self-serve, auditable history, and CI can validate before a human ever looks. Ordering = array order, append-only, wrap at ends — deterministic and diff-friendly.

**D6. Random lives on the hub with ~5 lines of inline JS; `?from=` filters only.**
*Considered:* build-time rotation (no JS at all), no random.
*Why:* True randomness needs JS somewhere; confining it to the hub keeps member sites at zero JS. `?from` never becomes a redirect target → no open-redirect. `<noscript>` degrades to the member list. Random excludes the current site because bouncing back to yourself is a bad hop.

**D7. Domain: `ring.pickles.dev`.**
*Considered:* neutral new domain, bare github.io.
*Why:* Free (existing domain + DNS CNAME), memorable, no new renewal to babysit. A neutral domain can come later without breaking anything except embedded links (acceptable at current scale).

**D8. Co-admins from day one (technicalpickles + noizwaves).**
*Why:* Bus factor on a two-person ring, and it signals community project rather than personal fiefdom.

**D9. Patron tag: required membership field, curated `dead-tags.json`, duplicates only once all tags are claimed.**
*Why:* It's the theme made mechanical; curation keeps it to genuinely dead tags; the unclaimed-tag list doubles as recruitment bait.

**D10. Badges: member-supplied PNG/GIF only, 88×31, ≤100 KB, CI re-encodes; no member SVG.**
*Why:* SVG can carry script; re-encoding strips metadata and defeats polyglot files. Build-generated default badges may be SVG because they're first-party.

**D11. CI security posture: changed-file allowlist for non-maintainer PRs; base-branch code runs against PR data; `pull_request` trigger only; SHA-pinned actions; least-privilege `permissions:`; CODEOWNERS + branch protection.**
*Why:* Directly closes the "PR edits the workflow and mines bitcoin in my Actions" attack, and its data-only-contributions principle is what makes stranger PRs safe at all.

**D12. Rendering rule: every member string is build-time escaped through one tested helper; schema charsets as second layer.**
*Why:* Defense in depth against injection via ring data, and it's the precondition D2's revisit path depends on.

**D13. Tooling: Node 22+/npm/`tsx`/vitest, CI-only deps (`ajv`, image lib), zero runtime deps in output. License: MIT.**
*Why:* Low contributor friction (npm over pnpm), boring and durable. MIT is clean because the widget was cut and nothing is vendored from onionring.js (which is CNPL).

**D14. Link-checker: weekly, string-match for `ring.pickles.dev`, 7-day grace for new members, opens/auto-closes issues, removal stays human.**
*Why:* Grace period solves the join-time chicken-and-egg (can't link to redirects that don't exist yet); auto-removal is too hostile for a cozy ring.

