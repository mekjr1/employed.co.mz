import { NextResponse, type NextRequest } from "next/server";

const SIGN_IN_PATH = "/sign-in";
const TOKEN_COOKIE = "employed_token";
const ADMIN_COOKIE = "employed_is_admin";

function createRedirect(request: NextRequest, destination: string) {
  const url = request.nextUrl.clone();
  url.pathname = destination;
  url.search = "";
  url.searchParams.set("redirect", `${request.nextUrl.pathname}${request.nextUrl.search}`);
  return NextResponse.redirect(url);
}

/** Map hostname subdomain to next-intl locale code */
function resolveLocale(hostname: string): string {
  const subdomain = hostname.split(".")[0].toLowerCase();
  if (subdomain === "mx") return "es";
  return "pt";
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(TOKEN_COOKIE)?.value;
  const isAdmin = request.cookies.get(ADMIN_COOKIE)?.value === "1";

  const requiresAuth = pathname === "/myjobs" || pathname === "/account" || /^\/jobs\/[^/]+\/edit$/.test(pathname);
  const requiresAdmin = pathname.startsWith("/admin");

  if (requiresAuth && !token) {
    return createRedirect(request, SIGN_IN_PATH);
  }

  if (requiresAdmin) {
    if (!token) {
      return createRedirect(request, SIGN_IN_PATH);
    }

    if (!isAdmin) {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  // Set X-NEXT-INTL-LOCALE so next-intl can read the locale server-side
  // without a path segment. This complements the hostname detection in
  // src/i18n/request.ts.
  const response = NextResponse.next();
  const hostname = request.headers.get("host") ?? request.nextUrl.hostname;
  response.headers.set("x-next-intl-locale", resolveLocale(hostname));
  return response;
}

export const config = {
  matcher: ["/myjobs", "/account", "/admin/:path*", "/jobs/:path*/edit", "/((?!_next|api|.*\\.).*)"],
};
