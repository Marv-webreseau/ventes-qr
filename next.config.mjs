const prod = process.env.NODE_ENV === "production";

// Politique de contenu : tout vient de notre propre domaine. Interrupteur de secours : DESACTIVER_CSP=1.
const csp = [
  "default-src 'self'", "base-uri 'self'", "form-action 'self'", "frame-ancestors 'none'", "object-src 'none'",
  "img-src 'self' data: blob:", "font-src 'self' data:", "style-src 'self' 'unsafe-inline'",
  "script-src 'self' 'unsafe-inline'", "connect-src 'self'", "worker-src 'self' blob:", "manifest-src 'self'", "media-src 'self' blob:",
].join("; ");

const securite = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=(), payment=()" },
  ...(prod ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" }] : []),
  ...(prod && !process.env.DESACTIVER_CSP ? [{ key: "Content-Security-Policy", value: csp }] : []),
];

export default {
  poweredByHeader: false,
  async headers() {
    return [
      { source: "/(.*)", headers: securite },
      { source: "/sw.js", headers: [{ key: "Cache-Control", value: "no-cache" }] },
    ];
  },
};
