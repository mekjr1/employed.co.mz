import type { NextConfig } from "next";

const SELF = "'self'";
const UNSAFE_INLINE = "'unsafe-inline'";
const NONE = "'none'";

const contentSecurityPolicy = [
  `default-src ${SELF}`,
  // Scripts: self + inline (required for Next.js hydration) + analytics placeholder
  `script-src ${SELF} ${UNSAFE_INLINE} https://www.google.com https://www.gstatic.com`,
  // Styles: self + inline (Tailwind CSS-in-JS) 
  `style-src ${SELF} ${UNSAFE_INLINE}`,
  // Images: self + data URIs + remote patterns
  `img-src ${SELF} data: https:`,
  // Fonts: self
  `font-src ${SELF}`,
  // Connect: self + backend API + Sentry
  `connect-src ${SELF} ${process.env.NEXT_PUBLIC_API_URL ?? ""} https://sentry.io https://*.sentry.io`,
  // Frames: only Google reCAPTCHA
  `frame-src https://www.google.com https://recaptcha.google.com`,
  // Object/embed: none
  `object-src ${NONE}`,
  // Base URI: self only
  `base-uri ${SELF}`,
  // Form actions: self only
  `form-action ${SELF}`,
].join("; ");

const securityHeaders = [
  {
    key: "X-DNS-Prefetch-Control",
    value: "on",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  {
    key: "Content-Security-Policy",
    value: contentSecurityPolicy,
  },
];

const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    remotePatterns: []
  },
  async headers() {
    return [
      {
        // Apply to all routes
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
