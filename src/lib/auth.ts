import { getServerSession, type NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import { db } from '@/lib/db'

function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60,
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
    }),
  ],
  callbacks: {
    async signIn({ account, profile }) {
      if (account?.provider !== 'google') return false
      const googleProfile = profile as { email?: string; email_verified?: boolean } | undefined
      return Boolean(googleProfile?.email && googleProfile.email_verified)
    },
    async jwt({ token, user }) {
      if (!token.userId && token.email) {
        const email = normalizeEmail(token.email)
        const appUser = await db.appUser.upsert({
          where: { email },
          update: {
            emailVerified: new Date(),
            name: user?.name ?? token.name ?? '',
            image: user?.image ?? token.picture ?? '',
          },
          create: {
            email,
            emailVerified: new Date(),
            name: user?.name ?? token.name ?? '',
            image: user?.image ?? token.picture ?? '',
          },
        })
        token.email = email
        token.userId = appUser.id
      }
      return token
    },
    async session({ session, token }) {
      if (session.user && token.userId) session.user.id = token.userId
      return session
    },
  },
}

export function auth() {
  return getServerSession(authOptions)
}

export async function requireUserId() {
  const session = await auth()
  if (!session?.user?.id) throw new Error('UNAUTHORIZED')
  return session.user.id
}

export function isUnauthorized(error: unknown) {
  return error instanceof Error && error.message === 'UNAUTHORIZED'
}
