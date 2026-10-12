# Boekhouding psychologen MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A Vue 3 + Firebase web app in which a solo Dutch psychologist (eenmanszaak) manages invoices, imported declarations, expenses, bank transactions, btw and year-end figures.

**Architecture:** SPA talking directly to Firestore/Storage, isolated per user by security rules (`practices/{uid}/…`). All business rules are pure TypeScript in `src/domain/` (no Vue/Firebase imports), unit-tested with Vitest. Thin repositories in `src/data/`, Pinia stores in `src/stores/`, one view per screen in `src/views/`.

**Tech Stack:** Vue 3.5, TypeScript, Vite 8, Vue Router 4, Pinia 3, Tailwind CSS 4 (`@tailwindcss/vite`), Firebase JS SDK 13, firebase-tools 15 (emulators), Vitest 5, `@firebase/rules-unit-testing`, Playwright (final check).

**Spec:** `docs/superpowers/specs/2026-10-12-boekhouding-mvp-design.md`

## Global Constraints

- All amounts are integer cents (`number`); never floats in storage. Rounding: `Math.round` per line.
- Dates are ISO strings `YYYY-MM-DD`.
- UI text in Dutch. Code identifiers in English.
- Domain modules (`src/domain/**`) must not import from `vue`, `pinia` or `firebase`.
- Every practice document lives under `practices/{uid}`; `fiscalParameters/{year}` is global read-only.
- Invoices are never deleted; corrections are credit invoices (`kind: 'credit'`).
- Invoice number format `YYYY-NNNN`, sequence restarts per calendar year, gap-free.
- Payment reference format: `<praktijknaam> – factuur <nummer>`; never contains care information.
- Dashboards, reports and exports contain no client names and no prestatiecodes (service codes); client debtors appear by `displayName` (client number) only.
- Fiscal values come from `fiscalParameters`, never hard-coded in logic; seeded values are labelled "controleer met fiscalist".
- Capitalisation threshold € 450 excl. btw (from fiscal parameters: `capitalizeThreshold`).
- Prerequisite: Java 21+ for the Firestore emulator (`brew install openjdk@21`). Not currently installed on this machine — ask the user before installing.

## Review Focus

1. **Dutch number formats in imports** ("1.234,56", "-12,50", "+12,50", "12.5") must parse to the right cents or produce a row error — never silently a wrong amount. Tests in Task 2 and Task 5.
2. **Re-importing the same bank or declaration file** must not create duplicates. Tests in Task 5 (`importHash` stable) and Task 6 (upsert by `externalId`).
3. **Invoice numbering across a year boundary and with an empty counter** must give `2027-0001` after `2026-0042` and `YYYY-0001` initially. Test in Task 4.
4. **Credit invoice for a (partly) paid invoice:** outstanding never goes negative and the original is marked `credited`. Test in Task 9 (`outstandingCents`).
5. **Privacy leaks in exports:** the CSV export and P&L lines contain no `invoiceName` and no `serviceCode`. Test in Task 12.

---

## File Structure

```
index.html, vite.config.ts, vitest.config.ts, tsconfig*.json, firebase.json, .firebaserc,
firestore.rules, firestore.indexes.json, storage.rules, .env.example
scripts/seed-fiscal.ts                    – seeds fiscalParameters into emulator/project
src/main.ts, src/App.vue, src/style.css
src/firebase.ts                           – init app, connect emulators when VITE_USE_EMULATORS=true
src/router.ts                             – routes + auth guard
src/domain/types.ts                       – shared domain types
src/domain/money.ts                       – cents parse/format
src/domain/vat.ts                         – line btw, input btw, warnings
src/domain/invoiceNumber.ts               – numbering + payment reference + extraction
src/domain/bankImport.ts                  – ING/Rabobank/ABN AMRO CSV + MT940
src/domain/declarationImport.ts           – declaration/retour CSV + rejection actions
src/domain/matching.ts                    – bank match suggestions
src/domain/expenses.ts                    – categories, supplier rules, capitalisation
src/domain/depreciation.ts                – straight-line schedules
src/domain/invoices.ts                    – totals, outstanding, credit, reminders
src/domain/fiscal.ts                      – FiscalParameters type + 2026 defaults
src/domain/taxEstimate.ts                 – IB + Zvw estimate, reservation
src/domain/vatReturn.ts                   – quarter figures, KOR signal
src/domain/accounts.ts                    – chart of accounts
src/domain/annualReport.ts                – P&L, balance, export rows
src/data/*.ts                             – Firestore repositories
src/stores/*.ts                           – Pinia stores
src/components/*.vue                      – AppShell, Money, Toast, ImportPreview, DataTable, Modal
src/views/*.vue                           – Login, Overview, Consults, Invoices, InvoicePrint, Expenses, Bank, Tax, Settings
tests/domain/*.test.ts, tests/rules/*.test.ts
```

---

### Task 1: Project scaffold, Tailwind, Firebase emulators, app shell

**Files:**
- Create: everything at repo root listed above except rules contents; `src/main.ts`, `src/App.vue`, `src/style.css`, `src/firebase.ts`, `src/router.ts`, `src/components/AppShell.vue`, placeholder views (`<h1>` with screen name), `tests/smoke.test.ts`

**Interfaces:**
- Produces: `db`, `auth`, `storage` exports from `src/firebase.ts`; route names `overview`, `consults`, `invoices`, `invoice-print`, `expenses`, `bank`, `tax`, `settings`, `login`.

- [ ] **Step 1:** Scaffold with `npm create vite@latest . -- --template vue-ts` (keep existing files), then `npm i vue-router pinia firebase` and `npm i -D tailwindcss @tailwindcss/vite vitest @vue/test-utils jsdom firebase-tools @firebase/rules-unit-testing tsx firebase-admin`.
- [ ] **Step 2:** Configure Tailwind via `@tailwindcss/vite` plugin and `@import "tailwindcss";` in `src/style.css`. Configure `vitest.config.ts` with two projects: `domain` (environment `node`, `tests/domain/**`) and `rules` (`tests/rules/**`, run only via `npm run test:rules`).
- [ ] **Step 3:** `firebase.json` with emulators auth 9099, firestore 8080, storage 9199, ui 4000; `.firebaserc` default project `demo-boekhouding` (demo- prefix = emulator-only). `.env.example` with `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_APP_ID`, `VITE_USE_EMULATORS=true`.
- [ ] **Step 4:** `src/firebase.ts` initialises from env (falls back to `projectId: 'demo-boekhouding'` when emulators on) and calls `connectAuthEmulator`, `connectFirestoreEmulator`, `connectStorageEmulator` when `VITE_USE_EMULATORS === 'true'`.
- [ ] **Step 5:** `AppShell.vue`: sidebar (desktop) / bottom nav (mobile) with the 7 screens: Overzicht, Consulten, Facturen, Uitgaven, Bank, Belasting, Instellingen. Router with placeholder views.
- [ ] **Step 6:** `package.json` scripts: `dev`, `build` (`vue-tsc -b && vite build`), `test` (`vitest run --project domain`), `test:rules` (`firebase emulators:exec --only firestore,storage "vitest run --project rules"`), `emulators` (`firebase emulators:start --import=.emulator-data --export-on-exit`), `seed` (`tsx scripts/seed-fiscal.ts`). Add `.emulator-data` to `.gitignore`.
- [ ] **Step 7:** `tests/smoke.test.ts`: `expect(1 + 1).toBe(2)`; run `npm test` → PASS; run `npm run build` → exit 0.
- [ ] **Step 8:** Commit `chore: scaffold vue + tailwind + firebase emulators`.

