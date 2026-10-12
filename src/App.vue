<script setup lang="ts">
import { watch } from 'vue'
import { RouterView, useRoute, useRouter } from 'vue-router'
import AppShell from './components/AppShell.vue'
import ToastList from './components/ToastList.vue'
import { useAuthStore } from './stores/auth'
import { usePracticeStore } from './stores/practice'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const practice = usePracticeStore()

// The router guard starts the practice store on first navigation; this only handles later log-in/log-out.
watch(
  () => authStore.user?.uid,
  (uid, previous) => {
    if (uid) practice.start(uid)
    else if (previous) {
      practice.stop()
      router.replace({ name: 'login' })
    }
  },
)

async function logout() {
  await authStore.logout()
}
</script>

<template>
  <RouterView v-if="route.meta.public || route.meta.bare" />
  <AppShell v-else :practice-name="practice.settings?.name" @logout="logout">
    <RouterView />
  </AppShell>
  <ToastList />
</template>
