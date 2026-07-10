import type { Member } from "./types.js";

export interface NeighborPair {
  member: Member;
  prev: Member;
  next: Member;
}

/** Ring order = array order; new members append; wraps at the ends. */
export function neighbors(members: Member[]): NeighborPair[] {
  const n = members.length;
  return members.map((member, i) => ({
    member,
    prev: members[(i - 1 + n) % n]!,
    next: members[(i + 1) % n]!,
  }));
}
