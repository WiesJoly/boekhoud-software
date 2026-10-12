import type { Unsubscribe } from 'firebase/firestore'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { loadFiscal } from '../data/fiscal'
import { invoicesRepo } from '../data/invoices'
import {
  consultsRepo, debtorsRepo, expensesRepo, hoursRepo, mileageRepo, servicesRepo, settingsRepo, supplierRulesRepo, transactionsRepo,
} from '../data/repos'
import type { ReportInput } from '../domain/annualReport'
import { FISCAL_DEFAULTS_2026, type FiscalParameters } from '../domain/fiscal'
import { taxedTurnover } from '../domain/vatReturn'
import { proRata } from '../domain/vat'
import type { BankTransaction, Consult, Debtor, Expense, HoursEntry, Invoice, Mileage, Service, Settings } from '../domain/types'
import { useToastStore } from './toast'

export const today = () => new Date().toISOString().slice(0, 10)

export const usePracticeStore = defineStore('practice', () => {
  const settings = ref<Settings | null>(null)
  const settingsLoaded = ref(false)
  const services = ref<Service[]>([])
  const debtors = ref<Debtor[]>([])
  const consults = ref<Consult[]>([])
  const invoices = ref<Invoice[]>([])
  const expenses = ref<Expense[]>([])
  const transactions = ref<BankTransaction[]>([])
  const mileage = ref<Mileage[]>([])
  const hours = ref<HoursEntry[]>([])
  const supplierRules = ref<Record<string, string>>({})
  const fiscal = ref<FiscalParameters>(FISCAL_DEFAULTS_2026)
  const fiscalUsingDefaults = ref(true)

  let unsubscribers: Unsubscribe[] = []
  let settingsReady: Promise<void> = Promise.resolve()
  let startedFor: string | null = null

  /** Subscribes to the practice of this user; repeated calls for the same user are no-ops. */
  function start(uid: string) {
    if (startedFor === uid) return
    stop()
    startedFor = uid
    const toast = useToastStore()
    const onError = (e: Error) => toast.error(`Gegevens laden mislukt: ${e.message}`)
    settingsReady = new Promise((resolve) => {
      unsubscribers.push(settingsRepo.subscribe((s) => { settings.value = s; settingsLoaded.value = true; resolve() }, (e) => { onError(e); resolve() }))
    })
    unsubscribers.push(
      servicesRepo.subscribe((x) => (services.value = x.sort((a, b) => a.name.localeCompare(b.name))), onError),
      debtorsRepo.subscribe((x) => (debtors.value = x.sort((a, b) => a.displayName.localeCompare(b.displayName))), onError),
      consultsRepo.subscribe((x) => (consults.value = x.sort((a, b) => b.date.localeCompare(a.date))), onError),
      invoicesRepo.subscribe((x) => (invoices.value = x.sort((a, b) => b.number.localeCompare(a.number))), onError),
      expensesRepo.subscribe((x) => (expenses.value = x.sort((a, b) => b.date.localeCompare(a.date))), onError),
      transactionsRepo.subscribe((x) => (transactions.value = x.sort((a, b) => b.date.localeCompare(a.date))), onError),
      mileageRepo.subscribe((x) => (mileage.value = x.sort((a, b) => b.date.localeCompare(a.date))), onError),
      hoursRepo.subscribe((x) => (hours.value = x.sort((a, b) => b.date.localeCompare(a.date))), onError),
      supplierRulesRepo.subscribe((x) => (supplierRules.value = Object.fromEntries(x.map((r) => [r.id, r.category]))), onError),
    )
    loadYear(Number(today().slice(0, 4))).catch(onError)
  }

  async function loadYear(year: number) {
    const { params, usingDefaults } = await loadFiscal(year)
    fiscal.value = params
    fiscalUsingDefaults.value = usingDefaults
  }

  function stop() {
    startedFor = null
    unsubscribers.forEach((u) => u())
    unsubscribers = []
    settings.value = null
    settingsLoaded.value = false
  }

  const debtorById = computed(() => new Map(debtors.value.map((d) => [d.id, d])))

  const bankBalance = computed(() => {
    const s = settings.value
    if (!s) return 0
    return transactions.value.filter((t) => t.date >= s.openingBalanceDate).reduce((sum, t) => sum + t.amountCents, s.openingBalanceCents)
  })

  /** Taxed share of this year's turnover, for mixed-use input VAT. */
  const currentProRata = computed(() => {
    const year = Number(today().slice(0, 4))
    const yearInvoices = invoices.value.filter((i) => i.date.startsWith(`${year}-`))
    const consultTurnover = consults.value
      .filter((c) => c.date.startsWith(`${year}-`) && c.status !== 'rejected' && !c.invoiceId)
      .reduce((s, c) => s + c.amountCents, 0)
    const total = yearInvoices.flatMap((i) => i.lines).reduce((s, l) => s + Math.round(l.qty * l.unitCents), consultTurnover)
    return proRata(taxedTurnover(year, invoices.value), total)
  })

  function reportInput(year: number): ReportInput | null {
    if (!settings.value) return null
    return {
      year,
      settings: settings.value,
      services: services.value,
      debtors: debtors.value,
      consults: consults.value,
      invoices: invoices.value,
      expenses: expenses.value,
      transactions: transactions.value,
      mileage: mileage.value,
      mileageRateCents: fiscal.value.mileageRateCents,
    }
  }

  return {
    settings, settingsLoaded, services, debtors, consults, invoices, expenses, transactions, mileage, hours, supplierRules,
    fiscal, fiscalUsingDefaults, debtorById, bankBalance, currentProRata,
    start, stop, loadYear, reportInput,
    whenSettingsLoaded: () => settingsReady,
  }
})
