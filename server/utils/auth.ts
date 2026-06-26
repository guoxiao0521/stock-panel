import { betterAuth } from 'better-auth'

let authInstance: ReturnType<typeof betterAuth> | null = null

export function useAuth() {
  if (authInstance)
    return authInstance

  authInstance = betterAuth({
    database: useDatabase(),
    secret: process.env.BETTER_AUTH_SECRET,
    baseURL: process.env.BETTER_AUTH_URL,
    socialProviders: {
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID ?? '',
        clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
      },
    },
  })

  return authInstance
}
