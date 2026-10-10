import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const t = req.nextauth.token;
    const p = req.nextUrl.pathname;
    // Mot de passe provisoire : rien d'autre n'est accessible avant d'en choisir un.
    if (t?.doitChangerMdp && !p.startsWith("/changer-mot-de-passe") && !p.startsWith("/api/compte")) {
      if (p.startsWith("/api/")) return NextResponse.json({ message: "Choisis d'abord ton mot de passe." }, { status: 403 });
      return NextResponse.redirect(new URL("/changer-mot-de-passe", req.url));
    }
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        if (!token?.id) return false;
        if (req.nextUrl.pathname.startsWith("/admin") || req.nextUrl.pathname.startsWith("/api/admin")) return token.role === "ADMIN";
        return true;
      },
    },
  },
);

export const config = {
  matcher: ["/admin/:path*", "/vendeur/:path*", "/changer-mot-de-passe", "/api/scan/:path*", "/api/ventes/:path*", "/api/articles/:path*", "/api/compte/:path*", "/api/admin/:path*"],
};
