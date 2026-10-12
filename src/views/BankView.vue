<script setup lang="ts">
import { computed, ref } from 'vue'
import AmountText from '../components/AmountText.vue'
import AppModal from '../components/AppModal.vue'
import EmptyState from '../components/EmptyState.vue'
import ImportPreview from '../components/ImportPreview.vue'
import PageHeader from '../components/PageHeader.vue'
import { invoicesRepo } from '../data/invoices'
import { consultsRepo, transactionsRepo } from '../data/repos'
import { parseBankFile, type ImportResult, type ParsedBankRow } from '../domain/bankImport'
import { allocatePayment, formatDate } from '../domain/invoices'
import { suggestMatch, type MatchSuggestion } from '../domain/matching'
import { formatCents } from '../domain/money'
import type { BankTransaction, MatchType } from '../domain/types'
import { usePracticeStore } from '../stores/practice'
import { attempt, useToastStore } from '../stores/toast'

const practice = usePracticeStore()
const toast = useToastStore()

const preview = ref<ImportResult<ParsedBankRow> | null>(null)
const importing = ref(false)
const linking = ref<BankTransaction | null>(null)
const month = ref('')

const unconfirmed = computed(() => practice.transactions.filter((t) => !t.confirmed))
const confirmed = computed(() => practice.transactions.filter((t) => t.confirmed && (!month.value || t.date.startsWith(month.value))))
const months = computed(() => [...new Set(practice.transactions.filter((t) => t.confirmed).map((t) => t.date.slice(0, 7)))].sort().reverse())

const ctx = computed(() => ({
  invoices: practice.invoices,
  consults: practice.consults,
  debtors: practice.debtors,
  expenses: practice.expenses,
  transactions: practice.transactions,
}))
const suggestions = computed(() => new Map(unconfirmed.value.map((t) => [t.id, suggestMatch(t, ctx.value)])))

async function onFile(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  try {
    preview.value = parseBankFile(await file.text())
  } catch (e) {
    toast.error(e instanceof Error ? e.message : String(e))
  }
}

async function confirmImport() {
  if (!preview.value) return
  importing.value = true
  const known = new Set(practice.transactions.map((t) => t.id))
  // Re-importing the same statement must not overwrite links already confirmed.
  const fresh = preview.value.rows.filter((r) => !known.has(r.importHash))
  const ok = await attempt(
    () => transactionsRepo.upsertMany(fresh.map((r) => ({ id: r.importHash, data: { ...r, confirmed: false } }))),
    'Importeren mislukt',
    `${fresh.length} nieuwe transacties geïmporteerd${preview.value.rows.length > fresh.length ? `, ${preview.value.rows.length - fresh.length} waren er al` : ''}`,
  )
  importing.value = false
  if (ok) preview.value = null
}

async function confirm(tx: BankTransaction, match: { type: MatchType; ids: string[] }) {
  await attempt(async () => {
    if (match.type === 'invoice') {
      const invoices = match.ids.map((id) => practice.invoices.find((i) => i.id === id)!).filter(Boolean)
      const credits = practice.invoices.filter((i) => i.kind === 'credit')
      for (const p of allocatePayment(invoices, credits, tx.amountCents)) {
        await invoicesRepo.update(p.id, { paidCents: p.paidCents, status: p.status })
      }
    } else if (match.type === 'consults') {
      await Promise.all(match.ids.map((id) => consultsRepo.update(id, { bankTransactionId: tx.id })))
    }
    await transactionsRepo.update(tx.id, { match, confirmed: true })
  }, 'Koppelen mislukt')
}

const MATCH_LABEL: Record<MatchType, string> = {
  invoice: 'Factuur',
  consults: 'Sessies ziekenfonds',
  expense: 'Uitgave',
  private: 'Privé',
  other: 'Overig',
}

function describe(match?: { type: MatchType; ids: string[] }) {
  if (!match) return ''
  if (match.type === 'invoice') return `Factuur ${match.ids.map((id) => practice.invoices.find((i) => i.id === id)?.number).join(', ')}`
  if (match.type === 'consults') return `${match.ids.length} sessies`
  if (match.type === 'expense') return `Uitgave ${practice.expenses.find((e) => e.id === match.ids[0])?.supplier ?? ''}`
  return MATCH_LABEL[match.type]
}

// Manual linking
const manualType = ref<'invoice' | 'expense'>('invoice')
const manualId = ref('')
const manualOptions = computed(() =>
  manualType.value === 'invoice'
    ? practice.invoices.filter((i) => i.kind === 'invoice' && i.status === 'open').map((i) => ({ id: i.id, label: `${i.number} · ${practice.debtorById.get(i.debtorId)?.displayName ?? ''} · ${formatCents(i.totalCents)}` }))
    : practice.expenses.map((e) => ({ id: e.id, label: `${formatDate(e.date)} · ${e.supplier} · ${formatCents(e.amountInclCents)}` })),
)
async function confirmManual() {
  if (!linking.value || !manualId.value) return
  await confirm(linking.value, { type: manualType.value, ids: [manualId.value] })
  linking.value = null
  manualId.value = ''
}
const previewColumns: { key: keyof ParsedBankRow & string; label: string; format?: (v: unknown) => string }[] = [
  { key: 'date', label: 'Datum', format: (v) => formatDate(String(v)) },
  { key: 'counterparty', label: 'Tegenpartij' },
  { key: 'description', label: 'Mededeling' },
  { key: 'amountCents', label: 'Bedrag', format: (v) => formatCents(Number(v)) },
]
const suggestionOf = (id: string): MatchSuggestion | null => suggestions.value.get(id) ?? null
</script>

