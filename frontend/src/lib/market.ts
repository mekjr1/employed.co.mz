import type { MarketConfig, MarketKey } from "@/lib/types";

export const MARKETS = {
  mx: {
    key: "mx",
    country: "Mexico",
    locale: "es-MX",
    siteName: "Employed MX",
    tagline: "Local jobs. Local hiring.",
    host: "mx.employed.co.mz",
    featuredJob: { amount: 99900, currency: "mxn", label: "MX$999" },
    paymentProviders: ["stripe"]
  },
  mz: {
    key: "mz",
    country: "Mozambique",
    locale: "pt-MZ",
    siteName: "Employed MZ",
    tagline: "Local jobs. Local hiring.",
    host: "mz.employed.co.mz",
    featuredJob: { amount: 250000, currency: "mzn", label: "MZN 2,500" },
    paymentProviders: ["mpesa", "emola", "stripe"]
  }
} satisfies Record<MarketKey, MarketConfig>;

export const DEFAULT_MARKET_KEY: MarketKey = "mz";

export function resolveMarketFromHostname(hostname?: string | null): MarketConfig {
  const host = (hostname ?? "").toLowerCase();
  const label = host.split(".")[0] as MarketKey;
  return MARKETS[label] ?? MARKETS[DEFAULT_MARKET_KEY];
}

export function resolveMarketFromHeaders(headersLike: Headers | { get(name: string): string | null }): MarketConfig {
  const host =
    headersLike.get("x-forwarded-host") ??
    headersLike.get("host") ??
    headersLike.get("x-original-host") ??
    undefined;

  return resolveMarketFromHostname(host);
}

export function buildMarketHostname(target: MarketKey, currentHostname: string): string {
  const lower = currentHostname.toLowerCase();

  if (lower.includes("lvh.me") || lower === "localhost") {
    return `${target}.lvh.me`;
  }

  const parts = lower.split(".");
  if (parts[0] in MARKETS) {
    parts[0] = target;
    return parts.join(".");
  }

  return MARKETS[target].host;
}
