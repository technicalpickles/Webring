# Dead HTML Tag Society

A webring for personal sites, in loving memory of `<blink>`.

**Live at:** [ring.pickles.dev](https://ring.pickles.dev)
**Maintainers:** [@technicalpickles](https://github.com/technicalpickles) ·
[@noizwaves](https://github.com/noizwaves)

## What is this

An old-school webring. Members link to a "next" and "previous" neighbor
plus the hub, using four plain `<a>` tags — no JavaScript, no tracking, no
runtime dependency on this repo. Joining is a pull request: fork, add
yourself to [`ring.json`](./ring.json), open a PR.

See [`JOINING.md`](./JOINING.md) to join, [`DESIGN.md`](./DESIGN.md) for
the full design doc, and [`DECISIONS.md`](./DECISIONS.md) for the
decision log and rationale history.

## How it works

`ring.json` is the source of truth. A GitHub Actions build reads it and
generates a fully static site:

```
ring.json ──(build)──► dist/
                        ├── index.html         home + directory + join snippet
                        ├── 404.html
                        ├── badges/*.png|gif|svg
                        ├── random/index.html  random-site hop (the only JS in the project)
                        └── {slug}/
                            ├── next/index.html
                            └── prev/index.html
```

Membership changes regenerate every redirect page, so the ring re-wires
itself on every merge — members never touch their own site again after
adding the snippet once.

## Local development

Requires Node 22+.

```sh
npm install
npm run build      # ring.json + templates → dist/
npm run dev        # build + serve dist/ locally
npm test           # vitest
npm run validate   # schema/charset/tag/badge/reachability checks (what CI runs on PRs)
```

## Repo layout

```
webring/
├── ring.json               # source of truth: ring name + members
├── ring.schema.json        # JSON Schema for ring.json
├── dead-tags.json          # curated list of adoptable patron tags
├── badges/                 # member-supplied 88×31 PNG/GIF badges
├── src/
│   ├── build.ts            # ring.json + templates → dist/
│   ├── validate.ts         # PR validation (schema, charset, tags, badges, reachability)
│   ├── check-links.ts      # weekly dead-link checker
│   ├── allowlist.ts        # changed-file allowlist for non-maintainer PRs
│   ├── badges.ts           # default badge + hub badge generation
│   ├── escape.ts           # the one HTML-escape helper
│   └── templates/          # index, redirect, random, 404, layout, snippet
├── dist/                   # gitignored, built in CI
├── .github/
│   ├── CODEOWNERS
│   └── workflows/          # deploy.yml, validate.yml, linkcheck.yml
├── JOINING.md
├── DESIGN.md
├── DECISIONS.md
└── CNAME
```

## One-time repo settings (not expressible in code)

These need to be set once in GitHub's Settings UI and aren't tracked by
this repo:

- **Branch protection on `main`**: require PR review, require the
  `validate` status check, require review from Code Owners.
- **Actions → General**: require approval for first-time contributors'
  workflow runs; set workflow default permissions to read-only.
- **Pages**: source = GitHub Actions; custom domain `ring.pickles.dev`
  with HTTPS enforced (the `CNAME` file in `dist/` sets the domain, but
  DNS + the HTTPS toggle are configured here).
- **2FA/passkeys required** for both maintainer accounts.
- Resolve the Action version tags in the workflows under
  `.github/workflows/` to full commit SHAs — see D15 in
  [`DECISIONS.md`](./DECISIONS.md) for why they currently aren't.

## Security model

Untrusted contributions (member PRs) can only ever be *data* —
`ring.json` and `badges/` — never code. See [`DECISIONS.md`](./DECISIONS.md)
for the full threat model and the CI controls that enforce it
(changed-file allowlist, `pull_request`-only trigger with base-branch
code run against PR data, CODEOWNERS, least-privilege workflow
permissions).

## License

MIT — see [`LICENSE`](./LICENSE).