<template>
  <PageHeader title="Bank" intro="Importeer je rekeninguittreksels (CODA, MT940 of CSV van je bank) en bevestig de voorgestelde koppelingen.">
    <label class="btn-primary cursor-pointer">
      Uittreksel importeren
      <input type="file" accept=".cod,.coda,.txt,.csv,.sta,.940,.mt940" class="sr-only" @change="onFile" />
    </label>
  </PageHeader>

  <p class="mb-6 text-sm">Saldo volgens de boekhouding: <AmountText :cents="practice.bankBalance" /></p>

  <section class="mb-10">
    <h2 class="mb-3">Te bevestigen <span class="font-normal text-ink-soft">{{ unconfirmed.length }}</span></h2>
    <EmptyState v-if="!unconfirmed.length">Alles is gekoppeld.</EmptyState>
    <ul v-else class="divide-y divide-mist border-y border-line">
      <li v-for="t in unconfirmed" :key="t.id" class="flex flex-wrap items-start gap-x-6 gap-y-2 py-3">
        <div class="w-28 shrink-0 text-sm text-ink-soft">{{ formatDate(t.date) }}</div>
        <div class="min-w-0 flex-1">
          <p class="font-medium">{{ t.counterparty || 'Onbekende tegenpartij' }}</p>
          <p class="truncate text-sm text-ink-soft">{{ t.description }}</p>
          <p v-if="suggestionOf(t.id)" class="mt-1 text-sm text-sage-dark">Voorstel: {{ suggestionOf(t.id)!.reason }}</p>
        </div>
        <AmountText class="w-28 text-right" :cents="t.amountCents" />
        <div class="flex w-full flex-wrap justify-end gap-1 sm:w-auto">
          <button v-if="suggestionOf(t.id)" class="btn-primary" @click="confirm(t, suggestionOf(t.id)!)">Bevestigen</button>
          <button class="btn-secondary" @click="linking = t">Koppelen</button>
          <button class="btn-quiet" @click="confirm(t, { type: 'private', ids: [] })">Privé</button>
          <button class="btn-quiet" @click="confirm(t, { type: 'other', ids: [] })">Overig</button>
        </div>
      </li>
    </ul>
  </section>

  <section>
    <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
      <h2>Gekoppeld</h2>
      <select v-model="month" class="field w-auto" aria-label="Maand">
        <option value="">Alle maanden</option>
        <option v-for="m in months" :key="m" :value="m">{{ m }}</option>
      </select>
    </div>
    <EmptyState v-if="!confirmed.length">Nog geen gekoppelde transacties.</EmptyState>
    <div v-else class="overflow-x-auto">
      <table class="table">
        <thead><tr><th>Datum</th><th>Tegenpartij</th><th>Gekoppeld aan</th><th class="text-right">Bedrag</th></tr></thead>
        <tbody>
          <tr v-for="t in confirmed" :key="t.id">
            <td class="whitespace-nowrap text-ink-soft">{{ formatDate(t.date) }}</td>
            <td>{{ t.counterparty }}</td>
            <td class="text-ink-soft">{{ describe(t.match) }}</td>
            <td class="text-right"><AmountText :cents="t.amountCents" /></td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>

  <AppModal v-if="preview" title="Uittreksel importeren" wide @close="preview = null">
    <ImportPreview :rows="preview.rows" :errors="preview.errors" :busy="importing" :columns="previewColumns" @confirm="confirmImport" @cancel="preview = null" />
  </AppModal>

  <AppModal v-if="linking" title="Transactie koppelen" @close="linking = null">
    <p class="mb-4 text-sm">{{ linking.counterparty }} · <AmountText :cents="linking.amountCents" /></p>
    <div class="space-y-4">
      <div class="flex gap-4 text-sm">
        <label class="flex items-center gap-2"><input v-model="manualType" type="radio" value="invoice" @change="manualId = ''" /> Factuur</label>
        <label class="flex items-center gap-2"><input v-model="manualType" type="radio" value="expense" @change="manualId = ''" /> Uitgave</label>
      </div>
      <select v-model="manualId" class="field" aria-label="Kies">
        <option value="" disabled>Kies…</option>
        <option v-for="o in manualOptions" :key="o.id" :value="o.id">{{ o.label }}</option>
      </select>
      <div class="flex justify-end gap-2">
        <button class="btn-secondary" @click="linking = null">Annuleren</button>
        <button class="btn-primary" :disabled="!manualId" @click="confirmManual">Koppelen</button>
      </div>
    </div>
  </AppModal>
</template>
