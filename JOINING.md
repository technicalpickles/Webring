# Joining the Dead HTML Tag Society

Welcome. This is a webring — a ring of personal sites that link to each
other's "next" and "previous" neighbor, plus a hub. Joining is a pull
request, not a form.

## Who can join

- **Personal or indie sites.** A blog, a homepage, a digital garden, a
  portfolio — something a person made and maintains, not a company page.
- **No commercial sites, ad farms, malware, or hate.** If your site exists
  primarily to sell something, serve ads, or harm people, this isn't the
  ring for you.
- **Be kind.** To other members, to visitors who hop through the ring, and
  to the admins reviewing your PR.
- Admins ([@technicalpickles](https://github.com/technicalpickles) and
  [@noizwaves](https://github.com/noizwaves)) may remove any member at
  their discretion, with or without notice, for violating the above.

## What you need

1. Your site must be reachable over `https://`.
2. A place on your homepage (or reachable from it) for four small links —
   see [step 3](#3-add-the-snippet-to-your-site) below. No JavaScript
   required, ever.

## How to join

### 1. Fork this repo

### 2. Add yourself to `ring.json`

Append an entry to the `members` array:

```json
{
  "slug": "yourname",
  "name": "yoursite.example",
  "url": "https://yoursite.example",
  "owner": "your-github-username",
  "tag": "marquee",
  "joined": "2026-07-10"
}
```

- `slug`: lowercase letters, numbers, hyphens only. Used in your redirect
  URLs (`ring.pickles.dev/{slug}/next/`).
- `name`: how your site is displayed in the directory.
- `url`: your homepage, `https://` only.
- `owner`: your name or handle.
- `tag`: pick an unclaimed **patron tag** from
  [`dead-tags.json`](./dead-tags.json) — the directory on the homepage
  lists which ones are still up for grabs. Duplicates are only allowed
  once every tag has been claimed at least once.
- `badge` (optional): see below.
- `rss` (optional): your feed URL, `https://` only.
- `joined`: today's date, `YYYY-MM-DD`.

Membership PRs from non-maintainers may only touch `ring.json` and files
under `badges/` — anything else will fail CI automatically.

### 3. Add the snippet to your site

Once merged, your redirect pages exist at
`ring.pickles.dev/{your-slug}/next/` and `.../prev/`. Add something like
this to your homepage:

```html
<p class="dhts">
  <a href="https://ring.pickles.dev/yourname/prev/" aria-label="previous site in the Dead HTML Tag Society">←</a>
  <a href="https://ring.pickles.dev/">Dead HTML Tag Society</a>
  <a href="https://ring.pickles.dev/random/?from=yourname" aria-label="random site in the ring">🎲</a>
  <a href="https://ring.pickles.dev/yourname/next/" aria-label="next site in the Dead HTML Tag Society">→</a>
</p>
```

Restyle or reword it however you like — the only requirement is working
prev/next links plus a link to the hub, reachable from your homepage. The
directory on the hub renders your personalized copy of this snippet for
you, with your slug already filled in.

### 4. Add a badge (optional)

An 88×31 pixel PNG or GIF, ≤100 KB, at `badges/{your-slug}.png` (or
`.gif`). No SVG — SVG can carry executable content, so it's not accepted
from members. CI re-encodes every submitted badge to strip metadata
before it's ever served. If you skip this, the site generates a default
badge with your name on it.

### 5. Open a pull request

CI checks:
- `ring.json` still matches the schema, your slug is unique, your tag is
  valid.
- Your site returns `200` over `https://`.
- Your badge (if any) is a valid 88×31 PNG/GIF under 100 KB.
- (Non-blocking) whether your homepage already links back to the ring —
  it usually won't yet, since your redirect pages don't exist until this
  PR merges. That's expected.

A human (either admin) reviews and merges. Once merged, the whole ring
rebuilds and re-wires itself automatically — you don't need to touch
anything else.

## Leaving

Open a PR removing your entry from `ring.json`. If something urgent comes
up, ping an admin for an emergency removal (a one-commit revert).