### Task 2: Domain types and money

**Files:**
- Create: `src/domain/types.ts`, `src/domain/money.ts`, `tests/domain/money.test.ts`

**Interfaces:**
- Produces in `types.ts` (exact names used by all later tasks):
  - `type VatCode = 'exempt' | 'standard21' | 'outside'`
  - `type VatProfile = 'exempt' | 'mixed' | 'taxed'`
  - `type DebtorType = 'insurer' | 'municipality' | 'client' | 'organisation'`
  - `type ConsultStatus = 'registered' | 'declared' | 'rejected' | 'paid'`
  - `interface Settings { name; address; kvk; agbPractice; agbProvider; big; vatNumber; iban; vatProfile: VatProfile; openingBalanceCents: number; openingBalanceDate: string }`
  - `interface Service { id; name; code: string; rateCents; vatCode: VatCode | null; nzaMaxCents?: number; revenueAccount: string; isCare: boolean }`
  - `interface Debtor { id; type: DebtorType; displayName; invoiceName; address; email; remindersEnabled: boolean }`
  - `interface Consult { id; externalId; date; debtorId; serviceCode; amountCents; status: ConsultStatus; rejectionReason?: string; paidCents: number; invoiceId?: string; bankTransactionId?: string; resolution?: string }`
  - `interface InvoiceLine { serviceId; description; date; qty: number; unitCents: number; vatCode: VatCode }`
  - `interface Invoice { id; number; kind: 'invoice' | 'credit'; creditOf?: string; date; dueDate; debtorId; lines: InvoiceLine[]; netCents; vatCents; totalCents; paymentReference; paidCents: number; status: 'open' | 'paid' | 'credited'; reminders: { level: 1 | 2; date: string }[]; consultIds?: string[] }`
  - `type VatAttribution = 'taxed' | 'exempt' | 'mixed'`
  - `interface Expense { id; date; supplier; category; amountInclCents; vatCents; vatAttribution: VatAttribution; deductibleVatCents; receiptPath?: string; capitalize: boolean; assetLifeYears?: number }`
  - `type MatchType = 'invoice' | 'consults' | 'expense' | 'private' | 'other'`
  - `interface BankTransaction { id; date; amountCents; counterparty; description; importHash: string; match?: { type: MatchType; ids: string[] }; confirmed: boolean }`
  - `interface Mileage { id; date; from; to; km: number; purpose }`
  - `interface HoursEntry { id; date; hours: number; kind: 'direct' | 'admin' | 'training' | 'intervision' }`
- Produces in `money.ts`: `parseAmount(input: string): number | null` (returns cents), `formatCents(cents: number): string`.

- [ ] **Step 1: Write failing tests** `tests/domain/money.test.ts`:
  - `parseAmount('1.234,56') === 123456`, `parseAmount('-12,50') === -1250`, `parseAmount('+12,50') === 1250`, `parseAmount('12.5') === 1250`, `parseAmount('12') === 1200`, `parseAmount('1,234.56') === 123456`, `parseAmount('abc') === null`, `parseAmount('') === null`.
  - `formatCents(123456) === '€ 1.234,56'`, `formatCents(-1250) === '-€ 12,50'`, `formatCents(0) === '€ 0,00'`.
- [ ] **Step 2:** `npm test` → FAIL (module not found).
- [ ] **Step 3:** Implement. Rule for parsing: strip spaces/€; if both `.` and `,` occur, the last one is the decimal separator; if only `,`, it is decimal; if only `.` followed by exactly 3 digits and more than one group or text like `1.234`, treat as thousands — specifically `/^\d{1,3}(\.\d{3})+$/` → thousands, otherwise decimal. Use `Intl.NumberFormat('nl-NL', {style:'currency', currency:'EUR'})` for formatting but normalise to the exact strings in the tests (replace non-breaking space).
- [ ] **Step 4:** `npm test` → PASS.
- [ ] **Step 5:** Commit `feat(domain): types and money parsing`.

### Task 3: Btw rules

**Files:** Create `src/domain/vat.ts`, `tests/domain/vat.test.ts`

**Interfaces:**
- Consumes: types from Task 2.
- Produces:
  - `lineVat(netCents: number, code: VatCode): number` — 21% rounded for `standard21`, else 0.
  - `inputVat(vatCents: number, profile: VatProfile, attribution: VatAttribution, proRata: number): { deductibleVatCents: number; nonDeductibleVatCents: number }`
  - `proRata(taxedTurnoverCents: number, totalTurnoverCents: number): number` — 0..1, 0 when total is 0.
  - `type VatWarning = 'MISSING_VAT_CODE' | 'EXEMPT_TO_ORGANISATION' | 'ABOVE_NZA_MAX'`
  - `invoiceWarnings(lines: InvoiceLine[], debtor: Debtor, services: Service[]): VatWarning[]` (deduplicated)

- [ ] **Step 1: Failing tests:**
  - `lineVat(10000,'standard21') === 2100`, `lineVat(333,'standard21') === 70`, `lineVat(10000,'exempt') === 0`.
  - `inputVat(2100,'exempt','mixed',0.5)` → `{0, 2100}`; `inputVat(2100,'taxed','mixed',0)` → `{2100, 0}`; `inputVat(2100,'mixed','taxed',0.3)` → `{2100,0}`; `inputVat(2100,'mixed','exempt',0.3)` → `{0,2100}`; `inputVat(2100,'mixed','mixed',0.3)` → `{630,1470}`.
  - `proRata(3000,10000) === 0.3`, `proRata(0,0) === 0`.
  - Warnings: line whose service has `vatCode: null` → includes `MISSING_VAT_CODE`; exempt line to `type: 'organisation'` → `EXEMPT_TO_ORGANISATION`; `unitCents` above service `nzaMaxCents` → `ABOVE_NZA_MAX`; clean invoice to client → `[]`.
- [ ] **Step 2:** Run → FAIL. **Step 3:** Implement. **Step 4:** Run → PASS.
- [ ] **Step 5:** Commit `feat(domain): btw rules and warnings`.

### Task 4: Invoice numbering and payment references

**Files:** Create `src/domain/invoiceNumber.ts`, `tests/domain/invoiceNumber.test.ts`

**Interfaces:**
- Produces:
  - `interface InvoiceCounter { year: number; next: number }`
  - `allocateInvoiceNumber(counter: InvoiceCounter | null, year: number): { number: string; counter: InvoiceCounter }`
  - `paymentReference(practiceName: string, invoiceNumber: string): string`
  - `extractInvoiceNumbers(text: string): string[]`

