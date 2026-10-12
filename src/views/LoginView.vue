<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import CatFace from '../components/kitten/CatFace.vue'
import PawIcon from '../components/kitten/PawIcon.vue'
import { authErrorMessage, useAuthStore } from '../stores/auth'

const authStore = useAuthStore()
const router = useRouter()
const mode = ref<'login' | 'register'>('login')
const email = ref('')
const password = ref('')
const error = ref('')
const busy = ref(false)

async function submit() {
  error.value = ''
  busy.value = true
  try {
    if (mode.value === 'login') await authStore.login(email.value, password.value)
    else await authStore.register(email.value, password.value)
    await router.replace({ name: 'overview' })
  } catch (e) {
    error.value = authErrorMessage(e)
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="grid min-h-screen md:grid-cols-[1fr_minmax(0,28rem)]">
    <section class="relative hidden flex-col justify-end overflow-hidden bg-sage p-12 text-on-primary md:flex">
      <div class="kitten-only absolute top-12 right-12 rotate-6 text-[9rem] leading-none drop-shadow-sm"><CatFace /></div>
      <div class="kitten-only absolute top-56 left-16 -rotate-12 text-3xl opacity-40"><PawIcon /></div>
      <div class="kitten-only absolute top-72 left-32 rotate-12 text-2xl opacity-30"><PawIcon /></div>
      <p class="amount max-w-md text-4xl leading-tight">
        Wat binnenkomt, wat openstaat, en wat van de Belastingdienst is.
      </p>
      <p class="mt-4 max-w-md opacity-80">
        Boekhouding voor vrijgevestigde psychologen. Geen dossiers, geen diagnoses: alleen wat financieel nodig is.
      </p>
    </section>

    <section class="flex items-center px-4 py-12 md:px-12">
      <form class="w-full space-y-5" @submit.prevent="submit">
        <div>
          <p class="text-sm text-ink-soft">Praktijkboekhouding</p>
          <h1 class="mt-1">{{ mode === 'login' ? 'Inloggen' : 'Account aanmaken' }}</h1>
        </div>

        <div>
          <label class="label" for="email">E-mailadres</label>
          <input id="email" v-model="email" class="field" type="email" autocomplete="email" required />
        </div>
        <div>
          <label class="label" for="password">Wachtwoord</label>
          <input
            id="password"
            v-model="password"
            class="field"
            type="password"
            :autocomplete="mode === 'login' ? 'current-password' : 'new-password'"
            minlength="6"
            required
          />
        </div>

        <p v-if="error" class="rounded-md bg-brick-light px-3 py-2 text-sm text-brick" role="alert">{{ error }}</p>

        <button class="btn-primary w-full justify-center" :disabled="busy">
          {{ mode === 'login' ? 'Inloggen' : 'Account aanmaken' }}
        </button>

        <p class="text-sm text-ink-soft">
          <template v-if="mode === 'login'">
            Nog geen account?
            <button type="button" class="font-medium text-sage underline" @click="mode = 'register'">Account aanmaken</button>
          </template>
          <template v-else>
            Al een account?
            <button type="button" class="font-medium text-sage underline" @click="mode = 'login'">Inloggen</button>
          </template>
        </p>
      </form>
    </section>
  </div>
</template>
