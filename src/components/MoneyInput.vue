<script setup lang="ts">
import { ref, watch } from 'vue'
import { parseAmount } from '../domain/money'

const model = defineModel<number>({ required: true })
defineProps<{ id?: string; required?: boolean }>()

const formatter = new Intl.NumberFormat('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const format = (cents: number) => formatter.format(cents / 100)
const text = ref(format(model.value))
const invalid = ref(false)

watch(model, (cents) => {
  if (parseAmount(text.value) !== cents) text.value = format(cents)
})

function commit() {
  const cents = parseAmount(text.value)
  invalid.value = cents === null
  if (cents !== null) {
    model.value = cents
    text.value = format(cents)
  }
}
</script>

<template>
  <div class="relative">
    <span class="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-ink-soft">€</span>
    <input
      :id="id"
      v-model="text"
      class="field amount pl-7 text-right"
      :class="{ '!border-brick': invalid }"
      inputmode="decimal"
      :required="required"
      :aria-invalid="invalid"
      @blur="commit"
      @keydown.enter="commit"
    />
  </div>
</template>