- [ ] **Step 1: Failing tests:**
  - `allocateInvoiceNumber(null, 2026)` → `{ number: '2026-0001', counter: { year: 2026, next: 2 } }`
  - `allocateInvoiceNumber({year:2026,next:42}, 2026).number === '2026-0042'`
  - `allocateInvoiceNumber({year:2026,next:43}, 2027)` → `'2027-0001'`, counter `{2027, 2}`
  - `allocateInvoiceNumber({year:2026,next:10000}, 2026).number === '2026-10000'` (no truncation)
  - `paymentReference('Praktijk De Linde','2026-0142') === 'Praktijk De Linde – factuur 2026-0142'`
  - `extractInvoiceNumbers('Betaling factuur 2026-0142 en 2026-0143') ` → `['2026-0142','2026-0143']`; `extractInvoiceNumbers('IBAN NL12 3456') → []`
- [ ] **Steps 2–4:** FAIL → implement → PASS.
- [ ] **Step 5:** Commit `feat(domain): invoice numbering and payment references`.

### Task 5: Bank import (CSV + MT940)

**Files:** Create `src/domain/bankImport.ts`, `tests/domain/bankImport.test.ts`, `tests/fixtures/ing.csv`, `rabobank.csv`, `abnamro.txt`, `sample.mt940`

**Interfaces:**
- Consumes: `parseAmount` (Task 2).
- Produces:
  - `interface ParsedBankRow { date: string; amountCents: number; counterparty: string; description: string; importHash: string }`
  - `interface ImportResult<T> { rows: T[]; errors: { line: number; message: string }[] }`
  - `detectBankFormat(text: string): 'ing' | 'rabobank' | 'abnamro' | 'mt940' | null`
  - `parseBankFile(text: string): ImportResult<ParsedBankRow>` — throws `Error('Onbekend bankformaat')` when detection fails.

Formats:
- ING CSV: header `"Datum","Naam / Omschrijving","Rekening","Tegenrekening","Code","Af Bij","Bedrag (EUR)","Mutatiesoort","Mededelingen"`, comma separator, quoted, date `YYYYMMDD`, `Af Bij` = `Af` (negative) / `Bij`.
- Rabobank CSV: header contains `"Datum"`, `"Bedrag"`, `"Naam tegenpartij"`, `"Omschrijving-1"`; date `YYYY-MM-DD`; signed amount `+12,50`/`-12,50`.
- ABN AMRO TXT: no header, tab-separated: account, currency, date `YYYYMMDD`, startBalance, endBalance, valueDate, amount (`-12,50`), description.
- MT940: `:61:` line `YYMMDD[MMDD]C|D<amount with comma>…`, following `:86:` lines = description; counterparty = text after `/NAME/` in `:86:` if present.
- `importHash` = `${date}|${amountCents}|${counterparty}|${description}` plus an occurrence index for identical rows within the same file (so two identical €10 payments on one day both import, but re-importing the file yields identical hashes).

- [ ] **Step 1: Failing tests** with small fixtures (2–3 rows each):
  - each format detected correctly; `detectBankFormat('foo') === null`.
  - ING row `"20260105","CZ Zorgverzekeringen",...,"Bij","1.234,56",...` → `{date:'2026-01-05', amountCents:123456, counterparty:'CZ Zorgverzekeringen'}`; `Af` row → negative.
  - Rabobank `-12,50` → `-1250`. ABN row parsed. MT940 `:61:2601050105C95,00NTRF` → `{date:'2026-01-05', amountCents:9500}`.
  - row with unparsable amount → appears in `errors` with its line number, other rows still returned.
  - parsing the same text twice yields identical `importHash` arrays; two identical rows in one file yield two distinct hashes.
- [ ] **Steps 2–4:** FAIL → implement (small CSV splitter handling quotes; no dependency) → PASS.
- [ ] **Step 5:** Commit `feat(domain): bank statement import`.

### Task 6: Declaration / retourinformatie import

**Files:** Create `src/domain/declarationImport.ts`, `tests/domain/declarationImport.test.ts`, `tests/fixtures/declaraties.csv`

**Interfaces:**
- Consumes: `parseAmount`, `ImportResult` (Task 5).
- Produces:
  - `interface ParsedConsult { externalId; date; debtorName; serviceCode; amountCents; status: ConsultStatus; rejectionReason?: RejectionReason; paidCents: number }`
  - `type RejectionReason = 'insurance_ended' | 'referral_missing' | 'max_reached' | 'other'`
  - `parseDeclarationFile(text: string): ImportResult<ParsedConsult>`
  - `rejectionAction(reason: RejectionReason): string`
  - `mergeConsult(existing: Consult | undefined, parsed: ParsedConsult, debtorId: string): Omit<Consult,'id'>` — keeps `invoiceId`, `bankTransactionId`, `resolution` from existing.

CSV: `;`-separated, header `consult_id;datum;debiteur;prestatiecode;bedrag;status;afwijsreden;betaald`; date `YYYY-MM-DD` or `DD-MM-YYYY`; status `geregistreerd|gedeclareerd|afgewezen|betaald`; afwijsreden free text mapped: contains `beëindigd`/`beeindigd` → `insurance_ended`, `verwijzing` → `referral_missing`, `maximum`/`plafond` → `max_reached`, else `other`.

Actions (exact copy):
- `insurance_ended` → `'Verzekering beëindigd: factureer het consult aan de cliënt.'`
- `referral_missing` → `'Verwijsbrief ontbreekt: vraag de verwijzing op en dien opnieuw in.'`
- `max_reached` → `'Maximum bereikt: neem contact op met de verzekeraar over het plafond.'`
- `other` → `'Bekijk de afwijzing in het EPD en dien zo nodig opnieuw in.'`

- [ ] **Step 1: Failing tests:** parses 3 fixture rows with correct cents/status; `DD-MM-YYYY` date normalised; unknown status → row error; `afgewezen` with reason `Verwijzing ontbreekt` → `referral_missing`; `mergeConsult(existing with invoiceId 'x', parsed paid)` keeps `invoiceId: 'x'` and updates status to `paid`.
- [ ] **Steps 2–4:** FAIL → implement → PASS.
- [ ] **Step 5:** Commit `feat(domain): declaration import`.

### Task 7: Bank matching suggestions

**Files:** Create `src/domain/matching.ts`, `tests/domain/matching.test.ts`

**Interfaces:**
- Consumes: `extractInvoiceNumbers` (Task 4), types.
- Produces: `suggestMatch(tx: BankTransaction, ctx: { invoices: Invoice[]; consults: Consult[]; debtors: Debtor[]; expenses: Expense[] }): { type: MatchType; ids: string[]; reason: string } | null`

Order of rules (first hit wins):
1. Incoming, description contains an invoice number of an `open` invoice → `invoice` with that id (multiple numbers → all ids).
2. Incoming, counterparty contains (case-insensitive) an insurer/municipality debtor's `displayName` → collect that debtor's consults with `status === 'paid'` and no `bankTransactionId`; if a subset in date order whose `paidCents` sum equals `amountCents` exists (greedy oldest-first prefix sum), → `consults` with those ids.
3. Outgoing, an expense without linked transaction where `-amountCents === amountInclCents` and supplier is contained in counterparty (case-insensitive) → `expense`.
4. Otherwise `null`.

