import { afterEach, describe, expect, it, vi } from "vitest";
import { lookup } from "node:dns/promises";
import { assertPublicIp, resolveRedirectTarget, SsrfError, validateAndResolve } from "./ssrf-guard";

vi.mock("node:dns/promises", () => ({ lookup: vi.fn() }));
const mockedLookup = vi.mocked(lookup);

function resolvesTo(...ips: string[]) {
  mockedLookup.mockResolvedValue(ips.map((address) => ({ address, family: address.includes(":") ? 6 : 4 })));
}

afterEach(() => mockedLookup.mockReset());

describe("assertPublicIp", () => {
  const blocked = [
    "127.0.0.1", "10.0.0.5", "192.168.1.1", "172.16.0.1", "172.31.255.255",
    "169.254.169.254", "100.64.0.1", "0.0.0.0", "255.255.255.255",
    "::1", "::ffff:127.0.0.1", "::ffff:169.254.169.254", "fe80::1", "fc00::1", "fd00:ec2::254",
  ];
  const allowed = ["8.8.8.8", "1.1.1.1", "93.184.216.34", "2606:2800:220:1:248:1893:25c8:1946"];

  it.each(blocked)("blocks internal/reserved %s", (ip) => {
    expect(() => assertPublicIp(ip)).toThrow(SsrfError);
  });
  it.each(allowed)("allows public %s", (ip) => {
    expect(() => assertPublicIp(ip)).not.toThrow();
  });
});

describe("validateAndResolve — regression tests for the original bypasses", () => {
  it("blocks a public hostname that resolves to loopback (DNS-based SSRF)", async () => {
    resolvesTo("127.0.0.1");
    await expect(validateAndResolve("https://spoofed.example.com/")).rejects.toThrow(SsrfError);
  });

  it("blocks a public hostname that resolves to the cloud metadata IP", async () => {
    resolvesTo("169.254.169.254");
    await expect(validateAndResolve("https://innocent.example.com/")).rejects.toThrow(SsrfError);
  });

  it("blocks when any one of several DNS records is private (round-robin)", async () => {
    resolvesTo("93.184.216.34", "10.0.0.5");
    await expect(validateAndResolve("https://ha.example.com/")).rejects.toThrow(SsrfError);
  });

  it("blocks IPv4-mapped IPv6 loopback literal", async () => {
    await expect(validateAndResolve("https://[::ffff:127.0.0.1]/")).rejects.toThrow(SsrfError);
  });

  it("blocks decimal-encoded 127.0.0.1", async () => {
    await expect(validateAndResolve("https://2130706433/")).rejects.toThrow(SsrfError);
  });
});

describe("validateAndResolve — other hardening", () => {
  it("rejects http downgrade", async () => {
    await expect(validateAndResolve("http://example.com/")).rejects.toThrow(/https/i);
  });
  it("rejects embedded credentials", async () => {
    await expect(validateAndResolve("https://user:pass@example.com/")).rejects.toThrow(/credential/i);
  });
  it("allows a public hostname and pins its IP", async () => {
    resolvesTo("93.184.216.34");
    const r = await validateAndResolve("https://example.com/mcp");
    expect(r.pinnedIp).toBe("93.184.216.34");
  });
});

describe("resolveRedirectTarget", () => {
  it("resolves relative redirects against the base", () => {
    const out = resolveRedirectTarget("/v2/list", new URL("https://example.com/mcp"));
    expect(out).toBe("https://example.com/v2/list");
  });
});
