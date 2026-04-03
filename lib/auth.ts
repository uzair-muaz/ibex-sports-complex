import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import connectDB from './mongodb';
import User from '@/models/User';

export const authOptions = {
  // Heroku (and similar proxies): trust X-Forwarded-Host / Proto so the app URL matches.
  trustHost: true,
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Please enter your email and password');
        }

        try {
          await connectDB();
        } catch (error: any) {
          console.error('Database connection error:', error);
          throw new Error(
            'Unable to connect to database. Please check your MongoDB connection settings and ensure your IP is whitelisted in MongoDB Atlas.'
          );
        }

        try {
          const email = (typeof credentials.email === 'string' ? credentials.email : String(credentials.email)).trim().toLowerCase();
          const password = typeof credentials.password === 'string' ? credentials.password : String(credentials.password);

          // Important: for invalid credentials return null (so NextAuth reports a credentials error,
          // rather than surfacing a misleading "Configuration" page on the client).
          const user = await User.findOne({ email });
          if (!user) return null;

          const isPasswordValid = await bcrypt.compare(password, user.password);

          if (!isPasswordValid) return null;

          return {
            id: user._id.toString(),
            email: user.email,
            name: user.name,
            role: user.role,
          };
        } catch (error: any) {
          console.error('Authentication error:', error);
          throw new Error('Authentication failed. Please try again.');
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }: { token: any; user: any }) {
      if (user) {
        token.role = (user as any).role;
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }: { session: any; token: any }) {
      if (session.user) {
        (session.user as any).role = token.role;
        (session.user as any).id = token.id;
      }
      return session;
    },
  },
  pages: {
    signIn: '/admin',
  },
  session: {
    strategy: 'jwt' as const,
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const nextAuth = NextAuth(authOptions);
export const { handlers, auth } = nextAuth;

