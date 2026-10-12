export type VatCode = 'exempt' | 'standard21' | 'outside'
export type VatProfile = 'exempt' | 'mixed' | 'taxed' | 'small'
/** mutuality = ziekenfonds; network = netwerk geestelijke gezondheid of andere overheid. */
export type DebtorType = 'mutuality' | 'network' | 'client' | 'organisation'
export type ConsultStatus = 'registered' | 'declared' | 'rejected' | 'paid'
export type VatAttribution = 'taxed' | 'exempt' | 'mixed'
export type MatchType = 'invoice' | 'consults' | 'expense' | 'private' | 'other'

export interface Settings {
  name: string
  address: string
  /** KBO-ondernemingsnummer */
  enterpriseNumber: string
  vatNumber: string
  rizivNumber: string
  /** Visumnummer FOD Volksgezondheid */
  visumNumber: string
  iban: string
  vatProfile: VatProfile
  openingBalanceCents: number
  openingBalanceDate: string
}

export interface Service {
  id: string
  name: string
  code: string
  rateCents: number
  vatCode: VatCode | null
  /** Conventietarief / maximumhonorarium */
  maxRateCents?: number
  revenueAccount: string
  isCare: boolean
}

export interface Debtor {
  id: string
  type: DebtorType
  /** Shown everywhere in the app; for clients this is the client number. */
  displayName: string
  /** Only printed on the invoice itself. */
  invoiceName: string
  address: string
  email: string
  vatNumber?: string
  remindersEnabled: boolean
}

export interface Consult {
  id: string
  externalId: string
  date: string
  debtorId: string
  serviceCode: string
  amountCents: number
  status: ConsultStatus
  rejectionReason?: string
  paidCents: number
  invoiceId?: string
  bankTransactionId?: string
  resolution?: string
}

export interface InvoiceLine {
  serviceId: string
  description: string
  date: string
  qty: number
  unitCents: number
  vatCode: VatCode
}

export interface Invoice {
  id: string
  number: string
  kind: 'invoice' | 'credit'
  creditOf?: string
  date: string
  dueDate: string
  debtorId: string
  lines: InvoiceLine[]
  netCents: number
  vatCents: number
  totalCents: number
  paymentReference: string
  paidCents: number
  status: 'open' | 'paid' | 'credited'
  reminders: { level: 1 | 2; date: string }[]
  consultIds?: string[]
}

export interface Expense {
  id: string
  date: string
  supplier: string
  category: string
  amountInclCents: number
  vatCents: number
  vatAttribution: VatAttribution
  deductibleVatCents: number
  receiptPath?: string
  capitalize: boolean
  assetLifeYears?: number
}

export interface BankTransaction {
  id: string
  date: string
  amountCents: number
  counterparty: string
  description: string
  importHash: string
  match?: { type: MatchType; ids: string[] }
  confirmed: boolean
}

export interface Mileage {
  id: string
  date: string
  from: string
  to: string
  km: number
  purpose: string
}
