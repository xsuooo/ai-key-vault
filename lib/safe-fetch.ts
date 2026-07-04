import net from "node:net";
import { Agent, type Dispatcher } from "undici";

import {
  resolvePublicOpenAIBaseUrl,
  type PublicOpenAIBaseUrlOptions,
} from "./server-url-guard.ts";
import { fetchWithTimeout, getErrorMessage } from "./utils.ts";

export type SafeOpenAIBaseUrl = {
  url: string;
  dispatcher?: Dispatcher;
};

type LookupCallback = (error: Error | null, address: string, family: 4 | 6) => void;

const pinnedAgents = new Map<string, Agent>();

function createPinnedAgent(url: string, addresses: string[]): Agent | undefined {
  if (addresses.length === 0) return undefined;

  const parsed = new URL(url);
  const key = `${parsed.protocol}//${parsed.host}|${addresses.join(",")}`;
  const cached = pinnedAgents.get(key);
  if (cached) return cached;

  let nextAddressIndex = 0;
  const agent = new Agent({
    connect: {
      lookup(_hostname: string, _options: unknown, callback: LookupCallback) {
        const address = addresses[nextAddressIndex % addresses.length];
        nextAddressIndex += 1;
        const family = net.isIP(address);
        if (family !== 4 && family !== 6) {
          callback(new Error(`Invalid pinned address: ${address}`), address, 4);
          return;
        }
        callback(null, address, family);
      },
    },
  });

  pinnedAgents.set(key, agent);
  return agent;
}

function withDispatcher(init: RequestInit, dispatcher?: Dispatcher): RequestInit {
  if (!dispatcher) return init;
  return { ...init, dispatcher } as RequestInit;
}

export async function resolveSafeOpenAIBaseUrl(
  rawUrl: string,
  options: PublicOpenAIBaseUrlOptions = {},
): Promise<SafeOpenAIBaseUrl> {
  const resolution = await resolvePublicOpenAIBaseUrl(rawUrl, options);
  return {
    url: resolution.url,
    dispatcher: createPinnedAgent(resolution.url, resolution.pinnedAddresses || []),
  };
}

export async function fetchSafeOpenAIWithTimeout(
  baseUrl: SafeOpenAIBaseUrl,
  pathname: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const endpoint = `${baseUrl.url}${pathname.startsWith("/") ? pathname : `/${pathname}`}`;
  return fetchWithTimeout(endpoint, withDispatcher(init, baseUrl.dispatcher), timeoutMs);
}

export async function fetchSafeOpenAIJsonWithTimeout(
  baseUrl: SafeOpenAIBaseUrl,
  pathname: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<unknown> {
  const response = await fetchSafeOpenAIWithTimeout(baseUrl, pathname, init, timeoutMs);
  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }
  if (!response.ok) {
    throw { status: response.status, message: getErrorMessage(payload) || `HTTP ${response.status}` };
  }
  return payload;
}
