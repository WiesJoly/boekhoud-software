import type { ConsultStatus, DebtorType, Invoice, VatCode } from './domain/types'

export const VAT_LABEL: Record<VatCode, string> = {
  exempt: 'Vrijgesteld',
  standard21: '21%',
  outside: 'Buiten btw',
  smallBusiness: 'Kleine onderneming',
}

export const DEBTOR_TYPE_LABEL: Record<DebtorType, string> = {
  client: 'Cliënt',
  organisation: 'Organisatie',
  mutuality: 'Ziekenfonds',
  network: 'Netwerk of overheid',
}

export const CONSULT_STATUS_LABEL: Record<ConsultStatus, string> = {
  registered: 'Nog te factureren',
  declared: 'Ingediend',
  rejected: 'Geweigerd',
  paid: 'Betaald',
}

export const INVOICE_STATUS_LABEL: Record<Invoice['status'], string> = {
  open: 'Open',
  paid: 'Betaald',
  credited: 'Gecrediteerd',
}

/** Exact invoice wording per VAT treatment. */
export const VAT_INVOICE_TEXT: Partial<Record<VatCode, string>> = {
  exempt: 'Vrijgesteld van btw krachtens artikel 44 van het Btw-Wetboek.',
  smallBusiness: 'Bijzondere vrijstellingsregeling kleine ondernemingen.',
  outside: 'Buiten het toepassingsgebied van de btw.',
}
