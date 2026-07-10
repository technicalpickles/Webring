import { mkdir, readFile, writeFile, copyFile, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import type { Member, Ring } from "./types.js";
import { neighbors } from "./ring-order.js";
import { renderIndex } from "./templates/index.js";
import { renderRedirect } from "./templates/redirect.js";
import { renderRandom } from "./templates/random.js";
import { render404 } from "./templates/404.js";
import { renderDefaultMemberBadgeSvg, renderHubBadgeSvg } from "./badges.js";
import { validateRing } from "./validate.js";

const ROOT = path.resolve(import.meta.dirname, "..");
const DIST = path.join(ROOT, "dist");

async function loadRing(): Promise<Ring> {
  const raw = await readFile(path.join(ROOT, "ring.json"), "utf-8");
  return JSON.parse(raw) as Ring;
}

async function loadDeadTags(): Promise<string[]> {
  const raw = await readFile(path.join(ROOT, "dead-tags.json"), "utf-8");
  return JSON.parse(raw) as string[];
}

function badgeExtension(badgePath: string): string {
  const ext = path.extname(badgePath).toLowerCase();
  if (ext !== ".png" && ext !== ".gif") {
    throw new Error(`Unsupported badge extension for ${badgePath}`);
  }
  return ext;
}

async function writeBadges(ring: Ring): Promise<Map<string, string>> {
  const badgeSrc = new Map<string, string>();
  await mkdir(path.join(DIST, "badges"), { recursive: true });

  for (const member of ring.members) {
    if (member.badge) {
      const ext = badgeExtension(member.badge);
      const sourcePath = path.join(ROOT, member.badge);
      const destName = `${member.slug}${ext}`;
      // Re-encode every submitted badge (strips metadata, defeats polyglot files) —
      // the deployed asset is never a byte-for-byte copy of what a PR submitted.
      const source = await readFile(sourcePath);
      const reencoded =
        ext === ".gif"
          ? await sharp(source).gif().toBuffer()
          : await sharp(source).png().toBuffer();
      await writeFile(path.join(DIST, "badges", destName), reencoded);
      badgeSrc.set(member.slug, `/badges/${destName}`);
    } else {
      const destName = `${member.slug}-default.svg`;
      const svg = renderDefaultMemberBadgeSvg(member.name);
      await writeFile(path.join(DIST, "badges", destName), svg, "utf-8");
      badgeSrc.set(member.slug, `/badges/${destName}`);
    }
  }

  const hubSvg = renderHubBadgeSvg();
  await writeFile(path.join(DIST, "badges", "dhts.svg"), hubSvg, "utf-8");
  const hubPng = await sharp(Buffer.from(hubSvg)).png().toBuffer();
  await writeFile(path.join(DIST, "badges", "dhts.png"), hubPng);

  return badgeSrc;
}

async function writeRedirects(ring: Ring): Promise<void> {
  for (const { member, prev, next } of neighbors(ring.members)) {
    const memberDir = path.join(DIST, member.slug);
    await mkdir(path.join(memberDir, "next"), { recursive: true });
    await mkdir(path.join(memberDir, "prev"), { recursive: true });
    await writeFile(
      path.join(memberDir, "next", "index.html"),
      renderRedirect(next.url, next.name),
      "utf-8",
    );
    await writeFile(
      path.join(memberDir, "prev", "index.html"),
      renderRedirect(prev.url, prev.name),
      "utf-8",
    );
  }
}

function unclaimedTags(ring: Ring, deadTags: string[]): string[] {
  const claimed = new Set(ring.members.map((m) => m.tag));
  return deadTags.filter((t) => !claimed.has(t));
}

async function build(): Promise<void> {
  await rm(DIST, { recursive: true, force: true });
  await mkdir(DIST, { recursive: true });

  const ring = await loadRing();
  const deadTags = await loadDeadTags();

  // Defense in depth: build.ts constructs filesystem paths directly from
  // member.slug/member.badge (dist/{slug}/next/, dist/badges/{slug}.png).
  // That's only safe when ring.json is already schema-valid — don't take
  // that on faith even though `npm run validate` normally runs first.
  const issues = await validateRing(ring);
  if (issues.length > 0) {
    console.error(`Refusing to build: ring.json failed validation (${issues.length} issue(s)):`);
    for (const issue of issues) console.error(`  - ${issue.message}`);
    process.exit(1);
  }

  const badgeSrc = await writeBadges(ring);
  const badgeSrcFor = (member: Member) => badgeSrc.get(member.slug) ?? "/badges/dhts.png";

  await writeFile(
    path.join(DIST, "index.html"),
    renderIndex(ring, badgeSrcFor, unclaimedTags(ring, deadTags)),
    "utf-8",
  );
  await writeFile(path.join(DIST, "404.html"), render404(ring.name), "utf-8");

  await mkdir(path.join(DIST, "random"), { recursive: true });
  await writeFile(path.join(DIST, "random", "index.html"), renderRandom(ring), "utf-8");

  await writeRedirects(ring);

  await copyFile(
    path.join(ROOT, "src", "templates", "style.css"),
    path.join(DIST, "style.css"),
  );

  if (existsSync(path.join(ROOT, "CNAME"))) {
    await copyFile(path.join(ROOT, "CNAME"), path.join(DIST, "CNAME"));
  }

  console.log(`Built ${ring.members.length} member(s) to ${path.relative(ROOT, DIST)}/`);
}

build().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
