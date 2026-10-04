import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import connectDB from "./mongodb";
import User from "@/models/User";

const googleConfigured =
  !!process.env.GOOGLE_CLIENT_ID && !!process.env.GOOGLE_CLIENT_SECRET;

export const authOptions = {
  trustHost: true,
  providers: [
    ...(googleConfigured
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
            allowDangerousEmailAccountLinking: true,
          }),
        ]
      : []),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Please enter your email and password");
        }

        try {
          await connectDB();
        } catch (error: unknown) {
          console.error("Database connection error:", error);
          throw new Error(
            "Unable to connect to database. Please check your MongoDB connection settings and ensure your IP is whitelisted in MongoDB Atlas.",
          );
        }

        try {
          const email = (
            typeof credentials.email === "string"
              ? credentials.email
              : String(credentials.email)
          )
            .trim()
            .toLowerCase();
          const password =
            typeof credentials.password === "string"
              ? credentials.password
              : String(credentials.password);

          const user = await User.findOne({ email });
          if (!user || !user.password) return null;

          const isPasswordValid = await bcrypt.compare(password, user.password);
          if (!isPasswordValid) return null;

          // Credentials login is for staff only
          if (user.role !== "super_admin" && user.role !== "admin") {
            return null;
          }

          return {
            id: user._id.toString(),
            email: user.email,
            name: user.name,
            role: user.role,
            image: user.image,
          };
        } catch (error: unknown) {
          console.error("Authentication error:", error);
          throw new Error("Authentication failed. Please try again.");
        }
      },
    }),
  ],
  callbacks: {
    async signIn({
      user,
      account,
      profile,
    }: {
      user: { email?: string | null; name?: string | null; image?: string | null };
      account: { provider?: string; providerAccountId?: string } | null;
      profile?: { email_verified?: boolean };
    }) {
      if (account?.provider !== "google") return true;

      const email = user.email?.trim().toLowerCase();
      if (!email) return false;

      try {
        await connectDB();
        let dbUser = await User.findOne({ email });

        if (dbUser) {
          // Never elevate via Google; keep existing role
          if (!dbUser.googleId && account.providerAccountId) {
            dbUser.googleId = account.providerAccountId;
          }
          if (user.image && !dbUser.image) dbUser.image = user.image;
          if (user.name && !dbUser.name) dbUser.name = user.name;
          if (profile?.email_verified) dbUser.emailVerified = new Date();
          await dbUser.save();
        } else {
          dbUser = await User.create({
            email,
            name: user.name || email.split("@")[0],
            role: "user",
            image: user.image || undefined,
            googleId: account.providerAccountId,
            emailVerified: profile?.email_verified ? new Date() : null,
          });
        }

        (user as { id?: string; role?: string }).id = dbUser._id.toString();
        (user as { id?: string; role?: string }).role = dbUser.role;
        return true;
      } catch (error) {
        console.error("Google sign-in error:", error);
        return false;
      }
    },
    async jwt({
      token,
      user,
      account,
      trigger,
      session,
    }: {
      token: Record<string, unknown>;
      user?: { id?: string; role?: string; image?: string | null };
      account?: { provider?: string } | null;
      trigger?: string;
      session?: { name?: string; phone?: string; image?: string };
    }) {
      if (user?.id) {
        token.id = user.id;
        token.role = user.role || "user";
        if (user.image) token.picture = user.image;
      }

      if (account?.provider === "google" && token.email) {
        try {
          await connectDB();
          const dbUser = await User.findOne({
            email: String(token.email).toLowerCase(),
          });
          if (dbUser) {
            token.id = dbUser._id.toString();
            token.role = dbUser.role;
            token.phone = dbUser.phone || "";
            if (dbUser.image) token.picture = dbUser.image;
            if (dbUser.name) token.name = dbUser.name;
          }
        } catch (e) {
          console.error("JWT google enrich error:", e);
        }
      }

      if (trigger === "update" && session) {
        if (session.name) token.name = session.name;
        if (session.phone !== undefined) token.phone = session.phone;
        if (session.image) token.picture = session.image;
      }

      if (token.id && token.phone === undefined) {
        try {
          await connectDB();
          const dbUser = await User.findById(token.id).select(
            "phone image name role",
          );
          if (dbUser) {
            token.phone = dbUser.phone || "";
            token.role = dbUser.role;
            if (dbUser.image) token.picture = dbUser.image;
            if (dbUser.name) token.name = dbUser.name;
          }
        } catch {
          /* ignore */
        }
      }

      return token;
    },
    async session({
      session,
      token,
    }: {
      session: {
        user?: {
          id?: string;
          role?: string;
          phone?: string;
          image?: string | null;
          name?: string | null;
          email?: string | null;
        };
      };
      token: Record<string, unknown>;
    }) {
      if (session.user) {
        session.user.id = String(token.id || "");
        session.user.role = (token.role as "super_admin" | "admin" | "user") || "user";
        session.user.phone = typeof token.phone === "string" ? token.phone : "";
        if (token.picture) session.user.image = String(token.picture);
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt" as const,
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const nextAuth = NextAuth(authOptions as unknown as Parameters<typeof NextAuth>[0]);
export const { handlers, auth, signIn, signOut } = nextAuth;
