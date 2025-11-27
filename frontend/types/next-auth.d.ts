import NextAuth, { DefaultSession, DefaultUser } from "next-auth";

declare module "next-auth" {
  /**
   * Returned by `useSession`, `getSession` and received as a prop on the `SessionProvider` React Context
   */
  interface Session {
    user: {
      id: number;
      username?: string | null;
      role?: string | null;
      isApproved?: boolean | null;
    } & DefaultSession["user"];
    accessToken?: string;
  }

  interface User extends DefaultUser {
    id: number;
    username?: string | null;
    role?: string | null;
    isApproved?: boolean | null;
    token?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: number;
    username?: string | null;
    role?: string | null;
    isApproved?: boolean | null;
    accessToken?: string | null;
  }
}
