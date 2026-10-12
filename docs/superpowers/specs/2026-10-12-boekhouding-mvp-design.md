# Boekhouding psychologen – MVP design

Date: 2026-10-12 · Source: `Boekhoudsoftware voor psychologen – functioneel ontwerp.md`

## Intent

A web app that lets a solo, self-employed psychologist in the Netherlands (eenmanszaak) keep a closed bookkeeping, apply btw correctly per service, and produce year-end figures for the income tax return — without medical data entering the bookkeeping. Target: weekly routine done in ~10 minutes.

**Decisions made with the user**
- Stack: Vue 3 + TypeScript + Vite, Tailwind CSS v4, Firebase (Auth, Firestore, Storage).
- External integrations are replaced by file imports: bank via CSV/MT940, declarations/retourinformatie via CSV, receipts via manual upload (no OCR). Live PSD2, VECOZO, OCR and payment links are out of scope.
- Development and tests run on the Firebase Local Emulator Suite; real project config goes in `.env` (placeholders committed as `.env.example`).
- Public sign-up; one practice per account (practice id = user uid).

**Assumptions**
- UI language Dutch.
- Approximate 2026 fiscal parameters are seeded and visibly marked "controleer met fiscalist".

**Out of scope for MVP:** groepspraktijk/multiple behandelaars, BV/dga, personeel, Jeugdwet-toewijzingscontrole, XAF auditfile, 2FA, automatic e-mail sending (reminders are listed as tasks; the user sends them), client portal.

## Architecture

- Single-page app. The browser talks to Firestore directly; security rules restrict every document under `practices/{uid}` to that user. `fiscalParameters` is globally readable, not writable from the client.
- All business rules live in `src/domain/` — pure TypeScript, no Vue or Firebase imports, fully unit tested with Vitest.
- `src/data/` contains thin Firestore repositories (one per collection) that convert documents ⇄ domain types.
- `src/stores/` Pinia stores subscribe to repositories and expose reactive state to views.
- `src/views/` one view per screen; shared UI in `src/components/`.

## Data model (`practices/{uid}/…`)

All amounts are integer cents. Dates are ISO strings `YYYY-MM-DD`.

| Collection | Key fields |
| --- | --- |
| `settings/main` (doc) | name, address, kvk, agbPractice, agbProvider, big, vatNumber, iban, vatProfile (`exempt` \| `mixed` \| `taxed`) |
| `services` | name, rateCents, vatCode (`exempt` \| `standard21` \| `outside`), nzaMaxCents?, revenueAccount, isCare |
| `debtors` | type (`insurer` \| `municipality` \| `client` \| `organisation`), displayName (client: client number), invoiceName, address, email, remindersEnabled |
| `consults` | externalId, date, debtorId, serviceCode, amountCents, status (`registered` \| `declared` \| `rejected` \| `paid`), rejectionReason?, paidCents, resolution? |
| `invoices` | number, kind (`invoice` \| `credit`), creditOf?, date, dueDate, debtorId, lines[{serviceId, description, date, qty, unitCents, vatCode}], totals, paymentReference, paidCents, status, reminders[] |
| `counters/invoice` (doc) | year, next |
| `expenses` | date, supplier, category, amountInclCents, vatCents, deductibleVatCents, receiptPath?, capitalize?, assetLifeYears? |
| `supplierRules` | supplierKey → category |
| `bankTransactions` | date, amountCents, counterparty, description, importHash, match? {type: `invoice`\|`consults`\|`expense`\|`private`\|`other`, ids[]}, confirmed |
| `mileage` | date, from, to, km, purpose |
| `hours` | date, hours, kind (`direct` \| `admin` \| `training` \| `intervision`) |

Global: `fiscalParameters/{year}`: incomeTaxBrackets, zvwRate, zvwMax, zelfstandigenaftrek, startersaftrek, mkbWinstvrijstelling, korThreshold, mileageRate, capitalizeThreshold, kiaBrackets, validFrom.

## Domain modules (`src/domain/`)

- `money` — cents arithmetic, formatting (€ 1.234,56), parsing Dutch amounts.
- `vat` — line VAT per vatCode; input-VAT treatment per profile (exempt → VAT becomes cost; mixed → pro-rata by taxed/total turnover; taxed → fully deductible); warnings: service without vatCode, exempt invoice to an organisation, rate above NZa maximum.
- `invoiceNumber` — format `YYYY-NNNN`, next-number logic (reset per year). Allocation runs in a Firestore transaction in the repository.
- `paymentReference` — neutral reference `"<Praktijk> – factuur <nr>"`, never containing care information.
- `bankImport` — parse generic CSV (configurable columns, common Dutch bank exports: ING, Rabobank, ABN AMRO) and MT940; dedupe via hash.
- `matching` — suggest matches: invoice number / payment reference in description → invoice; insurer lump sum → consults from retourinformatie whose amounts sum to the payment; amount+supplier → expense.
- `declarationImport` — parse declaration/retour CSV (externalId, date, debtor, serviceCode, amount, status, rejectionReason, paidAmount); rejection reasons map to standard actions.
- `expenses` — category list with default accounts, supplier-rule suggestion, capitalization suggestion above threshold.
- `depreciation` — straight-line monthly schedule, residual value 0 by default.
- `reminders` — which invoices need a reminder (14 / 28 days past invoice date, respecting debtor setting).
- `taxEstimate` — profit to date → zelfstandigenaftrek (if hours ≥ 1225), MKB-winstvrijstelling, income tax brackets, Zvw; reservation; annualised projection.
- `annualReport` — chart of accounts (~40 named accounts), profit & loss and balance sheet derived from invoices, consults, expenses, depreciation, bank; "nog te declareren" for unbilled consults at year end.
- `vatReturn` — quarterly figures (1a turnover/VAT 21%, 1e exempt, 5b input VAT) and KOR signal.

## Screens

1. **Login / Registreren**
2. **Overzicht** — available balance (bank balance − tax reservation), revenue month/year split care/other, outstanding per debtor type, unbilled consults, task list.
3. **Consulten** — import, filter by status, resolve rejection (action per reason), mark resubmitted.
4. **Facturen** — create from services with warnings, print view (browser print → PDF), credit invoice, mark paid, reminder status. Client names only appear here.
5. **Uitgaven** — add with receipt upload, suggested category, capitalization; mileage tab.
6. **Bank** — import with preview, suggested matches, confirm / private.
7. **Belasting** — VAT quarter (if profile ≠ exempt), KOR signal, tax estimate, urencriterium + hours entry, year-end P&L and balance, CSV export (pseudonymised: no names or service codes).
8. **Instellingen** — practice details, VAT profile, services.

## Privacy

Dashboards, reports and exports use client numbers and aggregated amounts; no names or prestatiecodes. Payment references are neutral. Data minimised to financial fields.

## Error handling

Imports show a preview with per-row errors before saving. Repository failures surface as toast messages; nothing is silently ignored. Invoices cannot be deleted, only credited.

## Testing

- Vitest unit tests for every domain module, written test-first.
- Firestore security-rules tests against the emulator (`@firebase/rules-unit-testing`).
- Manual end-to-end check of main flows with Playwright against the emulator at the end.
