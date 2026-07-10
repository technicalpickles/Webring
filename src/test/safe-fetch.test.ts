import { describe, expect, it } from "vitest";
import { isDisallowedIp } from "../safe-fetch.js";

describe("isDisallowedIp", () => {
  it("blocks loopback", () => {
    expect(isDisallowedIp("127.0.0.1")).toBe(true);
    expect(isDisallowedIp("::1")).toBe(true);
  });

  it("blocks the cloud metadata address", () => {
    expect(isDisallowedIp("169.254.169.254")).toBe(true);
  });

  it("blocks RFC1918 private ranges", () => {
    expect(isDisallowedIp("10.0.0.5")).toBe(true);
    expect(isDisallowedIp("172.16.0.1")).toBe(true);
    expect(isDisallowedIp("172.31.255.255")).toBe(true);
    expect(isDisallowedIp("192.168.1.1")).toBe(true);
  });

  it("does not block adjacent-but-public 172.x addresses", () => {
    expect(isDisallowedIp("172.15.255.255")).toBe(false);
    expect(isDisallowedIp("172.32.0.1")).toBe(false);
  });

  it("blocks CGNAT range", () => {
    expect(isDisallowedIp("100.64.0.1")).toBe(true);
    expect(isDisallowedIp("100.100.0.1")).toBe(true);
  });

  it("blocks multicast and reserved", () => {
    expect(isDisallowedIp("224.0.0.1")).toBe(true);
    expect(isDisallowedIp("255.255.255.255")).toBe(true);
  });

  it("blocks IPv6 link-local and unique-local", () => {
    expect(isDisallowedIp("fe80::1")).toBe(true);
    expect(isDisallowedIp("fc00::1")).toBe(true);
    expect(isDisallowedIp("fd12:3456::1")).toBe(true);
  });

  it("blocks an IPv4-mapped IPv6 private address", () => {
    expect(isDisallowedIp("::ffff:127.0.0.1")).toBe(true);
    expect(isDisallowedIp("::ffff:10.0.0.1")).toBe(true);
  });

  it("allows ordinary public addresses", () => {
    expect(isDisallowedIp("8.8.8.8")).toBe(false);
    expect(isDisallowedIp("1.1.1.1")).toBe(false);
    expect(isDisallowedIp("2606:4700:4700::1111")).toBe(false);
  });
});
