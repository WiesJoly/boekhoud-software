<script setup lang="ts">
import { RouterView, useRoute } from 'vue-router'
import AppShell from './components/AppShell.vue'

const route = useRoute()
</script>

<template>
  <RouterView v-if="route.meta.public || route.meta.bare" />
  <AppShell v-else>
    <RouterView />
  </AppShell>
</template>
