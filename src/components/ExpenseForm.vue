<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { uploadReceipt } from '../data/receipts'
import { expensesRepo, supplierRulesRepo } from '../data/repos'
import { depreciationSchedule } from '../domain/depreciation'
import { categoryOf, CATEGORIES, shouldCapitalize, suggestCategory, supplierKey } from '../domain/expenses'
import type { Expense, VatAttribution } from '../domain/types'
import { inputVat } from '../domain/vat'
import { today, usePracticeStore } from '../stores/practice'
import { useToastStore } from '../stores/toast'
import AmountText from './AmountText.vue'
import MoneyInput from './MoneyInput.vue'

const emit = defineEmits<{ saved: []; cancel: [] }>()
const practice = usePracticeStore()
const toast = useToastStore()

const form = reactive({
  date: today(),
  supplier: '',
  category: '',
  amountInclCents: 0,
  vatCents: 0,
  vatAttribution: 'mixed' as VatAttribution,
  capitalize: false,
  assetLifeYears: 5,
})
const file = ref<File | null>(null)
const suggested = ref(false)
const busy = ref(false)

const profile = computed(() => practice.settings?.vatProfile ?? 'exempt')
const vat = computed(() => inputVat(form.vatCents, profile.value, form.vatAttribution, practice.currentProRata))
const costCents = computed(() => form.amountInclCents - vat.value.deductibleVatCents)
const offerCapitalize = computed(() => shouldCapitalize(costCents.value, practice.fiscal.capitalizeThresholdCents))
const schedule = computed(() => (form.capitalize && offerCapitalize.value ? depreciationSchedule(costCents.value, form.date, form.assetLifeYears) : []))
const category = computed(() => categoryOf(form.category))

function onSupplierBlur() {
  if (form.category && !suggested.value) return
  const s = suggestCategory(form.supplier, practice.supplierRules)
  if (s) {
    form.category = s
    suggested.value = true
  }
}

async function save() {
  if (!form.category || form.amountInclCents <= 0) return
  busy.value = true
  try {
    const receiptPath = file.value ? await uploadReceipt(file.value) : undefined
    const expense: Omit<Expense, 'id'> = {
      date: form.date,
      supplier: form.supplier.trim(),
      category: form.category,
      amountInclCents: form.amountInclCents,
      vatCents: form.vatCents,
      vatAttribution: form.vatAttribution,
      deductibleVatCents: vat.value.deductibleVatCents,
      capitalize: form.capitalize && offerCapitalize.value,
      ...(receiptPath ? { receiptPath } : {}),
      ...(form.capitalize && offerCapitalize.value ? { assetLifeYears: form.assetLifeYears } : {}),
    }
    await expensesRepo.add(expense)
    if (expense.supplier) await supplierRulesRepo.upsert(supplierKey(expense.supplier), { category: expense.category })
    toast.success('Uitgave opgeslagen')
    emit('saved')
  } catch (e) {
    toast.error(`Uitgave opslaan mislukt: ${e instanceof Error ? e.message : e}`)
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <form class="space-y-4" @submit.prevent="save">
    <div>
      <label class="label" for="exp-file">Bon of factuur</label>
      <input
        id="exp-file"
        type="file"
        accept="image/*,application/pdf"
        capture="environment"
        class="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-sage-light file:px-3 file:py-2 file:text-sage-dark"
        @change="file = ($event.target as HTMLInputElement).files?.[0] ?? null"
      />
    </div>
    <div class="grid gap-4 sm:grid-cols-2">
      <div>
        <label class="label" for="exp-date">Datum</label>
        <input id="exp-date" v-model="form.date" type="date" class="field" required />
      </div>
      <div>
        <label class="label" for="exp-supplier">Leverancier</label>
        <input id="exp-supplier" v-model="form.supplier" class="field" required @blur="onSupplierBlur" />
      </div>
    </div>
    <div>
      <label class="label" for="exp-cat">
        Categorie <span v-if="suggested" class="badge ml-1 bg-sage-light text-sage-dark">voorgesteld</span>
      </label>
      <select id="exp-cat" v-model="form.category" class="field" required @change="suggested = false">
        <option value="" disabled>Kies een categorie</option>
        <option v-for="c in CATEGORIES" :key="c.id" :value="c.id">{{ c.label }}</option>
      </select>
      <p v-if="category" class="mt-1 text-sm text-ink-soft">{{ category.hint }}</p>
    </div>
    <div class="grid gap-4 sm:grid-cols-2">
      <div>
        <label class="label" for="exp-amount">Bedrag inclusief btw</label>
        <MoneyInput id="exp-amount" v-model="form.amountInclCents" required />
      </div>
      <div>
        <label class="label" for="exp-vat">Waarvan btw</label>
        <MoneyInput id="exp-vat" v-model="form.vatCents" />
      </div>
    </div>

    <fieldset v-if="profile === 'mixed'">
      <legend class="label">Waarvoor gebruik je deze aankoop?</legend>
      <div class="flex flex-wrap gap-4 text-sm">
        <label class="flex items-center gap-2"><input v-model="form.vatAttribution" type="radio" value="taxed" /> Alleen belaste diensten</label>
        <label class="flex items-center gap-2"><input v-model="form.vatAttribution" type="radio" value="exempt" /> Alleen zorg</label>
        <label class="flex items-center gap-2"><input v-model="form.vatAttribution" type="radio" value="mixed" /> Beide ({{ Math.round(practice.currentProRata * 100) }}% aftrekbaar)</label>
      </div>
    </fieldset>
    <p class="text-sm text-ink-soft">
      Aftrekbare btw <AmountText :cents="vat.deductibleVatCents" />, kost voor de boekhouding <AmountText :cents="costCents" />.
      <template v-if="profile === 'exempt' || profile === 'small'">Je trekt geen btw af, dus de btw hoort bij de kost.</template>
    </p>

    <div v-if="offerCapitalize" class="rounded-md bg-ochre-light p-3 text-sm">
      <label class="flex items-center gap-2 font-medium"><input v-model="form.capitalize" type="checkbox" /> Afschrijven over meerdere jaren</label>
      <p class="mt-1">Duurzame aankopen boven de drempel schrijf je af in plaats van ze in één keer als kost te boeken.</p>
      <div v-if="form.capitalize" class="mt-2 flex items-center gap-2">
        <label for="exp-life">Over</label>
        <input id="exp-life" v-model.number="form.assetLifeYears" type="number" min="1" max="20" class="field w-20" />
        <span>jaar: <AmountText :cents="schedule.length ? schedule[0].amountCents * 12 : 0" /> per jaar</span>
      </div>
    </div>

    <div class="flex justify-end gap-2">
      <button type="button" class="btn-secondary" @click="emit('cancel')">Annuleren</button>
      <button class="btn-primary" :disabled="busy || !form.category || form.amountInclCents <= 0">Uitgave opslaan</button>
    </div>
  </form>
</template>
