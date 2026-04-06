import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { AccessDenied } from "@auth/core/errors";
import { prisma } from "@/lib/db/prisma";
import { loginSchema } from "@/lib/validations/auth";

export const authConfig = {
  trustHost: true,
  providers: [
    Credentials({
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { phone, password } = parsed.data;

        const user = await prisma.user.findUnique({
          where: { phone },
        });

        if (!user) return null;

        if (!user.isActive) {
          throw new AccessDenied(
            "Your account has been deactivated. Please contact the administrator."
          );
        }

        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) return null;

        return {
          id: user.id,
          name: user.fullName,
          email: user.phone,
          role: user.role,
          mustChangePassword: user.mustChangePassword,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.role = (user as { role: string }).role;
        token.fullName = user.name as string;
        token.mustChangePassword = (user as { mustChangePassword: boolean }).mustChangePassword;
      }
      return token;
    },
    session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        (session.user as unknown as { role: string }).role = token.role as string;
        (session.user as unknown as { fullName: string }).fullName = token.fullName as string;
        (session.user as unknown as { mustChangePassword: boolean }).mustChangePassword =
          token.mustChangePassword as boolean;
      }
      return session;
    },
  },
  session: {
    strategy: "jwt",
    /** Absolute session lifetime (JWT). Idle logout is enforced client-side in SessionIdleTimeout. */
    maxAge: 60 * 60 * 8,
  },
  jwt: {
    maxAge: 60 * 60 * 8,
  },
} satisfies NextAuthConfig;
