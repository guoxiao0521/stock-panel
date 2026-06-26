import { computed } from 'vue'
import { authClient } from '@/lib/auth-client'

export function useAuthState() {
  const session = authClient.useSession()

  const user = computed(() => {
    const current = session.value.data?.user
    if (!current)
      return null

    return {
      id: current.id,
      email: current.email,
      name: current.name,
      avatarUrl: current.image ?? null,
    }
  })

  const loggedIn = computed(() => user.value !== null)

  async function signInWithGoogle() {
    await authClient.signIn.social({
      provider: 'google',
      callbackURL: '/',
    })
  }

  async function signOut() {
    await authClient.signOut()
  }

  return {
    loggedIn,
    user,
    pending: computed(() => session.value.isPending),
    signInWithGoogle,
    signOut,
    refetch: session.value.refetch,
  }
}