- [ ] **Step 1: Failing tests:** one per rule plus: invoice number present but invoice already `paid` → not matched by rule 1; insurer payment of 9500 with paid consults 5000+4500+3000 (oldest first) → first two ids; insurer payment 1234 with no sum match → `null`.
- [ ] **Steps 2–4:** FAIL → implement → PASS.
- [ ] **Step 5:** Commit `feat(domain): bank match suggestions`.

### Task 8: Expenses, categories, depreciation

**Files:** Create `src/domain/expenses.ts`, `src/domain/depreciation.ts`, `src/domain/accounts.ts`, tests for each

**Interfaces:**
- Produces in `accounts.ts`: `interface Account { id: string; name: string; group: 'fixed_assets' | 'current_assets' | 'liabilities' | 'equity' | 'revenue' | 'costs' }` and `ACCOUNTS: Account[]` — the accounts from the functional design's Rekeningschema (ids kebab-case, e.g. `inventaris`, `zakelijke-bank`, `debiteuren-verzekeraars`, `nog-te-declareren`, `btw-af-te-dragen`, `omzet-zorg-verzekeraar`, `omzet-coaching`, `kosten-huisvesting`, `kosten-afschrijvingen`, `kosten-niet-aftrekbare-btw`, `prive-opnamen` …). Test: ids unique and at least 40 accounts.
- Produces in `expenses.ts`:
  - `CATEGORIES: { id: string; label: string; account: string; hint: string }[]` — the 15 categories from the functional design table, `hint` = its "Fiscale aandachtspunt" text.
  - `supplierKey(supplier: string): string` (lowercase, trimmed, collapse whitespace, strip `b.v.`/`bv`)
  - `suggestCategory(supplier: string, rules: Record<string, string>): string | null`
  - `shouldCapitalize(amountExclCents: number, thresholdCents: number): boolean` (strictly greater)
- Produces in `depreciation.ts`:
  - `depreciationSchedule(costCents: number, startDate: string, lifeYears: number, residualCents = 0): { month: string; amountCents: number }[]` — monthly, starting the month of `startDate`, last month absorbs rounding.
  - `depreciationForYear(schedule, year: number): number`

- [ ] **Step 1: Failing tests:** `supplierKey(' Zoom  B.V. ') === 'zoom'`; `suggestCategory('ZOOM bv', {zoom:'software-ict'}) === 'software-ict'`; `shouldCapitalize(45000,45000) === false`, `45001 → true`; `depreciationSchedule(120000,'2026-07-15',5)` has 60 entries, first `'2026-07'` = 2000, sum = 120000; `depreciationSchedule(100000,'2026-01-01',3)` sums to exactly 100000; `depreciationForYear(...,2026)` for the July example = 12000.
- [ ] **Steps 2–4:** FAIL → implement → PASS.
- [ ] **Step 5:** Commit `feat(domain): expense categories and depreciation`.

### Task 9: Invoice totals, credits, outstanding, reminders

**Files:** Create `src/domain/invoices.ts`, `tests/domain/invoices.test.ts`

**Interfaces:**
- Consumes: `lineVat` (Task 3).
- Produces:
  - `invoiceTotals(lines: InvoiceLine[]): { netCents; vatCents; totalCents }` (vat per line, summed)
  - `buildCreditLines(original: Invoice): InvoiceLine[]` (same lines, negative `qty`)
  - `outstandingCents(invoice: Invoice, credits: Invoice[]): number` — `max(0, total + sum(credits for this invoice) − paid)`
  - `dueReminders(invoices: Invoice[], debtors: Debtor[], today: string): { invoiceId: string; level: 1 | 2 }[]` — only `kind:'invoice'`, `status:'open'`, debtor `type:'client'` with `remindersEnabled`; level 1 when ≥ 14 days after `date` and no level-1 reminder; level 2 when ≥ 28 days and level 1 exists and no level 2.
  - `REMINDER_TEXT: Record<1 | 2, string>` — gentle Dutch copy:
    - 1: `'Vriendelijke herinnering: de factuur {nummer} van {datum} staat nog open. Mocht de betaling al onderweg zijn, dan kunt u dit bericht als niet verzonden beschouwen.'`
    - 2: `'Tweede herinnering: de factuur {nummer} van {datum} staat nog open. Neem gerust contact op als betalen op dit moment lastig is, dan zoeken we samen naar een oplossing.'`

- [ ] **Step 1: Failing tests:** totals for one exempt 9500 line + one 21% 10000 line → `{19500, 2100, 21600}`; credit of that → totals `{-19500,-2100,-21600}`; outstanding: total 10000 paid 4000 credit -10000 → `0` (never negative); total 10000 paid 0 no credit → 10000; reminders: invoice dated 2026-01-01, today 2026-01-14 → none; 2026-01-15 → level 1; with level-1 sent, today 2026-01-29 → level 2; debtor `remindersEnabled:false` → none; organisation debtor → none.
- [ ] **Steps 2–4:** FAIL → implement → PASS.
- [ ] **Step 5:** Commit `feat(domain): invoice totals, credits, reminders`.

### Task 10: Fiscal parameters and tax estimate

**Files:** Create `src/domain/fiscal.ts`, `src/domain/taxEstimate.ts`, `tests/domain/taxEstimate.test.ts`, `scripts/seed-fiscal.ts`

**Interfaces:**
- Produces in `fiscal.ts`:
  - `interface FiscalParameters { year: number; incomeTaxBrackets: { upToCents: number | null; rate: number }[]; zvwRate: number; zvwMaxIncomeCents: number; zelfstandigenaftrekCents: number; startersaftrekCents: number; mkbWinstvrijstellingRate: number; urencriteriumHours: number; korThresholdCents: number; mileageRateCents: number; capitalizeThresholdCents: number; kia: { fromCents: number; toCents: number; rate: number }[]; verified: false }`
  - `FISCAL_DEFAULTS_2026: FiscalParameters` — approximate values (all `verified: false`): brackets 35,75% to € 38.883, 37,56% to € 78.426, 49,50% above; Zvw 4,85% max € 79.409; zelfstandigenaftrek € 1.200; startersaftrek € 2.123; MKB-winstvrijstelling 12,7%; urencriterium 1225; KOR € 20.000; km € 0,23; capitalize € 450; KIA 28% from € 2.901 to € 71.683.
- Produces in `taxEstimate.ts`:
  - `estimateTax(input: { profitCents: number; hours: number; isStarter: boolean; params: FiscalParameters }): { taxableProfitCents; incomeTaxCents; zvwCents; totalCents; zelfstandigenaftrekApplied: boolean }`
  - `reservationToDate(profitToDateCents: number, today: string, hoursToDate: number, isStarter: boolean, params: FiscalParameters): number` — annualise profit by elapsed days (`dayOfYear/daysInYear`), project hours the same way, run `estimateTax`, multiply total by the elapsed fraction.

Calculation: profit − (zelfstandigenaftrek [+ startersaftrek] if hours ≥ urencriterium, not below 0) → × (1 − mkbRate) = taxable; brackets applied progressively; Zvw = rate × min(taxable, max). Heffingskortingen ignored on purpose (conservative); the UI states this.

