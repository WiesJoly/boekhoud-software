# Boekhouding psychologen – MVP design (België)

Date: 2026-10-12 · Source: `Boekhoudsoftware voor psychologen – functioneel ontwerp.md` (written for NL; converted to Belgian rules on the user's request, 2026-10-12)

## Intent

A web app that lets a self-employed psychologist in **Belgium** (natuurlijk persoon, zelfstandige in hoofdberoep) keep a closed bookkeeping, apply btw correctly per service, set aside personenbelasting and sociale bijdragen, and produce year-end figures for the accountant — without medical data entering the bookkeeping. Target: weekly routine done in ~10 minutes.

**Decisions made with the user**
- Stack: Vue 3 + TypeScript + Vite, Tailwind CSS v4, Firebase (Auth, Firestore, Storage).
- Country: **België** (changed from NL). All fiscal rules, terminology and identifiers are Belgian.
- External integrations replaced by file imports: bank via **CODA** (all Belgian banks), MT940 and generic bank CSV; sessions/terugbetalingen via CSV export from the ELP-platform / netwerk / EPD; receipts via manual upload (no OCR). Live PSD2, MyCareNet/eHealth, Peppol sending, OCR and payment links are out of scope.
- Development and tests run on the Firebase Local Emulator Suite; real project config in `.env`.
- Public sign-up; one practice per account (practice id = user uid).

**Assumptions** (marked in the UI as "controleer met je boekhouder")
- UI language Dutch (Vlaanderen). Hoofdberoep. Single, no dependants for the tax estimate.
- Indicative 2026 fiscal parameters (inkomstenjaar 2026 / aanslagjaar 2027) are seeded with `verified: false`.

**Out of scope for MVP:** groepspraktijk, vennootschap (BV), personeel, Peppol-verzending (only a warning and the data on the invoice), btw verlegd for foreign services (hint only), XAF/accounting software export formats, 2FA, automatic e-mails, client portal, bijberoep.

## Belgian rules applied

- **Btw per dienst**: `exempt` = vrijgesteld krachtens art. 44 WBTW (therapeutic care by erkende klinisch psycholoog / orthopedagoog / psychotherapeut); `standard21` = 21% (coaching, arbeidspsychologie, trainingen, deskundigenverslagen); `outside` = buiten het toepassingsgebied (annuleringsvergoedingen, subsidies). Invoice text for exempt lines: "Vrijgesteld van btw krachtens artikel 44 van het Btw-Wetboek."
- **Btw-profiel**: `exempt` (vrijgestelde btw-plichtige art. 44: geen periodieke aangifte, inkoop-btw is kost), `mixed` (gemengde btw-plichtige: kwartaalaangifte, aftrek via werkelijk gebruik of algemeen verhoudingsgetal, **naar boven afgerond op een geheel percentage**), `taxed` (gewone btw-plichtige), `small` (vrijstellingsregeling kleine ondernemingen, drempel € 25.000: geen btw aanrekenen, geen aftrek, vermelding "Bijzondere vrijstellingsregeling kleine ondernemingen").
- **Btw-aangifte (kwartaal)**: roosters 00 (vrijgestelde handelingen), 03 (maatstaf 21%), 54 (verschuldigde btw), 59 (aftrekbare btw), 71 (te betalen) / 72 (terug te vorderen). Small-scheme signal when taxed turnover stays under the threshold (art. 44-omzet telt in principe niet mee).
- **Peppol**: warning when an invoice to an organisation contains taxed (21%) lines: since 2026 this must be sent as a structured e-invoice via Peppol.
- **Betaalreferentie**: gestructureerde mededeling `+++XXX/XXXX/XXXXX+++` derived from the invoice number (10 digits + mod-97 check, 00 → 97). Neutral: never contains care information.
- **Personenbelasting**: progressive brackets on net beroepsinkomen (winst − sociale bijdragen), minus the tax on the belastingvrije som (at the lowest rate), plus gemeentebelasting as a percentage of the tax. No forfaitaire beroepskosten (actual costs).
- **Sociale bijdragen** (hoofdberoep): 20,5% up to the first limit, 14,16% up to the second, nothing above; yearly minimum; plus beheerskosten. Contributions are deductible, so the base is solved as income after contributions.
- **Belastingreservering** = geschatte personenbelasting + gemeentebelasting + sociale bijdragen (meant for voorafbetalingen).
- **Bewaartermijn**: 10 jaar.
- **Afschrijvingen**: lineair, pro rata temporis (monthly); drempel voor activering is a fiscal parameter.

## Data model (`practices/{uid}/…`)

All amounts are integer cents. Dates ISO `YYYY-MM-DD`.

| Collection | Key fields |
| --- | --- |
| `settings/main` (doc) | name, address, enterpriseNumber (KBO), vatNumber, rizivNumber, visumNumber, iban, vatProfile (`exempt` \| `mixed` \| `taxed` \| `small`), openingBalanceCents, openingBalanceDate |
| `services` | name, code (pseudocode/nomenclatuur), rateCents, vatCode (`exempt` \| `standard21` \| `outside` \| null), maxRateCents? (conventietarief), revenueAccount, isCare |
| `debtors` | type (`mutuality` \| `network` \| `client` \| `organisation`), displayName (client: cliëntnummer), invoiceName, address, email, vatNumber?, remindersEnabled |
| `consults` (UI: sessies) | externalId, date, debtorId, serviceCode, amountCents, status (`registered` \| `declared` \| `rejected` \| `paid`), rejectionReason?, paidCents, invoiceId?, bankTransactionId?, resolution? |
| `invoices` | number, kind, creditOf?, date, dueDate, debtorId, lines[], totals, paymentReference (OGM), paidCents, status, reminders[], consultIds? |
| `counters/invoice` | year, next |
| `expenses` | date, supplier, category, amountInclCents, vatCents, vatAttribution, deductibleVatCents, receiptPath?, capitalize, assetLifeYears? |
| `supplierRules`, `bankTransactions`, `mileage` | as before |

Global `fiscalParameters/{year}`: incomeTaxBrackets, taxFreeAmountCents, municipalTaxRate, socialContribution {minimumYearCents, tiers[{upToCents, rate}], managementFeeRate}, smallBusinessThresholdCents, mileageRateCents, capitalizeThresholdCents, verified.

## Domain modules (`src/domain/`)

money, csv, vat (incl. `small` profile, Belgian pro rata rounding, warnings `MISSING_VAT_CODE`, `EXEMPT_TO_ORGANISATION`, `ABOVE_MAX_RATE`, `PEPPOL_REQUIRED`), invoiceNumber (numbering + OGM + extraction), bankImport (CODA, MT940, generic CSV), declarationImport (sessions CSV, Belgian statuses and reasons), matching (OGM / invoice number, ziekenfonds-verzamelbetalingen, expenses), expenses (Belgian hints), depreciation, invoices, fiscal (BE 2026 defaults), taxEstimate (PB + gemeentebelasting + sociale bijdragen), vatReturn (BE roosters + kleine-ondernemingssignaal), accounts (Belgian names), annualReport (resultatenrekening, balans, dagboek-export).

## Screens

1. Login / Registreren
2. Overzicht — beschikbaar (bank − reservering), omzet maand/jaar zorg vs overig, openstaand per debiteurtype, nog te factureren sessies, taken.
3. Sessies — import, status, weigering oplossen.
4. Facturen — nieuw (met waarschuwingen incl. Peppol), afdrukken/PDF, creditnota, betaald, herinneringen.
5. Uitgaven — bon, categorie, activering; kilometerlogboek.
6. Bank — CODA/MT940/CSV import, koppelingen, privé.
7. Belasting — btw-kwartaal (if profile mixed/taxed), kleine-ondernemingssignaal, reservering PB + sociale bijdragen, jaarafsluiting, export.
8. Instellingen — praktijkgegevens (KBO, btw, RIZIV, visum), btw-profiel, diensten, debiteuren.

## Privacy

GDPR: dashboards, reports and exports use client numbers and aggregated amounts; no names or pseudocodes. Payment references are a neutral OGM. Data minimised to financial fields.

## Error handling, testing

Unchanged: import previews with per-row errors; toasts on failures; invoices are never deleted (creditnota). Vitest unit tests for every domain module (test-first), Firestore rules tests on the emulator, Playwright walkthrough at the end.
