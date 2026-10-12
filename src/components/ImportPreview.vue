<script setup lang="ts" generic="T extends Record<string, unknown>">
defineProps<{
  rows: T[]
  errors: { line: number; message: string }[]
  columns: { key: keyof T & string; label: string; format?: (value: unknown) => string }[]
  busy?: boolean
}>()
const emit = defineEmits<{ confirm: []; cancel: [] }>()
</script>

<template>
  <div class="space-y-4">
    <p class="text-sm">
      <b class="font-medium">{{ rows.length }}</b> regels klaar om te importeren<template v-if="errors.length">,
        <b class="font-medium text-brick">{{ errors.length }}</b> regels met een fout worden overgeslagen</template>.
    </p>
    <ul v-if="errors.length" class="max-h-32 overflow-y-auto rounded-md bg-brick-light px-3 py-2 text-sm text-brick">
      <li v-for="e in errors" :key="e.line">Regel {{ e.line }}: {{ e.message }}</li>
    </ul>
    <div class="max-h-80 overflow-auto">
      <table class="table">
        <thead><tr><th v-for="c in columns" :key="c.key">{{ c.label }}</th></tr></thead>
        <tbody>
          <tr v-for="(row, i) in rows.slice(0, 50)" :key="i">
            <td v-for="c in columns" :key="c.key">{{ c.format ? c.format(row[c.key]) : row[c.key] }}</td>
          </tr>
        </tbody>
      </table>
      <p v-if="rows.length > 50" class="mt-2 text-sm text-ink-soft">En nog {{ rows.length - 50 }} regels.</p>
    </div>
    <div class="flex justify-end gap-2">
      <button class="btn-secondary" @click="emit('cancel')">Annuleren</button>
      <button class="btn-primary" :disabled="!rows.length || busy" @click="emit('confirm')">{{ rows.length }} regels importeren</button>
    </div>
  </div>
</template>