- [ ] **Step 1: Failing tests** with test params `brackets [{upTo:4000000, rate:0.4},{upTo:null,rate:0.5}], zvwRate 0.0485, zvwMax 7940900, ZA 120000, SA 0, mkb 0.127, uren 1225`:
  - profit 6000000, hours 1300 → taxable 5133240, IB 2166620, Zvw 248962, total 2415582, ZA applied.
  - profit 6000000, hours 1000 → taxable 5238000, IB 2219000, Zvw 254043.
  - profit 50000, hours 1300 → taxable 0, total 0 (no negatives).
  - `reservationToDate(3000000, '2026-07-02', 650, false, params)` equals `round(estimateTax({profit: 3000000*365/183, hours: 650*365/183}).total * 183/365)` (assert with a computed expectation).
- [ ] **Steps 2–4:** FAIL → implement → PASS.
- [ ] **Step 5:** `scripts/seed-fiscal.ts`: firebase-admin with `FIRESTORE_EMULATOR_HOST` honoured, writes `FISCAL_DEFAULTS_2026` to `fiscalParameters/2026`. Run against running emulator → doc visible in emulator UI.
- [ ] **Step 6:** Commit `feat(domain): fiscal parameters and tax estimate`.

### Task 11: Btw quarter and KOR signal

**Files:** Create `src/domain/vatReturn.ts`, `tests/domain/vatReturn.test.ts`

**Interfaces:**
- Consumes: `inputVat`, `proRata` (Task 3).
- Produces:
  - `quarterOf(date: string): { year: number; quarter: 1 | 2 | 3 | 4 }`
  - `vatReturn(year: number, quarter: 1|2|3|4, invoices: Invoice[], expenses: Expense[], profile: VatProfile, proRataRate: number): { box1aNetCents; box1aVatCents; box1eNetCents; box5bCents; payableCents }` — 1a = standard21 lines, 1e = exempt lines (invoice date in quarter, credits included); 5b = sum of expenses' `deductibleVatCents` in quarter; payable = 1a vat − 5b.
  - `korSignal(taxedTurnoverYearCents: number, params: FiscalParameters): { eligible: boolean; explanation: string }` — eligible when taxed turnover (exempt care excluded) < `korThresholdCents`; explanation in Dutch mentions that vrijgestelde zorg niet meetelt and to confirm with a fiscalist.

- [ ] **Step 1: Failing tests:** `quarterOf('2026-05-31')` → Q2; Q1 with one 21% invoice net 10000 in Feb, an exempt 9500 in March, one in April (excluded), expense deductible 500 in Jan → `{10000, 2100, 9500, 500, 1600}`; credit invoice in quarter reduces 1a; `korSignal(1500000)` eligible, `korSignal(2500000)` not.
- [ ] **Steps 2–4:** FAIL → implement → PASS.
- [ ] **Step 5:** Commit `feat(domain): btw quarter and KOR signal`.

### Task 12: Annual report and pseudonymised export

**Files:** Create `src/domain/annualReport.ts`, `tests/domain/annualReport.test.ts`

**Interfaces:**
- Consumes: `ACCOUNTS`, `CATEGORIES`, `depreciationSchedule`, `depreciationForYear`, `outstandingCents`, types.
- Produces:
  - `interface ReportInput { year; settings: Settings; services: Service[]; debtors: Debtor[]; consults: Consult[]; invoices: Invoice[]; expenses: Expense[]; transactions: BankTransaction[] }`
  - `profitAndLoss(input): { revenue: { account: string; cents: number }[]; costs: { account: string; cents: number }[]; profitCents: number }`
  - `balanceSheet(input): { assets: { account: string; cents: number }[]; liabilities: { account: string; cents: number }[]; equityCents: number }`
  - `revenueSplit(input, from: string, to: string): { careCents: number; otherCents: number }`
  - `exportRows(input): string[][]` — header `['datum','soort','rekening','debiteur','omschrijving','bedrag']`, then one row per invoice line (description = account name), consult (debiteur displayName) and expense (category label).
  - `toCsv(rows: string[][]): string` (`;`-separated, quoted when needed)

Rules:
- Revenue (factuurstelsel): invoice lines by invoice date excl. btw → service's `revenueAccount`; consults by consult date with status `declared`/`paid` and no `invoiceId` → `omzet-zorg-verzekeraar` (insurer) / `omzet-jeugdwet` (municipality); `registered` consults in the year → `nog-te-declareren` (revenue and asset).
- Costs: non-capitalised expenses `amountInclCents − deductibleVatCents` → category account; capitalised → depreciation for the year in `kosten-afschrijvingen`.
- Balance: bank = opening balance + transactions to 31-12; debtors = outstanding invoices + unpaid declared consults by debtor type; fixed assets = cost − cumulative depreciation; `btw-af-te-dragen` = sum of the year's `payableCents` (all quarters) when profile ≠ exempt; equity = assets − liabilities.

- [ ] **Step 1: Failing tests:** small fixture year → expected P&L lines and profit; a `registered` consult appears as `nog-te-declareren`; consult with `invoiceId` not double-counted; capitalised laptop of 120000 bought 2026-07-15 → 12000 depreciation, 108000 inventory; balance `assets − liabilities === equityCents`; **privacy:** `JSON.stringify(exportRows(input))` does not contain the client's `invoiceName` nor any `serviceCode`, and P&L output contains neither.
- [ ] **Steps 2–4:** FAIL → implement → PASS.
- [ ] **Step 5:** Commit `feat(domain): annual report and export`.

### Task 13: Security rules, repositories, auth

**Files:**
- Create: `firestore.rules`, `storage.rules`, `tests/rules/firestore.test.ts`, `src/data/repo.ts`, `src/data/*.ts` (settings, services, debtors, consults, invoices, expenses, supplierRules, bankTransactions, mileage, hours, fiscal), `src/stores/auth.ts`, `src/stores/practice.ts`, `src/views/LoginView.vue`, `src/components/Toast.vue`, `src/stores/toast.ts`
- Modify: `src/router.ts` (guard)

**Interfaces:**
- Consumes: domain types, `allocateInvoiceNumber`, `paymentReference`.
- Produces:
  - `src/data/repo.ts`: `collectionRepo<T extends { id: string }>(name: string)` returning `{ subscribe(cb: (items: T[]) => void): Unsubscribe; add(data: Omit<T,'id'>): Promise<string>; update(id, patch: Partial<T>): Promise<void>; upsert(id, data): Promise<void>; remove(id): Promise<void> }` scoped to `practices/{auth.currentUser.uid}/{name}`.
  - `src/data/invoices.ts`: `createInvoice(draft: Omit<Invoice,'id'|'number'|'paymentReference'>, practiceName: string): Promise<Invoice>` using `runTransaction` on `counters/invoice`; `createCredit(original: Invoice, practiceName): Promise<Invoice>` which also sets original `status: 'credited'`. No `remove` exported for invoices.
  - `src/data/fiscal.ts`: `loadFiscal(year: number): Promise<FiscalParameters>` — falls back to `FISCAL_DEFAULTS_2026` and sets `usingDefaults` flag.
  - `src/data/receipts.ts`: `uploadReceipt(file: File): Promise<string>` → Storage path `practices/{uid}/receipts/{uuid}-{name}`.
  - `useAuthStore()`: `user`, `ready`, `register(email,pw)`, `login(email,pw)`, `logout()`.
  - `usePracticeStore()`: reactive arrays for every collection plus `settings`, `fiscal`; `start()` subscribes all, `stop()` unsubscribes on logout.
  - `useToastStore()`: `error(msg: string)`, `success(msg: string)`.

