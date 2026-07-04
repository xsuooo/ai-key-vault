import dns from "node:dns/promises";
import net from "node:net";

type ResolveAddresses = (hostname: string) => Promise<string[]>;

export type PublicOpenAIBaseUrlOptions = {
  allowPrivateNetwork?: boolean;
  allowedHosts?: string[];
  resolveAddresses?: ResolveAddresses;
};

export type PublicOpenAIBaseUrlResolution = {
  url: string;
  pinnedAddresses?: string[];
};

const DEFAULT_ALLOWED_HOSTS = (process.env.OPENAI_PROXY_ALLOWED_HOSTS || "")
  .split(",")
  .map((item) => item.trim().toLowerCase())
  .filter(Boolean);

function shouldAllowPrivateNetwork(): boolean {
  if (process.env.OPENAI_PROXY_ALLOW_PRIVATE === "1") return true;
  return process.env.NODE_ENV !== "production";
}

function parseIPv4(address: string): number[] | null {
  if (net.isIP(address) !== 4) return null;
  const parts = address.split(".").map((part) => Number.parseInt(part, 10));
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
    return null;
  }
  return parts;
}

function isBlockedIPv4(address: string): boolean {
  const parts = parseIPv4(address);
  if (!parts) return false;
  const [a, b] = parts;

  if (a === 0) return true;
  if (a === 10) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  if (a === 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 198 && (b === 18 || b === 19)) return true;
  if (a >= 224) return true;
  return false;
}

function isBlockedIPv6(address: string): boolean {
  if (net.isIP(address) !== 6) return false;
  const normalized = address.toLowerCase();

  if (normalized === "::" || normalized === "::1") return true;
  if (normalized.startsWith("fc") || normalized.startsWith("fd")) return true;
  if (normalized.startsWith("fe80:")) return true;
  if (normalized.startsWith("ff")) return true;

  const mappedIPv4 = normalized.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mappedIPv4?.[1]) return isBlockedIPv4(mappedIPv4[1]);

  return false;
}

export function isBlockedNetworkAddress(address: string): boolean {
  return isBlockedIPv4(address) || isBlockedIPv6(address);
}

function hostMatchesAllowedList(hostname: string, allowedHosts: string[]): boolean {
  const normalizedHost = hostname.toLowerCase();
  return allowedHosts.some((entry) => {
    const normalizedEntry = entry.toLowerCase();
    if (normalizedEntry === normalizedHost) return true;
    if (normalizedEntry.startsWith("*.")) {
      const suffix = normalizedEntry.slice(1);
      return normalizedHost.endsWith(suffix);
    }
    return false;
  });
}

async function defaultResolveAddresses(hostname: string): Promise<string[]> {
  const literalIpVersion = net.isIP(hostname);
  if (literalIpVersion) return [hostname];

  const results = await dns.lookup(hostname, { all: true, verbatim: false });
  return results.map((item) => item.address);
}

export async function resolvePublicOpenAIBaseUrl(
  rawUrl: string,
  options: PublicOpenAIBaseUrlOptions = {},
): Promise<PublicOpenAIBaseUrlResolution> {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error("Base URL 不是合法 URL");
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new Error("Base URL 只支持 HTTP/HTTPS");
  }

  const allowedHosts = options.allowedHosts ?? DEFAULT_ALLOWED_HOSTS;
  const hostAllowed = hostMatchesAllowedList(parsed.hostname, allowedHosts);
  const allowPrivateNetwork = options.allowPrivateNetwork ?? shouldAllowPrivateNetwork();

  if (parsed.protocol !== "https:" && !allowPrivateNetwork && !hostAllowed) {
    throw new Error("生产环境 Base URL 必须使用 HTTPS，或显式加入 OPENAI_PROXY_ALLOWED_HOSTS");
  }

  if (hostAllowed || allowPrivateNetwork) {
    return { url: rawUrl };
  }

  const resolveAddresses = options.resolveAddresses ?? defaultResolveAddresses;
  const addresses = await resolveAddresses(parsed.hostname);
  if (addresses.length === 0) {
    throw new Error("Base URL 域名未解析到可用地址");
  }

  const blockedAddress = addresses.find(isBlockedNetworkAddress);
  if (blockedAddress) {
    throw new Error(`Base URL 解析到 private/internal/reserved 地址：${blockedAddress}`);
  }

  return { url: rawUrl, pinnedAddresses: addresses };
}

export async function assertPublicOpenAIBaseUrl(
  rawUrl: string,
  options: PublicOpenAIBaseUrlOptions = {},
): Promise<string> {
  return (await resolvePublicOpenAIBaseUrl(rawUrl, options)).url;
}
