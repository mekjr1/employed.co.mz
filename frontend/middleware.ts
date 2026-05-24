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

  return NextResponse.next();
}

export const config = {
  matcher: ["/myjobs", "/account", "/admin/:path*", "/jobs/:path*/edit"],
};