Rules:
- `match /practices/{uid}/{document=**}`: read/write iff `request.auth.uid == uid`.
- `invoices/{id}`: `delete` denied for everyone; update must not change `number`.
- `fiscalParameters/{year}`: read if signed in; write false.
- Storage `practices/{uid}/**`: read/write iff owner, files < 10 MB, contentType image/* or application/pdf.

- [ ] **Step 1: Failing rules tests** (`@firebase/rules-unit-testing`, project `demo-boekhouding`): owner can read/write `practices/alice/expenses/x`; bob cannot read alice's; unauthenticated denied; delete of `practices/alice/invoices/i1` denied for alice; update changing `number` denied; `fiscalParameters/2026` readable by alice, write denied.
- [ ] **Step 2:** `npm run test:rules` → FAIL (needs Java; if Java missing, stop and ask the user).
- [ ] **Step 3:** Write rules → `npm run test:rules` → PASS.
- [ ] **Step 4:** Implement repositories, stores, Toast (all repo errors caught in stores and sent to `toast.error`, then rethrown to the caller only where the view needs it), `LoginView` (tabs Inloggen / Registreren, Dutch error messages for `auth/invalid-credential`, `auth/email-already-in-use`, `auth/weak-password`), router guard redirecting to `login` when `!user`, and to `settings` after first registration when `settings` doc missing.
- [ ] **Step 5:** `npm run build` → exit 0. Manual: `npm run emulators` + `npm run dev`, register, land on Instellingen.
- [ ] **Step 6:** Commit `feat: security rules, repositories, auth`.

### Task 14: Instellingen screen

**Files:** Create `src/views/SettingsView.vue`, `src/components/ServiceForm.vue`, `src/components/DebtorForm.vue`, `src/domain/defaultServices.ts`, `tests/domain/defaultServices.test.ts`

**Interfaces:**
- Produces: `DEFAULT_SERVICES: Omit<Service,'id'>[]` — starter set: Ggz-consult zelfbetaler (exempt, care), No-show (exempt, not care, account `omzet-no-show`), Coaching (standard21), Training (standard21, `omzet-training`), Deskundigenrapport (standard21, `omzet-rapportage`), Onderverhuur (exempt, `omzet-onderverhuur`). Rates 0 so the user sets them.

- [ ] **Step 1: Failing test:** every default service has a non-null `vatCode` and a `revenueAccount` present in `ACCOUNTS`.
- [ ] **Step 2–3:** FAIL → implement → PASS.
- [ ] **Step 4:** View with three sections: Praktijkgegevens (all `Settings` fields; vatProfile as radio with plain-language explanations of the three profiles from the functional design), Diensten (list, add/edit with btw-code select; save is blocked when vatCode empty; "Standaarddiensten toevoegen" button when list empty), Debiteuren (list + form; client type shows "Cliëntnummer" label for displayName and a note that the name is only printed on invoices).
- [ ] **Step 5:** Build passes; manual check in emulator: save settings, add a service, add a client debtor.
- [ ] **Step 6:** Commit `feat: settings screen`.

### Task 15: Facturen screen

**Files:** Create `src/views/InvoicesView.vue`, `src/views/InvoicePrintView.vue`, `src/components/InvoiceEditor.vue`

- [ ] **Step 1:** List with filters (open/betaald/gecrediteerd), columns number, date, debtor displayName, total, outstanding (`outstandingCents`), reminder status; badge when `dueReminders` lists it.
- [ ] **Step 2:** `InvoiceEditor`: choose debtor, add lines from services (prefill rate/vatCode/description), live totals (`invoiceTotals`), show `invoiceWarnings` in Dutch above the save button (`MISSING_VAT_CODE`: "Deze dienst heeft geen btw-code. Stel die eerst in bij Instellingen." – blocks saving; `EXEMPT_TO_ORGANISATION`: "Vrijgestelde factuur aan een organisatie: is dit echt zorg met een gezondheidsdoel?" – warning; `ABOVE_NZA_MAX`: "Tarief ligt boven het NZa-maximumtarief." – warning). Due date default = date + 14 days. Saves via `createInvoice`.
- [ ] **Step 3:** Actions per invoice: Afdrukken (opens print route), Crediteren (confirm modal → `createCredit`), Markeer betaald, Herinnering verstuurd (adds reminder entry with today), copy reminder text (`REMINDER_TEXT` filled in).
- [ ] **Step 4:** `InvoicePrintView`: A4 print layout with practice details (KvK, AGB practice/provider, BIG, btw-nummer), debtor `invoiceName` + address, lines with date, prestatiecode, description, amount; btw per rate or text "Vrijgesteld van btw (art. 11 lid 1 sub g Wet OB)" for exempt lines; payment reference and IBAN; "CREDITFACTUUR bij factuur X" for credits. `@media print` hides app shell.
- [ ] **Step 5:** Build passes; manual: create invoice, print preview, credit it, original shows "gecrediteerd" and outstanding 0.
- [ ] **Step 6:** Commit `feat: invoices screen`.

### Task 16: Consulten screen

**Files:** Create `src/views/ConsultsView.vue`, `src/components/ImportPreview.vue`

**Interfaces:**
- Produces: `ImportPreview` props `{ rows: unknown[]; errors: {line; message}[]; columns: {key; label}[] }`, emits `confirm`, `cancel`. Reused by Task 18.

- [ ] **Step 1:** File input → `parseDeclarationFile` → ImportPreview. On confirm: for each row resolve debtor by `displayName` (create `insurer` debtor if missing), `mergeConsult` with existing consult found by `externalId`, upsert with id = `externalId`. Toast with counts (nieuw / bijgewerkt / fouten).
- [ ] **Step 2:** List with status filter tabs and counters; rejected rows show reason + `rejectionAction` text and buttons "Opnieuw ingediend" (status → `declared`, resolution set) and "Factureren aan cliënt" (opens InvoiceEditor prefilled with the consult, sets `invoiceId` after save).
- [ ] **Step 3:** Build passes; manual: import fixture `tests/fixtures/declaraties.csv` twice → no duplicates.
- [ ] **Step 4:** Commit `feat: consults screen with declaration import`.

### Task 17: Uitgaven screen

**Files:** Create `src/views/ExpensesView.vue`, `src/components/ExpenseForm.vue`, `src/components/MileageList.vue`

- [ ] **Step 1:** `ExpenseForm`: receipt upload (image/pdf, `uploadReceipt`), date, supplier (on blur: `suggestCategory` → preselect, with "voorgesteld" label), category select with `hint`, amount incl., btw amount, vatAttribution (only shown when profile `mixed`); computes `deductibleVatCents` via `inputVat` with current-year `proRata`; when `shouldCapitalize(amountIncl − deductible, capitalizeThreshold)` show "Activeren en afschrijven?" checkbox + life years (default 5) with schedule preview. On save, store supplier rule `supplierKey → category`.
- [ ] **Step 2:** List with month grouping and category totals; receipt link.
- [ ] **Step 3:** Tab "Kilometers": add trip (from/to with datalist of earlier addresses, km, purpose); yearly total km × `mileageRateCents` shown and added to P&L as `kosten-vervoer` (extend `profitAndLoss` input with `mileage` and add a test in `annualReport.test.ts`: 100 km × 23 = 2300 in `kosten-vervoer`).
- [ ] **Step 4:** Tests pass, build passes; manual: add expense from "Zoom", second expense from "zoom bv" gets suggested category.
- [ ] **Step 5:** Commit `feat: expenses and mileage`.

### Task 18: Bank screen

**Files:** Create `src/views/BankView.vue`

- [ ] **Step 1:** Import: file → `parseBankFile` → ImportPreview; on confirm upsert each row with id = `importHash` (so re-import is idempotent); unknown format → toast "Onbekend bankformaat".
- [ ] **Step 2:** List of unconfirmed transactions first, each showing `suggestMatch` result with reason; buttons: Bevestigen (writes `match`, `confirmed: true`, and applies effects: invoice → `paidCents += amount`, status `paid` when outstanding 0; consults → set `bankTransactionId`; expense → nothing extra), Privé (match `private`), Anders koppelen (select invoice/expense manually), Overig.
- [ ] **Step 3:** Confirmed list below, filterable by month; current balance = opening balance + sum.
- [ ] **Step 4:** Build passes; manual: import ING fixture, match an invoice by number, mark one private.
- [ ] **Step 5:** Commit `feat: bank import and matching`.

### Task 19: Belasting screen

**Files:** Create `src/views/TaxView.vue`, `src/components/HoursForm.vue`

- [ ] **Step 1:** Year selector. Banner when `fiscal.usingDefaults` or `verified === false`: "Fiscale bedragen zijn indicatief – controleer met je fiscalist."
- [ ] **Step 2:** Btw-sectie (hidden for profile `exempt`, replaced by explanation that no btw-aangifte is needed while there is no taxed turnover): 4 quarter cards with `vatReturn` boxes; `korSignal` card.
- [ ] **Step 3:** Inkomstenbelasting: profit to date (`profitAndLoss`), `estimateTax` projection and `reservationToDate`; note that heffingskortingen are not included so the estimate is on the safe side.
- [ ] **Step 4:** Urencriterium: hours entry list + progress bar to 1225, split per kind.
- [ ] **Step 5:** Jaarafsluiting: P&L and balance tables (account names, no numbers), "Exporteer CSV" (download `toCsv(exportRows)`), "Afdrukken" (print-friendly).
- [ ] **Step 6:** Build passes; manual check.
- [ ] **Step 7:** Commit `feat: tax screen`.

### Task 20: Overzicht screen

**Files:** Create `src/views/OverviewView.vue`, `src/domain/tasks.ts`, `tests/domain/tasks.test.ts`

**Interfaces:**
- Produces: `buildTasks(ctx: { consults; invoices; debtors; transactions; today: string }): { id: string; label: string; route: string; count: number }[]` — "N afwijzingen bekijken" (rejected consults without resolution → `consults`), "N herinneringen versturen" (`dueReminders` → `invoices`), "N banktransacties bevestigen" (unconfirmed → `bank`), "N consulten nog te declareren" (registered → `consults`). Tasks with count 0 omitted.

- [ ] **Step 1: Failing test:** fixture with 2 rejected (1 resolved), 1 unconfirmed tx → exactly `[afwijzingen 1, banktransacties 1]` in that order.
- [ ] **Step 2–3:** FAIL → implement → PASS.
- [ ] **Step 4:** View: big card "Beschikbaar" = bank balance − `reservationToDate`; revenue this month / this year via `revenueSplit` (zorg vs overig); outstanding per debtor type (only amounts and counts, no names); nog te declareren count; task list linking to routes.
- [ ] **Step 5:** Build passes; commit `feat: overview dashboard`.

### Task 21: End-to-end verification

- [ ] **Step 1:** `npm test` and `npm run test:rules` → all PASS; `npm run build` → exit 0.
- [ ] **Step 2:** Start emulators + seed + dev server; with Playwright: register → fill settings → add default services → create client debtor → create invoice → import ING fixture containing that invoice number → confirm match → invoice shows paid → overview shows revenue and no "banktransacties" task. Screenshot each screen.
- [ ] **Step 3:** Fix any defects found (each with a failing test first where it is domain logic).
- [ ] **Step 4:** Add `README.md` with setup (Java, `npm i`, `npm run emulators`, `npm run seed`, `npm run dev`, connecting a real Firebase project via `.env`, `firebase deploy --only firestore:rules,storage,hosting`). Commit `docs: readme and e2e verification`.

---

## Amendment 2026-10-12: België

The user changed the target country from NL to **België** after Task 14. The spec was rewritten (same path). Tasks B1–B7 convert the completed tasks; Tasks 15–21 then run with the Belgian names below. Where an earlier task conflicts with this amendment, the amendment wins.

**Global Constraints (replacing NL items):** payment reference = OGM `+++XXX/XXXX/XXXXX+++`; exempt invoice text "Vrijgesteld van btw krachtens artikel 44 van het Btw-Wetboek."; small-scheme text "Bijzondere vrijstellingsregeling kleine ondernemingen"; bewaartermijn 10 jaar; no NZa, BIG, AGB, KvK, VECOZO, urencriterium, zelfstandigenaftrek, MKB-winstvrijstelling, KOR, Zvw anywhere.

### Task B1: Types, btw rules
- `types.ts`: `VatProfile` adds `'small'`; `DebtorType = 'mutuality' | 'network' | 'client' | 'organisation'`; `Settings` = name, address, enterpriseNumber, vatNumber, rizivNumber, visumNumber, iban, vatProfile, openingBalanceCents, openingBalanceDate; `Service.nzaMaxCents` → `maxRateCents`; `Debtor.vatNumber?: string`; `HoursEntry` removed.
- `vat.ts`: `inputVat` with profile `small` → nothing deductible; `proRata` rounds **up** to a whole percentage (`proRata(3001, 10000) === 0.31`, `proRata(0,0) === 0`); warnings `ABOVE_MAX_RATE` (replaces `ABOVE_NZA_MAX`) and `PEPPOL_REQUIRED` (organisation debtor and any `standard21` line); `invoiceWarnings(lines, debtor, services)` unchanged signature.
- Tests updated first; `npm test` RED → GREEN.

### Task B2: Gestructureerde mededeling
- `structuredCommunication(invoiceNumber: string): string` — digits of `YYYY-NNNN…` → base = year + seq padded to 6 (10 digits); check = base mod 97, 0 → 97; format `+++123/4567/89012+++`. Test: `'2026-0142'` → base `2026000142`, check `2026000142 % 97`.
- `paymentReference(practiceName, number)` returns the OGM (practiceName unused → signature becomes `paymentReference(invoiceNumber)`).
- `extractInvoiceNumbers(text)` also recognises OGMs (with or without `+++`, `***`, slashes or spaces) and maps them back to `YYYY-NNNN` when the check digits are valid.

### Task B3: Bank import België
- Formats: `coda`, `mt940`, `csv` (generic, `;` or `,`, header synonyms: datum/date/uitvoeringsdatum/boekingsdatum; bedrag/amount; tegenpartij/naam tegenpartij/counterparty/naam; omschrijving/mededeling/description/vrije mededeling/gestructureerde mededeling — joined). NL ING/Rabobank/ABN formats removed.
- CODA: 128-char records; record `21`: sign at pos 32 (`0` credit, `1` debit), amount pos 33–47 (15 digits, 3 decimals), value date pos 48–53 `DDMMYY`, communication type pos 62 (`1` structured: pos 63–65 type `101` + 12 digits OGM), communication pos 63–115; record `22` continues communication pos 11–63; record `23`: counterparty account pos 11–47, name pos 48–82, communication continuation 83–125. Entry date pos 116–121 used as date.
- Tests with fixtures `tests/fixtures/sample.cod`, `belfius.csv` (`;`, Dutch headers), existing `sample.mt940`.

### Task B4: Sessies-import en matching
- CSV header `sessie_id;datum;ziekenfonds;pseudocode;bedrag;status;reden;betaald` (old NL header still accepted: `consult_id`, `debiteur`, `prestatiecode`, `afwijsreden`). Statuses `geregistreerd|ingediend|geweigerd|betaald` (+ NL synonyms).
- `RejectionReason = 'insurability' | 'max_sessions' | 'referral_missing' | 'other'`: verzekerbaar/verzekerbaarheid → insurability; maximum/aantal sessies → max_sessions; verwijzing/verwijsbrief → referral_missing.
- Actions: insurability → 'Verzekerbaarheid niet in orde: vraag de cliënt de situatie bij het ziekenfonds na te kijken of factureer de sessie aan de cliënt.'; max_sessions → 'Maximum aantal terugbetaalde sessies bereikt: bespreek met de cliënt verdere sessies aan het privétarief.'; referral_missing → 'Verwijzing ontbreekt: vraag de verwijzing op en dien opnieuw in.'; other → 'Bekijk de weigering op het platform en dien zo nodig opnieuw in.'
- Matching: OGM/invoice number → invoice; counterparty contains a `mutuality`/`network` debtor name → paid sessions summing to the amount.

### Task B5: Fiscale parameters en belastingraming
- `FiscalParameters`: `year`, `incomeTaxBrackets`, `taxFreeAmountCents`, `municipalTaxRate`, `socialContribution: { tiers: {upToCents: number|null; rate}[]; minimumYearCents; managementFeeRate }`, `smallBusinessThresholdCents`, `mileageRateCents`, `capitalizeThresholdCents`, `verified`.
- Defaults 2026 (AJ 2027): brackets 25% tot € 16.720, 40% tot € 29.510, 45% tot € 51.070, 50%; belastingvrije som € 11.180; gemeentebelasting 7%; sociale bijdragen 20,5% tot € 75.024,54, 14,16% tot € 110.562,42, 0% daarboven, minimum € 3.561,68/jaar (4 × € 890,42), beheerskosten 4%; kleine onderneming € 25.000; km-vergoeding 0 (zelfstandigen: werkelijke kosten); activering € 1.000.
- `socialContributions(profitCents, params): number` — solve `c = max(min, f(profit − c)) × (1 + fee)` by fixed-point iteration (20 rounds) where `f` applies the tiers; profit ≤ 0 → minimum.
- `estimateTax({ profitCents, params })` → `{ socialContributionsCents, taxableIncomeCents, incomeTaxCents, municipalTaxCents, totalCents }`; taxable = max(0, profit − social); income tax = brackets(taxable) − brackets(min(taxable, taxFree)) (vermindering belastingvrije som at the bracket rates), not below 0; municipal = round(incomeTax × rate).
- `reservationToDate(profitToDateCents, today, params)` — annualise, estimate, scale back.
- Tests with simple params: brackets `[{upTo:1000000, rate:0.25},{upTo:null, rate:0.5}]`, taxFree 500000, municipal 0.07, social tiers `[{upTo:5000000, rate:0.2},{upTo:null, rate:0}]`, minimum 300000, fee 0:
  - profit 6000000 → social c = 0.2 × (6000000 − c) → c = 1000000; taxable 5000000; tax = 250000 + 2000000 − 125000 = 2125000; municipal 148750; total 3273750.
  - profit 1000000 → social = max(300000, 0.2×(1000000−c)) → c≈166667 < min → 300000; taxable 700000; tax 250000·… = 175000 − 125000 = 50000; municipal 3500; total 353500.
  - profit 0 → social 300000, tax 0.

### Task B6: Btw-aangifte, rekeningen, categorieën, jaarrapport, standaarddiensten
- `vatReturn(year, quarter, invoices, expenses)` → `{ grid00Cents, grid03Cents, grid54Cents, grid59Cents, grid71Cents, grid72Cents }` (71 = max(0, 54 − 59), 72 = max(0, 59 − 54)).
- `smallBusinessSignal(taxedTurnoverYearCents, params)` replaces `korSignal`.
- Accounts: debiteuren-ziekenfondsen, debiteuren-netwerken, debiteuren-clienten, debiteuren-overig, nog-te-factureren (replaces nog-te-declareren), btw-rekening-courant (vorderen/schulden split kept as btw-te-vorderen / btw-te-betalen), omzet-riziv (sessies via ziekenfonds), omzet-netwerk, omzet-zelfbetalers, omzet-annulering, omzet-coaching, omzet-training, omzet-verslagen, omzet-onderverhuur, omzet-subsidies, omzet-overig; costs incl. kosten-sociale-bijdragen? No — sociale bijdragen are shown in the tax estimate, not in the bookkeeping result.
- Categories: Belgian hints (wagen: aftrekbaarheid volgens CO2-uitstoot; kantoor thuis: pro rata; representatie: 50% aftrekbaar, btw niet aftrekbaar; restaurantkosten 69%).
- Default services: Sessie eerstelijnspsychologische zorg (conventie, exempt, omzet-riziv, care), Psychotherapie / individuele sessie privé (exempt, omzet-zelfbetalers, care), Annuleringsvergoeding (outside, omzet-annulering), Coaching (21%), Training of workshop (21%), Deskundigenverslag (21%), Onderverhuur praktijkruimte (exempt, omzet-onderverhuur).
- Annual report: debtor accounts by new types; consult revenue mutuality → omzet-riziv, network → omzet-netwerk, client → omzet-zelfbetalers.

### Task B7: UI and data layer
- Settings form: KBO-ondernemingsnummer, btw-nummer, RIZIV-nummer, visumnummer, IBAN; four btw-profielen. ServiceForm: btw options with Belgian explanations, "Conventietarief / maximumhonorarium". DebtorForm types Ziekenfonds / Netwerk of overheid / Cliënt / Organisatie (+ btw-nummer for organisations). Practice store: drop hours; `currentProRata` uses the BE rounding. Nav label "Sessies".
- Verification: `npm test`, `npm run build`, rules tests.

Tasks 15–21 then apply with: Consulten → Sessies; NZa → conventietarief; invoice print shows KBO, btw-nummer, RIZIV- en visumnummer, OGM, art. 44 text, Peppol warning; Belasting screen shows btw-roosters, kleine-ondernemingssignaal, PB + gemeentebelasting + sociale bijdragen, no urencriterium; bank import accepts CODA.
