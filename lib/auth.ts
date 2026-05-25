import NextAuth, { type DefaultSession } from "next-auth";
import Google from "next-auth/providers/google";
import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import { parseCollegeEmail } from "@/lib/utils";
import { audit } from "@/lib/audit";

const ALLOWED_DOMAIN = (process.env.ALLOWED_EMAIL_DOMAIN ?? "nitsri.ac.in").toLowerCase();
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? "")
  .toLowerCase()
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "student" | "admin";
      branch?: string | null;
      batchYear?: number | null;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    uid?: string;
    role?: "student" | "admin";
    branch?: string | null;
    batchYear?: number | null;
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      authorization: { params: { prompt: "select_account" } },
    }),
  ],
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 7 },
  pages: { signIn: "/login", error: "/login" },
  callbacks: {
    async signIn({ user }) {
      const email = user.email?.toLowerCase();
      if (!email || !email.endsWith(`@${ALLOWED_DOMAIN}`)) return "/login?error=domain";

      const parsed = parseCollegeEmail(email);
      const isAdmin = ADMIN_EMAILS.includes(email);

      const existing = await db.query.users.findFirst({ where: eq(schema.users.email, email) });
      const id = existing?.id ?? crypto.randomUUID();

      if (existing?.isBlocked) return "/login?error=blocked";

      if (existing) {
        await db
          .update(schema.users)
          .set({
            name: user.name ?? existing.name,
            picture: user.image ?? existing.picture,
            lastLoginAt: new Date(),
            ...(isAdmin && existing.role !== "admin" ? { role: "admin" as const } : {}),
          })
          .where(eq(schema.users.id, id));
      } else {
        await db.insert(schema.users).values({
          id,
          email,
          name: user.name,
          picture: user.image,
          role: isAdmin ? "admin" : "student",
          branch: parsed?.branch,
          batchYear: parsed?.batchYear,
          lastLoginAt: new Date(),
        });
      }

      await audit({ userId: id, action: "login" });
      return true;
    },

    async jwt({ token, user, trigger }) {
      if (user?.email || trigger === "signIn") {
        const email = (user?.email ?? token.email)?.toLowerCase();
        if (email) {
          const row = await db.query.users.findFirst({ where: eq(schema.users.email, email) });
          if (row) {
            token.uid = row.id;
            token.role = row.role;
            token.branch = row.branch;
            token.batchYear = row.batchYear;
          }
        }
      }
      return token;
    },

    async session({ session, token }) {
      if (token.uid) session.user.id = token.uid;
      session.user.role = token.role ?? "student";
      session.user.branch = token.branch ?? null;
      session.user.batchYear = token.batchYear ?? null;
      return session;
    },
  },
  events: {
    async signOut(message) {
      const uid = "token" in message ? message.token?.uid : undefined;
      if (uid) await audit({ userId: uid, action: "logout" });
    },
  },
});

export async function currentUser() {
  const session = await auth();
  if (!session?.user?.id) return null;
  return session.user;
}

export async function requireUser() {
  const u = await currentUser();
  if (!u) throw new Response("Unauthorized", { status: 401 });
  return u;
}

export async function requireAdmin() {
  const u = await requireUser();
  if (u.role !== "admin") throw new Response("Forbidden", { status: 403 });
  return u;
}

export function isAllowedEmail(email: string) {
  return email.toLowerCase().endsWith(`@${ALLOWED_DOMAIN}`);
}
