import { describe, expect, it } from "vitest";
import { checkChangedFiles, isAllowedChange } from "../allowlist.js";

describe("isAllowedChange", () => {
  it("allows ring.json", () => {
    expect(isAllowedChange("ring.json")).toBe(true);
  });

  it("allows files under badges/", () => {
    expect(isAllowedChange("badges/pickles.png")).toBe(true);
    expect(isAllowedChange("badges/nested/whatever.png")).toBe(true);
  });

  it("disallows src/ files", () => {
    expect(isAllowedChange("src/build.ts")).toBe(false);
  });

  it("disallows workflow files", () => {
    expect(isAllowedChange(".github/workflows/deploy.yml")).toBe(false);
  });

  it("disallows dead-tags.json and the schema", () => {
    expect(isAllowedChange("dead-tags.json")).toBe(false);
    expect(isAllowedChange("ring.schema.json")).toBe(false);
  });

  it("disallows a path that merely starts with 'badges' but isn't the directory", () => {
    expect(isAllowedChange("badges.json")).toBe(false);
  });
});

describe("checkChangedFiles", () => {
  it("allows a PR that only touches ring.json and badges/", () => {
    const result = checkChangedFiles(["ring.json", "badges/pickles.png"]);
    expect(result.allowed).toBe(true);
    expect(result.disallowedFiles).toEqual([]);
  });

  it("blocks a PR that touches anything else", () => {
    const result = checkChangedFiles(["ring.json", "src/build.ts", ".github/workflows/deploy.yml"]);
    expect(result.allowed).toBe(false);
    expect(result.disallowedFiles).toEqual(["src/build.ts", ".github/workflows/deploy.yml"]);
  });

  it("allows an empty change set", () => {
    const result = checkChangedFiles([]);
    expect(result.allowed).toBe(true);
  });
});
