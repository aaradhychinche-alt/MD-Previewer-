
import NextAuth from "next-auth"
import GitHub from "next-auth/providers/github"

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    GitHub({
      clientId: process.env.AUTH_GITHUB_ID || process.env.GITHUB_ID,
      clientSecret: process.env.AUTH_GITHUB_SECRET || process.env.GITHUB_SECRET,
      // We need the 'repo' scope to access private repositories.
      authorization: {
        params: {
          scope: "read:user repo",
        },
      },
    }),
  ],
  debug: process.env.NODE_ENV === 'development',
  secret: process.env.AUTH_SECRET, // Explicitly set secret just in case
  callbacks: {
    async jwt({ token, account }) {
      // Persist the OAuth access_token to the token right after signin
      if (account) {
        token.accessToken = account.access_token
      }
      return token
    },
    async session({ session, token }) {
      // Send properties to the client, like an access_token from a provider.
      session.accessToken = token.accessToken
      return session
    },
  },
})
