import type { Member } from "./types.js";

export interface NeighborPair {
  member: Member;
  prev: Member;
  next: Member;
}

/**
 * Ring order with one file per member (see members.ts) has no shared array
 * to append to, so it's derived instead of stored: sort by `joined` date,
 * then `slug` as a tiebreaker for same-day joins. Deterministic, and no
 * file every join PR must touch — the thing that caused merge conflicts
 * when membership lived in a single array in ring.json (see DECISIONS.md).
 */
export function sortMembers(members: Member[]): Member[] {
  return [...members].sort((a, b) => {
    if (a.joined !== b.joined) return a.joined < b.joined ? -1 : 1;
    return a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0;
  });
}

/** Ring order = array order (see sortMembers for how that order is derived); wraps at the ends. */
export function neighbors(members: Member[]): NeighborPair[] {
  const n = members.length;
  return members.map((member, i) => ({
    member,
    prev: members[(i - 1 + n) % n]!,
    next: members[(i + 1) % n]!,
  }));
}
