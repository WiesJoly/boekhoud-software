<script setup lang="ts">
import AppIcon from '../components/AppIcon.vue'
import { computed, ref } from 'vue'
import AmountText from '../components/AmountText.vue'
import AppModal from '../components/AppModal.vue'
import EmptyState from '../components/EmptyState.vue'
import ExpenseForm from '../components/ExpenseForm.vue'
import MileageList from '../components/MileageList.vue'
import PageHeader from '../components/PageHeader.vue'
import { receiptUrl } from '../data/receipts'
import { categoryOf } from '../domain/expenses'
import { formatDate } from '../domain/invoices'
import { usePracticeStore } from '../stores/practice'
import { useToastStore } from '../stores/toast'

const practice = usePracticeStore()
const toast = useToastStore()
const tab = ref<'expenses' | 'mileage'>('expenses')
const adding = ref(false)

const months = computed(() => {
  const groups = new Map<string, typeof practice.expenses>()
  for (const e of practice.expenses) {
    const key = e.date.slice(0, 7)
    groups.set(key, [...(groups.get(key) ?? []), e])
  }
  return [...groups].map(([month, items]) => ({
    month,
    label: new Date(`${month}-15T12:00:00Z`).toLocaleDateString('nl-BE', { month: 'long', year: 'numeric' }),
    total: items.reduce((s, e) => s + e.amountInclCents, 0),
    items,
  }))
})

async function openReceipt(path: string) {
  try {
    window.open(await receiptUrl(path), '_blank', 'noopener')
  } catch (e) {
    toast.error(`Bon openen mislukt: ${e instanceof Error ? e.message : e}`)
  }
}
</script>

<template>
  <PageHeader title="Uitgaven" intro="Bonnen en aankoopfacturen. De categorie wordt onthouden per leverancier.">
    <button v-if="tab === 'expenses'" class="btn-primary" @click="adding = true"><AppIcon name="plus" />Uitgave toevoegen</button>
  </PageHeader>

  <div class="mb-4 flex gap-1" role="tablist">
    <button role="tab" :aria-selected="tab === 'expenses'" class="rounded-md px-3 py-1.5 text-sm" :class="tab === 'expenses' ? 'bg-sage-light font-medium text-sage-dark' : 'text-ink-soft hover:bg-mist'" @click="tab = 'expenses'">Uitgaven</button>
    <button role="tab" :aria-selected="tab === 'mileage'" class="rounded-md px-3 py-1.5 text-sm" :class="tab === 'mileage' ? 'bg-sage-light font-medium text-sage-dark' : 'text-ink-soft hover:bg-mist'" @click="tab = 'mileage'">Rittenlogboek</button>
  </div>

  <template v-if="tab === 'expenses'">
    <EmptyState v-if="!practice.expenses.length">
      <p class="mb-3">Nog geen uitgaven. Fotografeer een bon of upload een aankoopfactuur.</p>
      <button class="btn-primary" @click="adding = true">Uitgave toevoegen</button>
    </EmptyState>
    <section v-for="m in months" :key="m.month" class="mb-8">
      <div class="mb-2 flex items-baseline justify-between">
        <h2 class="capitalize">{{ m.label }}</h2>
        <AmountText :cents="m.total" />
      </div>
      <div class="overflow-x-auto">
        <table class="table">
          <thead><tr><th>Datum</th><th>Leverancier</th><th>Categorie</th><th class="text-right">Bedrag</th><th class="text-right">Aftrekbare btw</th><th /></tr></thead>
          <tbody>
            <tr v-for="e in m.items" :key="e.id">
              <td class="whitespace-nowrap text-ink-soft">{{ formatDate(e.date) }}</td>
              <td>{{ e.supplier }}</td>
              <td class="text-ink-soft">
                {{ categoryOf(e.category)?.label ?? e.category }}
                <span v-if="e.capitalize" class="badge ml-1 bg-mist">afschrijven over {{ e.assetLifeYears }} jaar</span>
              </td>
              <td class="text-right"><AmountText :cents="e.amountInclCents" /></td>
              <td class="text-right"><AmountText :cents="e.deductibleVatCents" muted /></td>
              <td class="text-right"><button v-if="e.receiptPath" class="btn-quiet" @click="openReceipt(e.receiptPath)">Bon</button></td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </template>
  <MileageList v-else />

  <AppModal v-if="adding" title="Uitgave toevoegen" @close="adding = false">
    <ExpenseForm @saved="adding = false" @cancel="adding = false" />
  </AppModal>
</template>
