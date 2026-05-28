import { getRequestConfig } from "next-intl/server";
import { headers } from "next/headers";

/**
 * Resolve the UI locale from the request hostname:
 *   mz.* → pt   (Mozambique market, Portuguese)
 *   mx.* → es   (Mexico market, Spanish)
 *   default → pt
 *
 * Uses the same hostname-based market detection as lib/market.ts so there
 * is a single source of truth.
 */
function localeFromHost(host: string): "en" | "pt" | "es" {
  const subdomain = host.split(".")[0].toLowerCase();
  if (subdomain === "mx") return "es";
  return "pt";
}

export default getRequestConfig(async () => {
  const requestHeaders = await headers();
  const host =
    requestHeaders.get("x-forwarded-host") ??
    requestHeaders.get("host") ??
    "";
  const locale = localeFromHost(host);

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
