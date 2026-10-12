<script setup lang="ts">
import AppIcon from '../components/AppIcon.vue'
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'
import AmountText from '../components/AmountText.vue'
import AppModal from '../components/AppModal.vue'
import EmptyState from '../components/EmptyState.vue'
import InvoiceEditor from '../components/InvoiceEditor.vue'
import PageHeader from '../components/PageHeader.vue'
import { createCredit, invoicesRepo } from '../data/invoices'
import { dueReminders, fillReminder, formatDate, outstandingCents } from '../domain/invoices'
import type { Invoice } from '../domain/types'
import { INVOICE_STATUS_LABEL } from '../labels'
import { today, usePracticeStore } from '../stores/practice'
import { attempt, useToastStore } from '../stores/toast'

const practice = usePracticeStore()
const toast = useToastStore()

const filter = ref<'open' | 'paid' | 'credited' | 'all'>('open')
const creating = ref(false)
const crediting = ref<Invoice | null>(null)

const credits = computed(() => practice.invoices.filter((i) => i.kind === 'credit'))
const reminders = computed(() => new Map(dueReminders(practice.invoices, practice.debtors, today()).map((r) => [r.invoiceId, r.level])))

const rows = computed(() =>
  practice.invoices
    .filter((i) => filter.value === 'all' || (i.kind === 'invoice' && i.status === filter.value))
    .map((i) => ({ invoice: i, outstanding: i.kind === 'invoice' ? outstandingCents(i, credits.value) : 0 })),
)

const counts = computed(() => ({
  open: practice.invoices.filter((i) => i.kind === 'invoice' && i.status === 'open').length,
  paid: practice.invoices.filter((i) => i.kind === 'invoice' && i.status === 'paid').length,
  credited: practice.invoices.filter((i) => i.kind === 'invoice' && i.status === 'credited').length,
  all: practice.invoices.length,
}))

function markPaid(invoice: Invoice) {
  const paid = invoice.paidCents + outstandingCents(invoice, credits.value)
  attempt(() => invoicesRepo.update(invoice.id, { paidCents: paid, status: 'paid' }), 'Bijwerken mislukt', `Factuur ${invoice.number} staat op betaald`)
}

async function copyReminder(invoice: Invoice, level: 1 | 2) {
  const text = fillReminder(level, invoice)
  try {
    await navigator.clipboard.writeText(text)
  } catch {
    // Clipboard can be blocked; the text is still recorded as sent.
  }
  await attempt(
    () => invoicesRepo.update(invoice.id, { reminders: [...invoice.reminders, { level, date: today() }] }),
    'Herinnering registreren mislukt',
    'Herinneringstekst gekopieerd en geregistreerd',
  )
}

async function confirmCredit() {
  const invoice = crediting.value
  crediting.value = null
  if (!invoice) return
  try {
    const credit = await createCredit(invoice, today())
    toast.success(`Creditnota ${credit.number} gemaakt voor factuur ${invoice.number}`)
  } catch (e) {
    toast.error(`Crediteren mislukt: ${e instanceof Error ? e.message : e}`)
  }
}

const TABS = [
  { id: 'open', label: 'Open' },
  { id: 'paid', label: 'Betaald' },
  { id: 'credited', label: 'Gecrediteerd' },
  { id: 'all', label: 'Alles' },
] as const
</script>

<template>
  <PageHeader title="Facturen" intro="Facturen aan cliënten en organisaties. Een factuur verwijder je nooit; je maakt een creditnota.">
    <button class="btn-primary" :disabled="!practice.settings" @click="creating = true"><AppIcon name="plus" />Nieuwe factuur</button>
  </PageHeader>

  <div class="mb-4 flex flex-wrap gap-1" role="tablist">
    <button
      v-for="t in TABS"
      :key="t.id"
      role="tab"
      :aria-selected="filter === t.id"
      class="rounded-md px-3 py-1.5 text-sm"
      :class="filter === t.id ? 'bg-sage-light font-medium text-sage-dark' : 'text-ink-soft hover:bg-mist'"
      @click="filter = t.id"
    >{{ t.label }} <span class="text-ink-soft">{{ counts[t.id] }}</span></button>
  </div>

  <EmptyState v-if="!rows.length">
    <template v-if="filter === 'open'">Geen openstaande facturen.</template>
    <template v-else>Geen facturen in deze lijst.</template>
  </EmptyState>
  <div v-else class="overflow-x-auto">
    <table class="table min-w-[48rem]">
      <thead>
        <tr><th>Nummer</th><th>Datum</th><th>Aan</th><th class="text-right">Totaal</th><th class="text-right">Open</th><th>Status</th><th /></tr>
      </thead>
      <tbody>
        <tr v-for="{ invoice, outstanding } in rows" :key="invoice.id">
          <td class="font-medium">{{ invoice.number }}<span v-if="invoice.kind === 'credit'" class="ml-2 badge bg-mist">creditnota</span></td>
          <td class="whitespace-nowrap text-ink-soft">{{ formatDate(invoice.date) }}</td>
          <td>{{ practice.debtorById.get(invoice.debtorId)?.displayName ?? '—' }}</td>
          <td class="text-right"><AmountText :cents="invoice.totalCents" /></td>
          <td class="text-right"><AmountText v-if="invoice.kind === 'invoice'" :cents="outstanding" :muted="outstanding === 0" /></td>
          <td>
            <span v-if="invoice.kind === 'invoice'" class="badge" :class="invoice.status === 'open' ? 'bg-ochre-light text-ochre' : 'bg-mist text-ink-soft'">{{ INVOICE_STATUS_LABEL[invoice.status] }}</span>
            <span v-if="reminders.get(invoice.id)" class="ml-1 badge bg-brick-light text-brick">{{ reminders.get(invoice.id) }}e herinnering</span>
          </td>
          <td class="whitespace-nowrap text-right">
            <RouterLink class="btn-quiet" :to="{ name: 'invoice-print', params: { id: invoice.id } }" target="_blank"><AppIcon name="print" />Afdrukken</RouterLink>
            <template v-if="invoice.kind === 'invoice' && invoice.status === 'open'">
              <button v-if="reminders.get(invoice.id)" class="btn-quiet" @click="copyReminder(invoice, reminders.get(invoice.id)!)">Herinnering kopiëren</button>
              <button class="btn-quiet" @click="markPaid(invoice)">Betaald</button>
            </template>
            <button v-if="invoice.kind === 'invoice' && invoice.status !== 'credited'" class="btn-quiet" @click="crediting = invoice">Crediteren</button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>

  <AppModal v-if="creating" title="Nieuwe factuur" wide @close="creating = false">
    <InvoiceEditor @saved="creating = false" @cancel="creating = false" />
  </AppModal>

  <AppModal v-if="crediting" :title="`Factuur ${crediting.number} crediteren`" @close="crediting = null">
    <p class="mb-4 text-sm">
      Er wordt een creditnota gemaakt voor het volledige bedrag (<AmountText :cents="-crediting.totalCents" />). De factuur blijft bewaard en krijgt de status gecrediteerd.
    </p>
    <div class="flex justify-end gap-2">
      <button class="btn-secondary" @click="crediting = null">Annuleren</button>
      <button class="btn-primary" @click="confirmCredit">Creditnota maken</button>
    </div>
  </AppModal>
</template>
