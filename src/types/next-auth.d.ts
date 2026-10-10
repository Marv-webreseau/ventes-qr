import "next-auth";
import "next-auth/jwt";
type Role = "ADMIN" | "VENDEUR";
declare module "next-auth" {
  interface User { role: Role; magasinId: string; sessionVersion: number; doitChangerMdp: boolean }
  interface Session { user: { id: string; role: Role; magasinId: string; name?: string | null } }
}
declare module "next-auth/jwt" {
  interface JWT { id: string; role: Role; magasinId: string; sv: number; doitChangerMdp: boolean }
}
