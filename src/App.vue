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

watch(
  () => authStore.user?.uid,
  (uid) => {
    if (uid) practice.start(uid)
    else {
      practice.stop()
      if (!route.meta.public) router.replace({ name: 'login' })
    }
  },
  { immediate: true },
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
