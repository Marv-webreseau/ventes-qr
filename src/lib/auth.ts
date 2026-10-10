import type { NextAuthOptions } from "next-auth";
import type { JWT } from "next-auth/jwt";
import Credentials from "next-auth/providers/credentials";
import { db } from "./db";
import { verifierConnexion } from "@/services/comptes.service";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt", maxAge: 60 * 60 * 12 },
  pages: { signIn: "/connexion" },
  providers: [
    Credentials({
      credentials: { identifiant: {}, motDePasse: {} },
      async authorize(c) {
        if (!c?.identifiant || !c.motDePasse) return null;
        const u = await verifierConnexion(c.identifiant, c.motDePasse); // lève "VERROUILLE" après trop d'échecs
        if (!u) return null;
        return { id: u.id, name: u.nom, role: u.role, magasinId: u.magasinId, sessionVersion: u.sessionVersion, doitChangerMdp: u.doitChangerMdp };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        return { ...token, id: user.id, role: user.role, magasinId: user.magasinId, sv: user.sessionVersion, doitChangerMdp: user.doitChangerMdp };
      }
      if (!token.id) return token;
      // À chaque lecture de session : compte supprimé, désactivé ou session fermée (changement/réinitialisation) => plus d'accès.
      const u = await db.user.findUnique({ where: { id: token.id }, select: { actif: true, role: true, sessionVersion: true, doitChangerMdp: true } });
      if (!u || !u.actif || u.sessionVersion !== token.sv) return {} as JWT;
      return { ...token, role: u.role, doitChangerMdp: u.doitChangerMdp };
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.magasinId = token.magasinId;
      }
      return session;
    },
  },
};
