import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

const handler = NextAuth({
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const res = await fetch("http://localhost:5000/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(credentials),
        });

        const user = await res.json();
        if (res.ok && user) {
          return {
            id: user.user?.id,
            email: user.user?.email,
            username: user.user?.username,
            role: user.user?.role,
            isApproved: user.user?.isApproved,
            token: user.token
          };
        }
        return null;
      },
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const u = user as {
          id: string;
          email: string;
          username?: string;
          role?: string;
          isApproved?: boolean;
          token?: string;
        };
        token.id = u.id;
        token.email = u.email;
        token.username = u.username;
        token.role = u.role;
        token.isApproved = u.isApproved;
        token.accessToken = u.token;
      }
      return token;
    },
    async session({ session, token }) {
      (session as any).user = {
        ...(session.user || {}),
        id: token.id,
        email: token.email,
        username: token.username,
        role: token.role,
        isApproved: token.isApproved,
      };
      (session as any).accessToken = token.accessToken;
      return session;
    },
  },
});

export { handler as GET, handler as POST };
