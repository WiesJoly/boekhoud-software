import { createUserWithEmailAndPassword, onAuthStateChanged, signInWithEmailAndPassword, signOut, type User } from 'firebase/auth'
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { auth } from '../firebase'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const ready = new Promise<void>((resolve) => {
    onAuthStateChanged(auth, (u) => {
      user.value = u
      resolve()
    })
  })

  return {
    user,
    ready,
    register: (email: string, password: string) => createUserWithEmailAndPassword(auth, email, password),
    login: (email: string, password: string) => signInWithEmailAndPassword(auth, email, password),
    logout: () => signOut(auth),
  }
})

const AUTH_ERRORS: Record<string, string> = {
  'auth/invalid-credential': 'E-mailadres of wachtwoord klopt niet.',
  'auth/invalid-email': 'Dit is geen geldig e-mailadres.',
  'auth/email-already-in-use': 'Er bestaat al een account met dit e-mailadres. Log in.',
  'auth/weak-password': 'Kies een wachtwoord van minstens 6 tekens.',
  'auth/too-many-requests': 'Te veel pogingen. Probeer het over een paar minuten opnieuw.',
  'auth/network-request-failed': 'Geen verbinding met de server.',
}

export function authErrorMessage(e: unknown): string {
  const code = (e as { code?: string })?.code ?? ''
  return AUTH_ERRORS[code] ?? 'Inloggen lukte niet. Probeer het opnieuw.'
}
