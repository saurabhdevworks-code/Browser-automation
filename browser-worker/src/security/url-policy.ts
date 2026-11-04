import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

const blockedHosts = new Set(["localhost", "metadata.google.internal"]);
function isPrivateV4(ip: string): boolean {
  const p = ip.split(".").map(Number);
  return p[0] === 10 || p[0] === 127 || p[0] === 0 ||
    (p[0] === 169 && p[1] === 254) || (p[0] === 172 && p[1] >= 16 && p[1] <= 31) ||
    (p[0] === 192 && p[1] === 168) || p[0] >= 224;
}
function isPrivateV6(ip: string): boolean {
  const s = ip.toLowerCase();
  return s === "::1" || s === "::" || s.startsWith("fc") || s.startsWith("fd") || s.startsWith("fe80:");
}
export async function assertSafeHttpUrl(raw: string): Promise<URL> {
  const url = new URL(raw);
  if (!["http:", "https:"].includes(url.protocol)) throw new Error("Only HTTP and HTTPS URLs are allowed");
  if (url.username || url.password) throw new Error("URLs must not contain embedded credentials");
  const host = url.hostname.toLowerCase();
  if (blockedHosts.has(host) || host.endsWith(".localhost") || host.endsWith(".local")) throw new Error("Local destinations are blocked");
  if (isIP(host)) {
    if ((isIP(host) === 4 && isPrivateV4(host)) || (isIP(host) === 6 && isPrivateV6(host))) throw new Error("Private network destinations are blocked");
  } else {
    const records = await lookup(host, { all: true, verbatim: true });
    if (!records.length || records.some(r => (isIP(r.address) === 4 && isPrivateV4(r.address)) || (isIP(r.address) === 6 && isPrivateV6(r.address))))
      throw new Error("Host resolves to a blocked or mixed private address range");
  }
  return url;
}
